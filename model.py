# @title
"""
FOOTBALL PREDICTOR PIPELINE
---------------------------
This script serves as a complete end-to-end pipeline for predicting football match outcomes.
It consolidates Expected Goals (xG), Match Stats, and Event databases, applies advanced
feature engineering (Elo, Rolling Averages, Poisson probabilities), tunes an XGBoost model
using Optuna, calibrates probabilities, and outputs SHAP explainability plots.
"""

import os
import warnings
import numpy as np
import pandas as pd
import optuna
import xgboost as xgb
import shap
import matplotlib.pyplot as plt
from scipy.stats import poisson
from sklearn.model_selection import TimeSeriesSplit
from sklearn.metrics import log_loss, accuracy_score, classification_report
from sklearn.calibration import CalibratedClassifierCV
from sklearn.utils.class_weight import compute_sample_weight

# Suppress warnings for cleaner output
warnings.filterwarnings('ignore')
optuna.logging.set_verbosity(optuna.logging.WARNING)

# =====================================================================
# PHASE 1: DATA LOADING & CONSOLIDATION
# =====================================================================

def load_and_combine_seasons(file_prefix, seasons=['2425', '2526']):
    """Loads and combines datasets across multiple seasons."""
    dfs = []
    for season in seasons:
        file_path = f"{file_prefix}_{season}.csv"
        if os.path.exists(file_path):
            df = pd.read_csv(file_path)
            df['Season'] = season
            dfs.append(df)
        else:
            print(f"Warning: {file_path} not found. Skipping.")

    if not dfs:
        return pd.DataFrame()
    return pd.concat(dfs, ignore_index=True)

def parse_match_data(xg_df):
    """Parses base match results and target variable from the xG Database."""
    print("-> Parsing Match Results from xG Data...")
    matches = xg_df[['Date', 'Game', 'Season']].drop_duplicates().sort_values('Date').reset_index(drop=True)
    matches['Date'] = pd.to_datetime(matches['Date'])

    parsed_data = []
    for _, row in matches.iterrows():
        try:
            teams_part, score_part = row['Game'].split(' - ')
            home_team, away_team = teams_part.split(' vs ')
            home_goals, away_goals = map(int, score_part.split(':'))
            parsed_data.append([row['Date'], row['Season'], row['Game'], home_team.strip(), away_team.strip(), home_goals, away_goals])
        except ValueError:
            pass # Skip malformed game strings

    df_matches = pd.DataFrame(parsed_data, columns=['Date', 'Season', 'Game', 'HomeTeam', 'AwayTeam', 'HomeGoals', 'AwayGoals'])

    # Target: 0=Away Win, 1=Draw, 2=Home Win
    conditions = [
        (df_matches['HomeGoals'] > df_matches['AwayGoals']),
        (df_matches['HomeGoals'] == df_matches['AwayGoals']),
        (df_matches['HomeGoals'] < df_matches['AwayGoals'])
    ]
    df_matches['Target'] = np.select(conditions, [2, 1, 0], default=1)
    return df_matches

# =====================================================================
# PHASE 2: TEAM-MATCH LEVEL AGGREGATION
# =====================================================================

