"use client";
import { useState } from "react";
import axios from "axios";
import { FolderUp, Loader2, UploadCloud } from "lucide-react";

export default function BatchPage() {
  const [file, setFile] = useState<File | null>(null);
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setLoading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await axios.post("http://127.0.0.1:8000/batch", formData);
      setResults(res.data.results || []);
    } catch (err) {
      console.error(err);
      alert("Error processing batch upload.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 w-full">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <FolderUp className="w-8 h-8 text-blue-600" /> Batch Predictor
        </h1>
        <p className="text-slate-500 mt-1">Upload a CSV containing <code className="bg-slate-100 text-slate-700 px-1 py-0.5 rounded">HomeTeam</code> and <code className="bg-slate-100 text-slate-700 px-1 py-0.5 rounded">AwayTeam</code> columns.</p>
      </div>

      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <form onSubmit={handleUpload} className="flex gap-4 items-center">
          <div className="flex-1 relative border-2 border-dashed border-slate-300 rounded-xl p-6 text-center hover:border-blue-500 transition-colors">
            <input 
              type="file" 
              accept=".csv"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            <div className="pointer-events-none">
              <UploadCloud className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <span className="text-slate-600 font-medium">
                {file ? file.name : "Drag and drop or click to select CSV"}
              </span>
            </div>
          </div>
          <button 
            type="submit"
            disabled={!file || loading}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white px-6 py-3 rounded-xl font-medium transition-colors flex items-center gap-2 h-full"
          >
            {loading && <Loader2 className="w-5 h-5 animate-spin" />}
            Upload & Predict
          </button>
        </form>
      </div>

      {results.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-6 py-4 text-sm font-semibold text-slate-600">Home Team</th>
                  <th className="px-6 py-4 text-sm font-semibold text-slate-600">Away Team</th>
                  <th className="px-6 py-4 text-sm font-semibold text-slate-600">Home Win %</th>
                  <th className="px-6 py-4 text-sm font-semibold text-slate-600">Draw %</th>
                  <th className="px-6 py-4 text-sm font-semibold text-slate-600">Away Win %</th>
                  <th className="px-6 py-4 text-sm font-semibold text-slate-600">Prediction</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {results.map((r, i) => (
                  <tr key={i} className="hover:bg-slate-50">
                    <td className="px-6 py-4 font-medium text-slate-900">{r.HomeTeam}</td>
                    <td className="px-6 py-4 font-medium text-slate-900">{r.AwayTeam}</td>
                    {r.Error ? (
                      <td colSpan={4} className="px-6 py-4 text-rose-500">{r.Error}</td>
                    ) : (
                      <>
                        <td className="px-6 py-4 text-slate-600">{r["Home Win Prob"]}%</td>
                        <td className="px-6 py-4 text-slate-600">{r["Draw Prob"]}%</td>
                        <td className="px-6 py-4 text-slate-600">{r["Away Win Prob"]}%</td>
                        <td className="px-6 py-4 font-semibold text-slate-900">{r.Prediction}</td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
