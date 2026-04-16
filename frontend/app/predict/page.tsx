"use client";
import { useState, useEffect } from "react";
import axios from "axios";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Dna, Loader2, AlertCircle } from "lucide-react";

export default function PredictorPage() {
  const defaultTeams = [
    "AmaZulu FC", "Cape Town City FC", "Chippa United", "Durban City",
    "Golden Arrows", "Kaizer Chiefs", "Magesi FC", "Mamelodi Sundowns",
    "Marumo Gallants", "Orbit College", "Orlando Pirates", "Polokwane City",
    "Richards Bay", "Royal AM", "Sekhukhune United", "Siwelele FC",
    "Stellenbosch FC", "SuperSport United", "TS Galaxy"
  ];
  const [teams, setTeams] = useState<string[]>(defaultTeams);
  const [homeTeam, setHomeTeam] = useState("");
  const [awayTeam, setAwayTeam] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<any>(null);



  const handlePredict = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!homeTeam || !awayTeam) return;
    
    setLoading(true);
    setError("");
    setResult(null);

    try {
      const res = await axios.post("https://cmdj.dpdns.org/predict", {
        home_team: homeTeam,
        away_team: awayTeam
      });
      setResult(res.data);
    } catch (err: any) {
      setError(err.response?.data?.detail || "An error occurred while predicting.");
    } finally {
      setLoading(false);
    }
  };

  const chartData = result ? [
    { name: "Home Win", value: result.home_win_prob, color: "#3b82f6" },
    { name: "Draw", value: result.draw_prob, color: "#94a3b8" },
    { name: "Away Win", value: result.away_win_prob, color: "#ef4444" }
  ] : [];

  return (
    <div className="max-w-4xl mx-auto space-y-8 w-full">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <Dna className="w-8 h-8 text-blue-600" /> Match Predictor
        </h1>
        <p className="text-slate-500 mt-1">Select teams to see AI-driven probabilities.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <form onSubmit={handlePredict} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-5 h-fit">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Home Team</label>
            <select 
              value={homeTeam}
              onChange={(e) => setHomeTeam(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
              required
            >
              <option value="" disabled>Select Home Team</option>
              {teams.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Away Team</label>
            <select 
              value={awayTeam}
              onChange={(e) => setAwayTeam(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
              required
            >
              <option value="" disabled>Select Away Team</option>
              {teams.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>



          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white py-2.5 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
          >
            {loading && <Loader2 className="w-5 h-5 animate-spin" />}
            Generate Prediction
          </button>

          {error && (
            <div className="flex items-center gap-2 text-rose-600 bg-rose-50 p-3 rounded-lg text-sm">
              <AlertCircle className="w-5 h-5 flex-shrink-0" /> {error}
            </div>
          )}
        </form>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center justify-center min-h-[300px]">
          {result ? (
            <div className="w-full space-y-6">
              <div className="text-center">
                <p className="text-sm font-medium text-slate-500 uppercase tracking-wider">Most Likely Outcome</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">{result.prediction}</p>
              </div>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <XAxis dataKey="name" axisLine={false} tickLine={false} />
                    <YAxis hide domain={[0, 100]} />
                    <Tooltip cursor={{fill: 'transparent'}} />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]} label={{ position: 'top', formatter: (val: number) => `${val}%` }}>
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          ) : (
            <div className="text-slate-400 flex flex-col items-center">
              <Dna className="w-12 h-12 mb-3 opacity-20" />
              <p>Run a prediction to see the probability split.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
