import React, { useState, useRef } from 'react';
import {
  UploadCloud,
  FileSpreadsheet,
  Download,
  CheckCircle,
  AlertCircle,
  Sparkles,
  ArrowRight,
  Video,
  Mail,
  Loader2,
  Table,
} from 'lucide-react';
import { Project } from '../types.js';

interface ExcelUploaderProps {
  onUploadSuccess: () => void;
  onNavigateToCockpit: (projectId: string) => void;
  onNavigateToFlowchart: (projectId: string) => void;
  onQuickSeed: () => void;
  isSeeding: boolean;
}

export const ExcelUploader: React.FC<ExcelUploaderProps> = ({
  onUploadSuccess,
  onNavigateToCockpit,
  onNavigateToFlowchart,
  onQuickSeed,
  isSeeding,
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStep, setUploadStep] = useState<string>('');
  const [uploadResults, setUploadResults] = useState<any[] | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const sampleColumns = [
    { name: 'User Name', example: 'Alex Rivera', note: 'Student / Candidate name' },
    { name: 'Email ID', example: 'alex.rivera@example.com', note: 'Email for automated notifications' },
    { name: 'Project Name', example: 'Autonomous Drone Delivery Fleet Coordinator', note: 'Input for Gemini AI module generation' },
    { name: 'Date of Upload', example: '2026-10-26', note: 'Submission timestamp' },
  ];

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelected(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelected(e.target.files[0]);
    }
  };

  const handleFileSelected = (file: File) => {
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext !== 'xlsx' && ext !== 'xls' && ext !== 'csv') {
      setErrorMsg('Please upload a valid Excel (.xlsx, .xls) or CSV file.');
      setSelectedFile(null);
      return;
    }
    setErrorMsg(null);
    setSelectedFile(file);
  };

  const handleUploadSubmit = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    setErrorMsg(null);
    setUploadResults(null);

    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      setUploadStep('Parsing Excel rows and validating column schemas...');
      await new Promise((r) => setTimeout(r, 600));

      setUploadStep('Ingesting records into SQLite database...');
      await new Promise((r) => setTimeout(r, 500));

      setUploadStep('Prompting Gemini 3.8 Flash for project module breakdowns & flowcharts...');

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to process sheet');
      }

      setUploadStep('Generating Google Meet links and sending milestone email briefs...');
      await new Promise((r) => setTimeout(r, 500));

      const result = await response.json();
      setUploadResults(result.projects || []);
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      onUploadSuccess();
    } catch (err: any) {
      console.error('Upload error:', err);
      setErrorMsg(err.message || 'An error occurred during sheet processing.');
    } finally {
      setIsUploading(false);
      setUploadStep('');
    }
  };

  const handleDownloadTemplate = () => {
    window.location.href = '/api/template/download';
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white flex items-center space-x-2">
            <FileSpreadsheet className="w-6 h-6 text-blue-400" />
            <span>Data Ingestion & Excel Automation</span>
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Upload student project cohorts via Excel/CSV. Guide You AI automatically generates modules, creates Google Meet rooms, and sends kickoff emails.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={handleDownloadTemplate}
            className="inline-flex items-center space-x-2 px-3.5 py-2 rounded-lg text-xs font-medium bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 transition"
          >
            <Download className="w-4 h-4 text-blue-400" />
            <span>Download .xlsx Template</span>
          </button>

          <button
            onClick={onQuickSeed}
            disabled={isSeeding}
            className="inline-flex items-center space-x-2 px-3.5 py-2 rounded-lg text-xs font-medium bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-md shadow-blue-500/20 transition disabled:opacity-50"
          >
            <Sparkles className="w-4 h-4" />
            <span>{isSeeding ? 'Seeding...' : 'Seed Sample Cohort'}</span>
          </button>
        </div>
      </div>

      {/* Grid: Upload Dropzone + Required Schema */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Dropzone */}
        <div className="lg:col-span-7 space-y-4">
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all duration-200 flex flex-col items-center justify-center min-h-[260px] ${
              dragActive
                ? 'border-blue-500 bg-blue-500/10 scale-[1.01]'
                : selectedFile
                ? 'border-emerald-500/50 bg-emerald-500/5'
                : 'border-slate-800 hover:border-slate-700 bg-slate-900/40 hover:bg-slate-900/80'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileChange}
              className="hidden"
            />

            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600/20 to-purple-600/20 border border-blue-500/20 flex items-center justify-center mb-4 text-blue-400">
              <UploadCloud className="w-7 h-7" />
            </div>

            {selectedFile ? (
              <div className="space-y-1">
                <p className="font-semibold text-slate-100 text-sm flex items-center justify-center space-x-1.5">
                  <CheckCircle className="w-4 h-4 text-emerald-400" />
                  <span>{selectedFile.name}</span>
                </p>
                <p className="text-xs text-slate-400">
                  {(selectedFile.size / 1024).toFixed(1)} KB • Ready for automated AI ingestion
                </p>
                <span className="text-[11px] text-blue-400 underline block mt-2">
                  Click or drag another file to replace
                </span>
              </div>
            ) : (
              <div className="space-y-1.5">
                <p className="font-medium text-slate-200 text-sm">
                  Drag and drop your Excel or CSV sheet here
                </p>
                <p className="text-xs text-slate-400">
                  Supports <strong className="text-slate-300">.xlsx</strong>, <strong className="text-slate-300">.xls</strong>, or <strong className="text-slate-300">.csv</strong> (Max 10MB)
                </p>
                <span className="inline-block mt-3 px-3 py-1 text-xs font-medium rounded-lg bg-slate-800 text-slate-300 border border-slate-700">
                  Browse Files
                </span>
              </div>
            )}
          </div>

          {/* Action Button & Live Pipeline Steps */}
          {selectedFile && !isUploading && (
            <button
              onClick={handleUploadSubmit}
              className="w-full flex items-center justify-center space-x-2 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium text-sm shadow-lg shadow-blue-500/20 transition active:scale-[0.99]"
            >
              <Sparkles className="w-4 h-4 text-blue-200" />
              <span>Launch AI Processing Pipeline for {selectedFile.name}</span>
            </button>
          )}

          {isUploading && (
            <div className="p-4 rounded-xl bg-slate-900 border border-blue-500/30 space-y-3">
              <div className="flex items-center space-x-3 text-sm font-medium text-blue-400">
                <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
                <span>Autonomous AI Pipeline In Progress...</span>
              </div>
              <p className="text-xs text-slate-300 pl-7">{uploadStep}</p>
              <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                <div className="bg-gradient-to-r from-blue-500 to-indigo-500 h-full w-2/3 animate-pulse"></div>
              </div>
            </div>
          )}

          {errorMsg && (
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start space-x-3 text-rose-400 text-sm">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Upload failed</p>
                <p className="text-xs text-rose-300 mt-0.5">{errorMsg}</p>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Required Schema & Info */}
        <div className="lg:col-span-5 space-y-4">
          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-200 flex items-center space-x-2">
                <Table className="w-4 h-4 text-blue-400" />
                <span>Expected Sheet Format</span>
              </h3>
              <span className="text-[11px] font-mono text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
                4 Required Columns
              </span>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Ensure your spreadsheet has the exact headers shown below. Case-insensitive header matching is supported.
            </p>

            <div className="space-y-2">
              {sampleColumns.map((col, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-lg bg-slate-950/80 border border-slate-800/80 flex flex-col space-y-1 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-200 font-mono">{col.name}</span>
                    <span className="text-[10px] text-slate-500">Column {idx + 1}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-[11px] text-slate-400">Example:</span>
                    <code className="text-[11px] text-indigo-400 font-mono bg-indigo-950/40 px-1.5 py-0.5 rounded">
                      {col.example}
                    </code>
                  </div>
                  <p className="text-[11px] text-slate-500">{col.note}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Ingestion Results Banner */}
      {uploadResults && uploadResults.length > 0 && (
        <div className="p-6 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-950 border border-emerald-500/30 space-y-4 shadow-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <CheckCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-white">
                  Successfully Ingested {uploadResults.length} Project(s)
                </h3>
                <p className="text-xs text-slate-400">
                  AI modules created • Google Meet rooms configured • Kickoff briefs sent
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
            {uploadResults.map((res, i) => (
              <div
                key={i}
                className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-col justify-between space-y-3"
              >
                <div>
                  <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                    <span className="font-medium text-slate-300">{res.userName}</span>
                    <span className="font-mono text-emerald-400">{res.modulesCount} Modules</span>
                  </div>
                  <h4 className="font-semibold text-sm text-slate-100 line-clamp-2">
                    {res.projectName}
                  </h4>
                  <p className="text-xs text-slate-500 mt-1 truncate">{res.email}</p>
                </div>

                <div className="pt-2 border-t border-slate-800/80 space-y-2">
                  <div className="flex items-center space-x-1.5 text-xs text-blue-400">
                    <Video className="w-3.5 h-3.5" />
                    <a
                      href={res.meetLink}
                      target="_blank"
                      rel="noreferrer"
                      className="underline truncate text-[11px]"
                    >
                      {res.meetLink}
                    </a>
                  </div>

                  <div className="flex items-center space-x-2 pt-1">
                    <button
                      onClick={() => onNavigateToCockpit(res.projectId)}
                      className="flex-1 py-1.5 px-2.5 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 text-xs font-medium flex items-center justify-center space-x-1 transition"
                    >
                      <span>Review Cockpit</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => onNavigateToFlowchart(res.projectId)}
                      className="py-1.5 px-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition"
                    >
                      Roadmap
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
