'use server';

import { AssessmentItem, Assessment } from '@/types/types-index';

const CLICKUP_API_KEY = process.env.CLICKUP_KEY;
const CLICKUP_BASE_URL = 'https://api.clickup.com/api/v2';

// Commercial Customers space ID
const COMMERCIAL_SPACE_ID = '26324040';

// ClickUp API types
export interface ClickUpFolder {
  id: string;
  name: string;
  task_count: string;
  archived: boolean;
  lists?: ClickUpList[];
}

export interface ClickUpList {
  id: string;
  name: string;
  task_count: number;
  folder?: {
    id: string;
    name: string;
  };
}

export interface ClickUpTask {
  id: string;
  name: string;
  description?: string;
  text_content?: string;
  status: {
    status: string;
    type: string;
  };
  priority?: {
    id: string;
    priority: string;
  } | null;
  tags: Array<{ name: string }>;
  assignees: Array<{ username: string }>;
  creator?: { username: string };
  date_created: string;
  list: {
    id: string;
    name: string;
  };
  folder: {
    id: string;
    name: string;
  };
  parent?: string | null;
  subtasks?: ClickUpTask[];
  attachments?: Array<{
    id: string;
    url: string;
    thumbnail_large?: string;
    mimetype?: string;
  }>;
  custom_fields?: Array<{
    id: string;
    name: string;
    value?: string | number;
    type_config?: {
      options?: Array<{ id: string; name: string; color: string }>;
    };
  }>;
}

// Helper to make ClickUp API requests
async function clickupFetch<T>(endpoint: string): Promise<T> {
  if (!CLICKUP_API_KEY) {
    throw new Error('CLICKUP_KEY is not configured');
  }

  const response = await fetch(`${CLICKUP_BASE_URL}${endpoint}`, {
    headers: {
      'Authorization': CLICKUP_API_KEY,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`ClickUp API error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

// Get all folders (customers) from Commercial Customers space
export async function getCommercialFolders(): Promise<ClickUpFolder[]> {
  const data = await clickupFetch<{ folders: ClickUpFolder[] }>(
    `/space/${COMMERCIAL_SPACE_ID}/folder`
  );
  return data.folders.filter(f => !f.archived);
}

// Get lists for a specific folder
export async function getFolderLists(folderId: string): Promise<ClickUpList[]> {
  const data = await clickupFetch<{ lists: ClickUpList[] }>(
    `/folder/${folderId}/list`
  );
  return data.lists;
}

// Get tasks from a specific list
export async function getListTasks(listId: string): Promise<ClickUpTask[]> {
  const data = await clickupFetch<{ tasks: ClickUpTask[] }>(
    `/list/${listId}/task?include_closed=false&subtasks=true`
  );
  return data.tasks;
}

// Get all tasks for a folder (customer) across all lists
export async function getFolderTasks(folderId: string): Promise<ClickUpTask[]> {
  const lists = await getFolderLists(folderId);
  const allTasks: ClickUpTask[] = [];

  for (const list of lists) {
    const tasks = await getListTasks(list.id);
    allTasks.push(...tasks);
  }

  return allTasks;
}

// Normalize string for fuzzy matching (remove punctuation, lowercase)
function normalizeForMatch(str: string): string {
  return str
    .toLowerCase()
    .replace(/[''`]/g, '') // Remove apostrophes
    .replace(/[^a-z0-9\s]/g, '') // Remove other punctuation
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();
}

// Find best matching ClickUp folder for an Assembly company name
export async function findMatchingFolder(companyName: string): Promise<ClickUpFolder | null> {
  const folders = await getCommercialFolders();
  const normalizedCompany = normalizeForMatch(companyName);

  // Try exact match first (normalized)
  let match = folders.find(f => normalizeForMatch(f.name) === normalizedCompany);
  if (match) return match;

  // Try "starts with" match (e.g., "Duke's Alehouse" matches "Dukes Alehouse and Kitchen")
  match = folders.find(f => {
    const normalizedFolder = normalizeForMatch(f.name);
    return normalizedCompany.startsWith(normalizedFolder) ||
           normalizedFolder.startsWith(normalizedCompany);
  });
  if (match) return match;

  // Try "contains" match
  match = folders.find(f => {
    const normalizedFolder = normalizeForMatch(f.name);
    // Check if key words match
    const companyWords = normalizedCompany.split(' ').filter(w => w.length > 2);
    const folderWords = normalizedFolder.split(' ').filter(w => w.length > 2);
    const matchingWords = companyWords.filter(w => folderWords.includes(w));
    return matchingWords.length >= Math.min(2, companyWords.length);
  });

  return match || null;
}

// Map ClickUp priority to AssessmentItem category
function mapPriorityToCategory(priority: ClickUpTask['priority']): AssessmentItem['category'] {
  if (!priority) return 'No Issue';

  switch (priority.priority.toLowerCase()) {
    case 'urgent':
      return 'Urgent';
    case 'high':
      return 'Recommended';
    case 'normal':
      return 'Cosmetic';
    case 'low':
    default:
      return 'No Issue';
  }
}

// Transform ClickUp task to AssessmentItem
function transformTaskToAssessmentItem(task: ClickUpTask): AssessmentItem {
  return {
    id: task.id,
    clickup_task_id: task.id,
    location: task.list.name,
    category: mapPriorityToCategory(task.priority),
    issue: task.name,
    recommendation: task.text_content || task.description || '',
    images: (task.attachments || [])
      .filter(a => a.url)
      .map(a => a.thumbnail_large || a.url),
    estimated_cost_min: 0, // Not available without custom fields
    estimated_cost_max: 0,
    tags: task.tags.map(t => t.name),
    comments: '',
    created_date: new Date(parseInt(task.date_created)).toISOString().split('T')[0],
    technician: task.assignees[0]?.username || 'Unassigned',
  };
}

// Get assessment for a company by matching to ClickUp folder
export async function getAssessmentForCompany(
  companyId: string,
  companyName: string
): Promise<Assessment> {
  const folder = await findMatchingFolder(companyName);

  if (!folder) {
    // Return empty assessment if no matching folder found
    return {
      id: `assess_${companyId}`,
      customer_id: companyId,
      customer_name: companyName,
      assessment_date: new Date().toISOString().split('T')[0],
      technician: 'N/A',
      items: [],
      status: 'draft',
      created_at: new Date().toISOString(),
    };
  }

  const tasks = await getFolderTasks(folder.id);
  const items = tasks.map(transformTaskToAssessmentItem);

  return {
    id: `assess_${companyId}`,
    customer_id: companyId,
    customer_name: companyName,
    assessment_date: new Date().toISOString().split('T')[0],
    technician: items[0]?.technician || 'N/A',
    items,
    status: 'draft',
    created_at: new Date().toISOString(),
  };
}

// Get all commercial customers (folders) with task counts
export async function getCommercialCustomers(): Promise<Array<{
  id: string;
  name: string;
  taskCount: number;
}>> {
  const folders = await getCommercialFolders();
  return folders.map(f => ({
    id: f.id,
    name: f.name,
    taskCount: parseInt(f.task_count) || 0,
  }));
}
