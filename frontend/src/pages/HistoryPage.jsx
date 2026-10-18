import React, { useState, useEffect } from 'react';
import { History, Download, Trash2, CheckCircle, Clock } from 'lucide-react';

export default function HistoryPage() {
  const [history, setHistory] = useState([]);

  useEffect(() => {
    const loadedHistory = JSON.parse(localStorage.getItem('post_history') || '[]');
    setHistory(loadedHistory);
  }, []);

  const handleClear = () => {
    if (window.confirm("Are you sure you want to clear all post history?")) {
      localStorage.removeItem('post_history');
      setHistory([]);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6 text-white">
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <History className="text-indigo-400 w-6 h-6" /> Post History
          </h1>
          <p className="text-xs text-slate-400 mt-1">Review, export, or manage your previously generated LinkedIn drafts.</p>
        </div>
        {history.length > 0 && (
          <button
            onClick={handleClear}
            className="flex items-center gap-1.5 text-xs bg-red-950/60 border border-red-800/50 text-red-400 px-3 py-2 rounded-lg hover:bg-red-900/50 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" /> Clear All
          </button>
        )}
      </div>

      {history.length === 0 ? (
        <div className="text-center py-16 bg-slate-900 border border-slate-800 rounded-xl p-8">
          <Clock className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-slate-300">No saved posts yet</h3>
          <p className="text-xs text-slate-500 mt-1">Generate content from the dashboard and click "Save to History".</p>
        </div>
      ) : (
        <div className="space-y-4">
          {history.map((item, idx) => (
            <div key={idx} className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3 shadow-md">
              <div className="flex justify-between items-start text-xs text-slate-400 border-b border-slate-800 pb-3">
                <div>
                  <span className="font-semibold text-slate-200 block text-sm mb-0.5">{item.request}</span>
                  <span>Tone: {item.tone} · Audience: {item.audience}</span>
                </div>
                <span className={`px-2 py-0.5 rounded font-bold ${item.approved ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-amber-950 text-amber-400 border border-amber-800'}`}>
                  {item.approved ? "Approved" : "Needs Review"}
                </span>
              </div>
              <textarea
                readOnly
                value={item.draft}
                rows={5}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-xs text-slate-100 font-sans"
              />
              <div className="flex justify-end gap-2">
                <a
                  href={`data:text/plain;charset=utf-8,${encodeURIComponent(item.draft)}`}
                  download={`linkedin_post_${idx + 1}.txt`}
                  className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-700 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" /> Download TXT
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}