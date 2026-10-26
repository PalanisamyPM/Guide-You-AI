import React from 'react';
import {
  Compass,
  FileSpreadsheet,
  LayoutDashboard,
  Video,
  GitBranch,
  Mail,
  Database,
  Sparkles,
  Calendar,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import { Stats } from '../types.js';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  stats: Stats | null;
  onQuickSeed: () => void;
  isSeeding: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  stats,
  onQuickSeed,
  isSeeding,
}) => {
  const tabs = [
    { id: 'projects', label: 'All Projects', icon: LayoutDashboard },
    { id: 'upload', label: 'Excel Ingestion', icon: FileSpreadsheet },
    { id: 'review', label: 'Review Cockpit', icon: Video },
    { id: 'flowchart', label: 'AI Roadmap Flowchart', icon: GitBranch },
    { id: 'comms', label: 'Email & Meet Hub', icon: Mail },
    { id: 'architecture', label: 'Architecture & Schema', icon: Database },
  ];

  return (
    <header className="sticky top-0 z-40 bg-slate-950/90 backdrop-blur-md border-b border-slate-800 text-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setActiveTab('projects')}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Compass className="w-5 h-5 text-white animate-pulse" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
                  Guide You AI
                </span>
                <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  Automation
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">
                Automated Review Scheduling & AI Milestone Orchestration
              </p>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="hidden lg:flex items-center space-x-4 text-xs">
            <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300">
              <Sparkles className="w-3.5 h-3.5 text-blue-400" />
              <span>Projects:</span>
              <strong className="text-white font-mono">{stats?.totalProjects ?? 0}</strong>
            </div>

            <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              <span>Scheduled:</span>
              <strong className="text-white font-mono">{stats?.scheduledReviews ?? 0}</strong>
            </div>

            <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Completed:</span>
              <strong className="text-white font-mono">{stats?.completedProjects ?? 0}</strong>
            </div>
          </div>

          {/* Quick Demo Button */}
          <div className="flex items-center space-x-2">
            <button
              onClick={onQuickSeed}
              disabled={isSeeding}
              className="inline-flex items-center space-x-1.5 text-xs font-medium px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white shadow-md shadow-indigo-500/20 transition-all duration-200 active:scale-95 disabled:opacity-50"
              title="Populate 3 sample capstone projects with full AI breakdowns and reviews"
            >
              <Sparkles className={`w-3.5 h-3.5 ${isSeeding ? 'animate-spin' : ''}`} />
              <span>{isSeeding ? 'Generating AI...' : 'Seed Sample Cohort'}</span>
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex space-x-1 overflow-x-auto py-2 scrollbar-none border-t border-slate-800/60">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-colors duration-150 ${
                  isActive
                    ? 'bg-blue-600/15 text-blue-400 border border-blue-500/30 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-blue-400' : 'text-slate-500'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
};
