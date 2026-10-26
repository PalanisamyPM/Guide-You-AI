import crypto from 'crypto';
import { runSql, queryAll } from './db.js';

export interface EmailDispatchOptions {
  projectId: string;
  recipientName: string;
  recipientEmail: string;
  projectName: string;
  reviewRound: number;
  scheduledDate: string;
  meetLink: string;
  type: 'initial_breakdown' | 'round_update' | 'completion_congrats' | 'reminder';
  modules?: Array<{ moduleNumber: number; title: string; description: string; keyDeliverables?: string[] }>;
  completedModulesCount?: number;
  totalModulesCount?: number;
  adminFeedback?: string;
  aiAnalysis?: string;
  nextSteps?: string[];
}

/**
 * Generates a realistic, standard Google Meet link
 */
export function generateGoogleMeetLink(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz';
  const randSegment = (len: number) => {
    let result = '';
    for (let i = 0; i < len; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };
  return `https://meet.google.com/${randSegment(3)}-${randSegment(4)}-${randSegment(3)}`;
}

/**
 * Builds HTML template and records email dispatch in the SQLite database
 */
export async function sendProjectNotificationEmail(opts: EmailDispatchOptions): Promise<{
  id: string;
  subject: string;
  meetLink: string;
  sentAt: string;
}> {
  const id = `eml_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
  const sentAt = new Date().toISOString();

  let subject = '';
  let bodyHtml = '';

  const formattedDate = new Date(opts.scheduledDate).toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short',
  });

  if (opts.type === 'initial_breakdown') {
    subject = `[Guide You AI] Project Roadmap & Review Round 1 Scheduled: "${opts.projectName}"`;
    bodyHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0f172a; color: #f8fafc; margin: 0; padding: 24px; }
          .container { max-width: 620px; margin: 0 auto; background: #1e293b; border-radius: 12px; border: 1px solid #334155; overflow: hidden; }
          .header { background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%); padding: 28px 24px; color: #ffffff; }
          .header h1 { margin: 0 0 6px 0; font-size: 22px; font-weight: 700; letter-spacing: -0.02em; }
          .header p { margin: 0; opacity: 0.9; font-size: 14px; }
          .content { padding: 28px 24px; }
          .meeting-card { background: #0f172a; border-radius: 8px; border: 1px solid #38bdf8; padding: 18px; margin: 20px 0; }
          .btn-meet { display: inline-block; background: #2563eb; color: #ffffff !important; text-decoration: none; font-weight: 600; font-size: 15px; padding: 12px 24px; border-radius: 6px; margin-top: 12px; }
          .module-card { background: #0f172a; border-radius: 8px; border: 1px solid #334155; padding: 14px; margin-bottom: 12px; }
          .module-tag { display: inline-block; background: #334155; color: #38bdf8; font-size: 11px; font-weight: bold; padding: 3px 8px; border-radius: 4px; text-transform: uppercase; margin-bottom: 6px; }
          .deliverable-item { font-size: 13px; color: #cbd5e1; margin: 4px 0; padding-left: 14px; position: relative; }
          .deliverable-item::before { content: "•"; position: absolute; left: 0; color: #38bdf8; font-weight: bold; }
          .footer { padding: 18px 24px; border-top: 1px solid #334155; font-size: 12px; color: #94a3b8; text-align: center; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Guide You AI - Project Milestone Roadmap</h1>
            <p>Automated Review Coordination System</p>
          </div>
          <div class="content">
            <p>Hello <strong>${opts.recipientName}</strong>,</p>
            <p>Your project submission for <strong>"${opts.projectName}"</strong> has been successfully ingested and processed by Guide You AI. Our systems have generated a structured module breakdown to guide you to full completion.</p>

            <div class="meeting-card">
              <span style="font-size: 11px; font-weight: bold; color: #38bdf8; text-transform: uppercase; letter-spacing: 0.05em;">Scheduled Milestone Review 1</span>
              <h3 style="margin: 6px 0 10px 0; font-size: 18px; color: #f8fafc;">${formattedDate}</h3>
              <p style="margin: 0 0 12px 0; font-size: 13px; color: #94a3b8;">Join the evaluation panel via Google Meet for your Module 1 code walkthrough and demo:</p>
              <a href="${opts.meetLink}" class="btn-meet" target="_blank">Join Google Meet Session</a>
              <div style="margin-top: 10px; font-size: 12px; color: #64748b;">Direct Link: ${opts.meetLink}</div>
            </div>

            <h3 style="font-size: 16px; margin: 24px 0 12px 0; color: #f1f5f9;">AI-Generated Development Modules</h3>
            ${(opts.modules || [])
              .map(
                (m) => `
              <div class="module-card">
                <span class="module-tag">Module ${m.moduleNumber}</span>
                <h4 style="margin: 0 0 6px 0; font-size: 14px; color: #f8fafc;">${m.title}</h4>
                <p style="margin: 0 0 8px 0; font-size: 13px; color: #94a3b8;">${m.description}</p>
                ${
                  m.keyDeliverables && m.keyDeliverables.length > 0
                    ? `
                  <div style="font-size: 12px; font-weight: 600; color: #cbd5e1; margin-bottom: 4px;">Key Deliverables:</div>
                  ${m.keyDeliverables.map((d) => `<div class="deliverable-item">${d}</div>`).join('')}
                `
                    : ''
                }
              </div>
            `
              )
              .join('')}

            <p style="font-size: 13px; color: #94a3b8; margin-top: 20px;">Please ensure your repository is updated with Module 1 code and deliverables prior to the review date.</p>
          </div>
          <div class="footer">
            Sent automatically by Guide You AI System • AI-Powered Project Review Engine
          </div>
        </div>
      </body>
      </html>
    `;
  } else if (opts.type === 'completion_congrats') {
    subject = `[Guide You AI] 🎉 Congratulations! All Project Milestones Approved: "${opts.projectName}"`;
    bodyHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0f172a; color: #f8fafc; margin: 0; padding: 24px; }
          .container { max-width: 620px; margin: 0 auto; background: #1e293b; border-radius: 12px; border: 1px solid #10b981; overflow: hidden; }
          .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 28px 24px; color: #ffffff; text-align: center; }
          .content { padding: 28px 24px; }
          .box { background: #0f172a; border-radius: 8px; border: 1px solid #334155; padding: 18px; margin: 18px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0 0 6px 0; font-size: 24px;">Project Completed! 🏆</h1>
            <p style="margin: 0; opacity: 0.95;">All Architectural & Development Modules Verified</p>
          </div>
          <div class="content">
            <p>Dear <strong>${opts.recipientName}</strong>,</p>
            <p>Congratulations! All planned modules for <strong>"${opts.projectName}"</strong> have been successfully verified and signed off by the review committee.</p>
            <div class="box">
              <h4 style="margin: 0 0 8px 0; color: #34d399;">Final Evaluation Summary:</h4>
              <p style="margin: 0; font-size: 14px; color: #cbd5e1;">${opts.aiAnalysis || 'Outstanding technical execution across all scheduled milestones.'}</p>
            </div>
            <p style="font-size: 13px; color: #94a3b8;">Your project status is now 100% COMPLETE. Keep up the high standard of engineering!</p>
          </div>
        </div>
      </body>
      </html>
    `;
  } else {
    // Round update / Recursive iteration
    subject = `[Guide You AI] Review Round ${opts.reviewRound} Completed & Next Round Scheduled: "${opts.projectName}"`;
    bodyHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0f172a; color: #f8fafc; margin: 0; padding: 24px; }
          .container { max-width: 620px; margin: 0 auto; background: #1e293b; border-radius: 12px; border: 1px solid #334155; overflow: hidden; }
          .header { background: linear-gradient(135deg, #6366f1 0%, #a855f7 100%); padding: 28px 24px; color: #ffffff; }
          .content { padding: 28px 24px; }
          .card { background: #0f172a; border-radius: 8px; border: 1px solid #334155; padding: 16px; margin: 16px 0; }
          .btn-meet { display: inline-block; background: #4f46e5; color: #ffffff !important; text-decoration: none; font-weight: 600; font-size: 14px; padding: 12px 22px; border-radius: 6px; margin-top: 10px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2 style="margin:0 0 6px 0;">Milestone Round ${opts.reviewRound} Evaluation Summary</h2>
            <p style="margin:0; font-size: 14px; opacity: 0.9;">Progress Update & Next Review Scheduling</p>
          </div>
          <div class="content">
            <p>Hello <strong>${opts.recipientName}</strong>,</p>
            <p>Your Round ${opts.reviewRound} review for <strong>"${opts.projectName}"</strong> has been completed. Here is your evaluation:</p>

            <div class="card">
              <h4 style="margin: 0 0 6px 0; color: #a5b4fc;">AI Milestone Evaluation:</h4>
              <p style="margin: 0 0 12px 0; font-size: 13px; color: #cbd5e1;">${opts.aiAnalysis || 'Demo successfully logged.'}</p>
              ${
                opts.nextSteps && opts.nextSteps.length > 0
                  ? `
                <div style="font-weight: 600; font-size: 13px; color: #f1f5f9; margin-bottom: 6px;">Action Items for Next Review:</div>
                ${opts.nextSteps
                  .map(
                    (step) =>
                      `<div style="font-size: 13px; color: #94a3b8; margin: 4px 0;">• ${step}</div>`
                  )
                  .join('')}
              `
                  : ''
              }
            </div>

            <div class="card" style="border-color: #6366f1;">
              <span style="font-size: 11px; font-weight: bold; color: #818cf8; text-transform: uppercase;">Next Review: Round ${opts.reviewRound + 1}</span>
              <h3 style="margin: 6px 0 10px 0; font-size: 17px; color: #f8fafc;">${formattedDate}</h3>
              <p style="margin: 0 0 10px 0; font-size: 13px; color: #94a3b8;">Join the Google Meet room for your next evaluation:</p>
              <a href="${opts.meetLink}" class="btn-meet" target="_blank">Join Round ${opts.reviewRound + 1} Google Meet</a>
              <div style="margin-top: 8px; font-size: 12px; color: #64748b;">Link: ${opts.meetLink}</div>
            </div>
          </div>
          <div style="padding: 16px; border-top: 1px solid #334155; font-size: 12px; color: #94a3b8; text-align: center;">
            Guide You AI Continuous Progress Pipeline
          </div>
        </div>
      </body>
      </html>
    `;
  }

  // Persist into SQLite email_logs table
  runSql(
    `INSERT INTO email_logs (id, project_id, recipient_name, recipient_email, subject, body_html, meet_link, review_round, type, sent_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      opts.projectId,
      opts.recipientName,
      opts.recipientEmail,
      subject,
      bodyHtml,
      opts.meetLink,
      opts.reviewRound,
      opts.type,
      sentAt,
    ]
  );

  return { id, subject, meetLink: opts.meetLink, sentAt };
}
