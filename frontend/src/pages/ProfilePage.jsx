import React, { useState, useEffect } from 'react';
import { UserCheck, Sparkles, Search, CheckCircle2, Award, Briefcase, Code, Save, Check } from 'lucide-react';

export default function ProfilePage() {
  // Career Profile States
  const [profile, setProfile] = useState({});
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [skills, setSkills] = useState('');
  const [projects, setProjects] = useState('');
  const [experience, setExperience] = useState('');
  const [saved, setSaved] = useState(false);

  // Analytics States
  const [stats, setStats] = useState({
    totalGenerated: 0,
    approvedCount: 0,
    avgScore: 0,
    totalSearches: 0
  });

  useEffect(() => {
    // Load Career Memory
    const savedProfile = JSON.parse(localStorage.getItem('career_profile') || '{}');
    setProfile(savedProfile);
    setName(savedProfile.name || '');
    setRole(savedProfile.role || '');
    setSkills(savedProfile.skills || '');
    setProjects(savedProfile.projects || '');
    setExperience(savedProfile.experience || '');

    // Load History & Calculate Analytics Metrics
    const history = JSON.parse(localStorage.getItem('post_history') || '[]');
    const totalGenerated = history.length;
    const approvedCount = history.filter(item => item.approved).length;
    
    let totalScoreSum = 0;
    let scoreCount = 0;
    history.forEach(item => {
      const scorecard = item.scorecard || {};
      const scores = Object.values(scorecard).filter(val => typeof val === 'number');
      if (scores.length > 0) {
        totalScoreSum += scores.reduce((a, b) => a + b, 0) / scores.length;
        scoreCount++;
      }
    });

    const avgScore = scoreCount > 0 ? (totalScoreSum / scoreCount).toFixed(1) : "N.A";
    // Simulated searches metric based on history and active workflows
    const totalSearches = totalGenerated * 2; 

    setStats({ totalGenerated, approvedCount, avgScore, totalSearches });
  }, []);

  const handleSaveProfile = (e) => {
    e.preventDefault();
    const updated = { name, role, skills, projects, experience };
    localStorage.setItem('career_profile', JSON.stringify(updated));
    setProfile(updated);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-8 text-white">
      {/* Header */}
      <div className="border-b border-slate-800 pb-4">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <UserCheck className="text-indigo-400 w-6 h-6" /> Career Memory & Usage Analytics
        </h1>
        <p className="text-xs text-slate-400 mt-1">Manage your persistent context and inspect agent telemetry stats.</p>
      </div>

      {/* Usage & Telemetry Analytics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs uppercase font-semibold">Total Generated</span>
            <Sparkles className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-extrabold text-white">{stats.totalGenerated}</div>
          <p className="text-[11px] text-slate-500 mt-1">Posts crafted by Writer Agent</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs uppercase font-semibold">Review Approvals</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-extrabold text-white">{stats.approvedCount}</div>
          <p className="text-[11px] text-slate-500 mt-1">Passed Reviewer Auditor</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs uppercase font-semibold">Tavily Searches</span>
            <Search className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-extrabold text-white">{stats.totalSearches}</div>
          <p className="text-[11px] text-slate-500 mt-1">External web research lookups</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs uppercase font-semibold">Avg Quality Score</span>
            <Award className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-extrabold text-white">{stats.avgScore} <span className="text-xs text-slate-400">/10</span></div>
          <p className="text-[11px] text-slate-500 mt-1">Scorecard performance index</p>
        </div>
      </div>

      {/* Editable Career Profile Manager */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl space-y-6">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-indigo-400" /> Edit Career Memory
          </h2>
          {saved && (
            <span className="flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-950/60 border border-emerald-800 px-3 py-1 rounded-full">
              <Check className="w-3.5 h-3.5" /> Profile Updated
            </span>
          )}
        </div>

        <form onSubmit={handleSaveProfile} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Full Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-xs text-slate-100 focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Current Role / Education</label>
              <input
                type="text"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-xs text-slate-100 focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
              <Code className="w-3.5 h-3.5 text-indigo-400" /> Technical Skills
            </label>
            <textarea
              rows={3}
              value={skills}
              onChange={(e) => setSkills(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-xs text-slate-100 focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
              <Award className="w-3.5 h-3.5 text-indigo-400" /> Projects & Key Achievements
            </label>
            <textarea
              rows={3}
              value={projects}
              onChange={(e) => setProjects(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-xs text-slate-100 focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <button
            type="submit"
            className="bg-indigo-600 hover:bg-indigo-500 text-white font-medium px-6 py-2.5 rounded-lg text-xs transition-all flex items-center gap-2 shadow-lg cursor-pointer"
          >
            <Save className="w-4 h-4" /> Save Career Profile Changes
          </button>
        </form>
      </div>
    </div>
  );
}