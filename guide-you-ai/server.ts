import express from 'express';
import multer from 'multer';
import * as XLSX from 'xlsx';
import path from 'path';
import crypto from 'crypto';
import dotenv from 'dotenv';
import {
  initDatabase,
  queryAll,
  queryOne,
  runSql,
  UserRecord,
  ProjectRecord,
  ModuleRecord,
  ReviewRecord,
  EmailLogRecord,
} from './server/db.js';
import {
  generateProjectBreakdown,
  analyzeProjectReview,
  evaluateMeetingTurn,
} from './server/gemini.js';
import {
  generateGoogleMeetLink,
  sendProjectNotificationEmail,
} from './server/mailer.js';
import {
  calculateDistinctReviewSlot,
  staggerAllExistingReviews,
} from './server/scheduler.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

app.use(express.json());

// Initialize SQLite database and stagger existing review slots
await initDatabase();
staggerAllExistingReviews();

// ==========================================
// API ROUTES
// ==========================================

/**
 * 1. Template Download for Excel/CSV upload
 */
app.get('/api/template/download', (req, res) => {
  try {
    const wb = XLSX.utils.book_new();
    const sampleData = [
      {
        'User Name': 'Alex Rivera',
        'Email ID': 'alex.rivera@example.com',
        'Project Name': 'AI Autonomous Drone Delivery Fleet Coordinator',
        'Date of Upload': new Date().toISOString().split('T')[0],
      },
      {
        'User Name': 'Maya Lin',
        'Email ID': 'maya.lin@example.com',
        'Project Name': 'Zero-Knowledge Telehealth & E-Prescription Portal',
        'Date of Upload': new Date().toISOString().split('T')[0],
      },
      {
        'User Name': 'Marcus Chen',
        'Email ID': 'marcus.chen@example.com',
        'Project Name': 'Real-Time Edge Computer Vision for Traffic Grid Management',
        'Date of Upload': new Date().toISOString().split('T')[0],
      },
    ];

    const ws = XLSX.utils.json_to_sheet(sampleData);
    XLSX.utils.book_append_sheet(wb, ws, 'Projects_Batch');
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Disposition', 'attachment; filename="Guide_You_AI_Template.xlsx"');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buf);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to generate template', details: err.message });
  }
});

/**
 * 2. Upload Excel / CSV file, parse rows, store in SQLite, and trigger Gemini pipeline
 */
