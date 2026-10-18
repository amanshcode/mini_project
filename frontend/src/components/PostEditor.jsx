import React, { useState } from 'react';
import { Download, CheckCircle } from 'lucide-react';
// import { useState } from 'react';
import { Copy, Check } from 'lucide-react';


export default function PostEditor({ result, requestText, tone, audience }) {
  const [draft, setDraft] = useState(result?.draft || "");
  const [saved, setSaved] = useState(false);
  const scorecard = result?.scorecard || {};
  const claims = result?.claim_checks || [];
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(draft);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  const wordCount = draft.trim() ? draft.trim().split(/\s+/).length : 0;
  const readTime = Math.ceil(wordCount / 200); // Average reading speed ~200 wpm

  const handleSaveToHistory = () => {
    if (!draft.trim()) {
      alert("The post is empty. Nothing was saved.");
      return;
    }

    // Load existing history from localStorage
    const existingHistory = JSON.parse(localStorage.getItem('post_history') || '[]');

    // Create new history record
    const newRecord = {
      id: Date.now().toString(),
      created_at: new Date().toISOString().replace('T', ' ').substring(0, 19),
      request: requestText || result?.request || "Custom LinkedIn Post",
      tone: tone || "Professional",
      audience: audience || "General LinkedIn audience",
      draft: draft,
      approved: result?.is_approved || false,
      scorecard: scorecard,
      claim_checks: claims,
    };

    // Prepend to history array and save back
    existingHistory.unshift(newRecord);
    localStorage.setItem('post_history', JSON.stringify(existingHistory));

    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="space-y-6">
      {/* Editor Box */}
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-semibold">✍️ Generated LinkedIn Draft</h3>
          <span className="text-xs px-2.5 py-1 rounded-full bg-slate-800 text-indigo-300 border border-slate-700 font-medium">
            🔄 Attempts: {result?.attempt || 1}
          </span>
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-bold ${result?.is_approved ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-amber-950 text-amber-400 border border-amber-800'}`}>
          {result?.is_approved ? "Approved by Reviewer" : "Needs Review"}
        </span>
      </div>
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 text-white shadow-xl">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">✍️ Generated LinkedIn Draft</h3>
          <span className={`px-3 py-1 rounded-full text-xs font-bold ${result?.is_approved ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-amber-950 text-amber-400 border border-amber-800'}`}>
            {result?.is_approved ? "Approved by Reviewer" : "Needs Review"}
          </span>
        </div>
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={8}
          className="w-full bg-slate-950 border border-slate-700 rounded-lg p-4 text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-sans text-sm leading-relaxed"
        />
        <div className="flex justify-between items-center text-xs text-slate-400 mt-2">
          <span>Words: <strong className="text-white">{wordCount}</strong></span>
          <span>Est. Read Time: <strong className="text-white">{readTime} min read</strong></span>
        </div>
        <div className="flex items-center gap-3 mt-4">
          <button
            onClick={handleSaveToHistory}
            className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg font-medium text-sm transition-colors cursor-pointer flex items-center gap-2 shadow-lg"
          >
            {saved ? <><CheckCircle className="w-4 h-4 text-emerald-300" /> Saved to History!</> : "Save Post to History"}
          </button>
          <a
            href={`data:text/plain;charset=utf-8,${encodeURIComponent(draft)}`}
            download="linkedin_post.txt"
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 px-4 py-2 rounded-lg font-medium text-sm transition-colors border border-slate-700"
          >
            <Download className="w-4 h-4" /> Export TXT
          </a>
          <button
            onClick={handleCopy}
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 px-4 py-2 rounded-lg font-medium text-sm transition-colors border border-slate-700 cursor-pointer"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            {copied ? "Copied to Clipboard!" : "Copy Post"}
          </button>
        </div>
      </div>

      {/* Quality Scorecard Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Object.entries({
          hook: "Hook Strength",
          clarity: "Clarity",
          audience_fit: "Audience Fit",
          authenticity: "Authenticity",
          readability: "Readability",
          structure: "Structure"
        }).map(([key, label]) => {
          const val = scorecard[key] || 0;
          return (
            <div key={key} className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-white">
              <div className="flex justify-between text-sm mb-1 text-slate-400">
                <span>{label}</span>
                <span className="font-bold text-indigo-400">{val}/10</span>
              </div>
              <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                <div className="bg-indigo-500 h-full rounded-full transition-all duration-500" style={{ width: `${(val / 10) * 100}%` }}></div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Claim Audits */}
      {claims.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 text-white">
          <h3 className="text-lg font-semibold mb-3">🔍 Claim Verification</h3>
          <div className="space-y-3">
            {claims.map((claim, idx) => (
              <div key={idx} className="p-3 bg-slate-800/50 border border-slate-700/50 rounded-lg">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-sm text-slate-200">{claim.claim}</span>
                  <span className={`text-xs px-2 py-0.5 rounded font-bold ${claim.status === 'SUPPORTED' ? 'bg-emerald-950 text-emerald-400' : 'bg-amber-950 text-amber-400'}`}>
                    {claim.status}
                  </span>
                </div>
                <p className="text-xs text-slate-400">{claim.explanation}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}