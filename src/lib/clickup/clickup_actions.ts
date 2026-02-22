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
      options?: Array<{ id: string; name: string; color: string; orderindex: number }>;
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
      Authorization: CLICKUP_API_KEY,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(
      `ClickUp API error: ${response.status} ${response.statusText}`,
    );
  }

  return response.json();
}

// Get all folders (customers) from Commercial Customers space
export async function getCommercialFolders(): Promise<ClickUpFolder[]> {
  const data = await clickupFetch<{ folders: ClickUpFolder[] }>(
    `/space/${COMMERCIAL_SPACE_ID}/folder`,
  );
  return data.folders.filter((f) => !f.archived);
}

// Get lists for a specific folder
export async function getFolderLists(folderId: string): Promise<ClickUpList[]> {
  const data = await clickupFetch<{ lists: ClickUpList[] }>(
    `/folder/${folderId}/list`,
  );
  return data.lists;
}

// Get tasks from a specific list (includes subtasks in response)
export async function getListTasks(
  listId: string,
  includeSubtasks = true,
): Promise<ClickUpTask[]> {
  const data = await clickupFetch<{ tasks: ClickUpTask[] }>(
    `/list/${listId}/task?include_closed=false&subtasks=${includeSubtasks}`,
  );
  return data.tasks;
}

// Get a single task with full details
export async function getTask(taskId: string): Promise<ClickUpTask> {
  return clickupFetch<ClickUpTask>(`/task/${taskId}?include_subtasks=true`);
}