app.post('/api/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded. Please upload a .xlsx, .xls, or .csv file.' });
    }

    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      return res.status(400).json({ error: 'Uploaded file has no readable sheets.' });
    }

    const rawRows = XLSX.utils.sheet_to_json<Record<string, any>>(workbook.Sheets[sheetName]);
    if (!rawRows || rawRows.length === 0) {
      return res.status(400).json({ error: 'The uploaded sheet is empty.' });
    }

    const processedResults = [];

    for (let rowIndex = 0; rowIndex < rawRows.length; rowIndex++) {
      const row = rawRows[rowIndex];
      // Flexible key matching for headers
      const userName = (row['User Name'] || row['UserName'] || row['Name'] || row['Student Name'] || '').toString().trim();
      const email = (row['Email ID'] || row['Email'] || row['Email Address'] || row['Mail'] || '').toString().trim().toLowerCase();
      const projectName = (row['Project Name'] || row['Project Title'] || row['Project'] || row['Title'] || '').toString().trim();
      const uploadDateStr = (row['Date of Upload'] || row['Date'] || row['Upload Date'] || new Date().toISOString().split('T')[0]).toString().trim();

      if (!projectName || !email) {
        continue;
      }

      // 1. Find or create user
      let user = queryOne<UserRecord>('SELECT * FROM users WHERE email = ?', [email]);
      if (!user) {
        const userId = `usr_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
        const userCreated = new Date().toISOString();
        runSql(
          'INSERT INTO users (id, name, email, role, created_at) VALUES (?, ?, ?, ?, ?)',
          [userId, userName || 'Developer', email, 'student', userCreated]
        );
        user = queryOne<UserRecord>('SELECT * FROM users WHERE id = ?', [userId]);
      }

      // 2. Create Project
      const projectId = `prj_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
      const now = new Date().toISOString();

      // Trigger Gemini AI Module Generation
      const breakdown = await generateProjectBreakdown(projectName, user?.name || userName);

      runSql(
        `INSERT INTO projects (id, user_id, project_name, upload_date, status, completion_percentage, summary, tech_stack, flowchart_json, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          projectId,
          user!.id,
          projectName,
          uploadDateStr || now.split('T')[0],
          'Pending Module 1',
          0,
          breakdown.summary,
          JSON.stringify(breakdown.techStack || []),
          JSON.stringify({ nodes: breakdown.flowchartNodes, edges: breakdown.flowchartEdges }),
          now,
          now,
        ]
      );

      // 3. Save Modules
      const insertedModules = [];
      for (const mod of breakdown.modules) {
        const modId = `mod_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
        runSql(
          `INSERT INTO modules (id, project_id, module_number, title, description, key_deliverables, status)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            modId,
            projectId,
            mod.moduleNumber,
            mod.title,
            mod.description,
            JSON.stringify(mod.keyDeliverables || []),
            mod.moduleNumber === 1 ? 'in_progress' : 'pending',
          ]
        );
        insertedModules.push({ id: modId, ...mod });
      }

      // 4. Schedule First Review Round with distinct collision-free date and time
      const scheduledDateIso = calculateDistinctReviewSlot(rowIndex, 2);
      const meetLink = generateGoogleMeetLink();

      const reviewId = `rev_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
      runSql(
        `INSERT INTO reviews (id, project_id, review_round, scheduled_date, google_meet_link, status, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [reviewId, projectId, 1, scheduledDateIso, meetLink, 'scheduled', now]
      );

      // 5. Send automated initial notification email with Meet Link & Modules
      await sendProjectNotificationEmail({
        projectId,
        recipientName: user!.name,
        recipientEmail: user!.email,
        projectName,
        reviewRound: 1,
        scheduledDate: scheduledDateIso,
        meetLink,
        type: 'initial_breakdown',
        modules: breakdown.modules,
      });

      processedResults.push({
        projectId,
        projectName,
        userName: user!.name,
        email: user!.email,
        modulesCount: breakdown.modules.length,
        scheduledDate: scheduledDateIso,
        meetLink,
      });
    }

    res.json({
      success: true,
      message: `Successfully processed ${processedResults.length} project(s) with automated AI breakdowns and Google Meet review schedules.`,
      projects: processedResults,
    });
  } catch (err: any) {
    console.error('Upload processing error:', err);
    res.status(500).json({ error: 'Failed to process sheet', details: err.message });
  }
});

/**
 * 3. Seed Sample Cohort for quick instant testing
 */
app.post('/api/seed-sample', async (req, res) => {
  try {
    const samples = [
      {
        userName: 'Sophia Patel',
        email: 'sophia.patel@polytech.edu',
        projectName: 'Smart Urban Traffic Signal Synchronization using Edge YOLOv8 & DRL',
      },
      {
        userName: 'David Okonjo',
        email: 'david.o@stanford.edu',
        projectName: 'Decentralized Clinical Trial Data Vault with Zero-Knowledge Audits',
      },
      {
        userName: 'Elena Rostova',
        email: 'elena.rostova@mit.edu',
        projectName: 'Autonomous Microgrid Load Balancing and Solar Generation Predictor',
      },
    ];

    const results = [];
    const now = new Date();

    for (let sampleIndex = 0; sampleIndex < samples.length; sampleIndex++) {
      const sample = samples[sampleIndex];
      // Find or create user
      let user = queryOne<UserRecord>('SELECT * FROM users WHERE email = ?', [sample.email]);
      if (!user) {
        const userId = `usr_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
        runSql(
          'INSERT INTO users (id, name, email, role, created_at) VALUES (?, ?, ?, ?, ?)',
          [userId, sample.userName, sample.email, 'student', now.toISOString()]
        );
        user = queryOne<UserRecord>('SELECT * FROM users WHERE id = ?', [userId]);
      }

      const projectId = `prj_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
      const breakdown = await generateProjectBreakdown(sample.projectName, sample.userName);

      runSql(
        `INSERT INTO projects (id, user_id, project_name, upload_date, status, completion_percentage, summary, tech_stack, flowchart_json, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          projectId,
          user!.id,
          sample.projectName,
          now.toISOString().split('T')[0],
          'Pending Module 1',
          0,
          breakdown.summary,
          JSON.stringify(breakdown.techStack || []),
          JSON.stringify({ nodes: breakdown.flowchartNodes, edges: breakdown.flowchartEdges }),
          now.toISOString(),
          now.toISOString(),
        ]
      );

      for (const mod of breakdown.modules) {
        const modId = `mod_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
        runSql(
          `INSERT INTO modules (id, project_id, module_number, title, description, key_deliverables, status)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            modId,
            projectId,
            mod.moduleNumber,
            mod.title,
            mod.description,
            JSON.stringify(mod.keyDeliverables || []),
            mod.moduleNumber === 1 ? 'in_progress' : 'pending',
          ]
        );
      }

      const scheduledDateIso = calculateDistinctReviewSlot(sampleIndex, 2);
      const meetLink = generateGoogleMeetLink();
      const reviewId = `rev_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;

      runSql(
        `INSERT INTO reviews (id, project_id, review_round, scheduled_date, google_meet_link, status, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [reviewId, projectId, 1, scheduledDateIso, meetLink, 'scheduled', now.toISOString()]
      );

      await sendProjectNotificationEmail({
        projectId,
        recipientName: user!.name,
        recipientEmail: user!.email,
        projectName: sample.projectName,
        reviewRound: 1,
        scheduledDate: scheduledDateIso,
        meetLink,
        type: 'initial_breakdown',
        modules: breakdown.modules,
      });

      results.push({ projectId, projectName: sample.projectName, userName: user!.name, scheduledDate: scheduledDateIso });
    }

    res.json({ success: true, count: results.length, projects: results });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to seed sample cohort', details: err.message });
  }
});

