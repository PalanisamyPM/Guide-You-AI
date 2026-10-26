import React, { useState } from 'react';
import {
  Kanban,
  Table as TableIcon,
  Search,
  Filter,
  Video,
  PlayCircle,
  ExternalLink,
  GitBranch,
  Calendar,
  User,
  Mail,
  CheckCircle2,
  Clock,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import { Project } from '../types.js';

interface ProjectsDashboardProps {
  projects: Project[];
  loading: boolean;
  onSelectProject: (projectId: string) => void;
  onNavigateToCockpit: (projectId: string) => void;
  onNavigateToFlowchart: (projectId: string) => void;
  onQuickUpload: () => void;
}

export const ProjectsDashboard: React.FC<ProjectsDashboardProps> = ({
  projects,
  loading,
  onSelectProject,
  onNavigateToCockpit,
  onNavigateToFlowchart,
  onQuickUpload,
}) => {
  const [viewMode, setViewMode] = useState<'kanban' | 'table'>('kanban');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const kanbanColumns: Array<{
    id: Project['status'];
    title: string;
    accent: string;
    badgeBg: string;
    badgeText: string;
  }> = [
    {
      id: 'Pending Module 1',
      title: 'Pending Module 1',
      accent: 'border-amber-500/40',
      badgeBg: 'bg-amber-500/10',
      badgeText: 'text-amber-400',
    },
    {
      id: 'Review Scheduled',
      title: 'Review Scheduled',
      accent: 'border-blue-500/40',
      badgeBg: 'bg-blue-500/10',
      badgeText: 'text-blue-400',
    },
    {
      id: 'In Review',
      title: 'In Session / Evaluating',
      accent: 'border-purple-500/40',
      badgeBg: 'bg-purple-500/10',
      badgeText: 'text-purple-400',
    },
    {
      id: 'Revision Needed',
      title: 'Revision Needed',
      accent: 'border-rose-500/40',
      badgeBg: 'bg-rose-500/10',
      badgeText: 'text-rose-400',
    },
    {
      id: 'Completed',
      title: 'Completed (100%)',
      accent: 'border-emerald-500/40',
      badgeBg: 'bg-emerald-500/10',
      badgeText: 'text-emerald-400',
    },
  ];

  const filteredProjects = projects.filter((p) => {
    const matchesSearch =
      p.project_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.user_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.user_email.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: Project['status']) => {
    switch (status) {
      case 'Completed':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            Completed
          </span>
        );
      case 'Review Scheduled':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-500/15 text-blue-400 border border-blue-500/30">
            Review Scheduled
          </span>
        );
      case 'In Review':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-purple-500/15 text-purple-400 border border-purple-500/30">
            In Review
          </span>
        );
      case 'Revision Needed':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-500/15 text-rose-400 border border-rose-500/30">
            Revision Needed
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30">
            Pending Module 1
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white flex items-center space-x-2">
            <span>All Projects Tracking Dashboard</span>
            <span className="text-xs font-mono font-medium px-2 py-0.5 rounded-md bg-slate-800 text-slate-400 border border-slate-700">
              {filteredProjects.length} Total
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Real-time pipeline monitoring, milestone progress tracking, and Google Meet evaluation links.
          </p>
        </div>

        {/* View Toggle & Controls */}
        <div className="flex items-center space-x-3">
          <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-1">
            <button
              onClick={() => setViewMode('kanban')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition ${
                viewMode === 'kanban'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Kanban className="w-3.5 h-3.5" />
              <span>Kanban</span>
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition ${
                viewMode === 'table'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <TableIcon className="w-3.5 h-3.5" />
              <span>Data Table</span>
            </button>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 rounded-xl bg-slate-900/60 border border-slate-800">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search candidate, project name, or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-4 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition"
          />
        </div>

        <div className="flex items-center space-x-2 overflow-x-auto scrollbar-none">
          <span className="text-xs text-slate-500 flex items-center space-x-1 pl-1">
            <Filter className="w-3 h-3" />
            <span>Status:</span>
          </span>
          {['all', 'Pending Module 1', 'Review Scheduled', 'In Review', 'Completed'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-2.5 py-1 rounded-md text-[11px] font-medium whitespace-nowrap transition ${
                statusFilter === st
                  ? 'bg-blue-600/20 text-blue-400 border border-blue-500/40 font-semibold'
                  : 'text-slate-400 hover:text-slate-200 bg-slate-950 border border-slate-800/80'
              }`}
            >
              {st === 'all' ? 'All Statuses' : st}
            </button>
          ))}
        </div>
      </div>

      {/* Empty State */}
      {filteredProjects.length === 0 && !loading && (
        <div className="p-12 text-center rounded-2xl bg-slate-900/40 border border-slate-800 space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-slate-800 flex items-center justify-center mx-auto text-slate-400">
            <Kanban className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-slate-200">No Projects Found</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto mt-1">
              {searchQuery
                ? `No projects matching "${searchQuery}". Try clearing search.`
                : 'Upload an Excel or CSV file with project submissions to trigger automated review schedules.'}
            </p>
          </div>
          <button
            onClick={onQuickUpload}
            className="inline-flex items-center space-x-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium shadow-md transition"
          >
            <span>Upload Spreadsheet</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* KANBAN BOARD VIEW */}
      {viewMode === 'kanban' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-start">
          {kanbanColumns.map((col) => {
            const colProjects = filteredProjects.filter((p) => p.status === col.id);
            return (
              <div
                key={col.id}
                className="flex flex-col rounded-xl bg-slate-900/50 border border-slate-800/80 min-h-[500px] overflow-hidden"
              >
                {/* Column Header */}
                <div className={`p-3 border-b border-slate-800 flex items-center justify-between bg-slate-950/40`}>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-bold text-slate-200">{col.title}</span>
                  </div>
                  <span
                    className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${col.badgeBg} ${col.badgeText}`}
                  >
                    {colProjects.length}
                  </span>
                </div>

                {/* Column Cards */}
                <div className="p-3 space-y-3 flex-1 overflow-y-auto max-h-[750px] scrollbar-thin">
                  {colProjects.map((p) => (
                    <div
                      key={p.id}
                      className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition shadow-sm space-y-3 group"
                    >
                      {/* Candidate info */}
                      <div className="flex items-start justify-between">
                        <div className="space-y-0.5">
                          <span className="text-xs font-semibold text-slate-200 flex items-center space-x-1">
                            <User className="w-3 h-3 text-slate-400" />
                            <span>{p.user_name}</span>
                          </span>
                          <span className="text-[11px] text-slate-400 block truncate max-w-[180px]">
                            {p.user_email}
                          </span>
                        </div>
                        <span className="text-[10px] font-mono text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded">
                          R{p.current_round || 1}
                        </span>
                      </div>

                      {/* Project Title */}
                      <h4
                        onClick={() => onSelectProject(p.id)}
                        className="text-xs font-bold text-slate-100 hover:text-blue-400 cursor-pointer line-clamp-2 transition leading-snug"
                        title={p.project_name}
                      >
                        {p.project_name}
                      </h4>

                      {/* Progress bar */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-[10px] text-slate-400">
                          <span>Completion</span>
                          <span className="font-mono font-bold text-slate-200">
                            {p.completion_percentage}%
                          </span>
                        </div>
                        <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${
                              p.completion_percentage === 100
                                ? 'bg-emerald-500'
                                : p.completion_percentage > 50
                                ? 'bg-blue-500'
                                : 'bg-amber-500'
                            }`}
                            style={{ width: `${p.completion_percentage}%` }}
                          />
                        </div>
                      </div>

                      {/* Scheduled Review date & Meet */}
                      {p.next_review_date && (
                        <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800 space-y-1.5 text-[11px]">
                          <div className="flex items-center justify-between text-slate-400">
                            <span className="flex items-center space-x-1">
                              <Calendar className="w-3 h-3 text-blue-400" />
                              <span>Slot:</span>
                            </span>
                            <span className="font-mono text-amber-300 font-semibold text-[10px] bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                              {new Date(p.next_review_date).toLocaleDateString(undefined, {
                                weekday: 'short',
                                month: 'short',
                                day: 'numeric',
                              })}{' '}
                              •{' '}
                              {new Date(p.next_review_date).toLocaleTimeString(undefined, {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>

                          {p.next_meet_link && (
                            <div className="flex items-center justify-between pt-1 border-t border-slate-800/60">
                              <button
                                onClick={() => onNavigateToCockpit(p.id)}
                                className="inline-flex items-center space-x-1 text-purple-400 hover:text-purple-300 text-[10px] font-semibold"
                                title="Launch AI Google Meet Room with Dr. Gemini"
                              >
                                <Sparkles className="w-3 h-3 text-purple-400 animate-pulse" />
                                <span>Join with AI</span>
                              </button>
                              
                              <a
                                href={p.next_meet_link}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center space-x-1 text-slate-400 hover:text-slate-200 text-[10px]"
                                title="Open in external Google Meet"
                              >
                                <ExternalLink className="w-2.5 h-2.5" />
                                <span>Meet Link</span>
                              </a>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Card Action Buttons */}
                      <div className="flex items-center space-x-1.5 pt-1">
                        <button
                          onClick={() => onNavigateToCockpit(p.id)}
                          className="flex-1 py-1 px-2 rounded-md bg-blue-600/15 hover:bg-blue-600/25 text-blue-300 border border-blue-500/30 text-[11px] font-medium flex items-center justify-center space-x-1 transition"
                        >
                          <PlayCircle className="w-3 h-3" />
                          <span>Review Day</span>
                        </button>
                        <button
                          onClick={() => onNavigateToFlowchart(p.id)}
                          title="View AI Roadmap Flowchart"
                          className="py-1 px-2 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-medium transition"
                        >
                          <GitBranch className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}

                  {colProjects.length === 0 && (
                    <div className="p-6 text-center text-slate-500 text-xs italic">
                      No projects
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* DATA TABLE VIEW */}
      {viewMode === 'table' && (
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4">Candidate / Email</th>
                  <th className="py-3 px-4">Project Title</th>
                  <th className="py-3 px-4">State</th>
                  <th className="py-3 px-4">Progress</th>
                  <th className="py-3 px-4">Round</th>
                  <th className="py-3 px-4">Scheduled Review</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-300">
                {filteredProjects.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-100">{p.user_name}</div>
                      <div className="text-[11px] text-slate-400 font-mono">{p.user_email}</div>
                    </td>
                    <td className="py-3 px-4 max-w-xs">
                      <div
                        onClick={() => onSelectProject(p.id)}
                        className="font-medium text-slate-200 hover:text-blue-400 cursor-pointer line-clamp-1"
                        title={p.project_name}
                      >
                        {p.project_name}
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        Uploaded: {p.upload_date}
                      </div>
                    </td>
                    <td className="py-3 px-4">{getStatusBadge(p.status)}</td>
                    <td className="py-3 px-4 w-36">
                      <div className="flex items-center space-x-2">
                        <div className="w-20 bg-slate-800 h-2 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              p.completion_percentage === 100
                                ? 'bg-emerald-500'
                                : p.completion_percentage > 50
                                ? 'bg-blue-500'
                                : 'bg-amber-500'
                            }`}
                            style={{ width: `${p.completion_percentage}%` }}
                          />
                        </div>
                        <span className="font-mono text-[11px] font-bold text-slate-200">
                          {p.completion_percentage}%
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-slate-300">
                      R{p.current_round || 1}
                    </td>
                    <td className="py-3 px-4">
                      {p.next_review_date ? (
                        <div className="space-y-1">
                          <div className="text-slate-200 font-medium">
                            {new Date(p.next_review_date).toLocaleDateString(undefined, {
                              weekday: 'short',
                              month: 'short',
                              day: 'numeric',
                            })}
                          </div>
                          <div className="text-[11px] font-mono font-semibold text-amber-300">
                            {new Date(p.next_review_date).toLocaleTimeString(undefined, {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </div>
                          <div className="flex items-center space-x-2 pt-0.5">
                            <button
                              onClick={() => onNavigateToCockpit(p.id)}
                              className="text-[10px] font-semibold text-purple-400 hover:text-purple-300 flex items-center space-x-1"
                              title="Join AI-powered Google Meet evaluation"
                            >
                              <Sparkles className="w-3 h-3 text-purple-400" />
                              <span>Join with AI</span>
                            </button>
                            {p.next_meet_link && (
                              <a
                                href={p.next_meet_link}
                                target="_blank"
                                rel="noreferrer"
                                className="text-[10px] text-slate-400 hover:text-slate-300 flex items-center space-x-0.5"
                                title="Open in Google Meet tab"
                              >
                                <ExternalLink className="w-2.5 h-2.5" />
                                <span>Tab</span>
                              </a>
                            )}
                          </div>
                        </div>
                      ) : (
                        <span className="text-slate-500 italic">None</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => onNavigateToCockpit(p.id)}
                          className="px-2.5 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-medium transition"
                        >
                          Review
                        </button>
                        <button
                          onClick={() => onNavigateToFlowchart(p.id)}
                          className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-medium transition"
                        >
                          Roadmap
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
