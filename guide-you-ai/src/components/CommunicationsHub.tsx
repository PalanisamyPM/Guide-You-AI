import React, { useState, useEffect } from 'react';
import {
  Mail,
  Video,
  Search,
  ExternalLink,
  Eye,
  Calendar,
  User,
  CheckCircle,
  Copy,
  Clock,
  Sparkles,
} from 'lucide-react';
import { EmailLog } from '../types.js';

export const CommunicationsHub: React.FC = () => {
  const [emails, setEmails] = useState<EmailLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEmail, setSelectedEmail] = useState<EmailLog | null>(null);
  const [copiedLink, setCopiedLink] = useState<string | null>(null);

  const fetchEmails = () => {
    setLoading(true);
    fetch('/api/emails')
      .then((res) => res.json())
      .then((data) => {
        setEmails(data || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error fetching emails:', err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchEmails();
  }, []);

  const filteredEmails = emails.filter(
    (e) =>
      e.recipient_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.recipient_email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (e.project_name && e.project_name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleCopyLink = (link: string) => {
    navigator.clipboard.writeText(link);
    setCopiedLink(link);
    setTimeout(() => setCopiedLink(null), 2000);
  };

  const getTypeBadge = (type: EmailLog['type']) => {
    switch (type) {
      case 'initial_breakdown':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-blue-500/15 text-blue-400 border border-blue-500/30">
            Initial Roadmap
          </span>
        );
      case 'round_update':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-purple-500/15 text-purple-400 border border-purple-500/30">
            Round Update
          </span>
        );
      case 'completion_congrats':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            100% Sign-Off
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-800 text-slate-400">
            Notice
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white flex items-center space-x-2">
            <Mail className="w-6 h-6 text-indigo-400" />
            <span>Communications & Google Meet Outbox</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Audit log of all automated notification emails, Google Meet session bookings, and milestone briefs dispatched by Guide You AI.
          </p>
        </div>

        <button
          onClick={fetchEmails}
          className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 hover:bg-slate-800 text-slate-300 text-xs font-medium transition self-start sm:self-auto"
        >
          Refresh Logs
        </button>
      </div>

      {/* Search Input */}
      <div className="relative max-w-md">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Filter by student, email, or project title..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-4 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
        />
      </div>

      {/* Email Logs List */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4">Type & Round</th>
                <th className="py-3 px-4">Recipient</th>
                <th className="py-3 px-4">Subject & Project</th>
                <th className="py-3 px-4">Google Meet Link</th>
                <th className="py-3 px-4">Dispatched At</th>
                <th className="py-3 px-4 text-right">Inspect</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-300">
              {filteredEmails.map((eml) => (
                <tr key={eml.id} className="hover:bg-slate-800/40 transition">
                  <td className="py-3 px-4 whitespace-nowrap">
                    <div className="flex items-center space-x-1.5">
                      {getTypeBadge(eml.type)}
                      <span className="font-mono text-[10px] text-slate-400">R{eml.review_round}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="font-semibold text-slate-200">{eml.recipient_name}</div>
                    <div className="text-[11px] text-slate-400 font-mono">{eml.recipient_email}</div>
                  </td>
                  <td className="py-3 px-4 max-w-xs">
                    <div className="font-medium text-slate-200 line-clamp-1">{eml.subject}</div>
                    {eml.project_name && (
                      <div className="text-[10px] text-slate-500 truncate mt-0.5">
                        {eml.project_name}
                      </div>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    {eml.meet_link ? (
                      <div className="flex items-center space-x-2">
                        <a
                          href={eml.meet_link}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[11px] text-blue-400 hover:underline flex items-center space-x-1"
                        >
                          <Video className="w-3 h-3 flex-shrink-0" />
                          <span className="font-mono truncate max-w-[140px]">{eml.meet_link.replace('https://', '')}</span>
                        </a>
                        <button
                          onClick={() => handleCopyLink(eml.meet_link)}
                          title="Copy Link"
                          className="text-slate-500 hover:text-slate-300 transition"
                        >
                          <Copy className="w-3 h-3" />
                        </button>
                        {copiedLink === eml.meet_link && (
                          <span className="text-[10px] text-emerald-400">Copied!</span>
                        )}
                      </div>
                    ) : (
                      <span className="text-slate-500 italic">None</span>
                    )}
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap text-slate-400 text-[11px] font-mono">
                    {new Date(eml.sent_at).toLocaleString()}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={() => setSelectedEmail(eml)}
                      className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-medium inline-flex items-center space-x-1 transition"
                    >
                      <Eye className="w-3 h-3 text-indigo-400" />
                      <span>View Email</span>
                    </button>
                  </td>
                </tr>
              ))}

              {filteredEmails.length === 0 && !loading && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500 text-xs italic">
                    No communication logs found. Ingest a project sheet to trigger automated emails.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Rendered HTML Email Modal Preview */}
      {selectedEmail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950">
              <div className="space-y-0.5">
                <div className="flex items-center space-x-2">
                  <Mail className="w-4 h-4 text-indigo-400" />
                  <span className="text-xs font-bold text-slate-200">{selectedEmail.subject}</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  To: {selectedEmail.recipient_name} &lt;{selectedEmail.recipient_email}&gt; • Sent: {new Date(selectedEmail.sent_at).toLocaleString()}
                </p>
              </div>

              <button
                onClick={() => setSelectedEmail(null)}
                className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs flex items-center justify-center transition"
              >
                ✕
              </button>
            </div>

            {/* Email HTML Iframe Container */}
            <div className="flex-1 p-4 overflow-y-auto bg-slate-950">
              <div
                className="bg-white text-slate-900 rounded-xl overflow-hidden p-6 max-w-xl mx-auto shadow"
                dangerouslySetInnerHTML={{ __html: selectedEmail.body_html }}
              />
            </div>

            {/* Modal Footer */}
            <div className="p-3 border-t border-slate-800 bg-slate-950 flex items-center justify-between text-xs text-slate-400">
              <span>Google Meet link: <strong className="text-blue-400">{selectedEmail.meet_link}</strong></span>
              <button
                onClick={() => setSelectedEmail(null)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
