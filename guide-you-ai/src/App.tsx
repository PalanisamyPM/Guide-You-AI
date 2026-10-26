import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar.js';
import { ProjectsDashboard } from './components/ProjectsDashboard.js';
import { ExcelUploader } from './components/ExcelUploader.js';
import { ReviewCockpit } from './components/ReviewCockpit.js';
import { FlowchartViewer } from './components/FlowchartViewer.js';
import { CommunicationsHub } from './components/CommunicationsHub.js';
import { ArchitectureDocs } from './components/ArchitectureDocs.js';
import { Project, Stats } from './types.js';

export default function App() {
  const [activeTab, setActiveTab] = useState<string>('projects');
  const [projects, setProjects] = useState<Project[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSeeding, setIsSeeding] = useState(false);

  const fetchProjectsAndStats = async () => {
    try {
      const [projRes, statsRes] = await Promise.all([
        fetch('/api/projects'),
        fetch('/api/stats'),
      ]);

      if (projRes.ok) {
        const projData = await projRes.json();
        setProjects(projData || []);
        if (projData.length > 0 && !selectedProjectId) {
          setSelectedProjectId(projData[0].id);
        }
      }

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }
    } catch (err) {
      console.error('Failed to load initial data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjectsAndStats();
  }, []);

  const handleQuickSeed = async () => {
    setIsSeeding(true);
    try {
      const response = await fetch('/api/seed-sample', { method: 'POST' });
      if (response.ok) {
        await fetchProjectsAndStats();
        setActiveTab('projects');
      }
    } catch (err) {
      console.error('Seed error:', err);
    } finally {
      setIsSeeding(false);
    }
  };

  const handleNavigateToCockpit = (projectId: string) => {
    setSelectedProjectId(projectId);
    setActiveTab('review');
  };

  const handleNavigateToFlowchart = (projectId: string) => {
    setSelectedProjectId(projectId);
    setActiveTab('flowchart');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-blue-500/30 selection:text-blue-200">
      {/* Navigation Header */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        stats={stats}
        onQuickSeed={handleQuickSeed}
        isSeeding={isSeeding}
      />

      {/* Main Content Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'projects' && (
          <ProjectsDashboard
            projects={projects}
            loading={loading}
            onSelectProject={setSelectedProjectId}
            onNavigateToCockpit={handleNavigateToCockpit}
            onNavigateToFlowchart={handleNavigateToFlowchart}
            onQuickUpload={() => setActiveTab('upload')}
          />
        )}

        {activeTab === 'upload' && (
          <ExcelUploader
            onUploadSuccess={fetchProjectsAndStats}
            onNavigateToCockpit={handleNavigateToCockpit}
            onNavigateToFlowchart={handleNavigateToFlowchart}
            onQuickSeed={handleQuickSeed}
            isSeeding={isSeeding}
          />
        )}

        {activeTab === 'review' && (
          <ReviewCockpit
            projects={projects}
            selectedProjectId={selectedProjectId}
            onSelectProject={setSelectedProjectId}
            onRefreshData={fetchProjectsAndStats}
          />
        )}

        {activeTab === 'flowchart' && (
          <FlowchartViewer
            projects={projects}
            selectedProjectId={selectedProjectId}
            onSelectProject={setSelectedProjectId}
            onNavigateToCockpit={handleNavigateToCockpit}
          />
        )}

        {activeTab === 'comms' && <CommunicationsHub />}

        {activeTab === 'architecture' && <ArchitectureDocs />}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950/80 py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Guide You AI • Autonomous Review Schedule Automation System</span>
          </div>
          <div>
            Powered by Google Gemini 3.8 Flash • SQLite • Express &amp; React 19
          </div>
        </div>
      </footer>
    </div>
  );
}
