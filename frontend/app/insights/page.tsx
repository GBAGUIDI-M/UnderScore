"use client";
import { useState, useEffect } from "react";
import axios from "axios";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { Activity, Loader2 } from "lucide-react";

export default function InsightsPage() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get("http://127.0.0.1:8000/explain").then(res => {
      if (res.data && !res.data.message) {
        // convert dict to array
        const sorted = Object.entries(res.data)
          .map(([key, val]) => ({ name: key, importance: val }))
          .sort((a: any, b: any) => a.importance - b.importance);
        setData(sorted);
      }
    }).finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-5xl mx-auto space-y-8 w-full">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <Activity className="w-8 h-8 text-blue-600" /> Model Insights (SHAP)
        </h1>
        <p className="text-slate-500 mt-1">Global feature importance explaining what drives the XGBoost model predictions.</p>
      </div>

      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm min-h-[500px] flex justify-center items-center">
        {loading ? (
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        ) : data.length > 0 ? (
          <div className="w-full h-[600px]">
             <ResponsiveContainer width="100%" height="100%">
               <BarChart data={data} layout="vertical" margin={{ top: 5, right: 30, left: 150, bottom: 5 }}>
                 <XAxis type="number" />
                 <YAxis dataKey="name" type="category" tick={{fontSize: 12}} />
                 <Tooltip />
                 <Bar dataKey="importance" fill="#3b82f6" radius={[0, 4, 4, 0]} />
               </BarChart>
             </ResponsiveContainer>
          </div>
        ) : (
          <p className="text-slate-500">No SHAP data available. Run model training first.</p>
        )}
      </div>
    </div>
  );
}