def aggregate_team_stats(df_matches, xg_df, stats_df, events_df):
    """Aggregates all raw player/event data up to the Team-Match level."""
    print("-> Aggregating xG, Stats, and Events to Team-Match level...")

    # 1. Aggregate xG Data
    team_xg = xg_df.groupby(['Game', 'Team'])[['xG', 'xGOT']].sum().reset_index()

    # 2. Aggregate Match Stats (Assuming columns like 'totalPass', 'duelWon' exist based on dictionary)
    team_stats = pd.DataFrame()
    if not stats_df.empty:
        # We assume stats_df has 'Game' and 'teamName' or a way to identify the team.
        # Fallback: group by Game and contestantId if teamName is missing, though we assume 'Team' exists or is mapped
        team_col = 'Team' if 'Team' in stats_df.columns else 'teamName' if 'teamName' in stats_df.columns else 'contestantId'

        stat_cols = ['totalPass', 'totalFinalThirdPasses', 'duelWon', 'touchesInOppBox', 'interceptionWon']
        available_stats = [c for c in stat_cols if c in stats_df.columns]

        if available_stats:
            team_stats = stats_df.groupby(['Game', team_col])[available_stats].sum().reset_index()
            team_stats.rename(columns={team_col: 'Team'}, inplace=True)

    # 3. Aggregate Event Data (Assuming 'xT' exists as per prompt)
    team_events = pd.DataFrame()
    if not events_df.empty and 'xT' in events_df.columns:
        team_col = 'Team' if 'Team' in events_df.columns else 'teamName'
        team_events = events_df.groupby(['Game', team_col])['xT'].sum().reset_index()
        team_events.rename(columns={team_col: 'Team'}, inplace=True)

    # 4. Merge Aggregations back to main Match dataframe
    def merge_team_features(df, agg_df, prefix):
        if agg_df.empty: return df
        # Merge Home
        df = df.merge(agg_df, left_on=['Game', 'HomeTeam'], right_on=['Game', 'Team'], how='left')
        df = df.drop('Team', axis=1).rename(columns={c: f'Home_{c}' for c in agg_df.columns if c not in ['Game', 'Team']})
        # Merge Away
        df = df.merge(agg_df, left_on=['Game', 'AwayTeam'], right_on=['Game', 'Team'], how='left')
        df = df.drop('Team', axis=1).rename(columns={c: f'Away_{c}' for c in agg_df.columns if c not in ['Game', 'Team']})
        return df

    df_matches = merge_team_features(df_matches, team_xg, '')
    df_matches = merge_team_features(df_matches, team_stats, '')
    df_matches = merge_team_features(df_matches, team_events, '')

    df_matches.fillna(0, inplace=True)
    return df_matches

# =====================================================================
# PHASE 3: ADVANCED FEATURE ENGINEERING (ROLLING & ELO)
# =====================================================================

def calculate_elo_ratings(df_matches, k_factor=20):
    print("-> Calculating Dynamic Elo Ratings...")
    elo_dict = {}

    home_elos, away_elos = [], []
    for index, row in df_matches.iterrows():
        home_team, away_team = row['HomeTeam'], row['AwayTeam']

        home_elo = elo_dict.get(home_team, 1500.0)
        away_elo = elo_dict.get(away_team, 1500.0)

        home_elos.append(home_elo)
        away_elos.append(away_elo)

        expected_home = 1 / (1 + 10 ** ((away_elo - home_elo) / 400))
        expected_away = 1 - expected_home

        actual_home = 1 if row['Target'] == 2 else (0 if row['Target'] == 0 else 0.5)
        actual_away = 1 - actual_home

        elo_dict[home_team] = home_elo + k_factor * (actual_home - expected_home)
        elo_dict[away_team] = away_elo + k_factor * (actual_away - expected_away)

    df_matches['Home_Elo'] = home_elos
    df_matches['Away_Elo'] = away_elos
    df_matches['Elo_Difference'] = df_matches['Home_Elo'] - df_matches['Away_Elo']
    return df_matches

def build_rolling_features(df_matches):
    print("-> Building Chronological Rolling Averages & Rest Days...")

    # Identify all metric columns created in aggregation phase
    metric_cols = [c.replace('Home_', '') for c in df_matches.columns if c.startswith('Home_') and c not in ['HomeTeam', 'HomeGoals', 'Home_Elo']]

    team_matches = []
    for _, row in df_matches.iterrows():
        # Home perspective
        home_data = {'Date': row['Date'], 'Game': row['Game'], 'Team': row['HomeTeam']}
        for col in metric_cols:
            home_data[f'{col}_For'] = row.get(f'Home_{col}', 0)
            home_data[f'{col}_Against'] = row.get(f'Away_{col}', 0)
        team_matches.append(home_data)

        # Away perspective
        away_data = {'Date': row['Date'], 'Game': row['Game'], 'Team': row['AwayTeam']}
        for col in metric_cols:
            away_data[f'{col}_For'] = row.get(f'Away_{col}', 0)
            away_data[f'{col}_Against'] = row.get(f'Home_{col}', 0)
        team_matches.append(away_data)

    df_teams = pd.DataFrame(team_matches).sort_values(['Team', 'Date'])

    # Calculate Rolling Stats (.shift(1) prevents leakage)
    window = 5
    rolling_cols = []
    for col in metric_cols:
        df_teams[f'Roll_{col}_For'] = df_teams.groupby('Team')[f'{col}_For'].transform(lambda x: x.shift(1).rolling(window, min_periods=1).mean())
        df_teams[f'Roll_{col}_Against'] = df_teams.groupby('Team')[f'{col}_Against'].transform(lambda x: x.shift(1).rolling(window, min_periods=1).mean())
        rolling_cols.extend([f'Roll_{col}_For', f'Roll_{col}_Against'])

    # Rest Days
    df_teams['Rest_Days'] = df_teams.groupby('Team')['Date'].diff().dt.days.fillna(14).clip(upper=21)
    rolling_cols.append('Rest_Days')

    # Merge back
    for is_home, prefix in [(True, 'Home_'), (False, 'Away_')]:
        team_type = 'HomeTeam' if is_home else 'AwayTeam'
        merge_df = df_teams[['Game', 'Team'] + rolling_cols].rename(columns={c: f'{prefix}{c}' for c in rolling_cols})
        df_matches = df_matches.merge(merge_df, left_on=['Game', team_type], right_on=['Game', 'Team'], how='left').drop('Team', axis=1)

    df_matches.fillna(df_matches.mean(numeric_only=True), inplace=True) # Fill initial match NaNs safely
    return df_matches

