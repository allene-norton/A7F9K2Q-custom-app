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
const RESIDENTIAL_SPACE_ID = '32103279';

import { APPROVAL_NEEDED_FIELD_ID } from '@/lib/constants';
import { getFolderMappings } from '@/lib/store';

// Run async tasks with a max concurrency limit to avoid ClickUp rate limits
async function withConcurrency<T>(
  tasks: (() => Promise<T>)[],
  limit: number,
): Promise<T[]> {
  const results: T[] = new Array(tasks.length);
  let next = 0;
  async function run(): Promise<void> {
    while (next < tasks.length) {
      const i = next++;
      results[i] = await tasks[i]();
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, tasks.length) }, run));
  return results;
}

// ClickUp API types
export interface ClickUpFolder {
  id: string;
  name: string;
  task_count: string;
  archived: boolean;
  date_created?: string; // ms timestamp string from ClickUp
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
  date_updated?: string;
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
async function clickupFetch<T>(endpoint: string, retries = 3): Promise<T> {
  if (!CLICKUP_API_KEY) {
    throw new Error('CLICKUP_KEY is not configured');
  }

  const response = await fetch(`${CLICKUP_BASE_URL}${endpoint}`, {
    headers: {
      Authorization: CLICKUP_API_KEY,
      'Content-Type': 'application/json',
    },
    next: { revalidate: 30 },
  });

  if (response.status === 429 && retries > 0) {
    const retryAfter = Math.min(parseInt(response.headers.get('Retry-After') ?? '1', 10), 3);
    await new Promise((r) => setTimeout(r, retryAfter * 1000));
    return clickupFetch<T>(endpoint, retries - 1);
  }

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

// Get all folders (customers) from Residential Customers space
export async function getResidentialFolders(): Promise<ClickUpFolder[]> {
  return getSpaceFolders(RESIDENTIAL_SPACE_ID);
}

// Get lists for a specific folder
export async function getFolderLists(folderId: string): Promise<ClickUpList[]> {
  const data = await clickupFetch<{ lists: ClickUpList[] }>(
    `/folder/${folderId}/list`,
  );
  return data.lists;
}

// Get nested subfolders inside a folder (ClickUp nested folder support)
async function getFolderSubFolders(folderId: string): Promise<ClickUpFolder[]> {
  try {
    const data = await clickupFetch<{ folders: ClickUpFolder[] }>(
      `/folder/${folderId}/folder`,
    );
    return (data.folders ?? []).filter((f) => !f.archived);
  } catch {
    return [];
  }
}

interface LocationFieldDef {
  id: string;
  options: Array<{ id: string; name: string; orderindex: number }>;
}

// Fetch the "Location" custom field definition for a folder, including its dropdown options.
// The folder/field endpoint returns full type_config; task responses often omit it.
async function getFolderLocationField(
  folderId: string,
): Promise<LocationFieldDef | null> {
  const data = await clickupFetch<{
    fields: Array<{
      id: string;
      name: string;
      type_config?: {
        options?: Array<{ id: string; name: string; orderindex: number }>;
      };
    }>;
  }>(`/folder/${folderId}/field`);

  const field = (data.fields ?? []).find((f) =>
    f.name.toLowerCase().includes('location'),
  );
  if (!field) return null;

  return {
    id: field.id,
    options: field.type_config?.options ?? [],
  };
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

  // If subtasks exist but don't have full details, fetch each one (throttled to avoid 429s)
  if (task.subtasks && task.subtasks.length > 0) {
    const fullSubtasks = await withConcurrency(
      task.subtasks.map((subtask) => () => getTask(subtask.id)),
      8,
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

// Return all ClickUp folders matching an Assembly entity (overrides + fuzzy, merged)
export async function findMatchingFolders(
  companyName: string,
  assemblyId?: string,
): Promise<ClickUpFolder[]> {
  const folders = await getCommercialFolders();
  const fuzzyMatches = findMatchingFoldersFuzzy(companyName, folders);

  // Merge manual overrides that aren't already covered by the fuzzy results
  if (assemblyId) {
    const overrides = await getFolderMappings();
    const mappings = (overrides[assemblyId] ?? []).filter((m) => m.clickupSpace === 'commercial');
    const seen = new Set(fuzzyMatches.map((f) => f.id));
    for (const m of mappings) {
      if (!seen.has(m.clickupFolderId)) {
        const found = folders.find((f) => f.id === m.clickupFolderId);
        if (found) {
          fuzzyMatches.push(found);
          seen.add(found.id);
        }
      }
    }
  }

  return fuzzyMatches;
}

// Find all ClickUp folders matching an Assembly company name (fuzzy, no overrides)
export async function findMatchingFolder(
  companyName: string,
): Promise<ClickUpFolder | null> {
  const folders = await getCommercialFolders();
  const matches = findMatchingFoldersFuzzy(companyName, folders);
  return matches[0] ?? null;
}

function findMatchingFoldersFuzzy(
  companyName: string,
  folders: ClickUpFolder[],
): ClickUpFolder[] {
  const normalizedCompany = normalizeForMatch(companyName);

  // Combine exact + starts-with in one pass so "Kresswood Trails North" matches both the
  // parent folder AND "Kresswood Trails North - 1", "Kresswood Trails North - 2", etc.
  // Boundary check: folder must start with the full company name followed by a space or end-of-string,
  // preventing "Park" from matching "Parking Lot Management".
  const startsWith = folders.filter((f) => {
    const nf = normalizeForMatch(f.name);
    const folderStartsWithCompany =
      nf.startsWith(normalizedCompany) &&
      (nf.length === normalizedCompany.length || nf[normalizedCompany.length] === ' ');
    const companyStartsWithFolder =
      normalizedCompany.startsWith(nf) &&
      (normalizedCompany.length === nf.length || normalizedCompany[nf.length] === ' ');
    return folderStartsWithCompany || companyStartsWithFolder;
  });
  if (startsWith.length > 0) return startsWith;

  // Word-overlap fallback
  const companyWords = normalizedCompany.split(' ').filter((w) => w.length > 2);
  return folders.filter((f) => {
    const folderWords = normalizeForMatch(f.name).split(' ').filter((w) => w.length > 2);
    const matchingWords = companyWords.filter((w) => folderWords.includes(w));
    return matchingWords.length >= Math.min(2, companyWords.length);
  });
}

// Extract category from ClickUp custom field or fall back to priority
function extractCategory(task: ClickUpTask): AssessmentItem['category'] {
  const categoryField = task.custom_fields?.filter(
    (field) => field.id === '3188285b-248d-4f23-b84d-58baddbaba0b',
  )[0];

  if (categoryField?.value !== undefined && categoryField?.value !== null) {
    if (categoryField.type_config?.options) {
      const valueAsNumber =
        typeof categoryField.value === 'string'
          ? parseInt(categoryField.value, 10)
          : categoryField.value;

      const option = categoryField.type_config.options.find(
        (opt) => opt.orderindex === valueAsNumber,
      );
      if (option) return option.name;
    }
  }

  // Fall back to priority if no custom field
  if (!task.priority) return 'Uncategorized';
  return task.priority.priority;
}

// Transform ClickUp task to AssessmentItem
function transformTaskToAssessmentItem(task: ClickUpTask): AssessmentItem {
  const description = task.description || task.text_content || '';
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
    description,
    images: (task.attachments || [])
      .filter((a) => {
        if (!a.url) return false;
        // HEIC/HEIF files don't render in browsers — only keep if ClickUp has a thumbnail
        if (!a.thumbnail_large) {
          const ext = a.url.split('?')[0].toLowerCase();
          if (ext.endsWith('.heic') || ext.endsWith('.heif')) return false;
          if (a.mimetype === 'image/heic' || a.mimetype === 'image/heif') return false;
        }
        return true;
      })
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
    updated_date: task.date_updated
      ? new Date(parseInt(task.date_updated)).toISOString().split('T')[0]
      : new Date(parseInt(task.date_created)).toISOString().split('T')[0],
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

// Returns true if the Approval Needed custom field is checked on a task.
// Falls back to name match so hourly-space tasks (different field ID, same name) are handled.
function extractApprovalNeeded(task: ClickUpTask): boolean {
  const field =
    task.custom_fields?.find((f) => f.id === APPROVAL_NEEDED_FIELD_ID) ??
    task.custom_fields?.find(
      (f) => f.name?.toLowerCase() === 'approval needed',
    );
  if (!field) return false;
  return (
    field.value === true ||
    field.value === 'true' ||
    field.value === 1 ||
    field.value === '1'
  );
}

// Returns the Location dropdown value for a task.
// Uses the folder field definition's options as fallback when the task response
// omits type_config (common in list/task endpoints).
function extractLocationField(
  task: ClickUpTask,
  locationField: LocationFieldDef | null,
): string {
  if (!locationField) return '';

  const taskField = task.custom_fields?.find((f) => f.id === locationField.id);
  if (taskField?.value === undefined || taskField?.value === null) return '';

  // Text / short_text fields — value is already the string
  const options = taskField.type_config?.options ?? locationField.options;
  if (options.length === 0) {
    return typeof taskField.value === 'string'
      ? taskField.value
      : String(taskField.value);
  }

  // Dropdown — resolve orderindex to option name
  const valueAsNumber =
    typeof taskField.value === 'string'
      ? parseInt(taskField.value, 10)
      : Number(taskField.value);
  const option = options.find((opt) => opt.orderindex === valueAsNumber);
  return option?.name ?? '';
}

// Get all assessment parent tasks (locations) for a commercial company.
// Looks for the "Assessments" list in the matching folder.
export async function getCommercialAssessmentLocations(
  companyName: string,
  assemblyId?: string,
): Promise<AssessmentParent[]> {
  const folders = await findMatchingFolders(companyName, assemblyId);
  if (folders.length === 0) return [];

  const folderResults = await withConcurrency(
    folders.map((folder) => async () => {
      const [assessmentList, locationField] = await Promise.all([
        getAssessmentListForFolder(folder.id),
        getFolderLocationField(folder.id),
      ]);
      if (!assessmentList) return [];

      const tasks = await getListTasks(assessmentList.id, false);
      return tasks
        .filter((t) => !t.parent && t.name.toLowerCase().includes('assessment'))
        .map((t) => ({
          taskId: t.id,
          taskName: t.name,
          location: extractLocationField(t, locationField),
          date: new Date(parseInt(t.date_updated ?? t.date_created)).toISOString().split('T')[0],
          created_date: new Date(parseInt(t.date_created)).toISOString().split('T')[0],
          updated_date: new Date(parseInt(t.date_updated ?? t.date_created)).toISOString().split('T')[0],
          status: t.status.status,
          statusColor: t.status.color || '#6b7280',
          folderName: folder.name,
        }));
    }),
    5,
  );

  const all = folderResults.flat();
  all.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  return all;
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
    parentTaskName: parent.taskName,
  }));

  return {
    id: `assess_${companyId}_${parent.taskId}`,
    customer_id: companyId,
    customer_name: companyName,
    assessment_name: parent.taskName,
    assessment_date: parent.date,
    description: fullTask.description || fullTask.text_content || '',
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
    assessment_name: folderName,
    assessment_date: new Date().toISOString().split('T')[0],
    description: '',
    location: '',
    technician: null,
    items,
    status: 'draft',
    created_at: Date.now().toString(),
  };
}
