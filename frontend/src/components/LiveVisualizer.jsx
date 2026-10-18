import React from 'react';
import { CheckCircle2, Loader2, Circle } from 'lucide-react';

const STEPS = [
  "Writer Agent",
  "Tavily Research",
  "Draft Preview",
  "Reviewer & Claim Auditor",
  "Final Approval"
];

export default function LiveVisualizer({ activeNode, completedNodes }) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 text-white shadow-xl">
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <span>⚡</span> Live Agent Workflow Visualizer
      </h3>
      <div className="space-y-3">
        {STEPS.map((step, idx) => {
          const isCompleted = completedNodes.has(step);
          const isRunning = activeNode === step;

          return (
            <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-slate-800/50 border border-slate-700/50">
              <div className="flex items-center gap-3">
                {isCompleted ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                ) : isRunning ? (
                  <Loader2 className="w-5 h-5 text-indigo-400 animate-spin" />
                ) : (
                  <Circle className="w-5 h-5 text-slate-500" />
                )}
                <span className={`font-medium ${isRunning ? 'text-indigo-300' : isCompleted ? 'text-slate-200' : 'text-slate-500'}`}>
                  {step}
                </span>
              </div>
              <span className="text-xs px-2.5 py-1 rounded-full font-semibold">
                {isCompleted ? <span className="text-emerald-400 bg-emerald-950/60 border border-emerald-800/50 px-2 py-0.5 rounded">Completed</span> : 
                 isRunning ? <span className="text-indigo-400 bg-indigo-950/60 border border-indigo-800/50 px-2 py-0.5 rounded">Running...</span> : 
                 <span className="text-slate-500 bg-slate-800 px-2 py-0.5 rounded">Waiting</span>}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}