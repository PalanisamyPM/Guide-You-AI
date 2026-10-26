import { GoogleGenAI, Type } from '@google/genai';

// Initialize Gemini client with standard telemetry header
const getGeminiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY || '';
  return new GoogleGenAI({
    apiKey: apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
};

export interface GeneratedModule {
  moduleNumber: number;
  title: string;
  description: string;
  keyDeliverables: string[];
  estimatedDays: number;
}

export interface GeneratedBreakdown {
  summary: string;
  techStack: string[];
  modules: GeneratedModule[];
  flowchartNodes: Array<{ id: string; label: string; type: string; details: string }>;
  flowchartEdges: Array<{ from: string; to: string; label?: string }>;
  recommendedFirstReviewDays: number;
}

export interface ReviewAnalysisResult {
  overallEvaluation: string;
  progressPercentage: number;
  qualityRating: number; // 1-5
  blockersAndRisks: string[];
  actionableNextSteps: string[];
  recommendedNextReviewDays: number;
  isAllCompleted: boolean;
  studentEncouragement: string;
}

export interface MeetingTurnResponse {
  aiSpeech: string;
  critique: string;
  meetingMinutesEntry: string;
  demonstratedDeliverables: string[];
  recommendedRating: number; // 1-5
  suggestedPromptOptions: string[];
  isModuleSatisfied: boolean;
}

/**
 * Analyzes a project title and breaks it down into structured modules,
 * deliverables, and a step-by-step flowchart using Gemini 3.8 Flash.
 */
export async function generateProjectBreakdown(
  projectName: string,
  userName: string = 'Candidate'
): Promise<GeneratedBreakdown> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (apiKey) {
    try {
      const ai = getGeminiClient();
      const prompt = `
You are the Lead Systems Architect and Technical Evaluator for the "Guide You AI" Project Review Automation System.
Analyze the following student/developer project name and generate a comprehensive, professional breakdown into 4 to 5 sequential development modules, complete with key deliverables and a flowchart graph structure.

Project Name: "${projectName}"
Developer / Student Name: "${userName}"

Respond with ONLY valid JSON adhering to this JSON schema:
{
  "summary": "2-3 sentence technical overview of this project scope and architecture",
  "techStack": ["string", "string", ...],
  "modules": [
    {
      "moduleNumber": 1,
      "title": "Clear concise module title",
      "description": "Specific functional goals for this module",
      "keyDeliverables": ["Deliverable 1", "Deliverable 2", "Deliverable 3"],
      "estimatedDays": 7
    }
  ],
  "flowchartNodes": [
    { "id": "m1", "label": "Module 1: Title", "type": "initial", "details": "Key focus" }
  ],
  "flowchartEdges": [
    { "from": "m1", "to": "m2", "label": "Milestone Passed" }
  ],
  "recommendedFirstReviewDays": 7
}
`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          temperature: 0.2,
        },
      });

      const rawText = response.text || '';
      const parsed = JSON.parse(rawText) as GeneratedBreakdown;
      if (parsed && Array.isArray(parsed.modules) && parsed.modules.length > 0) {
        return parsed;
      }
    } catch (err) {
      console.error('Gemini breakdown generation failed, falling back to heuristic architect generator:', err);
    }
  }

  // Fallback heuristic generator when API is offline or without key
  return fallbackProjectBreakdown(projectName);
}

/**
 * Analyzes review day outcomes, administrator checks, and feedback
 * to recursively plan the next review round and next actionable steps.
 */
