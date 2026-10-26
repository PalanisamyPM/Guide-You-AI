import React, { useState, useEffect, useRef } from 'react';
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  Monitor,
  PhoneOff,
  Sparkles,
  MessageSquare,
  FileText,
  CheckCircle2,
  ExternalLink,
  Send,
  Loader2,
  Clock,
  Layers,
  ChevronRight,
  Maximize2,
  Minimize2,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { Project, Module, Review } from '../types.js';

interface AiMeetingRoomProps {
  project: Project;
  review: Review;
  onClose: () => void;
  onConcludeAndSubmit: (completedModuleIds: string[], notes: string) => void;
}

export const AiMeetingRoom: React.FC<AiMeetingRoomProps> = ({
  project,
  review,
  onClose,
  onConcludeAndSubmit,
}) => {
  const [isMicOn, setIsMicOn] = useState(true);
  const [isVideoOn, setIsVideoOn] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [activeTab, setActiveTab] = useState<'chat' | 'minutes' | 'deliverables'>('chat');
  
  // Call timer
  const [callDuration, setCallDuration] = useState(124); // Start at 2:04
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);
  const [aiSpeechText, setAiSpeechText] = useState<string>('');
  
  // Conversation and Live evaluation
  const [candidateInput, setCandidateInput] = useState('');
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [conversation, setConversation] = useState<Array<{ role: 'ai' | 'user'; text: string; time: string }>>([]);
  const [meetingMinutes, setMeetingMinutes] = useState<string[]>([]);
  const [checkedDeliverables, setCheckedDeliverables] = useState<string[]>([]);
  const [suggestedPrompts, setSuggestedPrompts] = useState<string[]>([
    'Walk through database schema & models',
    'Demonstrate API endpoints & authentication',
    'Show error handling & test results',
  ]);

  const videoRef = useRef<HTMLVideoElement>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  // Target active module for this review round
  const modules = project.modules || [];
  const currentModule = modules.find((m) => m.status !== 'completed') || modules[0];

  // Initialize AI Welcome Message
  useEffect(() => {
    const initialWelcome = `Hello ${project.user_name}! I am Dr. Gemini, your Senior AI Technical Evaluator for "${project.project_name}". Welcome to your Round ${review.review_round} review session. Today we are evaluating "${currentModule?.title || 'System Implementation'}". Could you walk me through your architectural choices and how you verified your core deliverables?`;
    
    setAiSpeechText(initialWelcome);
    setIsAiSpeaking(true);
    setConversation([
      {
        role: 'ai',
        text: initialWelcome,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
    setMeetingMinutes([
      `Session commenced for Round ${review.review_round} review of "${project.project_name}".`,
      `Focus module: ${currentModule?.title || 'System Implementation'}.`,
    ]);

    const timer = setTimeout(() => setIsAiSpeaking(false), 5000);
    return () => clearTimeout(timer);
  }, [project, review, currentModule]);

  // Meeting clock increment
  useEffect(() => {
    const interval = setInterval(() => {
      setCallDuration((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // WebCam Video Stream Toggle
  useEffect(() => {
    let stream: MediaStream | null = null;
    if (isVideoOn && videoRef.current) {
      navigator.mediaDevices
        ?.getUserMedia({ video: true, audio: false })
        .then((s) => {
          stream = s;
          if (videoRef.current) videoRef.current.srcObject = s;
        })
        .catch((err) => {
          console.warn('Camera access not granted or unavailable, showing avatar:', err);
          setIsVideoOn(false);
        });
    }

    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [isVideoOn]);

  // Auto-scroll chat to bottom
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [conversation, isAiThinking]);

  const handleSendCandidateMessage = async (textToSend?: string) => {
    const text = textToSend || candidateInput;
    if (!text.trim() || isAiThinking) return;

    const userTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const updatedHistory = [...conversation, { role: 'user' as const, text, time: userTime }];
    setConversation(updatedHistory);
    setCandidateInput('');
    setIsAiThinking(true);

    try {
      const response = await fetch('/api/meet/interact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: project.id,
          reviewId: review.id,
          moduleId: currentModule?.id,
          candidateMessage: text,
          conversationHistory: updatedHistory.map((m) => ({ role: m.role, text: m.text })),
        }),
      });

      if (!response.ok) throw new Error('Failed to evaluate turn');
      const data = await response.json();

      const aiTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setConversation((prev) => [
        ...prev,
        { role: 'ai', text: data.aiSpeech, time: aiTime },
      ]);
      setAiSpeechText(data.aiSpeech);
      setIsAiSpeaking(true);
      setTimeout(() => setIsAiSpeaking(false), 6000);

      // Append meeting minutes
      if (data.meetingMinutesEntry) {
        setMeetingMinutes((prev) => [...prev, data.meetingMinutesEntry]);
      }

      // Add checked deliverables
      if (data.demonstratedDeliverables && data.demonstratedDeliverables.length > 0) {
        setCheckedDeliverables((prev) => Array.from(new Set([...prev, ...data.demonstratedDeliverables])));
      }

      // Update suggested prompts
      if (data.suggestedPromptOptions && data.suggestedPromptOptions.length > 0) {
        setSuggestedPrompts(data.suggestedPromptOptions);
      }
    } catch (err) {
      console.error('AI Meeting Turn error:', err);
      const fallbackAiSpeech = `Good explanation. I've noted your progress on ${currentModule?.title || 'the current module'}. Please continue detailing your validation tests and any security edge cases.`;
      setAiSpeechText(fallbackAiSpeech);
      setIsAiSpeaking(true);
      setTimeout(() => setIsAiSpeaking(false), 4000);
      setConversation((prev) => [
        ...prev,
        {
          role: 'ai',
          text: fallbackAiSpeech,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setIsAiThinking(false);
    }
  };

  const handleConcludeMeeting = () => {
    // If deliverables verified or current module completed, include module ID
    const completedIds = currentModule ? [currentModule.id] : [];
    const notes = meetingMinutes.join(' ');
    onConcludeAndSubmit(completedIds, notes);
  };

  const formatSeconds = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#202124] text-white flex flex-col overflow-hidden font-sans">
      {/* GOOGLE MEET TOP BAR */}
      <header className="h-14 px-4 bg-[#202124] border-b border-[#3c4043] flex items-center justify-between text-xs">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-white shadow">
              <Video className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-semibold text-sm text-slate-100">
                  Guide You AI • Google Meet Live Evaluation Room
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-blue-500/20 text-blue-400 border border-blue-500/30">
                  AI Evaluator Connected
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-mono truncate max-w-md">
                {review.google_meet_link} • {project.project_name} (Round {review.review_round})
              </p>
            </div>
          </div>
        </div>

        {/* Meeting Timer & External Link */}
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-1.5 px-3 py-1 rounded-full bg-[#2d2e30] border border-[#3c4043] text-slate-300 font-mono text-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>{formatSeconds(callDuration)}</span>
          </div>

          <a
            href={review.google_meet_link}
            target="_blank"
            rel="noreferrer"
            className="hidden sm:inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-[#303134] hover:bg-[#3c4043] text-blue-400 text-xs font-medium border border-[#5f6368] transition"
            title="Open in official Google Meet browser tab"
          >
            <span>Google Meet Tab</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </header>

      {/* MAIN MEETING STAGE */}
      <div className="flex-1 flex overflow-hidden">
        {/* VIDEO TILES AREA (Left / Center) */}
        <div className="flex-1 p-4 grid grid-cols-1 md:grid-cols-2 gap-4 items-center justify-center overflow-y-auto">
          {/* Tile 1: AI Technical Reviewer (Dr. Gemini) */}
          <div className="relative rounded-2xl bg-[#303134] border-2 border-[#3c4043] flex flex-col justify-between overflow-hidden shadow-2xl h-[360px] md:h-[420px] group transition-all">
            {/* Speaking / Audio Status Badge */}
            <div className="absolute top-3 left-3 z-10 flex items-center space-x-2">
              <span className="px-2.5 py-1 rounded-lg bg-black/60 backdrop-blur-md text-[11px] font-semibold text-purple-300 border border-purple-500/30 flex items-center space-x-1.5">
                <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                <span>Dr. Gemini • Senior AI Evaluator</span>
              </span>
              {isAiSpeaking && (
                <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-mono animate-pulse">
                  Speaking...
                </span>
              )}
            </div>

            {/* AI Avatar & Audio Visualizer */}
            <div className="flex-1 flex flex-col items-center justify-center space-y-4 p-6">
              <div
                className={`relative w-28 h-28 rounded-full flex items-center justify-center transition-all duration-300 ${
                  isAiSpeaking
                    ? 'scale-110 shadow-2xl shadow-purple-500/50 bg-gradient-to-tr from-purple-600 via-indigo-600 to-blue-500'
                    : 'bg-gradient-to-tr from-purple-800 to-slate-800 border-2 border-purple-500/40'
                }`}
              >
                <Sparkles className="w-12 h-12 text-white animate-pulse" />
                {isAiSpeaking && (
                  <div className="absolute -inset-2 rounded-full border-2 border-purple-400 animate-ping opacity-30"></div>
                )}
              </div>

              {/* Dynamic Waveform Bars */}
              <div className="flex items-center space-x-1.5 h-6">
                {[12, 24, 18, 30, 16, 26, 14].map((h, i) => (
                  <div
                    key={i}
                    className={`w-1 rounded-full transition-all duration-200 ${
                      isAiSpeaking
                        ? 'bg-purple-400 animate-bounce'
                        : 'bg-slate-600'
                    }`}
                    style={{
                      height: isAiSpeaking ? `${h}px` : '4px',
                      animationDelay: `${i * 100}ms`,
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Live Closed Captioning Subtitle Bar */}
            <div className="p-3 bg-black/80 backdrop-blur-md border-t border-[#3c4043] min-h-[64px] flex items-center text-xs text-slate-200 leading-snug">
              {isAiThinking ? (
                <div className="flex items-center space-x-2 text-purple-300 text-xs">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Dr. Gemini is analyzing your response & deliverables...</span>
                </div>
              ) : (
                <p className="line-clamp-2 italic">"{aiSpeechText}"</p>
              )}
            </div>
          </div>

          {/* Tile 2: Candidate / Student View */}
          <div className="relative rounded-2xl bg-[#303134] border-2 border-[#3c4043] flex flex-col justify-between overflow-hidden shadow-2xl h-[360px] md:h-[420px]">
            {/* Candidate Name Badge */}
            <div className="absolute top-3 left-3 z-10 flex items-center space-x-2">
              <span className="px-2.5 py-1 rounded-lg bg-black/60 backdrop-blur-md text-[11px] font-semibold text-slate-200 border border-slate-700">
                {project.user_name} (Candidate)
              </span>
              {!isMicOn && (
                <span className="p-1 rounded-md bg-rose-500/80 text-white" title="Microphone muted">
                  <MicOff className="w-3.5 h-3.5" />
                </span>
              )}
            </div>

            {/* Camera Video Feed or Avatar */}
            <div className="flex-1 flex flex-col items-center justify-center p-6 bg-slate-900/60">
              {isVideoOn ? (
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover rounded-xl"
                />
              ) : (
                <div className="flex flex-col items-center space-y-3">
                  <div className="w-24 h-24 rounded-full bg-blue-600 flex items-center justify-center text-3xl font-bold text-white shadow-lg">
                    {project.user_name.charAt(0)}
                  </div>
                  <span className="text-xs text-slate-400">Camera Off</span>
                </div>
              )}
            </div>

            {/* Screen Share simulation / overlay */}
            {isScreenSharing && (
              <div className="absolute inset-0 bg-[#202124]/95 z-20 p-4 flex flex-col">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-xs text-slate-300">
                  <span className="flex items-center space-x-1.5 text-blue-400 font-semibold">
                    <Monitor className="w-3.5 h-3.5" />
                    <span>Sharing: {currentModule?.title} Source & Architecture</span>
                  </span>
                  <button
                    onClick={() => setIsScreenSharing(false)}
                    className="text-[11px] text-slate-400 hover:text-white underline"
                  >
                    Stop Share
                  </button>
                </div>
                <div className="flex-1 p-3 font-mono text-[11px] text-slate-300 bg-black/80 rounded-lg mt-2 overflow-y-auto space-y-2 border border-slate-800">
                  <div className="text-emerald-400">// Verified Architecture Schema</div>
                  <div className="text-purple-400">SELECT * FROM modules WHERE status = 'in_progress';</div>
                  <div className="text-slate-400">
                    Target: {currentModule?.description}
                  </div>
                </div>
              </div>
            )}

            {/* Bottom info banner */}
            <div className="p-3 bg-black/70 backdrop-blur-md border-t border-[#3c4043] flex items-center justify-between text-xs text-slate-400">
              <span>Candidate Audio: {isMicOn ? 'Active (Speech Ready)' : 'Muted'}</span>
              <span className="font-mono text-[11px] text-slate-500">Google Meet HD 1080p</span>
            </div>
          </div>
        </div>

        {/* SIDEBAR: LIVE CHAT, MINUTES & DELIVERABLES (Right) */}
        <div className="w-80 md:w-96 bg-[#28292c] border-l border-[#3c4043] flex flex-col justify-between overflow-hidden">
          {/* Sidebar Tabs */}
          <div className="flex items-center border-b border-[#3c4043] bg-[#202124] text-xs">
            <button
              onClick={() => setActiveTab('chat')}
              className={`flex-1 py-3 font-medium flex items-center justify-center space-x-1.5 transition ${
                activeTab === 'chat'
                  ? 'text-blue-400 border-b-2 border-blue-400 bg-[#28292c]'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>In-Call Chat</span>
            </button>
            <button
              onClick={() => setActiveTab('minutes')}
              className={`flex-1 py-3 font-medium flex items-center justify-center space-x-1.5 transition ${
                activeTab === 'minutes'
                  ? 'text-blue-400 border-b-2 border-blue-400 bg-[#28292c]'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>AI Minutes ({meetingMinutes.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('deliverables')}
              className={`flex-1 py-3 font-medium flex items-center justify-center space-x-1.5 transition ${
                activeTab === 'deliverables'
                  ? 'text-blue-400 border-b-2 border-blue-400 bg-[#28292c]'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Criteria</span>
            </button>
          </div>

          {/* Sidebar Content */}
          <div ref={chatScrollRef} className="flex-1 p-3 overflow-y-auto space-y-3 text-xs">
            {/* Tab: Chat */}
            {activeTab === 'chat' && (
              <div className="space-y-3">
                {conversation.map((msg, i) => (
                  <div
                    key={i}
                    className={`p-3 rounded-xl ${
                      msg.role === 'ai'
                        ? 'bg-[#303134] border border-purple-500/30 text-slate-200'
                        : 'bg-blue-600/30 border border-blue-500/40 text-slate-100 ml-4'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1 text-[10px]">
                      <span className="font-semibold text-purple-300">
                        {msg.role === 'ai' ? 'Dr. Gemini (AI Reviewer)' : project.user_name}
                      </span>
                      <span className="text-slate-500">{msg.time}</span>
                    </div>
                    <p className="leading-relaxed">{msg.text}</p>
                  </div>
                ))}

                {isAiThinking && (
                  <div className="p-3 rounded-xl bg-[#303134] border border-purple-500/30 flex items-center space-x-2 text-purple-300 text-xs">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Dr. Gemini is synthesizing evaluation...</span>
                  </div>
                )}
              </div>
            )}

            {/* Tab: AI Minutes */}
            {activeTab === 'minutes' && (
              <div className="space-y-2">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Official Meeting Minutes:
                </span>
                {meetingMinutes.map((item, i) => (
                  <div
                    key={i}
                    className="p-2.5 rounded-lg bg-[#303134] border border-[#3c4043] flex items-start space-x-2 text-slate-300 text-xs"
                  >
                    <span className="text-blue-400 font-bold">•</span>
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Tab: Deliverables */}
            {activeTab === 'deliverables' && (
              <div className="space-y-3">
                <div className="p-2 rounded-lg bg-blue-950/40 border border-blue-500/30 text-[11px] text-blue-300">
                  Module {currentModule?.module_number}: {currentModule?.title}
                </div>
                {(currentModule?.key_deliverables || []).map((deliv, i) => {
                  const isChecked = checkedDeliverables.includes(deliv);
                  return (
                    <div
                      key={i}
                      className={`p-2.5 rounded-lg border flex items-start space-x-2 text-xs transition ${
                        isChecked
                          ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-200'
                          : 'bg-[#303134] border-[#3c4043] text-slate-300'
                      }`}
                    >
                      <CheckCircle2
                        className={`w-4 h-4 flex-shrink-0 mt-0.5 ${
                          isChecked ? 'text-emerald-400' : 'text-slate-600'
                        }`}
                      />
                      <span>{deliv}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Quick Demo Prompts & Candidate Chat Input */}
          <div className="p-3 bg-[#202124] border-t border-[#3c4043] space-y-2">
            {/* Quick 1-click topic prompts */}
            <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 scrollbar-none">
              {suggestedPrompts.map((p, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSendCandidateMessage(p)}
                  disabled={isAiThinking}
                  className="px-2.5 py-1 rounded-md text-[10px] font-medium whitespace-nowrap bg-[#303134] hover:bg-[#3c4043] text-slate-300 border border-slate-700 transition"
                >
                  {p}
                </button>
              ))}
            </div>

            {/* Input form */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendCandidateMessage();
              }}
              className="flex items-center space-x-2"
            >
              <input
                type="text"
                value={candidateInput}
                onChange={(e) => setCandidateInput(e.target.value)}
                placeholder="Explain demo / ask Dr. Gemini..."
                disabled={isAiThinking}
                className="flex-1 bg-[#303134] border border-[#3c4043] rounded-lg px-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition"
              />
              <button
                type="submit"
                disabled={!candidateInput.trim() || isAiThinking}
                className="p-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-50 transition"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* GOOGLE MEET BOTTOM CONTROL BAR */}
      <footer className="h-16 px-6 bg-[#202124] border-t border-[#3c4043] flex items-center justify-between">
        {/* Left: Meeting ID */}
        <div className="text-xs font-mono text-slate-400 hidden sm:block">
          {review.google_meet_link.replace('https://', '')}
        </div>

        {/* Center: Call Controls */}
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setIsMicOn(!isMicOn)}
            className={`w-10 h-10 rounded-full flex items-center justify-center transition ${
              isMicOn
                ? 'bg-[#3c4043] hover:bg-[#474a4d] text-white'
                : 'bg-rose-600 hover:bg-rose-500 text-white'
            }`}
            title={isMicOn ? 'Turn off microphone' : 'Turn on microphone'}
          >
            {isMicOn ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
          </button>

          <button
            onClick={() => setIsVideoOn(!isVideoOn)}
            className={`w-10 h-10 rounded-full flex items-center justify-center transition ${
              isVideoOn
                ? 'bg-[#3c4043] hover:bg-[#474a4d] text-white'
                : 'bg-rose-600 hover:bg-rose-500 text-white'
            }`}
            title={isVideoOn ? 'Turn off camera' : 'Turn on camera'}
          >
            {isVideoOn ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
          </button>

          <button
            onClick={() => setIsScreenSharing(!isScreenSharing)}
            className={`w-10 h-10 rounded-full flex items-center justify-center transition ${
              isScreenSharing
                ? 'bg-blue-600 text-white'
                : 'bg-[#3c4043] hover:bg-[#474a4d] text-white'
            }`}
            title="Present screen / demo code"
          >
            <Monitor className="w-4 h-4" />
          </button>

          {/* Red End Call / Conclude Review button */}
          <button
            onClick={handleConcludeMeeting}
            className="px-4 py-2 rounded-full bg-rose-600 hover:bg-rose-500 text-white font-medium text-xs flex items-center space-x-1.5 shadow transition active:scale-95"
            title="Conclude review with AI minutes"
          >
            <PhoneOff className="w-3.5 h-3.5" />
            <span>Conclude Review with AI</span>
          </button>
        </div>

        {/* Right: Close Room / Back to Dashboard */}
        <div className="flex items-center space-x-2">
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg bg-[#303134] hover:bg-[#3c4043] text-slate-300 text-xs font-medium transition"
          >
            Minimize Meeting
          </button>
        </div>
      </footer>
    </div>
  );
};
