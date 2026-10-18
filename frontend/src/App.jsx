import React, { useState } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import HistoryPage from './pages/HistoryPage';
import ProfilePage from './pages/ProfilePage';
import { Sparkles, History, User, Menu } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState('create');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col lg:flex-row">
      {/* Sidebar Component */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main Container */}
      <div className="flex-1 lg:pl-80 flex flex-col min-h-screen">
        {/* Top Navbar */}
        <header className="h-16 bg-slate-900/80 backdrop-blur-md border-b border-slate-800 px-6 flex items-center justify-between sticky top-0 z-40">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-slate-300 hover:text-white">
              <Menu className="w-6 h-6" />
            </button>
            <span className="font-bold text-white text-base tracking-tight">VeritasAI · LinkedIn Content Copilot</span>
          </div>

          <nav className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('create')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors ${activeTab === 'create' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
            >
              <Sparkles className="w-4 h-4" /> Create Content
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors ${activeTab === 'history' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
            >
              <History className="w-4 h-4" /> Post History
            </button>
            <button
              onClick={() => setActiveTab('profile')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors ${activeTab === 'profile' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
            >
              <User className="w-4 h-4" /> Career Memory
            </button>
          </nav>
        </header>

        {/* Tab Viewport */}
        <main className="flex-1 pb-12">
          {activeTab === 'create' && <Dashboard />}
          {activeTab === 'history' && <HistoryPage />}
          {activeTab === 'profile' && <ProfilePage />}
        </main>
      </div>
    </div>
  );
}