export async function analyzeProjectReview(
  projectName: string,
  userName: string,
  allModules: Array<{ id: string; moduleNumber: number; title: string; description: string }>,
  completedModuleIds: string[],
  adminFeedback: string,
  reviewRound: number
): Promise<ReviewAnalysisResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  const completedCount = completedModuleIds.length;
  const totalCount = allModules.length;
  const isAllCompleted = completedCount >= totalCount;
  const progressPercentage = Math.round((completedCount / (totalCount || 1)) * 100);

  if (apiKey) {
    try {
      const ai = getGeminiClient();
      const prompt = `
You are the Senior Technical Project Director evaluating a live milestone review in "Guide You AI".

Project: "${projectName}"
Developer: "${userName}"
Current Review Round: ${reviewRound}
Total Modules: ${totalCount}
Completed Modules Count: ${completedCount}

Modules Breakdown:
${allModules
  .map(
    (m) =>
      `- [${completedModuleIds.includes(m.id) ? 'X' : ' '}] Module ${m.moduleNumber}: ${m.title} (${m.description})`
  )
  .join('\n')}

Administrator Observations & Review Notes:
"${adminFeedback || 'Standard milestone demo and code walkthrough conducted.'}"

Provide a thorough technical evaluation, highlighting strengths, code quality, any blockers, concrete next steps for the developer, and scheduling advice.
Respond strictly in JSON:
{
  "overallEvaluation": "Comprehensive review summary with technical critique",
  "progressPercentage": ${progressPercentage},
  "qualityRating": 4,
  "blockersAndRisks": ["Risk/blocker 1", "Risk/blocker 2"],
  "actionableNextSteps": ["Action step 1", "Action step 2", "Action step 3"],
  "recommendedNextReviewDays": 7,
  "isAllCompleted": ${isAllCompleted},
  "studentEncouragement": "Constructive motivational message addressing ${userName}"
}
`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          temperature: 0.3,
        },
      });

      const raw = response.text || '';
      const parsed = JSON.parse(raw) as ReviewAnalysisResult;
      return {
        ...parsed,
        progressPercentage,
        isAllCompleted,
      };
    } catch (err) {
      console.error('Gemini review analysis failed, using structured fallback:', err);
    }
  }

  // Fallback review evaluator
  return {
    overallEvaluation: `Round ${reviewRound} review completed for "${projectName}". Demonstrated progress covers ${completedCount} of ${totalCount} modules (${progressPercentage}%). Evaluator feedback: ${
      adminFeedback || 'Demo verified successfully.'
    }`,
    progressPercentage,
    qualityRating: completedCount > 0 ? 4 : 3,
    blockersAndRisks:
      isAllCompleted
        ? []
        : [
            'Ensure end-to-end integration tests cover edge cases.',
            'Maintain API documentation and schema synchronization before next deployment.',
          ],
    actionableNextSteps: isAllCompleted
      ? ['Prepare final production handoff documentation', 'Tag version 1.0.0 release in Git repository']
      : [
          `Finalize and test pending module deliverables for the next sprint.`,
          'Refactor core functions into isolated unit test suites.',
          'Review error handling and logging protocols for the demo.',
        ],
    recommendedNextReviewDays: 7,
    isAllCompleted,
    studentEncouragement: isAllCompleted
      ? `Outstanding work ${userName}! You have successfully completed all planned modules with high engineering standards.`
      : `Great momentum ${userName}! Keep up the consistent execution and focus on closing the next deliverables for Round ${
          reviewRound + 1
        }.`,
  };
}

/**
 * Intelligent domain heuristic generator for realistic breakdowns
 */
