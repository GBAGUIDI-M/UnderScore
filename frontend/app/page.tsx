"use client";
import { useState } from "react";
import axios from "axios";
import { CheckCircle2, PlayCircle, Loader2 } from "lucide-react";

export default function Dashboard() {
  const [isTraining, setIsTraining] = useState(false);
  const [trainStatus, setTrainStatus] = useState<string | null>(null);

  const handleTrain = async () => {
    setIsTraining(true);
    setTrainStatus(null);
    try {
      const res = await axios.post("http://161.35.74.143/train");
      setTrainStatus(res.data.message || "Model trained successfully!");
    } catch (e: any) {
      setTrainStatus("Error training model. Make sure data is accessible.");
    } finally {
      setIsTraining(false);
    }
  };

  return (
    <div className="max-w-6xl w-full mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Overview</h1>
        <p className="text-slate-500 mt-1">Welcome back. Here is the current status of the AI engine.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-slate-500">Pipeline Status</h3>
            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
          </div>
          <p className="text-2xl font-semibold mt-2 text-slate-900">Active</p>
          <p className="text-sm text-slate-500 mt-1">Ready for predictions</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 md:col-span-2">
          <h3 className="text-sm font-medium text-slate-500">Model Actions</h3>
          <div className="mt-4 flex items-center gap-4">
            <button 
              onClick={handleTrain}
              disabled={isTraining}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white px-5 py-2.5 rounded-lg font-medium transition-colors"
            >
              {isTraining ? <Loader2 className="w-5 h-5 animate-spin"/> : <PlayCircle className="w-5 h-5"/>}
              {isTraining ? "Training Engine..." : "Retrain XGBoost Model"}
            </button>
            {trainStatus && (
              <span className={`text-sm ${trainStatus.includes("Error") ? 'text-rose-500' : 'text-emerald-500'}`}>
                {trainStatus}
              </span>
            )}
          </div>
          <p className="text-sm text-slate-500 mt-4 leading-relaxed">
            Clicking this button will trigger the internal XGBoost ML Pipeline. It recompiles the Expect Goals (xG) statistics, optimizes hyperparameters with Optuna, and computes new SHAP analysis data.
          </p>
        </div>
      </div>
    </div>
  );
}
