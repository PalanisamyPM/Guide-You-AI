export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  created_at: string;
}

export interface Module {
  id: string;
  project_id: string;
  module_number: number;
  title: string;
  description: string;
  key_deliverables: string[];
  status: 'pending' | 'in_progress' | 'completed' | 'revised';
  completed_at?: string;
}

export interface Review {
  id: string;
  project_id: string;
  review_round: number;
  scheduled_date: string;
  google_meet_link: string;
  status: 'scheduled' | 'in_session' | 'completed' | 'cancelled';
  admin_feedback?: string;
  ai_analysis?: string;
  next_steps?: string[];
  completed_at?: string;
  created_at: string;
}

export interface EmailLog {
  id: string;
  project_id: string;
  project_name?: string;
  recipient_name: string;
  recipient_email: string;
  subject: string;
  body_html: string;
  meet_link: string;
  review_round: number;
  type: 'initial_breakdown' | 'round_update' | 'completion_congrats' | 'reminder';
  sent_at: string;
}

export interface FlowchartNode {
  id: string;
  label: string;
  type: string;
  details: string;
}

export interface FlowchartEdge {
  from: string;
  to: string;
  label?: string;
}

export interface Project {
  id: string;
  user_id: string;
  user_name: string;
  user_email: string;
  project_name: string;
  upload_date: string;
  status: 'Pending Module 1' | 'Review Scheduled' | 'In Review' | 'Revision Needed' | 'Completed';
  completion_percentage: number;
  summary?: string;
  tech_stack: string[];
  flowchart?: {
    nodes: FlowchartNode[];
    edges: FlowchartEdge[];
  };
  total_modules?: number;
  completed_modules?: number;
  next_review_date?: string;
  next_meet_link?: string;
  current_round?: number;
  current_review_id?: string;
  created_at: string;
  updated_at: string;
  modules?: Module[];
  reviews?: Review[];
  emails?: EmailLog[];
}

export interface Stats {
  totalProjects: number;
  completedProjects: number;
  scheduledReviews: number;
  totalEmailsSent: number;
}
