import React, { useState, useEffect } from 'react';
import {
  GitBranch,
  CheckCircle2,
  Clock,
  Code,
  ArrowRight,
  Layers,
  Sparkles,
  ShieldCheck,
  Calendar,
  User,
} from 'lucide-react';
import { Project, Module } from '../types.js';

interface FlowchartViewerProps {
  projects: Project[];
  selectedProjectId: string | null;
  onSelectProject: (id: string) => void;
  onNavigateToCockpit: (projectId: string) => void;
}

export const FlowchartViewer: React.FC<FlowchartViewerProps> = ({
  projects,
  selectedProjectId,
  onSelectProject,
  onNavigateToCockpit,
}) => {
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeModuleIndex, setActiveModuleIndex] = useState<number>(0);

  useEffect(() => {
    if (!selectedProjectId && projects.length > 0) {
      onSelectProject(projects[0].id);
    }
  }, [selectedProjectId, projects]);

  useEffect(() => {
    if (!selectedProjectId) return;
    setLoading(true);

    fetch(`/api/projects/${selectedProjectId}`)
      .then((res) => res.json())
      .then((data: Project) => {
        setActiveProject(data);
        setActiveModuleIndex(0);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error fetching project flowchart:', err);
        setLoading(false);
      });
  }, [selectedProjectId]);

  const modules = activeProject?.modules || [];
  const activeModule = modules[activeModuleIndex] || modules[0];

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header & Project Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white flex items-center space-x-2">
            <GitBranch className="w-6 h-6 text-blue-400" />
            <span>AI Module Roadmap & Flowchart</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Gemini 3.8 Flash automated milestone breakdown, architecture gates, and dependency pipeline.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-xs text-slate-400 font-medium">Project:</span>
          <select
            value={selectedProjectId || ''}
            onChange={(e) => onSelectProject(e.target.value)}
            className="bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:border-blue-500 max-w-xs truncate"
          >
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.user_name} - {p.project_name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {activeProject && (
        <div className="space-y-6">
          {/* Project Summary Banner */}
          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
              <div>
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
                  AI Engineering Architecture
                </span>
                <h3 className="text-lg font-bold text-white mt-1">{activeProject.project_name}</h3>
                <p className="text-xs text-slate-400 mt-1">{activeProject.summary}</p>
              </div>

              <button
                onClick={() => onNavigateToCockpit(activeProject.id)}
                className="self-start md:self-auto px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md transition whitespace-nowrap"
              >
                Go to Review Cockpit
              </button>
            </div>

            {/* Tech Stack Chips */}
            {activeProject.tech_stack && activeProject.tech_stack.length > 0 && (
              <div className="flex items-center space-x-2 pt-2 border-t border-slate-800/80 flex-wrap gap-y-1">
                <span className="text-[11px] font-medium text-slate-500 flex items-center space-x-1">
                  <Code className="w-3.5 h-3.5" />
                  <span>Recommended Stack:</span>
                </span>
                {activeProject.tech_stack.map((tech, i) => (
                  <span
                    key={i}
                    className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-slate-700"
                  >
                    {tech}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* VISUAL FLOWCHART PIPELINE NODES */}
          <div className="p-6 rounded-2xl bg-slate-950 border border-slate-800 space-y-6 overflow-x-auto">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center space-x-1.5">
                <Layers className="w-4 h-4 text-blue-400" />
                <span>Development Pipeline Flowchart</span>
              </span>
              <span className="text-[11px] text-slate-500">
                Click any module node to inspect deliverables
              </span>
            </div>

            {/* Horizontal Node Graph with Connectors */}
            <div className="flex items-center min-w-[750px] py-4 px-2">
              {modules.map((m, idx) => {
                const isSelected = activeModuleIndex === idx;
                const isDone = m.status === 'completed';

                return (
                  <React.Fragment key={m.id}>
                    {/* Node Card */}
                    <div
                      onClick={() => setActiveModuleIndex(idx)}
                      className={`relative flex-1 p-4 rounded-xl cursor-pointer border transition-all duration-200 ${
                        isSelected
                          ? 'bg-blue-900/30 border-blue-500 shadow-lg shadow-blue-500/10 scale-105 z-10'
                          : isDone
                          ? 'bg-emerald-950/20 border-emerald-500/40 hover:border-emerald-400'
                          : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span
                          className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                            isDone
                              ? 'bg-emerald-500/20 text-emerald-300'
                              : isSelected
                              ? 'bg-blue-500/20 text-blue-300'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          Step {m.module_number}
                        </span>
                        {isDone ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <Clock className="w-4 h-4 text-slate-500" />
                        )}
                      </div>

                      <h4 className="text-xs font-bold text-white line-clamp-1 mb-1">{m.title}</h4>
                      <p className="text-[10px] text-slate-400 line-clamp-2">{m.description}</p>
                    </div>

                    {/* Edge Connector & Gate Indicator */}
                    {idx < modules.length - 1 && (
                      <div className="flex flex-col items-center px-2 flex-shrink-0">
                        <span className="text-[9px] font-mono text-slate-500 uppercase tracking-tighter mb-1">
                          Gate {idx + 1}
                        </span>
                        <div className="w-6 h-0.5 bg-gradient-to-r from-blue-500 to-indigo-500"></div>
                        <ArrowRight className="w-3.5 h-3.5 text-blue-400 -ml-1" />
                      </div>
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </div>

          {/* Module Deep-Dive Inspection Panel */}
          {activeModule && (
            <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center space-x-3">
                  <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 font-bold font-mono text-sm">
                    M{activeModule.module_number}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">{activeModule.title}</h4>
                    <p className="text-xs text-slate-400">{activeModule.description}</p>
                  </div>
                </div>

                <span
                  className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${
                    activeModule.status === 'completed'
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                      : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                  }`}
                >
                  {activeModule.status === 'completed' ? 'Verified Completed' : 'Pending Review'}
                </span>
              </div>

              {/* Deliverables Checklist */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                  Prescribed Technical Deliverables:
                </span>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {(activeModule.key_deliverables || []).map((deliv, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-start space-x-2.5 text-xs text-slate-300"
                    >
                      <ShieldCheck className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
                      <span>{deliv}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