def add_poisson_probabilities(df_matches):
    print("-> Calculating Poisson Match Probabilities...")
    def get_match_probs(h_lambda, a_lambda):
        h_lambda, a_lambda = max(0.1, h_lambda), max(0.1, a_lambda)
        h_probs = [poisson.pmf(i, h_lambda) for i in range(7)]
        a_probs = [poisson.pmf(i, a_lambda) for i in range(7)]

        matrix = np.outer(h_probs, a_probs)
        return np.sum(np.tril(matrix, -1)), np.sum(np.diag(matrix)), np.sum(np.triu(matrix, 1))

    probs = []
    for _, row in df_matches.iterrows():
        # Project goals based on Rolling xG (For vs Opponent's Against)
        if 'Home_Roll_xG_For' in row:
            h_proj = (row['Home_Roll_xG_For'] + row['Away_Roll_xG_Against']) / 2
            a_proj = (row['Away_Roll_xG_For'] + row['Home_Roll_xG_Against']) / 2
        else:
            h_proj, a_proj = 1.0, 1.0 # Fallback

        probs.append(get_match_probs(h_proj, a_proj))

    prob_df = pd.DataFrame(probs, columns=['Poisson_HomeWin', 'Poisson_Draw', 'Poisson_AwayWin'])
    # Normalize
    totals = prob_df.sum(axis=1)
    for col in prob_df.columns: prob_df[col] /= totals

    return pd.concat([df_matches, prob_df], axis=1)

# =====================================================================
# PHASE 4: OPTUNA TUNING & XGBOOST TRAINING
# =====================================================================

