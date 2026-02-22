// src/types/index.ts

export interface Customer {
  id?: string;
  clickup_id: string;
  name: string;
  address: string;
  units: number;
  contact_email: string;
  contact_name: string;
}

export interface AssessmentItem {
  id: string;
  clickup_task_id: string;
  location: string;
  category: "Urgent" | "Recommended" | "Cosmetic" | "Included Maintenance" | "No Issue";
  priority: "Urgent" | "High" | "Normal" | "Low" | null;
  status: string | null;
  issue: string;
  description: string | undefined;
  recommendation: string;
  images: string[];
  estimated_cost_min: number; // remove
  estimated_cost_max: number; // remove
  tags: string[];
  comments: string;
  created_date: string;
  technician: string;
}

export interface Assessment {
  id: string;
  customer_id: string;
  customer_name: string;
  assessment_name: string;
  assessment_date: string | undefined;
  description: string; 
  location: string;
  technician: string | null;
  items: AssessmentItem[];
  status: string;
  created_at: string;
}

export interface WorkOrder {
  id: string;
  customer_id: string;
  title: string;
  description: string;
  status: "To Do" | "In Progress" | "Complete" | "On Hold";
  priority: "Urgent" | "High" | "Normal" | "Low";
  assigned_to: string;
  hours_logged: number;
  images: string[];
  created_at: string;
  updated_at: string;
}
