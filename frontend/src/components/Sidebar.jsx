import React, { useState, useEffect } from 'react';
import { User, Briefcase, Code, Award, Save, Check } from 'lucide-react';

export default function Sidebar({ isOpen, onClose }) {
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [skills, setSkills] = useState('');
  const [projects, setProjects] = useState('');
  const [experience, setExperience] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    // Load existing profile from localStorage on mount
    const savedProfile = JSON.parse(localStorage.getItem('career_profile') || '{}');
    setName(savedProfile.name || '');
    setRole(savedProfile.role || '');
    setSkills(savedProfile.skills || '');
    setProjects(savedProfile.projects || '');
    setExperience(savedProfile.experience || '');
  }, []);

  const handleSave = () => {
    const profile = { name, role, skills, projects, experience };
    localStorage.setItem('career_profile', JSON.stringify(profile));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <aside className={`fixed inset-y-0 left-0 z-50 w-80 bg-slate-900 border-r border-slate-800 p-6 flex flex-col justify-between transition-transform duration-300 ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
      <div className="space-y-6 overflow-y-auto pr-1">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-indigo-400" /> Career Memory
          </h2>
          <button onClick={onClose} className="lg:hidden text-slate-400 hover:text-white">✕</button>
        </div>
        <p className="text-xs text-slate-400 leading-relaxed">
          Stored profile details are used to contextualize and personalize your technical posts and achievements.
        </p>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-indigo-400" /> Name (Optional)
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Aman Sharma"
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-slate-100 focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
              <Briefcase className="w-3.5 h-3.5 text-indigo-400" /> Current Role / Education
            </label>
            <input
              type="text"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              placeholder="CS Engineering (AI/ML) Student"
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-slate-100 focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
              <Code className="w-3.5 h-3.5 text-indigo-400" /> Technical Skills
            </label>
            <textarea
              rows={3}
              value={skills}
              onChange={(e) => setSkills(e.target.value)}
              placeholder="Python, LangGraph, React, FastAPI..."
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-slate-100 focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
              <Award className="w-3.5 h-3.5 text-indigo-400" /> Projects & Achievements
            </label>
            <textarea
              rows={3}
              value={projects}
              onChange={(e) => setProjects(e.target.value)}
              placeholder="Describe what you actually built..."
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-slate-100 focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>
      </div>

      <div className="pt-4 border-t border-slate-800">
        <button
          onClick={handleSave}
          className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-2.5 rounded-lg text-xs transition-all flex items-center justify-center gap-2 shadow-lg"
        >
          {saved ? <><Check className="w-4 h-4 text-emerald-300" /> Saved Successfully</> : <><Save className="w-4 h-4" /> Save Career Memory</>}
        </button>
      </div>
    </aside>
  );
}