/**
 * 4. Get All Projects with aggregate stats for Kanban and Table view
 */
app.get('/api/projects', (req, res) => {
  try {
    const projects = queryAll(`
      SELECT 
        p.*,
        u.name as user_name,
        u.email as user_email,
        (SELECT COUNT(*) FROM modules m WHERE m.project_id = p.id) as total_modules,
        (SELECT COUNT(*) FROM modules m WHERE m.project_id = p.id AND m.status = 'completed') as completed_modules,
        (SELECT r.scheduled_date FROM reviews r WHERE r.project_id = p.id AND r.status = 'scheduled' ORDER BY r.review_round ASC LIMIT 1) as next_review_date,
        (SELECT r.google_meet_link FROM reviews r WHERE r.project_id = p.id AND r.status = 'scheduled' ORDER BY r.review_round ASC LIMIT 1) as next_meet_link,
        (SELECT r.review_round FROM reviews r WHERE r.project_id = p.id AND r.status = 'scheduled' ORDER BY r.review_round ASC LIMIT 1) as current_round,
        (SELECT r.id FROM reviews r WHERE r.project_id = p.id AND r.status = 'scheduled' ORDER BY r.review_round ASC LIMIT 1) as current_review_id
      FROM projects p
      JOIN users u ON p.user_id = u.id
      ORDER BY p.created_at DESC
    `);

    // Parse JSON fields
    const parsed = projects.map((p) => {
      let techStack = [];
      let flowchart = { nodes: [], edges: [] };
      try {
        techStack = JSON.parse(p.tech_stack || '[]');
      } catch (e) {}
      try {
        flowchart = JSON.parse(p.flowchart_json || '{"nodes":[],"edges":[]}');
      } catch (e) {}

      return {
        ...p,
        tech_stack: techStack,
        flowchart,
      };
    });

    res.json(parsed);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch projects', details: err.message });
  }
});