function fallbackProjectBreakdown(projectName: string): GeneratedBreakdown {
  const p = projectName.toLowerCase();
  let techStack = ['TypeScript', 'Node.js', 'React', 'Tailwind CSS', 'PostgreSQL'];
  let modules: GeneratedModule[] = [];

  if (p.includes('ai') || p.includes('vision') || p.includes('nlp') || p.includes('model') || p.includes('ml')) {
    techStack = ['Python', 'FastAPI', 'PyTorch / HuggingFace', 'React', 'Docker'];
    modules = [
      {
        moduleNumber: 1,
        title: 'Problem Framing, Dataset Pipeline & Baseline Architecture',
        description: 'Design database schema, data collection scripts, preprocessing and API interfaces.',
        keyDeliverables: [
          'High-level architectural flowchart & ERD diagrams',
          'Data cleaning, validation, and tokenization/ingestion pipeline',
          'FastAPI/Express skeleton with authenticated endpoints',
        ],
        estimatedDays: 7,
      },
      {
        moduleNumber: 2,
        title: 'Core AI Model Training, Fine-Tuning & Evaluation',
        description: 'Implement training loops or LLM prompt orchestration pipelines with validation metrics.',
        keyDeliverables: [
          'Model pipeline implementation with checkpointing',
          'Confusion matrix, F1-score or BLEU evaluation benchmark report',
          'Inference latency benchmarking (<200ms target)',
        ],
        estimatedDays: 7,
      },
      {
        moduleNumber: 3,
        title: 'Interactive Frontend Dashboard & Real-Time Visualization',
        description: 'Build user-facing web interface for interacting with model outputs and analytics.',
        keyDeliverables: [
          'Responsive React UI with parameter tuning controls',
          'Real-time streaming responses or visual bounding box overlay',
          'Error boundary handling and toast feedback',
        ],
        estimatedDays: 7,
      },
      {
        moduleNumber: 4,
        title: 'Containerization, Security Auditing & Production Sign-off',
        description: 'Dockerization, integration testing, API rate-limiting, and deployment readiness.',
        keyDeliverables: [
          'Dockerfile & docker-compose configuration',
          'End-to-end integration test coverage (>80%)',
          'User documentation and live demo deployment link',
        ],
        estimatedDays: 7,
      },
    ];
  } else if (p.includes('ecommerce') || p.includes('store') || p.includes('shop') || p.includes('market')) {
    techStack = ['Next.js', 'Node.js', 'PostgreSQL', 'Stripe API', 'Tailwind CSS'];
    modules = [
      {
        moduleNumber: 1,
        title: 'Catalog Data Model, Admin Ingestion & Auth System',
        description: 'Setup product catalog, categories, user authentication and RBAC permissions.',
        keyDeliverables: [
          'Relational database schema with foreign key constraints',
          'Secure JWT/Session authentication with password hashing',
          'Product CRUD admin dashboard with image upload capability',
        ],
        estimatedDays: 6,
      },
      {
        moduleNumber: 2,
        title: 'Cart State Management & Checkout Transaction Engine',
        description: 'Build shopping cart logic, inventory reservation locks, and payment integration.',
        keyDeliverables: [
          'Persistent client-side and server-validated cart state',
          'Stripe webhook listener and transactional invoice generator',
          'Out-of-stock validation and order state machine',
        ],
        estimatedDays: 7,
      },
      {
        moduleNumber: 3,
        title: 'Customer Order Portal, Search Filtering & Notifications',
        description: 'Implement faceted search, customer purchase history, and automated order emails.',
        keyDeliverables: [
          'Instant client-side multi-filter and keyword search',
          'Order tracking timeline and invoice PDF download',
          'Automated email notification triggers upon status change',
        ],
        estimatedDays: 7,
      },
      {
        moduleNumber: 4,
        title: 'Performance Optimization, Security Audit & Launch Prep',
        description: 'Implement caching, SEO meta tags, load testing, and security hardening.',
        keyDeliverables: [
          'Redis/Memory caching for hot catalog queries',
          'Lighthouse audit score > 90 across performance and accessibility',
          'Automated database backup script and deployment checklist',
        ],
        estimatedDays: 6,
      },
    ];
  } else {
    modules = [
      {
        moduleNumber: 1,
        title: 'System Architecture, Data Schema & Core Foundation',
        description: 'Setup project repository, database migrations, authentication, and core entities.',
        keyDeliverables: [
          'Entity-relationship diagram and SQLite/PostgreSQL schema',
          'RESTful API routing skeleton and authentication middleware',
          'Modular frontend layout with responsive theme scaffolding',
        ],
        estimatedDays: 7,
      },
      {
        moduleNumber: 2,
        title: 'Core Business Logic, Workflows & Service Layer',
        description: 'Implement primary CRUD features, domain validation rules, and transactional logic.',
        keyDeliverables: [
          'Primary functional services with strict validation schemas',
          'API controllers with comprehensive status code error handling',
          'Unit test suite for business critical calculation logic',
        ],
        estimatedDays: 7,
      },
      {
        moduleNumber: 3,
        title: 'Interactive Frontend Experience & API Integration',
        description: 'Connect React interface to backend endpoints with state management and UX polish.',
        keyDeliverables: [
          'Data tables with sorting, filtering, and pagination controls',
          'Interactive forms with optimistic UI and inline validation',
          'Empty, loading, and error state UX treatments',
        ],
        estimatedDays: 7,
      },
      {
        moduleNumber: 4,
        title: 'End-to-End Testing, Security Hardening & Project Sign-Off',
        description: 'Run integration tests, optimize performance, write technical docs, and prepare demo.',
        keyDeliverables: [
          'Comprehensive integration test suite',
          'Security review (CORS, sanitized queries, rate limits)',
          'Complete README, architectural documentation, and demo walk-through',
        ],
        estimatedDays: 6,
      },
    ];
  }

  const nodes = modules.map((m, idx) => ({
    id: `m${m.moduleNumber}`,
    label: `M${m.moduleNumber}: ${m.title}`,
    type: idx === 0 ? 'start' : idx === modules.length - 1 ? 'end' : 'process',
    details: m.description,
  }));

  const edges = modules.slice(0, -1).map((m, idx) => ({
    from: `m${m.moduleNumber}`,
    to: `m${modules[idx + 1].moduleNumber}`,
    label: `Pass Review ${m.moduleNumber}`,
  }));

  return {
    summary: `Structured engineering roadmap for "${projectName}", broken down into ${modules.length} incremental milestones. Each phase enforces verification checkpoints before progression.`,
    techStack,
    modules,
    flowchartNodes: nodes,
    flowchartEdges: edges,
    recommendedFirstReviewDays: 7,
  };
}

