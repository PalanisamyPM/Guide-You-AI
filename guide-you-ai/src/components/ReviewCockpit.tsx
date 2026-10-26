import React, { useState, useEffect } from 'react';
import {
  Video,
  CheckCircle,
  Clock,
  Sparkles,
  ArrowRight,
  ExternalLink,
  AlertCircle,
  FileText,
  User,
  Calendar,
  Send,
  Loader2,
  CheckSquare,
  Square,
  ChevronDown,
  ChevronRight,
  Award,
  RefreshCw,
  Edit3,
} from 'lucide-react';
import { Project, Module, Review } from '../types.js';
import { AiMeetingRoom } from './AiMeetingRoom.js';
import { RescheduleModal } from './RescheduleModal.js';

interface ReviewCockpitProps {
  projects: Project[];
  selectedProjectId: string | null;
  onSelectProject: (id: string) => void;
  onRefreshData: () => void;
}

export const ReviewCockpit: React.FC<ReviewCockpitProps> = ({
  projects,
  selectedProjectId,
  onSelectProject,
  onRefreshData,
}) => {
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const [loadingProject, setLoadingProject] = useState(false);
  const [completedModuleIds, setCompletedModuleIds] = useState<string[]>([]);
  const [adminFeedback, setAdminFeedback] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [evaluationResult, setEvaluationResult] = useState<any | null>(null);
  const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>({});
  const [isAiRoomOpen, setIsAiRoomOpen] = useState(false);
  const [isRescheduleOpen, setIsRescheduleOpen] = useState(false);

  // Pick first available project if none selected
  useEffect(() => {
    if (!selectedProjectId && projects.length > 0) {
      onSelectProject(projects[0].id);
    }
  }, [selectedProjectId, projects]);

  // Fetch full project details when selected
  useEffect(() => {
    if (!selectedProjectId) {
      setActiveProject(null);
      return;
    }

    let isMounted = true;
    setLoadingProject(true);
    setEvaluationResult(null);

    fetch(`/api/projects/${selectedProjectId}`)
      .then((res) => res.json())
      .then((data: Project) => {
        if (!isMounted) return;
        setActiveProject(data);
        // Pre-fill completed module IDs
        const preCompleted = (data.modules || [])
          .filter((m) => m.status === 'completed')
          .map((m) => m.id);
        setCompletedModuleIds(preCompleted);
        setLoadingProject(false);
      })
      .catch((err) => {
        console.error('Error fetching project:', err);
        if (isMounted) setLoadingProject(false);
      });

    return () => {
      isMounted = false;
    };
  }, [selectedProjectId]);

  const toggleModuleCompletion = (moduleId: string) => {
    setCompletedModuleIds((prev) =>
      prev.includes(moduleId) ? prev.filter((id) => id !== moduleId) : [...prev, moduleId]
    );
  };

  const toggleDeliverablesExpand = (moduleId: string) => {
    setExpandedModules((prev) => ({
      ...prev,
      [moduleId]: !prev[moduleId],
    }));
  };

  const handleReviewSubmission = async (overrideModuleIds?: string[], overrideNotes?: string) => {
    if (!activeProject) return;

    setIsSubmitting(true);
    setEvaluationResult(null);

    const modulesToSubmit = overrideModuleIds || completedModuleIds;
    const notesToSubmit = overrideNotes || adminFeedback || 'Milestone demo verified during Google Meet session.';

    try {
      const activeReview = (activeProject.reviews || []).find((r) => r.status === 'scheduled');
      const roundNumber = activeReview ? activeReview.review_round : (activeProject.current_round || 1);

      const response = await fetch(`/api/projects/${activeProject.id}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reviewId: activeReview?.id,
          completedModuleIds: modulesToSubmit,
          adminFeedback: notesToSubmit,
          reviewRound: roundNumber,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to record review evaluation');
      }

      const result = await response.json();
      setEvaluationResult(result);
      setAdminFeedback('');
      onRefreshData();

      // Refresh local active project
      const updatedRes = await fetch(`/api/projects/${activeProject.id}`);
      const updatedProject = await updatedRes.json();
      setActiveProject(updatedProject);
    } catch (err: any) {
      console.error('Review submission error:', err);
      alert('Review submission failed: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAiMeetingConcluded = (concludedModuleIds: string[], meetingMinutes: string) => {
    setIsAiRoomOpen(false);
    // Combine with current module IDs
    const merged = Array.from(new Set([...completedModuleIds, ...concludedModuleIds]));
    setCompletedModuleIds(merged);
    const notes = `[AI Meeting Session]: ${meetingMinutes}`;
    setAdminFeedback(notes);
    // Trigger submission
    handleReviewSubmission(merged, notes);
  };

  const scheduledReview = (activeProject?.reviews || []).find((r) => r.status === 'scheduled');
  const pastReviews = (activeProject?.reviews || []).filter((r) => r.status === 'completed');

  const formatMeetingDate = (dateStr?: string) => {
    if (!dateStr) return 'Not scheduled';
    const d = new Date(dateStr);
    return d.toLocaleString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Top Selector Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white flex items-center space-x-2">
            <Video className="w-6 h-6 text-purple-400" />
            <span>Interactive Review Cockpit</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Conduct live milestone evaluations via Google Meet, record module checks, and let Gemini recursively automate the next cycle.
          </p>
        </div>

        {/* Project Selector Dropdown */}
        <div className="flex items-center space-x-2">
          <span className="text-xs text-slate-400 font-medium">Select Project:</span>
          <select
            value={selectedProjectId || ''}
            onChange={(e) => onSelectProject(e.target.value)}
            className="bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:border-blue-500 max-w-xs truncate"
          >
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.user_name} - {p.project_name} ({p.completion_percentage}%)
              </option>
            ))}
          </select>
        </div>
      </div>

      {loadingProject && (
        <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center space-y-3">
          <Loader2 className="w-6 h-6 animate-spin text-blue-400" />
          <span className="text-xs">Loading project review state...</span>
        </div>
      )}

      {activeProject && !loadingProject && (
        <div className="space-y-6">
          {/* Active Review Banner with AI Google Meet Button */}
          <div className="p-5 rounded-2xl bg-gradient-to-r from-blue-900/40 via-purple-900/40 to-slate-900 border border-indigo-500/30 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl">
            <div className="space-y-1.5">
              <div className="flex items-center space-x-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  Round {scheduledReview?.review_round || activeProject.current_round || 1} Review Session
                </span>
                <span className="text-xs text-slate-400">
                  Progress: <strong className="text-white font-mono">{activeProject.completion_percentage}%</strong>
                </span>
              </div>
              <h3 className="text-lg font-bold text-white">{activeProject.project_name}</h3>
              <div className="flex items-center space-x-4 text-xs text-slate-300 flex-wrap gap-y-1">
                <span className="flex items-center space-x-1">
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  <strong>{activeProject.user_name}</strong>
                </span>
                <span className="text-slate-500">•</span>
                <span className="text-slate-400">{activeProject.user_email}</span>
                {scheduledReview?.scheduled_date && (
                  <>
                    <span className="text-slate-500">•</span>
                    <span className="flex items-center space-x-1.5 text-amber-300 font-mono bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{formatMeetingDate(scheduledReview.scheduled_date)}</span>
                    </span>
                    <button
                      onClick={() => setIsRescheduleOpen(true)}
                      className="text-xs text-blue-400 hover:text-blue-300 underline flex items-center space-x-1"
                    >
                      <Edit3 className="w-3 h-3" />
                      <span>Change Time</span>
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Google Meet Quick Actions: AI Interactive Room + External Meet */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              {scheduledReview ? (
                <>
                  <button
                    onClick={() => setIsAiRoomOpen(true)}
                    className="inline-flex items-center justify-center space-x-2 px-5 py-3 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-semibold text-xs shadow-lg shadow-purple-500/25 transition active:scale-95"
                  >
                    <Sparkles className="w-4 h-4 text-purple-200 animate-pulse" />
                    <span>Join with AI (Google Meet Room)</span>
                  </button>

                  <a
                    href={scheduledReview.google_meet_link}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center justify-center space-x-1.5 px-3 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 text-xs font-medium transition"
                    title="Open external meet.google.com link"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                    <span className="hidden lg:inline">Browser Tab</span>
                  </a>
                </>
              ) : (
                <div className="px-4 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-medium flex items-center space-x-2">
                  <Award className="w-4 h-4" />
                  <span>All Scheduled Reviews Completed!</span>
                </div>
              )}
            </div>
          </div>

          {/* Review Evaluation Workspace: Two-column layout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column (7 cols): Module Demo Checklist */}
            <div className="lg:col-span-7 space-y-4">
              <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-100 flex items-center space-x-2">
                    <CheckSquare className="w-4 h-4 text-blue-400" />
                    <span>Demo Checklist: Verify Completed Modules</span>
                  </h3>
                  <span className="text-[11px] font-mono text-slate-400">
                    {completedModuleIds.length} of {activeProject.modules?.length || 0} checked
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  During the Google Meet walkthrough, check off each module the developer has satisfactorily demonstrated.
                </p>

                {/* Modules list */}
                <div className="space-y-3">
                  {(activeProject.modules || []).map((mod) => {
                    const isChecked = completedModuleIds.includes(mod.id);
                    const isExpanded = !!expandedModules[mod.id];

                    return (
                      <div
                        key={mod.id}
                        className={`p-3.5 rounded-xl border transition-all ${
                          isChecked
                            ? 'bg-emerald-950/20 border-emerald-500/40'
                            : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-start space-x-3">
                          <button
                            type="button"
                            onClick={() => toggleModuleCompletion(mod.id)}
                            className="mt-0.5 text-slate-400 hover:text-white transition"
                          >
                            {isChecked ? (
                              <CheckCircle className="w-5 h-5 text-emerald-400" />
                            ) : (
                              <Square className="w-5 h-5 text-slate-600 hover:text-slate-400" />
                            )}
                          </button>

                          <div className="flex-1 space-y-1">
                            <div className="flex items-center justify-between">
                              <span
                                className={`text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                                  isChecked
                                    ? 'bg-emerald-500/20 text-emerald-300'
                                    : 'bg-slate-800 text-slate-400'
                                }`}
                              >
                                Module {mod.module_number}
                              </span>
                              <button
                                type="button"
                                onClick={() => toggleDeliverablesExpand(mod.id)}
                                className="text-[11px] text-slate-400 hover:text-slate-200 flex items-center space-x-0.5"
                              >
                                <span>{isExpanded ? 'Hide' : 'Deliverables'}</span>
                                {isExpanded ? (
                                  <ChevronDown className="w-3 h-3" />
                                ) : (
                                  <ChevronRight className="w-3 h-3" />
                                )}
                              </button>
                            </div>

                            <h4
                              onClick={() => toggleModuleCompletion(mod.id)}
                              className={`text-xs font-semibold cursor-pointer ${
                                isChecked ? 'text-emerald-200 line-through' : 'text-slate-200'
                              }`}
                            >
                              {mod.title}
                            </h4>
                            <p className="text-[11px] text-slate-400">{mod.description}</p>

                            {/* Expandable deliverables */}
                            {isExpanded && mod.key_deliverables && (
                              <div className="mt-2 pt-2 border-t border-slate-800/60 space-y-1">
                                <span className="text-[10px] font-semibold text-slate-300 uppercase tracking-wider block">
                                  Evaluation Criteria:
                                </span>
                                {mod.key_deliverables.map((d, i) => (
                                  <div
                                    key={i}
                                    className="text-[11px] text-slate-400 flex items-center space-x-1.5 pl-1"
                                  >
                                    <span className="w-1 h-1 rounded-full bg-blue-400"></span>
                                    <span>{d}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Right Column (5 cols): Reviewer Feedback & Gemini Execution */}
            <div className="lg:col-span-5 space-y-4">
              <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
                <h3 className="text-sm font-bold text-slate-100 flex items-center space-x-2">
                  <FileText className="w-4 h-4 text-purple-400" />
                  <span>Evaluator Notes & Observations</span>
                </h3>

                <p className="text-xs text-slate-400">
                  Input observations from the code demo. These will be analyzed by Gemini to generate tailored next steps and auto-schedule Round {((scheduledReview?.review_round || activeProject.current_round || 1) + 1)}.
                </p>

                <textarea
                  rows={4}
                  value={adminFeedback}
                  onChange={(e) => setAdminFeedback(e.target.value)}
                  placeholder="e.g., Candidate showed great architecture for the database and authentication module. Advised on adding unit tests and refactoring error handling before next week..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-purple-500 transition"
                />

                <button
                  type="button"
                  onClick={() => handleReviewSubmission()}
                  disabled={isSubmitting}
                  className="w-full flex items-center justify-center space-x-2 py-3 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-medium text-xs shadow-lg shadow-purple-500/20 transition active:scale-[0.99] disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-purple-200" />
                      <span>Gemini Analyzing Progress & Scheduling Next Round...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 text-purple-200" />
                      <span>Submit Evaluation & Run Recursive Iteration</span>
                    </>
                  )}
                </button>
              </div>

              {/* Recursive Automation Outcome Card */}
              {evaluationResult && (
                <div className="p-5 rounded-2xl bg-slate-900 border border-purple-500/40 space-y-3.5 shadow-xl animate-in fade-in duration-300">
                  <div className="flex items-center space-x-2 text-xs font-bold text-purple-300">
                    <Sparkles className="w-4 h-4 text-purple-400" />
                    <span>Gemini AI Review Evaluation</span>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed">
                    {evaluationResult.aiAnalysis?.overallEvaluation}
                  </p>

                  {/* Next Steps */}
                  {evaluationResult.aiAnalysis?.actionableNextSteps && (
                    <div className="space-y-1.5 pt-2 border-t border-slate-800">
                      <span className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider block">
                        Action Items for Candidate:
                      </span>
                      {evaluationResult.aiAnalysis.actionableNextSteps.map((step: string, i: number) => (
                        <div key={i} className="text-[11px] text-slate-400 flex items-start space-x-1.5">
                          <span className="text-purple-400 font-bold">•</span>
                          <span>{step}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Recursive Iteration Status */}
                  <div className="pt-2 border-t border-slate-800">
                    {evaluationResult.isFullyCompleted ? (
                      <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-medium flex items-center space-x-2">
                        <Award className="w-4 h-4" />
                        <span>All Modules Complete (100%)! Final sign-off email dispatched.</span>
                      </div>
                    ) : (
                      <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/30 space-y-1 text-xs">
                        <div className="flex items-center space-x-1.5 text-blue-300 font-semibold">
                          <RefreshCw className="w-3.5 h-3.5 text-blue-400" />
                          <span>Recursive Loop: Round {evaluationResult.nextReview?.reviewRound} Scheduled</span>
                        </div>
                        <p className="text-[11px] text-slate-400">
                          Date: {new Date(evaluationResult.nextReview?.scheduledDate).toLocaleDateString()} • New Google Meet room & updated brief emailed to candidate.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Historical Reviews Log */}
          {pastReviews.length > 0 && (
            <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
              <h3 className="text-sm font-bold text-slate-200 flex items-center space-x-2">
                <Clock className="w-4 h-4 text-blue-400" />
                <span>Completed Review Rounds History</span>
              </h3>

              <div className="space-y-3">
                {pastReviews.map((rev) => (
                  <div
                    key={rev.id}
                    className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-blue-400 font-mono">
                        Round {rev.review_round} Review
                      </span>
                      <span className="text-[11px] text-slate-500">
                        Completed {rev.completed_at ? new Date(rev.completed_at).toLocaleString() : ''}
                      </span>
                    </div>

                    {rev.admin_feedback && (
                      <div className="text-slate-300">
                        <strong className="text-slate-400 font-medium">Evaluator Notes: </strong>
                        <span>{rev.admin_feedback}</span>
                      </div>
                    )}

                    {rev.ai_analysis && (
                      <div className="text-slate-300 bg-slate-900/80 p-2.5 rounded-lg border border-slate-800/60">
                        <strong className="text-purple-400 font-medium flex items-center space-x-1 mb-1">
                          <Sparkles className="w-3 h-3" />
                          <span>Gemini Technical Synthesis:</span>
                        </strong>
                        <p className="text-[11px] text-slate-400">{rev.ai_analysis}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Render Interactive Google Meet AI Review Room Modal */}
          {isAiRoomOpen && scheduledReview && (
            <AiMeetingRoom
              project={activeProject}
              review={scheduledReview}
              onClose={() => setIsAiRoomOpen(false)}
              onConcludeAndSubmit={handleAiMeetingConcluded}
            />
          )}

          {/* Render Reschedule Modal */}
          {isRescheduleOpen && scheduledReview && (
            <RescheduleModal
              review={scheduledReview}
              projectName={activeProject.project_name}
              candidateName={activeProject.user_name}
              onClose={() => setIsRescheduleOpen(false)}
              onSuccess={(updatedDate) => {
                onRefreshData();
                fetch(`/api/projects/${activeProject.id}`)
                  .then((r) => r.json())
                  .then((up) => setActiveProject(up));
              }}
            />
          )}
        </div>
      )}
    </div>
  );
};
