'use server';

import {
  AssessmentItem,
  Assessment,
  AssessmentParent,
} from '@/types/types-index';
import { hexToRgba } from '@/lib/utils';

const CLICKUP_API_KEY = process.env.CLICKUP_KEY;
const CLICKUP_BASE_URL = 'https://api.clickup.com/api/v2';

// Space IDs
const COMMERCIAL_SPACE_ID = '26324040';
const HOURLY_SPACE_ID = '32286697';

// Custom field IDs
const APPROVAL_NEEDED_FIELD_ID = 'cad5546f-2c00-40b2-98f0-142efd801b0b';
const LOCATION_FIELD_ID = '307c69e8-44ba-49e6-a244-1c870000211d';

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
    color?: string;
  };
  priority?: {
    id: string;
    priority: string;
  } | null;
  tags: Array<{ name: string; tag_fg: string; tag_bg: string }>;
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
    value?: string | number | boolean;
    type_config?: {
      options?: Array<{
        id: string;
        name: string;
        color: string;
        orderindex: number;
      }>;
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

// Get all non-archived folders from any space
async function getSpaceFolders(spaceId: string): Promise<ClickUpFolder[]> {
  const data = await clickupFetch<{ folders: ClickUpFolder[] }>(
    `/space/${spaceId}/folder`,
  );
  return data.folders.filter((f) => !f.archived);
}

// Get all folders (customers) from Commercial Customers space
export async function getCommercialFolders(): Promise<ClickUpFolder[]> {
  return getSpaceFolders(COMMERCIAL_SPACE_ID);
}

// Get all folders (customers) from Hourly Customers space
export async function getHourlyFolders(): Promise<ClickUpFolder[]> {
  return getSpaceFolders(HOURLY_SPACE_ID);
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
  const categoryField = task.custom_fields?.filter(
    (field) => field.id === '3188285b-248d-4f23-b84d-58baddbaba0b',
  )[0];

  if (categoryField?.value !== undefined && categoryField?.value !== null) {
    console.log(
      `Task: ${task.name} - categoryField.value:`,
      categoryField.value,
      `(type: ${typeof categoryField.value})`,
    );
    console.log(`categoryField.name:`, categoryField.name);

    // Check if it's a dropdown field with options
    if (categoryField.type_config?.options) {
      console.log(`OPTS`, categoryField.type_config?.options);

      // Convert value to number for comparison since orderindex is a number
      const valueAsNumber =
        typeof categoryField.value === 'string'
          ? parseInt(categoryField.value, 10)
          : categoryField.value;

      const option = categoryField.type_config.options.find(
        (opt) => opt.orderindex === valueAsNumber,
      );
      if (option) {
        console.log(`Found matching option:`, option.name);
        return option.name;
      } else {
        console.log(`No matching option found for orderindex ${valueAsNumber}`);
      }
    }
  } else {
    console.log(`Task: ${task.name} - No category field value found`);
  }

  // Fall back to priority if no custom field
  if (!task.priority) {
    console.log(
      `Task: ${task.name} - No priority found, returning Uncategorized`,
    );
    return 'Uncategorized';
  }

  console.log(`Task: ${task.name} - Using priority: ${task.priority.priority}`);
  return task.priority.priority;
}

// Transform ClickUp task to AssessmentItem
function transformTaskToAssessmentItem(task: ClickUpTask): AssessmentItem {
  return {
    id: task.id,
    clickup_task_id: task.id,
    location: task.list.name,
    category: extractCategory(task),
    priority:
      (task.priority?.priority.toLowerCase() as AssessmentItem['priority']) ||
      null,
    issue: task.name,
    status: task.status.status,
    recommendation: task.text_content || task.description || '',
    description: task.description || '',
    images: (task.attachments || [])
      .filter((a) => a.url)
      .map((a) => a.thumbnail_large || a.url),
    estimated_cost_min: 0, // Not available without custom fields
    estimated_cost_max: 0, // remove
    tags: task.tags.map((t) => ({
      name: t.name,
      fg: '#1a1c1f',
      bg: hexToRgba(t.tag_bg, 0.15),
    })),
    comments: '',
    created_date: new Date(parseInt(task.date_created))
      .toISOString()
      .split('T')[0],
    technician: task.assignees[0]?.username || '',
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

// --- NEW ARCHITECTURE ---

// Find the "Assessments" list within a folder
async function getAssessmentListForFolder(
  folderId: string,
): Promise<ClickUpList | null> {
  const lists = await getFolderLists(folderId);
  return (
    lists.find((l) => l.name.toLowerCase().includes('assessments')) || null
  );
}

// Returns true if the Approval Needed custom field is checked on a task
function extractApprovalNeeded(task: ClickUpTask): boolean {
  const field = task.custom_fields?.find(
    (f) => f.id === APPROVAL_NEEDED_FIELD_ID,
  );
  if (!field) return false;
  return field.value === true || field.value === 'true' || field.value === 1;
}

// Returns the Location custom field value, falling back to the task name
function extractLocationField(task: ClickUpTask): string {
  const field = task.custom_fields?.find((f) => f.id === LOCATION_FIELD_ID);
  if (
    field?.value !== undefined &&
    field?.value !== null &&
    field.type_config?.options
  ) {
    const valueAsNumber =
      typeof field.value === 'string'
        ? parseInt(field.value, 10)
        : Number(field.value);
    const option = field.type_config.options.find(
      (opt) => opt.orderindex === valueAsNumber,
    );
    if (option) return option.name;
  }
  return task.name;
}

// Get all assessment parent tasks (locations) for a commercial company.
// Looks for the "Assessments" list in the matching folder.
export async function getCommercialAssessmentLocations(
  companyName: string,
): Promise<AssessmentParent[]> {
  const folder = await findMatchingFolder(companyName);

  if (!folder) return [];
  

  const assessmentList = await getAssessmentListForFolder(folder.id);
  if (!assessmentList) return [];

  const tasks = await getListTasks(assessmentList.id, false);
  const parentTasks = tasks.filter(
    (t) => !t.parent && t.name.toLowerCase().includes('assessment'),
  );

  parentTasks.sort(
    (a, b) => parseInt(b.date_created) - parseInt(a.date_created),
  );

  console.log("PARENT TASKS")

  return parentTasks.map((t) => ({
    taskId: t.id,
    taskName: t.name,
    location: extractLocationField(t),
    date: new Date(parseInt(t.date_created)).toISOString().split('T')[0],
    status: t.status.status,
    statusColor: t.status.color || '#6b7280',
  }));
}

// Build an Assessment from a selected commercial parent task.
// Only subtasks where Approval Needed = true are included.
export async function buildCommercialAssessment(
  parent: AssessmentParent,
  companyId: string,
  companyName: string,
): Promise<Assessment> {
  const fullTask = await getAssessmentWithSubtasks(parent.taskId);

  const approvedSubtasks = (fullTask.subtasks || []).filter(
    extractApprovalNeeded,
  );
  const items = approvedSubtasks.map((t) => ({
    ...transformTaskToAssessmentItem(t),
    location: parent.location,
  }));

  return {
    id: `assess_${companyId}_${parent.taskId}`,
    customer_id: companyId,
    customer_name: companyName,
    assessment_name: parent.taskName,
    assessment_date: parent.date,
    description: fullTask.text_content || fullTask.description || '',
    location: parent.location,
    technician:
      fullTask.assignees?.[0]?.username || fullTask.creator?.username || 'N/A',
    items,
    status: 'draft',
    created_at: fullTask.date_created,
  };
}

// Build an Assessment from all tasks across all lists in an hourly customer folder.
// Only tasks where Approval Needed = true are included.
export async function getHourlyAssessmentForFolder(
  folderId: string,
  folderName: string,
): Promise<Assessment> {
  const lists = await getFolderLists(folderId);

  const allTasks: ClickUpTask[] = [];
  for (const list of lists) {
    const tasks = await getListTasks(list.id, false);
    allTasks.push(...tasks);
  }

  const approvedTasks = allTasks.filter(
    (t) => !t.parent && extractApprovalNeeded(t),
  );
  const items = approvedTasks.map(transformTaskToAssessmentItem);

  return {
    id: `assess_hourly_${folderId}`,
    customer_id: folderId,
    customer_name: folderName,
    assessment_name: `${folderName} — Approval Needed`,
    assessment_date: new Date().toISOString().split('T')[0],
    description: '',
    location: '',
    technician: null,
    items,
    status: 'draft',
    created_at: Date.now().toString(),
  };
}