/**
 * 5. Get Single Project Details
 */
app.get('/api/projects/:id', (req, res) => {
  try {
    const { id } = req.params;
    const project = queryOne(
      `SELECT p.*, u.name as user_name, u.email as user_email
       FROM projects p
       JOIN users u ON p.user_id = u.id
       WHERE p.id = ?`,
      [id]
    );

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const modules = queryAll('SELECT * FROM modules WHERE project_id = ? ORDER BY module_number ASC', [id]).map((m) => {
      let keyDeliverables = [];
      try {
        keyDeliverables = JSON.parse(m.key_deliverables || '[]');
      } catch (e) {}
      return { ...m, key_deliverables: keyDeliverables };
    });

    const reviews = queryAll('SELECT * FROM reviews WHERE project_id = ? ORDER BY review_round ASC', [id]).map((r) => {
      let nextSteps = [];
      try {
        nextSteps = JSON.parse(r.next_steps || '[]');
      } catch (e) {}
      return { ...r, next_steps: nextSteps };
    });

    const emails = queryAll('SELECT * FROM email_logs WHERE project_id = ? ORDER BY sent_at DESC', [id]);

    let techStack = [];
    let flowchart = { nodes: [], edges: [] };
    try {
      techStack = JSON.parse(project.tech_stack || '[]');
    } catch (e) {}
    try {
      flowchart = JSON.parse(project.flowchart_json || '{"nodes":[],"edges":[]}');
    } catch (e) {}

    res.json({
      ...project,
      tech_stack: techStack,
      flowchart,
      modules,
      reviews,
      emails,
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch project details', details: err.message });
  }
});

/**
 * 6. Interactive Review Evaluation & Recursive Iteration Trigger
 */
app.post('/api/projects/:id/reviews', async (req, res) => {
  try {
    const { id: projectId } = req.params;
    const {
      reviewId,
      completedModuleIds = [],
      adminFeedback = '',
      reviewRound = 1,
    } = req.body;

    const project = queryOne<{ id: string; project_name: string; user_id: string }>(
      'SELECT id, project_name, user_id FROM projects WHERE id = ?',
      [projectId]
    );
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const user = queryOne<UserRecord>('SELECT * FROM users WHERE id = ?', [project.user_id]);
    const allModules = queryAll<ModuleRecord>(
      'SELECT * FROM modules WHERE project_id = ? ORDER BY module_number ASC',
      [projectId]
    );

    const now = new Date().toISOString();

    // 1. Update status of modules
    for (const mod of allModules) {
      const isMarkedCompleted = completedModuleIds.includes(mod.id);
      if (isMarkedCompleted) {
        runSql("UPDATE modules SET status = 'completed', completed_at = ? WHERE id = ?", [now, mod.id]);
      } else if (mod.status !== 'completed') {
        // If not completed and was in_progress or pending, keep active
        runSql("UPDATE modules SET status = 'in_progress' WHERE id = ?", [mod.id]);
      }
    }

    // 2. Feed updated status back into Gemini API to evaluate and generate next steps
    const geminiAnalysis = await analyzeProjectReview(
      project.project_name,
      user?.name || 'Developer',
      allModules.map((m) => ({ id: m.id, moduleNumber: m.module_number, title: m.title, description: m.description })),
      completedModuleIds,
      adminFeedback,
      reviewRound
    );

    // 3. Mark current review as completed
    const activeReview = reviewId
      ? queryOne<ReviewRecord>('SELECT * FROM reviews WHERE id = ?', [reviewId])
      : queryOne<ReviewRecord>('SELECT * FROM reviews WHERE project_id = ? AND status = "scheduled" ORDER BY review_round ASC LIMIT 1', [projectId]);

    const targetReviewId = activeReview ? activeReview.id : `rev_${Date.now()}`;

    runSql(
      `UPDATE reviews 
       SET status = 'completed', admin_feedback = ?, ai_analysis = ?, next_steps = ?, completed_at = ?
       WHERE id = ?`,
      [
        adminFeedback,
        geminiAnalysis.overallEvaluation,
        JSON.stringify(geminiAnalysis.actionableNextSteps || []),
        now,
        targetReviewId,
      ]
    );

    // Check completion status
    const updatedCompletedModules = queryAll<ModuleRecord>(
      "SELECT id FROM modules WHERE project_id = ? AND status = 'completed'",
      [projectId]
    );
    const totalCount = allModules.length;
    const completedCount = updatedCompletedModules.length;
    const isFullyCompleted = completedCount >= totalCount;
    const calculatedPercentage = Math.round((completedCount / (totalCount || 1)) * 100);

    let nextReview = null;

    if (isFullyCompleted) {
      // Step 4: Final Completion
      runSql(
        "UPDATE projects SET status = 'Completed', completion_percentage = 100, updated_at = ? WHERE id = ?",
        [now, projectId]
      );

      // Send congratulations email
      await sendProjectNotificationEmail({
        projectId,
        recipientName: user?.name || 'Developer',
        recipientEmail: user?.email || '',
        projectName: project.project_name,
        reviewRound,
        scheduledDate: now,
        meetLink: activeReview?.google_meet_link || '',
        type: 'completion_congrats',
        aiAnalysis: geminiAnalysis.overallEvaluation,
      });
    } else {
      // Step 4: Recursive Iteration
      // Schedule Next Review Round with distinct date & time slot
      const nextRound = reviewRound + 1;
      const nextReviewDateIso = calculateDistinctReviewSlot(nextRound, 3 + nextRound * 2);

      const nextMeetLink = generateGoogleMeetLink();
      const nextReviewId = `rev_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;

      runSql(
        `INSERT INTO reviews (id, project_id, review_round, scheduled_date, google_meet_link, status, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [nextReviewId, projectId, nextRound, nextReviewDateIso, nextMeetLink, 'scheduled', now]
      );

      // Determine next state
      const nextStatus = calculatedPercentage === 0 ? 'Pending Module 1' : 'Review Scheduled';
      runSql(
        'UPDATE projects SET status = ?, completion_percentage = ?, updated_at = ? WHERE id = ?',
        [nextStatus, calculatedPercentage, now, projectId]
      );

      // Send updated email brief with next review date and Meet link
      await sendProjectNotificationEmail({
        projectId,
        recipientName: user?.name || 'Developer',
        recipientEmail: user?.email || '',
        projectName: project.project_name,
        reviewRound,
        scheduledDate: nextReviewDateIso,
        meetLink: nextMeetLink,
        type: 'round_update',
        completedModulesCount: completedCount,
        totalModulesCount: totalCount,
        adminFeedback,
        aiAnalysis: geminiAnalysis.overallEvaluation,
        nextSteps: geminiAnalysis.actionableNextSteps,
      });

      nextReview = {
        id: nextReviewId,
        reviewRound: nextRound,
        scheduledDate: nextReviewDateIso,
        meetLink: nextMeetLink,
      };
    }

    res.json({
      success: true,
      isFullyCompleted,
      progressPercentage: calculatedPercentage,
      aiAnalysis: geminiAnalysis,
      nextReview,
    });
  } catch (err: any) {
    console.error('Review evaluation error:', err);
    res.status(500).json({ error: 'Failed to record review evaluation', details: err.message });
  }
});

/**
 * 6.1. Interactive AI Google Meet Room Endpoint
 * Enables candidate to interact live with the AI Evaluator during the review meeting.
 */
app.post('/api/meet/interact', async (req, res) => {
  try {
    const {
      projectId,
      reviewId,
      moduleId,
      candidateMessage,
      conversationHistory = [],
    } = req.body;

    const project = queryOne<ProjectRecord>('SELECT * FROM projects WHERE id = ?', [projectId]);
    if (!project) return res.status(404).json({ error: 'Project not found' });
    const user = queryOne<UserRecord>('SELECT * FROM users WHERE id = ?', [project.user_id]);
    
    const module = moduleId
      ? queryOne<ModuleRecord>('SELECT * FROM modules WHERE id = ?', [moduleId])
      : queryOne<ModuleRecord>('SELECT * FROM modules WHERE project_id = ? AND status != "completed" ORDER BY module_number ASC LIMIT 1', [projectId]);

    const review = reviewId
      ? queryOne<ReviewRecord>('SELECT * FROM reviews WHERE id = ?', [reviewId])
      : queryOne<ReviewRecord>('SELECT * FROM reviews WHERE project_id = ? AND status = "scheduled" ORDER BY review_round ASC LIMIT 1', [projectId]);

    let keyDeliverables: string[] = [];
    try {
      keyDeliverables = JSON.parse(module?.key_deliverables || '[]');
    } catch (e) {}

    const evalResult = await evaluateMeetingTurn({
      projectName: project.project_name,
      userName: user?.name || 'Developer',
      reviewRound: review?.review_round || 1,
      moduleTitle: module?.title || 'Core Architecture Implementation',
      moduleDescription: module?.description || 'Milestone verification',
      keyDeliverables,
      conversationHistory,
      candidateMessage,
    });

    res.json(evalResult);
  } catch (err: any) {
    console.error('AI Meet interaction error:', err);
    res.status(500).json({
      error: 'Failed to process AI meet interaction',
      details: err?.message || String(err),
      stack: err?.stack,
    });
  }
});

/**
 * 6.2. Reschedule Review Date & Time
 */
app.patch('/api/reviews/:id/reschedule', (req, res) => {
  try {
    const { id } = req.params;
    const { scheduledDate, googleMeetLink } = req.body;

    if (!scheduledDate) {
      return res.status(400).json({ error: 'scheduledDate is required' });
    }

    if (googleMeetLink) {
      runSql('UPDATE reviews SET scheduled_date = ?, google_meet_link = ? WHERE id = ?', [
        scheduledDate,
        googleMeetLink,
        id,
      ]);
    } else {
      runSql('UPDATE reviews SET scheduled_date = ? WHERE id = ?', [scheduledDate, id]);
    }

    const updated = queryOne('SELECT * FROM reviews WHERE id = ?', [id]);
    res.json({ success: true, review: updated });
  } catch (err: any) {
    console.error('Reschedule error:', err);
    res.status(500).json({ error: 'Failed to reschedule review', details: err.message });
  }
});

/**
 * 7. Get All Email Logs across projects
 */
app.get('/api/emails', (req, res) => {
  try {
    const emails = queryAll(`
      SELECT e.*, p.project_name
      FROM email_logs e
      JOIN projects p ON e.project_id = p.id
      ORDER BY e.sent_at DESC
      LIMIT 100
    `);
    res.json(emails);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch email logs', details: err.message });
  }
});

/**
 * 8. Quick stats summary
 */
app.get('/api/stats', (req, res) => {
  try {
    const totalProjects = queryOne<{ count: number }>('SELECT COUNT(*) as count FROM projects')?.count || 0;
    const completedProjects = queryOne<{ count: number }>("SELECT COUNT(*) as count FROM projects WHERE status = 'Completed'")?.count || 0;
    const scheduledReviews = queryOne<{ count: number }>("SELECT COUNT(*) as count FROM reviews WHERE status = 'scheduled'")?.count || 0;
    const totalEmailsSent = queryOne<{ count: number }>('SELECT COUNT(*) as count FROM email_logs')?.count || 0;

    res.json({
      totalProjects,
      completedProjects,
      scheduledReviews,
      totalEmailsSent,
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch stats', details: err.message });
  }
});

// ==========================================
// VITE / STATIC SERVING
// ==========================================
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Guide You AI server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