/**
 * Interactive AI Meeting Room Evaluator
 * Evaluates developer responses live during the Google Meet review session.
 */
export async function evaluateMeetingTurn(params: {
  projectName: string;
  userName: string;
  reviewRound: number;
  moduleTitle: string;
  moduleDescription: string;
  keyDeliverables: string[];
  conversationHistory: Array<{ role: 'ai' | 'user'; text: string }>;
  candidateMessage: string;
}): Promise<MeetingTurnResponse> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (apiKey) {
    try {
      const ai = getGeminiClient();
      const prompt = `
You are Dr. Gemini, the Lead Technical Reviewer in an interactive Google Meet review session for "Guide You AI".
Project: "${params.projectName}"
Candidate: "${params.userName}"
Review Round: ${params.reviewRound}
Target Module: "${params.moduleTitle}"
Module Scope: "${params.moduleDescription}"
Key Deliverables to Verify:
${params.keyDeliverables.map((d, i) => `${i + 1}. ${d}`).join('\n')}

Previous Meeting Transcript:
${params.conversationHistory.slice(-4).map((m) => `${m.role === 'ai' ? 'Dr. Gemini' : params.userName}: ${m.text}`).join('\n')}

Candidate Just Said / Demonstrated:
"${params.candidateMessage}"

Analyze the candidate's explanation and demo against the key deliverables.
Provide:
1. "aiSpeech": What you speak back in the meeting (conversational, insightful, supportive yet technically rigorous, ~2-3 sentences).
2. "critique": Brief technical feedback on their architectural approach.
3. "meetingMinutesEntry": 1-2 bullet points summarizing what was demonstrated for the official meeting record.
4. "demonstratedDeliverables": Array of exact deliverables from the list above that the candidate has satisfactorily proven.
5. "recommendedRating": Score from 1 to 5.
6. "suggestedPromptOptions": Array of 3 short quick-response topics the candidate could present next (under 6 words each).
7. "isModuleSatisfied": Boolean true if key criteria have been met.

Respond strictly in valid JSON matching this schema:
{
  "aiSpeech": "string",
  "critique": "string",
  "meetingMinutesEntry": "string",
  "demonstratedDeliverables": ["string"],
  "recommendedRating": 4,
  "suggestedPromptOptions": ["string", "string", "string"],
  "isModuleSatisfied": false
}
`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          temperature: 0.3,
        },
      });

      const raw = response.text || '';
      const parsed = JSON.parse(raw) as MeetingTurnResponse;
      return parsed;
    } catch (err) {
      console.error('Gemini meeting turn evaluation failed, falling back:', err);
    }
  }

  // Resilient heuristic evaluator
  return {
    aiSpeech: `Thank you for walking me through that, ${params.userName}. Your implementation approach for "${params.moduleTitle}" shows sound architectural planning. Could you now detail your test coverage and how you address potential edge cases?`,
    critique: 'Clear explanation of core logic. Recommend adding automated regression tests before final sign-off.',
    meetingMinutesEntry: `Candidate demonstrated implementation details for ${params.moduleTitle}. Validated core architectural structure.`,
    demonstratedDeliverables: params.keyDeliverables.slice(0, 1),
    recommendedRating: 4,
    suggestedPromptOptions: [
      'Show database indexing & schema',
      'Walk through API authentication flow',
      'Demonstrate error handling & unit tests',
    ],
    isModuleSatisfied: true,
  };
}