def optimize_and_train(df_matches):
    print("\n--- PHASE 4: MODELING ---")
    # Identify final feature columns
    features = [c for c in df_matches.columns if c.startswith(('Home_Roll_', 'Away_Roll_', 'Poisson_', 'Elo_')) or c in ['Home_Elo', 'Away_Elo', 'Home_Rest_Days', 'Away_Rest_Days']]

    X = df_matches[features]
    y = df_matches['Target']

    tscv = TimeSeriesSplit(n_splits=5)

    # Calculate sample weights for imbalance (useful for XGBoost)
    sample_weights = compute_sample_weight(class_weight='balanced', y=y)

    def objective(trial):
        params = {
            'objective': 'multi:softprob',
            'num_class': 3,
            'eval_metric': 'mlogloss',
            'learning_rate': trial.suggest_float('learning_rate', 0.01, 0.1),
            'max_depth': trial.suggest_int('max_depth', 3, 7),
            'subsample': trial.suggest_float('subsample', 0.6, 1.0),
            'colsample_bytree': trial.suggest_float('colsample_bytree', 0.6, 1.0),
            'n_estimators': trial.suggest_int('n_estimators', 50, 300),
            'min_child_weight': trial.suggest_int('min_child_weight', 1, 10),
            'random_state': 42
        }

        log_losses = []
        for train_idx, val_idx in tscv.split(X):
            X_train, X_val = X.iloc[train_idx], X.iloc[val_idx]
            y_train, y_val = y.iloc[train_idx], y.iloc[val_idx]
            sw_train = sample_weights[train_idx]

            model = xgb.XGBClassifier(**params)
            model.fit(X_train, y_train, sample_weight=sw_train, verbose=False)

            preds = model.predict_proba(X_val)
            log_losses.append(log_loss(y_val, preds, labels=[0,1,2]))

        return np.mean(log_losses)

    print("-> Running Optuna Hyperparameter Tuning (XGBoost)...")
    study = optuna.create_study(direction='minimize')
    study.optimize(objective, n_trials=200) # Increase n_trials in production

    best_params = study.best_params
    best_params['objective'] = 'multi:softprob'
    best_params['num_class'] = 3
    best_params['eval_metric'] = 'mlogloss'
    best_params['random_state'] = 42

    # =====================================================================
    # PHASE 5: EVALUATION & PROBABILITY CALIBRATION
    # =====================================================================
    print("\n--- PHASE 5: CALIBRATION & EVALUATION ---")

    # 80/20 Chronological Split
    split_idx = int(len(X) * 0.8)
    X_train, X_test = X.iloc[:split_idx], X.iloc[split_idx:]
    y_train, y_test = y.iloc[:split_idx], y.iloc[split_idx:]
    sw_train = sample_weights[:split_idx]

    base_model = xgb.XGBClassifier(**best_params)

    # We must fit the base model to use it inside the CalibratedClassifier
    # Note: scikit-learn CalibratedClassifierCV requires a fitted estimator if cv='prefit',
    # but with cv=tscv it will fit it iteratively. We pass sample weights via fit_params.
    calibrated_model = CalibratedClassifierCV(estimator=base_model, method='isotonic', cv=tscv)
    calibrated_model.fit(X_train, y_train, sample_weight=sw_train)

    final_preds_proba = calibrated_model.predict_proba(X_test)
    final_preds_class = calibrated_model.predict(X_test)

    final_loss = log_loss(y_test, final_preds_proba, labels=[0, 1, 2])
    accuracy = accuracy_score(y_test, final_preds_class)

    print("="*45)
    print(f"🎯 FINAL CALIBRATED LOG LOSS : {final_loss:.4f} 🎯")
    print(f"🎯 FINAL ACCURACY            : {accuracy:.4f} 🎯")
    print("="*45)

    print("\nClassification Report (0=Away, 1=Draw, 2=Home):")
    print(classification_report(y_test, final_preds_class, zero_division=0))

    # =====================================================================
    # PHASE 6: EXPLAINABILITY & VISUALIZATION (SHAP)
    # =====================================================================
    print("\n--- PHASE 6: EXPLAINABILITY ---")
    # To use SHAP effectively with XGBoost, we train a final unified model on all train data
    final_explainer_model = xgb.XGBClassifier(**best_params)
    final_explainer_model.fit(X_train, y_train, sample_weight=sw_train)

    try:
        explainer = shap.TreeExplainer(final_explainer_model)
        shap_values = explainer.shap_values(X_test)

        # Save SHAP plot
        plt.figure(figsize=(10, 8))
        shap.summary_plot(shap_values, X_test, show=False)
        plt.savefig("shap_feature_importance.png", bbox_inches='tight')
        print("-> SHAP summary plot saved as 'shap_feature_importance.png'")
    except Exception as e:
        print(f"Could not generate SHAP plots. Exception: {e}")

if __name__ == "__main__":
    print("Initializing Football Predictor Pipeline...\n")

    # 1. Load Data
    xg_df = load_and_combine_seasons("PSL_xG_Database")
    stats_df = load_and_combine_seasons("PSL_MatchStats")
    events_df = load_and_combine_seasons("PSL_Events_Database")

    if xg_df.empty:
        print("ERROR: xG Database is required to run the pipeline.")
    else:
        # 2. Execute Pipeline
        df = parse_match_data(xg_df)
        df = aggregate_team_stats(df, xg_df, stats_df, events_df)
        df = calculate_elo_ratings(df)
        df = build_rolling_features(df)
        df = add_poisson_probabilities(df)

        # Display Feature Matrix Shape
        print(f"\nFinal Feature Matrix Shape: {df.shape}")

        # 3. Train and Evaluate
        optimize_and_train(df)
        print("\nPipeline execution complete.")