import React, { useState } from 'react';
import {
  Database,
  GitBranch,
  Layers,
  Server,
  FileSpreadsheet,
  Cpu,
  Mail,
  Video,
  RefreshCw,
  Code2,
  Copy,
  Check,
} from 'lucide-react';

export const ArchitectureDocs: React.FC = () => {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const schemaTables = [
    {
      name: 'users',
      purpose: 'Stores candidate/developer accounts associated with project submissions',
      columns: [
        { name: 'id', type: 'TEXT PRIMARY KEY', desc: 'Unique user identifier (e.g. usr_123)' },
        { name: 'name', type: 'TEXT NOT NULL', desc: 'Developer or student name from spreadsheet' },
        { name: 'email', type: 'TEXT UNIQUE NOT NULL', desc: 'Email address for automated briefs' },
        { name: 'role', type: 'TEXT NOT NULL DEFAULT "student"', desc: 'Role permissions (student, reviewer)' },
        { name: 'created_at', type: 'TEXT NOT NULL', desc: 'ISO 8601 creation timestamp' },
      ],
    },
    {
      name: 'projects',
      purpose: 'Central project entities tracking state, completion percentage, tech stack & AI summary',
      columns: [
        { name: 'id', type: 'TEXT PRIMARY KEY', desc: 'Unique project identifier (e.g. prj_123)' },
        { name: 'user_id', type: 'TEXT NOT NULL REFERENCES users(id)', desc: 'Foreign key to users table' },
        { name: 'project_name', type: 'TEXT NOT NULL', desc: 'Title ingested from spreadsheet' },
        { name: 'upload_date', type: 'TEXT NOT NULL', desc: 'Submission date from spreadsheet' },
        { name: 'status', type: 'TEXT NOT NULL', desc: 'Pending Module 1 | Review Scheduled | In Review | Completed' },
        { name: 'completion_percentage', type: 'INTEGER NOT NULL DEFAULT 0', desc: '0% to 100% evaluated progress' },
        { name: 'summary', type: 'TEXT', desc: 'Gemini-generated architectural executive overview' },
        { name: 'tech_stack', type: 'TEXT (JSON)', desc: 'JSON array of recommended technologies' },
        { name: 'flowchart_json', type: 'TEXT (JSON)', desc: 'JSON graph nodes and edges for roadmap' },
        { name: 'created_at', type: 'TEXT NOT NULL', desc: 'Creation timestamp' },
        { name: 'updated_at', type: 'TEXT NOT NULL', desc: 'Last modification timestamp' },
      ],
    },
    {
      name: 'modules',
      purpose: 'Actionable sequential development milestones with evaluation criteria and checklist',
      columns: [
        { name: 'id', type: 'TEXT PRIMARY KEY', desc: 'Unique module identifier (e.g. mod_123)' },
        { name: 'project_id', type: 'TEXT NOT NULL REFERENCES projects(id)', desc: 'Foreign key to projects table' },
        { name: 'module_number', type: 'INTEGER NOT NULL', desc: 'Sequence number (1, 2, 3, 4...)' },
        { name: 'title', type: 'TEXT NOT NULL', desc: 'Module title (e.g. Architecture & Auth Pipeline)' },
        { name: 'description', type: 'TEXT NOT NULL', desc: 'Functional scope and expectations' },
        { name: 'key_deliverables', type: 'TEXT (JSON)', desc: 'Checklist array of concrete deliverables' },
        { name: 'status', type: 'TEXT NOT NULL', desc: 'pending | in_progress | completed | revised' },
        { name: 'completed_at', type: 'TEXT', desc: 'Timestamp when marked complete in review' },
      ],
    },
    {
      name: 'reviews',
      purpose: 'Milestone evaluation rounds, Google Meet sessions, and AI recursive feedback loops',
      columns: [
        { name: 'id', type: 'TEXT PRIMARY KEY', desc: 'Unique review round ID (e.g. rev_123)' },
        { name: 'project_id', type: 'TEXT NOT NULL REFERENCES projects(id)', desc: 'Foreign key to projects table' },
        { name: 'review_round', type: 'INTEGER NOT NULL', desc: 'Round index (1, 2, 3...)' },
        { name: 'scheduled_date', type: 'TEXT NOT NULL', desc: 'Calendar date for the Google Meet' },
        { name: 'google_meet_link', type: 'TEXT NOT NULL', desc: 'Auto-generated Google Meet URL' },
        { name: 'status', type: 'TEXT NOT NULL', desc: 'scheduled | in_session | completed | cancelled' },
        { name: 'admin_feedback', type: 'TEXT', desc: 'Evaluator notes input during the demo' },
        { name: 'ai_analysis', type: 'TEXT', desc: 'Gemini synthesis, code evaluation, and critique' },
        { name: 'next_steps', type: 'TEXT (JSON)', desc: 'Gemini-generated action items for next round' },
        { name: 'completed_at', type: 'TEXT', desc: 'Completion timestamp' },
        { name: 'created_at', type: 'TEXT NOT NULL', desc: 'Booking timestamp' },
      ],
    },
    {
      name: 'email_logs',
      purpose: 'Audit log of automated notification emails and calendar invites sent to candidates',
      columns: [
        { name: 'id', type: 'TEXT PRIMARY KEY', desc: 'Unique email dispatch ID' },
        { name: 'project_id', type: 'TEXT NOT NULL REFERENCES projects(id)', desc: 'Associated project' },
        { name: 'recipient_name', type: 'TEXT NOT NULL', desc: 'Recipient candidate name' },
        { name: 'recipient_email', type: 'TEXT NOT NULL', desc: 'Recipient email address' },
        { name: 'subject', type: 'TEXT NOT NULL', desc: 'Email subject line' },
        { name: 'body_html', type: 'TEXT NOT NULL', desc: 'Rendered responsive HTML email template' },
        { name: 'meet_link', type: 'TEXT NOT NULL', desc: 'Google Meet link provided in the email' },
        { name: 'review_round', type: 'INTEGER NOT NULL', desc: 'Current review round index' },
        { name: 'type', type: 'TEXT NOT NULL', desc: 'initial_breakdown | round_update | completion_congrats' },
        { name: 'sent_at', type: 'TEXT NOT NULL', desc: 'Dispatch timestamp' },
      ],
    },
  ];

  const sqlSchemaCode = `
-- Guide You AI: Core SQLite Relational Schema
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL DEFAULT 'student',
  created_at TEXT NOT NULL
);

CREATE TABLE projects (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  project_name TEXT NOT NULL,
  upload_date TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Pending Module 1',
  completion_percentage INTEGER NOT NULL DEFAULT 0,
  summary TEXT,
  tech_stack TEXT,
  flowchart_json TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE modules (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  module_number INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  key_deliverables TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  completed_at TEXT,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE TABLE reviews (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  review_round INTEGER NOT NULL,
  scheduled_date TEXT NOT NULL,
  google_meet_link TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled',
  admin_feedback TEXT,
  ai_analysis TEXT,
  next_steps TEXT,
  completed_at TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE TABLE email_logs (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  recipient_name TEXT NOT NULL,
  recipient_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  body_html TEXT NOT NULL,
  meet_link TEXT NOT NULL,
  review_round INTEGER NOT NULL DEFAULT 1,
  type TEXT NOT NULL,
  sent_at TEXT NOT NULL,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);
`;

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="pb-4 border-b border-slate-800">
        <h2 className="text-2xl font-bold tracking-tight text-white flex items-center space-x-2">
          <Database className="w-6 h-6 text-indigo-400" />
          <span>System Architecture & Database Schema</span>
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Detailed technical models, pipeline architecture, and recursive execution engine specifications.
        </p>
      </div>

      {/* PIPELINE ARCHITECTURE FLOW */}
      <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-6">
        <div className="flex items-center space-x-2 text-sm font-bold text-white">
          <Layers className="w-5 h-5 text-blue-400" />
          <span>End-to-End System Architecture Flow</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          {/* Step 1 */}
          <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
            <div className="w-7 h-7 rounded-lg bg-blue-500/10 text-blue-400 font-mono font-bold text-xs flex items-center justify-center">
              1
            </div>
            <h4 className="text-xs font-bold text-slate-200 flex items-center space-x-1.5">
              <FileSpreadsheet className="w-3.5 h-3.5 text-blue-400" />
              <span>Data Ingestion</span>
            </h4>
            <p className="text-[11px] text-slate-400">
              Admin uploads Excel/CSV. Express &amp; SheetJS parse records, validate 4 required columns, and upsert users &amp; projects into SQLite.
            </p>
          </div>

          {/* Step 2 */}
          <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
            <div className="w-7 h-7 rounded-lg bg-indigo-500/10 text-indigo-400 font-mono font-bold text-xs flex items-center justify-center">
              2
            </div>
            <h4 className="text-xs font-bold text-slate-200 flex items-center space-x-1.5">
              <Cpu className="w-3.5 h-3.5 text-indigo-400" />
              <span>Gemini Breakdown</span>
            </h4>
            <p className="text-[11px] text-slate-400">
              Gemini 3.8 Flash evaluates Project Name, formulating 4-5 sequential modules, deliverables checklist, and flowchart graph structure.
            </p>
          </div>

          {/* Step 3 */}
          <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
            <div className="w-7 h-7 rounded-lg bg-purple-500/10 text-purple-400 font-mono font-bold text-xs flex items-center justify-center">
              3
            </div>
            <h4 className="text-xs font-bold text-slate-200 flex items-center space-x-1.5">
              <Video className="w-3.5 h-3.5 text-purple-400" />
              <span>Meet &amp; Comms</span>
            </h4>
            <p className="text-[11px] text-slate-400">
              Auto-generates Google Meet room, calculates Round 1 deadline, and dispatches rich HTML notification email to candidate.
            </p>
          </div>

          {/* Step 4 */}
          <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
            <div className="w-7 h-7 rounded-lg bg-pink-500/10 text-pink-400 font-mono font-bold text-xs flex items-center justify-center">
              4
            </div>
            <h4 className="text-xs font-bold text-slate-200 flex items-center space-x-1.5">
              <Server className="w-3.5 h-3.5 text-pink-400" />
              <span>Review Cockpit</span>
            </h4>
            <p className="text-[11px] text-slate-400">
              Live review session via Google Meet. Admin evaluates demo, checks off completed modules, and logs qualitative notes.
            </p>
          </div>

          {/* Step 5 */}
          <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-400 font-mono font-bold text-xs flex items-center justify-center">
              5
            </div>
            <h4 className="text-xs font-bold text-slate-200 flex items-center space-x-1.5">
              <RefreshCw className="w-3.5 h-3.5 text-emerald-400" />
              <span>Recursive Loop</span>
            </h4>
            <p className="text-[11px] text-slate-400">
              Gemini evaluates state. If pending modules remain, auto-schedules Round N+1, generates new Meet room, and iterates until 100% completion.
            </p>
          </div>
        </div>
      </div>

      {/* DATABASE SCHEMA MODELS (Deliverable 1) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-white flex items-center space-x-2">
            <Database className="w-5 h-5 text-indigo-400" />
            <span>SQLite Data Models (Users, Projects, Modules, Reviews, EmailLogs)</span>
          </h3>

          <button
            onClick={() => handleCopy(sqlSchemaCode, 'sql_schema')}
            className="flex items-center space-x-1.5 text-xs text-slate-300 hover:text-white px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 transition"
          >
            {copiedId === 'sql_schema' ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400">Copied SQL</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy DDL SQL</span>
              </>
            )}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {schemaTables.map((tbl) => (
            <div
              key={tbl.name}
              className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col justify-between space-y-3"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-sm font-bold text-blue-400 bg-blue-500/10 px-2.5 py-0.5 rounded border border-blue-500/20">
                    table: {tbl.name}
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">
                    {tbl.columns.length} columns
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-2">{tbl.purpose}</p>
              </div>

              <div className="rounded-xl bg-slate-950/80 border border-slate-800/80 overflow-hidden text-xs">
                <table className="w-full text-left">
                  <thead className="bg-slate-900/60 border-b border-slate-800 text-[10px] uppercase font-mono text-slate-400">
                    <tr>
                      <th className="py-2 px-3">Column</th>
                      <th className="py-2 px-3">Type</th>
                      <th className="py-2 px-3">Description</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-[11px]">
                    {tbl.columns.map((c, i) => (
                      <tr key={i} className="hover:bg-slate-900/40 font-mono">
                        <td className="py-1.5 px-3 font-semibold text-slate-200">{c.name}</td>
                        <td className="py-1.5 px-3 text-purple-400">{c.type}</td>
                        <td className="py-1.5 px-3 font-sans text-slate-400 text-[10px]">
                          {c.desc}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