// Check if a task is an assessment task based on name
// Flexible pattern matching for Kasey's naming variations
function isAssessmentTask(taskName: string): boolean {
  const name = taskName.toLowerCase();
  return (
    name.includes('assessment') ||
    name.includes('on site') ||
    name.includes('on-site')
  );
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

// Get assessment tasks for a folder (tasks containing "assessment" or "on site" in name)
export async function getAssessmentTasks(
  folderId: string,
): Promise<ClickUpTask[]> {
  const allTasks = await getFolderTasks(folderId);

  // Filter for assessment tasks only (not subtasks, and name matches)
  const assessmentTasks = allTasks.filter(
    (task) => !task.parent && isAssessmentTask(task.name),
  );

  // Sort by date_created descending (most recent first)
  assessmentTasks.sort(
    (a, b) => parseInt(b.date_created) - parseInt(a.date_created),
  );

  return assessmentTasks;
}

// Get full assessment task with subtasks
export async function getAssessmentWithSubtasks(
  taskId: string,
): Promise<ClickUpTask> {
  const task = await getTask(taskId);

  // If subtasks exist but don't have full details, fetch each one
  if (task.subtasks && task.subtasks.length > 0) {
    const fullSubtasks = await Promise.all(
      task.subtasks.map((subtask) => getTask(subtask.id)),
    );
    task.subtasks = fullSubtasks;
  }

  return task;
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
export async function findMatchingFolder(
  companyName: string,
): Promise<ClickUpFolder | null> {
  const folders = await getCommercialFolders();
  const normalizedCompany = normalizeForMatch(companyName);

  // Try exact match first (normalized)
  let match = folders.find(
    (f) => normalizeForMatch(f.name) === normalizedCompany,
  );
  if (match) return match;

  // Try "starts with" match (e.g., "Duke's Alehouse" matches "Dukes Alehouse and Kitchen")
  match = folders.find((f) => {
    const normalizedFolder = normalizeForMatch(f.name);
    return (
      normalizedCompany.startsWith(normalizedFolder) ||
      normalizedFolder.startsWith(normalizedCompany)
    );
  });
  if (match) return match;

  // Try "contains" match
  match = folders.find((f) => {
    const normalizedFolder = normalizeForMatch(f.name);
    // Check if key words match
    const companyWords = normalizedCompany
      .split(' ')
      .filter((w) => w.length > 2);
    const folderWords = normalizedFolder.split(' ').filter((w) => w.length > 2);
    const matchingWords = companyWords.filter((w) => folderWords.includes(w));
    return matchingWords.length >= Math.min(2, companyWords.length);
  });

  return match || null;
}

// Extract category from ClickUp custom field or fall back to priority
function extractCategory(task: ClickUpTask): AssessmentItem['category'] {
  // First try to get from custom field named "Category"
  const categoryField = task.custom_fields?.filter(
    (field) => field.id === '3188285b-248d-4f23-b84d-58baddbaba0b',
  )[0];

  console.log(`CAT FIELD:`, categoryField)

  if (categoryField?.value) {
    const categoryValue = categoryField.value

    // Check if it's a dropdown field with options
    if (categoryField.type_config?.options) {
      const option = categoryField.type_config.options.find(
        (opt) => opt.orderindex === categoryField.value,
      );
      if (option) {
        const normalizedName = option.name.toLowerCase();
        if (normalizedName.includes('urgent')) return 'Urgent';
        if (normalizedName.includes('recommended')) return 'Recommended';
        if (normalizedName.includes('cosmetic')) return 'Cosmetic';
        if (normalizedName.includes('included maintenance'))
          return 'Included Maintenance';
      }
    }

    // Direct string value matching
    // if (categoryValue.includes('urgent')) return 'Urgent';
    // if (categoryValue.includes('recommended')) return 'Recommended';
    // if (categoryValue.includes('cosmetic')) return 'Cosmetic';
    // if (categoryValue.includes('included maintenance'))
    //   return 'Included Maintenance';
  }

  // Fall back to priority if no custom field
  if (!task.priority) return 'No Issue';

  switch (task.priority.priority.toLowerCase()) {
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
    category: extractCategory(task),
    priority: task.priority?.priority.toLowerCase() as AssessmentItem['priority'] || null,
    issue: task.name,
    status: task.status.status,
    recommendation: task.text_content || task.description || '',
    description: task.description || undefined,
    images: (task.attachments || [])
      .filter((a) => a.url)
      .map((a) => a.thumbnail_large || a.url),
    estimated_cost_min: 0, // Not available without custom fields
    estimated_cost_max: 0, // remove
    tags: task.tags.map((t) => t.name),
    comments: '',
    created_date: new Date(parseInt(task.date_created))
      .toISOString()
      .split('T')[0],
    technician: task.assignees[0]?.username || "",
  };
}

// Get assessment for a company by matching to ClickUp folder
export async function getAssessmentForCompany(
  companyId: string,
  companyName: string,
): Promise<Assessment> {
  const folder = await findMatchingFolder(companyName);

  if (!folder) {
    // Return empty assessment if no matching folder found
    return {
      id: `assess_${companyId}`,
      customer_id: companyId,
      customer_name: companyName,
      assessment_name: 'No ClickUp Folder Found',
      assessment_date: new Date().toISOString().split('T')[0],
      description: '',
      location: '',
      technician: 'N/A',
      items: [],
      status: 'draft',
      created_at: new Date().toISOString(),
    };
  }

  // Get assessment tasks (parent tasks with "assessment" in name)
  const assessmentTasks = await getAssessmentTasks(folder.id);

  console.log(
    `Found ${assessmentTasks.length} assessment tasks for ${companyName}`,
  );
  if (assessmentTasks.length > 0) {
    console.log('Most recent assessment:', {
      id: assessmentTasks[0].id,
      name: assessmentTasks[0].name,
      date_created: assessmentTasks[0].date_created,
      converted_date: new Date(parseInt(assessmentTasks[0].date_created))
        .toISOString()
        .split('T')[0],
    });
  }

  if (assessmentTasks.length === 0) {
    // No assessments found for this company
    return {
      id: `assess_${companyId}`,
      customer_id: companyId,
      customer_name: companyName,
      assessment_name: 'No Assessment Found',
      assessment_date: new Date().toISOString().split('T')[0],
      description: '',
      location: '',
      technician: 'N/A',
      items: [],
      status: 'draft',
      created_at: new Date().toISOString(),
    };
  }

  // Get the most recent assessment with all subtasks
  const mostRecentAssessment = assessmentTasks[0]; // Already sorted by date (most recent first)
  const assessmentWithSubtasks = await getAssessmentWithSubtasks(
    mostRecentAssessment.id,
  );

  // Transform subtasks to assessment items
  const allItems = (assessmentWithSubtasks.subtasks || []).map(
    transformTaskToAssessmentItem,
  );

  return {
    id: `assess_${companyId}`,
    customer_id: companyId,
    customer_name: companyName,
    assessment_name: mostRecentAssessment.name,
    assessment_date: new Date(parseInt(mostRecentAssessment.date_created))
      .toISOString()
      .split('T')[0],
    description:
      mostRecentAssessment.text_content ||
      mostRecentAssessment.description ||
      '',
    location: mostRecentAssessment.list.name,
    technician:
      mostRecentAssessment.assignees?.[0]?.username ||
      mostRecentAssessment.creator?.username ||
      'N/A',
    items: allItems,
    status: 'draft',
    created_at: mostRecentAssessment.date_created,
  };
}

// Get all commercial customers (folders) with task counts
export async function getCommercialCustomers(): Promise<
  Array<{
    id: string;
    name: string;
    taskCount: number;
  }>
> {
  const folders = await getCommercialFolders();
  return folders.map((f) => ({
    id: f.id,
    name: f.name,
    taskCount: parseInt(f.task_count) || 0,
  }));
}
