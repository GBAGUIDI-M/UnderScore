from fastapi import FastAPI, HTTPException, BackgroundTasks, UploadFile, File
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
import ml_pipeline
import pandas as pd
import io

app = FastAPI(title="Football Predictor API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, restrict to frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class MatchRequest(BaseModel):
    home_team: str
    away_team: str

@app.get("/")
def health_check():
    return {"status": "ok", "message": "Football Predictor Backend is running."}

@app.post("/train")
def train_model_endpoint(background_tasks: BackgroundTasks):
    # Depending on data size, this might take a bit. We'll run it synchronously for simplicity in this demo,
    # or you can use background tasks. Let's run it inline for immediate feedback if small.
    try:
        res = ml_pipeline.trigger_training()
        return res
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/predict")
def predict_match_endpoint(req: MatchRequest):
    try:
        res = ml_pipeline.predict_single_match(req.home_team, req.away_team)
        return res
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/explain")
def explain_endpoint():
    data = ml_pipeline.get_shap()
    if not data:
        return {"message": "No SHAP data available. Train model first."}
    return data

@app.get("/teams")
def get_teams():
    return {"teams": ml_pipeline.get_teams()}

@app.post("/batch")
async def batch_predict(file: UploadFile = File(...)):
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="File must be a CSV")
    
    contents = await file.read()
    df = pd.read_csv(io.BytesIO(contents))
    
    if "HomeTeam" not in df.columns or "AwayTeam" not in df.columns:
        raise HTTPException(status_code=400, detail="CSV must contain HomeTeam and AwayTeam columns")
        
    results = []
    for _, row in df.iterrows():
        try:
            pred = ml_pipeline.predict_single_match(row["HomeTeam"], row["AwayTeam"])
            results.append({
                "HomeTeam": row["HomeTeam"], 
                "AwayTeam": row["AwayTeam"],
                "Home Win Prob": pred["home_win_prob"],
                "Draw Prob": pred["draw_prob"],
                "Away Win Prob": pred["away_win_prob"],
                "Prediction": pred["prediction"]
            })
        except:
            results.append({
                "HomeTeam": row["HomeTeam"], 
                "AwayTeam": row["AwayTeam"], 
                "Error": "Prediction failed"
            })
            
    res_df = pd.DataFrame(results)
    return {"results": res_df.to_dict(orient="records")}
