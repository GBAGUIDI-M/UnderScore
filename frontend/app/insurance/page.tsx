"use client";
import { useState } from "react";
import axios from "axios";
import { ShieldCheck, Loader2, AlertCircle, Calculator, TrendingUp } from "lucide-react";

export default function InsuranceUnderwriting() {
  const defaultTeams = [
    "AmaZulu FC", "Cape Town City FC", "Chippa United", "Durban City",
    "Golden Arrows", "Kaizer Chiefs", "Magesi FC", "Mamelodi Sundowns",
    "Marumo Gallants", "Orbit College", "Orlando Pirates", "Polokwane City",
    "Richards Bay", "Royal AM", "Sekhukhune United", "Siwelele FC",
    "Stellenbosch FC", "SuperSport United", "TS Galaxy"
  ];

  const [homeTeam, setHomeTeam] = useState("");
  const [awayTeam, setAwayTeam] = useState("");
  const [prizeAmount, setPrizeAmount] = useState(5000000);
  const [targetCondition, setTargetCondition] = useState("Home Win");
  const [margin, setMargin] = useState(30);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [financials, setFinancials] = useState<any>(null);

  const formatCurrency = (val: number) => {
    return "R " + val.toLocaleString('en-ZA', { maximumFractionDigits: 0 });
  };

  const handleCalculate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!homeTeam || !awayTeam) return;

    setLoading(true);
    setError("");
    setFinancials(null);

    try {
      const res = await axios.post("http://127.0.0.1:8000/predict", {
        home_team: homeTeam,
        away_team: awayTeam
      });

      const result = res.data;
      let targetProbObj = 0;
      if (targetCondition === "Home Win") targetProbObj = result.home_win_prob;
      else if (targetCondition === "Draw") targetProbObj = result.draw_prob;
      else if (targetCondition === "Away Win") targetProbObj = result.away_win_prob;

      const probDecimal = targetProbObj / 100;
      const expectedLoss = probDecimal * prizeAmount;
      const actualPremium = expectedLoss * (1 + (margin / 100));
      const projectedProfit = actualPremium - expectedLoss;

      setFinancials({
        baseResult: result,
        probability: targetProbObj,
        expectedLoss,
        actualPremium,
        projectedProfit
      });
    } catch (err: any) {
      setError(err.response?.data?.detail || "An error occurred estimating risk.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 w-full pb-10">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <ShieldCheck className="w-8 h-8 text-blue-600" /> Prize Indemnity Underwriting
        </h1>
        <p className="text-slate-500 mt-1 max-w-3xl">
          Transform predicted sports probabilities into a mathematically certain insurance product. Calculate the mathematically guaranteed premium to charge brands for multi-million Rand stunts.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <form onSubmit={handleCalculate} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-5 lg:col-span-5 h-fit">
          <h3 className="font-semibold text-lg text-slate-800 border-b pb-3 mb-4 flex items-center gap-2">
            <Calculator className="w-5 h-5 text-slate-400" /> Scenario Parameters
          </h3>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Corporate Prize Amount (Rands)</label>
            <input
              type="number"
              value={prizeAmount}
              onChange={(e) => setPrizeAmount(Number(e.target.value))}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none font-medium text-slate-800"
              required
              min={1000}
            />
          </div>

          <div className="space-y-4 pt-2 border-t border-slate-100">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Home Team</label>
              <select value={homeTeam} onChange={(e) => setHomeTeam(e.target.value)} className="w-full px-4 py-2 border border-slate-300 rounded-lg outline-none bg-white" required>
                <option value="" disabled>Select Home Team</option>
                {defaultTeams.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Away Team</label>
              <select value={awayTeam} onChange={(e) => setAwayTeam(e.target.value)} className="w-full px-4 py-2 border border-slate-300 rounded-lg outline-none bg-white" required>
                <option value="" disabled>Select Away Team</option>
                {defaultTeams.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Condition for Payout</label>
              <select value={targetCondition} onChange={(e) => setTargetCondition(e.target.value)} className="w-full px-4 py-2 border border-slate-300 rounded-lg outline-none bg-white" required>
                <option value="Home Win">Fan predicts Home Win</option>
                <option value="Draw">Fan predicts Draw</option>
                <option value="Away Win">Fan predicts Away Win</option>
              </select>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100">
            <label className="block text-sm font-medium text-slate-700 mb-1">Insurer's Profit Margin (%)</label>
            <input
              type="number"
              value={margin}
              onChange={(e) => setMargin(Number(e.target.value))}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              required
              min={0}
              max={1000}
            />
          </div>

          <button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 mt-4 text-lg">
            {loading && <Loader2 className="w-5 h-5 animate-spin" />}
            Calculate Premium
          </button>

          {error && <div className="text-rose-600 bg-rose-50 p-3 rounded-lg text-sm">{error}</div>}
        </form>

        <div className="lg:col-span-7 space-y-6">
          {!financials ? (
            <div className="bg-slate-100 border border-dashed border-slate-300 rounded-xl flex flex-col items-center justify-center p-12 text-slate-400 h-full min-h-[400px]">
              <TrendingUp className="w-16 h-16 mb-4 opacity-50 text-slate-400" />
              <h3 className="text-xl font-semibold mb-2">No Risk Assessed Yet</h3>
              <p className="text-center max-w-sm">Configure the prize details and select a match to generate an instant actuarial quote for the insurance pitch.</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden transform transition-all animate-in fade-in slide-in-from-bottom-4">
              <div className="bg-slate-900 px-6 py-8 text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 -mr-8 -mt-8 w-40 h-40 rounded-full bg-blue-500 opacity-20 blur-3xl"></div>
                <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300">Underwriting Recommendation</h2>
                <div className="mt-4 flex items-end gap-2">
                  <span className="text-5xl font-extrabold tracking-tight">{formatCurrency(financials.actualPremium)}</span>
                  <span className="text-lg text-slate-400 mb-1">Upfront Premium</span>
                </div>
              </div>

              <div className="p-6 md:p-8 space-y-8">
                <div>
                  <h4 className="text-slate-500 text-sm font-medium uppercase tracking-wider mb-4">Actuarial Risk Mathematics</h4>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <span className="text-slate-600">Pure Probability of Event</span>
                      <span className="font-bold text-lg text-rose-600 bg-rose-50 px-3 py-1 rounded-full">{financials.probability.toFixed(2)}%</span>
                    </div>
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <span className="text-slate-600">Total Liability (Prize)</span>
                      <span className="font-semibold text-slate-900">{formatCurrency(prizeAmount)}</span>
                    </div>
                    <div className="flex items-center justify-between bg-slate-50 p-4 rounded-lg">
                      <span className="text-slate-800 font-medium">True Expected Loss (Base Cost)</span>
                      <span className="font-bold text-slate-900">{formatCurrency(financials.expectedLoss)}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-slate-500 text-sm font-medium uppercase tracking-wider mb-4">Insurer's Business Model</h4>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <span className="text-slate-600">Target Profit Margin</span>
                      <span className="font-medium text-slate-900">{margin}%</span>
                    </div>
                    <div className="flex items-center justify-between bg-emerald-50 text-emerald-900 p-4 rounded-lg border border-emerald-100">
                      <span className="font-semibold">Projected Long-Term Profit</span>
                      <span className="font-bold text-xl text-emerald-700">+{formatCurrency(financials.projectedProfit)}</span>
                    </div>
                  </div>
                  <p className="text-sm text-slate-500 mt-4 leading-relaxed">
                    By charging the brand <strong>{formatCurrency(financials.actualPremium)}</strong> to cover a {financials.probability.toFixed(2)}% risk of losing {formatCurrency(prizeAmount)}, the insurance firm guarantees an average profit of {formatCurrency(financials.projectedProfit)} per policy issued at this scale. Our XGBoost model acts as the perfect actuarial safety net to price this policy without requiring any soccer knowledge.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
