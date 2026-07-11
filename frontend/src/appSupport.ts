export type ProjectItem = {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  documentCount: number;
};

export type WorkspaceHealthStatus = 'ready' | 'review' | 'setup';

export type WorkspaceHealthCheck = {
  name: string;
  status: WorkspaceHealthStatus;
  detail: string;
};

export type WorkspaceHealth = {
  projectId: string;
  score: number;
  status: WorkspaceHealthStatus;
  summary: string;
  documentCount: number;
  chunkCount: number;
  memoryCount: number;
  staleMemoryCount: number;
  repositoryCount: number;
  recentlySyncedRepositoryCount: number;
  checks: WorkspaceHealthCheck[];
};

export type DocumentItem = {
  id: string;
  projectId: string;
  projectName: string;
  name: string;
  format: string;
  sizeBytes: number;
  createdAt: string;
  chunkCount: number;
};

export type SearchResult = {
  projectId: string;
  projectName: string;
  documentId: string;
  documentName: string;
  pageNumber?: number;
  chunkId: string;
  score: number;
  text: string;
};

export type ChatResponse = {
  answer: string;
  sources: SearchResult[];
  provider: string;
  createdAt: string;
};

export type OptimizedContext = {
  summary: string;
  criticalContext: string[];
  importantContext: string[];
  optionalContext?: string[];
  sources: string[];
  preview?: ContextPreviewItem[];
  estimatedTokens: number;
  tokenSavings?: {
    originalTokens: number;
    optimizedTokens: number;
    savedTokens: number;
    savingsPercent: number;
    targetTokens: number;
  };
  compression?: string;
  budgetProfile?: string;
};

export type ContextPreviewItem = {
  source: string;
  documentId: string;
  chunkId: string;
  score: number;
  estimatedTokens: number;
  reason: string;
  artifactKind?: string;
  compressed: boolean;
};

export type ConversationTurn = {
  id: string;
  question: string;
  response: ChatResponse;
};

export type AdminStatus = {
  provider: string;
  model: string;
  availableProviders: string[];
  qdrantUrl: string;
  index: {
    documentCount: number;
    chunkCount: number;
    vectorStore: string;
    collection: string;
  };
  settings: RuntimeSettings;
};

export type AgentActivity = {
  id: string;
  type: string;
  action: string;
  detail: string;
  status: 'success' | 'failure';
  projectId?: string;
  sessionId?: string;
  createdAt: string;
};

export type RuntimeSettings = {
  llm: {
    provider: string;
    model: string;
    apiKey: string;
    baseUrl: string;
  };
  optimizer: {
    mode: string;
    maxTokens: number;
    budgetProfile: string;
  };
  localLlm: {
    enabled: boolean;
    provider: string;
    baseUrl: string;
    model: string;
  };
  embedding: {
    provider: string;
    model: string;
    baseUrl: string;
    dimensions: number;
  };
  repositoryAgent: {
    path: string;
    scheduled: boolean;
    intervalMs: number;
  };
};

export type DeleteProjectResult = {
  deleted: boolean;
  projectId: string;
  projectName: string;
  deletedDocuments: number;
  deletedRepositoryMetadata: number;
};

export type MemoryFreshness = {
  status: 'current' | 'stale';
  reason?: string;
  changedFiles: string[];
  newestChangeAt?: string;
};

export type MemoryItem = {
  id: string;
  type: string;
  content: string;
  confidence: number;
  createdAt: string;
  usageCount: number;
  lastAccessedAt?: string;
  repository?: string;
  module?: string;
  projectIds: string[];
  freshness?: MemoryFreshness;
};

export type RepositoryFileMetadata = {
  documentId: string;
  repository: string;
  repositoryRoot: string;
  filePath: string;
  module: string;
  language: string;
  lastModifiedAt: string;
  sizeBytes: number;
  contentHash: string;
  indexedAt: string;
  deleted: boolean;
};

export type RepositorySummary = {
  repositoryId: string;
  repository: string;
  repositoryRoot: string;
  language: string;
  status: string;
  trackedFiles: number;
  deletedFiles: number;
  lastIndexedAt?: string;
  projectIds: string[];
};

export type RepositoryAgentStatus = {
  configuredPath?: string;
  trackedFiles: number;
  deletedFiles: number;
  lastIndexedAt?: string;
  repositories: RepositorySummary[];
  files: RepositoryFileMetadata[];
};

export type RepositoryItem = {
  id: string;
  name: string;
  path: string;
  language: string;
  lastSyncedAt?: string;
  status: string;
};

export type RepositoryDeleteResult = {
  deleted: boolean;
  repositoryId: string;
  repositoryName: string;
  deletedIndexedKnowledge: number;
};

export type DebugSession = {
  id: string;
  title: string;
  status: 'active' | 'archived';
  createdAt: string;
  updatedAt: string;
};

export type DebugInputType = 'csv' | 'json' | 'log';
export type DebugSanitizerMode = 'strict' | 'balanced' | 'permissive';

export type DebugWarning = {
  type: 'email' | 'phone' | 'name' | 'address' | 'unknown_pii' | 'risky_column';
  message: string;
  field?: string;
  count?: number;
};

export type SanitizationSummary = {
  kept: number;
  tokenized: number;
  redacted: number;
  removed: number;
  hashed: number;
  truncated: number;
  generalized: number;
  warnings: number;
};

export type SanitizationAuditEntry = {
  field: string;
  action: 'keep' | 'remove' | 'redact' | 'tokenize' | 'hash' | 'truncate' | 'generalize' | 'warn';
  matchedRule: string;
  source: 'built_in' | 'project' | 'session';
  originalDetectedType?: string;
  result?: string;
  blocking: boolean;
};

export type SanitizationRule = {
  id: string;
  enabled: boolean;
  fieldPattern: string;
  matchType: 'exact' | 'glob' | 'regex';
  action: SanitizationAuditEntry['action'];
  tokenType?: string;
  priority: number;
  protection: 'normal' | 'protected' | 'hard_blocked';
};

export type SensitiveDataDetector = {
  id: string;
  name: string;
  enabled: boolean;
  action: SanitizationAuditEntry['action'];
  replacementType?: string;
};

export type SanitizationProfile = {
  id: string;
  name: string;
  description?: string;
  scope: 'built_in' | 'project' | 'session';
  enabled: boolean;
  defaultAction: SanitizationAuditEntry['action'];
  unknownFieldBehavior: 'remove' | 'redact' | 'warn' | 'keep';
  strictMode: boolean;
  rules: SanitizationRule[];
  detectors: SensitiveDataDetector[];
  updatedAt: string;
};

export type DebugTokenMapping = {
  sessionId: string;
  token: string;
  entityType: string;
  table: string;
  column: string;
  realValue: string;
  createdAt: string;
};

export type DebugArtifact = {
  id: string;
  sessionId: string;
  inputType: DebugInputType;
  sourceName: string;
  sanitizedText: string;
  compactText?: string;
  rawTokenEstimate?: number;
  compressedTokenEstimate?: number;
  reductionPercent?: number;
  profileName?: string;
  publishable?: boolean;
  summary?: SanitizationSummary;
  audit?: SanitizationAuditEntry[];
  sanitizedContent?: string;
  warningSummary: DebugWarning[];
  dataRequestId?: string;
  createdAt: string;
};

export type DebugArtifactSlice = {
  artifactId: string;
  startLine: number;
  endLine: number;
  text: string;
};

export type DebugArtifactReference = {
  id: string;
  sourceName: string;
  inputType: DebugInputType;
  createdAt: string;
  lineCount: number;
};

export type DebugArtifactDiffLine = {
  type: 'added' | 'removed';
  lineNumber: number;
  text: string;
};

export type DebugArtifactComparison = {
  left: DebugArtifactReference;
  right: DebugArtifactReference;
  summary: string;
  unchangedLineCount: number;
  totalChangedLines: number;
  addedLines: DebugArtifactDiffLine[];
  removedLines: DebugArtifactDiffLine[];
};

export type DebugDataRequest = {
  id: string;
  sessionId: string;
  status: 'pending' | 'completed' | 'rejected';
  entity: string;
  relation?: string;
  parentToken?: string;
  reason: string;
  requestedFields: string[];
  suggestedSql?: string;
  createdAt: string;
  completedAt?: string;
};

export type DebugNote = {
  id: string;
  sessionId: string;
  request: string;
  createdAt: string;
};

export type DebugAuditEvent = {
  id: string;
  sessionId: string;
  action: string;
  detail: string;
  createdAt: string;
};

export type DebugMemorySuggestion = {
  id: string;
  type: string;
  content: string;
  confidence: number;
  reason: string;
};

export type DebugSessionDetail = {
  session: DebugSession;
  tokenMappings: DebugTokenMapping[];
  artifacts: DebugArtifact[];
  dataRequests: DebugDataRequest[];
  notes: DebugNote[];
  auditEvents: DebugAuditEvent[];
  memorySuggestions: DebugMemorySuggestion[];
};

export type SanitizeDebugResponse = {
  session: DebugSession;
  sanitizedText: string;
  artifact: DebugArtifact;
  warnings: DebugWarning[];
  tokenMappings: DebugTokenMapping[];
};

export type View = 'home' | 'workspaces' | 'repositories' | 'memories' | 'knowledge' | 'safeDebug' | 'optimizer' | 'settings' | 'chat';
export type IngestMode = 'upload' | 'text';

export const viewRoutes: Record<View, string> = {
  home: '/',
  workspaces: '/workspaces',
  repositories: '/repositories',
  memories: '/memories',
  knowledge: '/knowledge',
  safeDebug: '/safe-debug',
  optimizer: '/optimize',
  chat: '/chat',
  settings: '/settings'
};

export const PROJECT_QUERY_PARAM = 'project';
export const CUSTOM_MODEL = '__custom__';
export const DISABLED_MODEL = '__disabled__';
export const chatModelOptions = ['llama3.1', 'qwen2.5:7b', 'mistral', 'codellama'];
export const compressionModelOptions = ['qwen2.5:7b', 'llama3.1', 'mistral'];
export const embeddingModelOptions = ['nomic-embed-text', 'bge-m3'];
export const contextBudgetProfiles = [
  { value: 'small', label: 'Small', maxTokens: 1200, description: 'Focused context for narrow edits.' },
  { value: 'standard', label: 'Standard', maxTokens: 3000, description: 'Default context for normal coding tasks.' },
  { value: 'deep', label: 'Deep', maxTokens: 6000, description: 'Broader context for refactors and unfamiliar code.' },
];
export const contextBudgetProfileOptions = contextBudgetProfiles.map((profile) => ({ value: profile.value, label: profile.label }));
export const memoryTypes = ['ArchitectureDecision', 'CodingConvention', 'BugFix', 'Pattern', 'ProjectKnowledge', 'DomainKnowledge', 'TechnicalDebt'];
export const memoryLabels: Record<string, string> = {
  ArchitectureDecision: 'Architecture',
  CodingConvention: 'Conventions',
  BugFix: 'Bug fixes',
  Pattern: 'Patterns',
  ProjectKnowledge: 'Workspace',
  DomainKnowledge: 'Domain',
  TechnicalDebt: 'Debt'
};

export const taskTemplates = [
  {
    value: 'bug-fix',
    label: 'Bug fix',
    description: 'Find failure context, likely owner code, related tests, and prior bug lessons.',
    task: 'Fix a bug. Include the failing behavior, likely affected module, relevant tests, previous bug-fix memories, and the smallest code context needed to make the change safely.',
    maxTokens: 3000,
    budgetProfile: 'standard',
  },
  {
    value: 'add-endpoint',
    label: 'Add endpoint',
    description: 'Pull controller, service, DTO, validation, API conventions, and tests.',
    task: 'Add a new API endpoint. Include controller conventions, service flow, DTO/entity naming patterns, validation rules, error handling style, and related endpoint tests.',
    maxTokens: 4500,
    budgetProfile: 'deep',
  },
  {
    value: 'ui-change',
    label: 'UI change',
    description: 'Focus on frontend components, design-system usage, routes, and state.',
    task: 'Implement a UI change. Include relevant React components, Mantine design-system patterns, route/state handling, accessibility concerns, and nearby UI tests or build constraints.',
    maxTokens: 3000,
    budgetProfile: 'standard',
  },
  {
    value: 'refactor',
    label: 'Refactor',
    description: 'Prioritize dependencies, contracts, callers, tests, and behavior risks.',
    task: 'Refactor existing code without changing behavior. Include dependency chains, public contracts, callers, related tests, conventions, and known risks.',
    maxTokens: 6000,
    budgetProfile: 'deep',
  },
  {
    value: 'safe-debug',
    label: 'Safe Debug',
    description: 'Use sanitized artifacts, compact logs, token mappings, and data requests.',
    task: 'Debug a production-like issue using Safe Debug only. Include compact sanitized artifacts, exception and failed-request clues, tokenized identifiers, related memories, and any small sanitized slices needed.',
    maxTokens: 4500,
    budgetProfile: 'deep',
  },
];

export const memoryBadgeColor = (type: string) => {
  if (type === 'BugFix') return 'red';
  if (type === 'CodingConvention') return 'blue';
  if (type === 'TechnicalDebt') return 'yellow';
  return 'teal';
};

export const formatBytes = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
};

export const activityTitle = (action: string) => {
  const labels: Record<string, string> = {
    recall_memory: 'Agent recalled memory',
    optimize_context: 'Agent optimized context',
    build_context_package: 'Agent built context package',
    search_documents: 'Agent searched knowledge',
    remember: 'Agent stored memory',
    get_debug_session_state: 'Agent inspected Safe Debug',
    get_debug_artifact_slice: 'Agent expanded debug slice',
    create_debug_data_request: 'Agent requested debug data',
    add_artifact: 'Agent added artifact',
  };
  return labels[action] ?? `Agent used ${action.replaceAll('_', ' ')}`;
};

export const safeDebugInstructionFor = (sessionId?: string) => `You are connected to a Safe Debug Session.

Current sessionId: ${sessionId || '<select a debug session>'}

Use only sanitized artifacts from the session.
Artifacts are compacted for agent use by default.
When compact context is not enough, call get_debug_artifact_slice for a small sanitized line range.
Do not ask the developer for raw production data.
Do not ask for names, emails, phone numbers, addresses, or other PII.

When you need more data, call create_debug_data_request with:
- sessionId
- entity
- relation
- parentToken
- reason
- requestedFields

Example:
Need orders for USER_001 because payment status depends on order state.

Do not write free-text requests in chat unless the MCP request tool is unavailable.`;

export const relationSqlTemplates: Record<string, Record<string, string>> = {
  users: {
    orders: 'SELECT *\nFROM orders\nWHERE user_id = {{realValue}};',
    payments: 'SELECT *\nFROM payments\nWHERE user_id = {{realValue}};'
  },
  orders: {
    payment_attempts: 'SELECT *\nFROM payment_attempts\nWHERE order_id = {{realValue}};',
    order_items: 'SELECT *\nFROM order_items\nWHERE order_id = {{realValue}};'
  }
};

export function selectValue(value: string, options: string[]): string {
  return options.includes(value) ? value : CUSTOM_MODEL;
}

export function viewFromPath(pathname: string): View {
  const normalized = pathname.replace(/\/+$/, '') || '/';
  const match = Object.entries(viewRoutes).find(([, path]) => path === normalized);
  return (match?.[0] as View | undefined) ?? 'home';
}

export function projectIdFromSearch(search: string): string {
  return new URLSearchParams(search).get(PROJECT_QUERY_PARAM) ?? '';
}

export function routeFor(view: View, projectId: string): string {
  const params = new URLSearchParams(window.location.search);
  if (projectId) {
    params.set(PROJECT_QUERY_PARAM, projectId);
  } else {
    params.delete(PROJECT_QUERY_PARAM);
  }
  const query = params.toString();
  return `${viewRoutes[view]}${query ? `?${query}` : ''}`;
}

export async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  if (!response.ok) {
    const body = await response.text();
    if (response.status === 502 || body.includes('Bad Gateway')) {
      throw new Error('Backend is unavailable. Start or restart the backend service, then retry.');
    }
    throw new Error(readableError(body) || `${response.status} ${response.statusText}`);
  }
  if (response.status === 204) return undefined as T;
  const body = await response.text();
  if (!body) return undefined as T;
  return JSON.parse(body) as T;
}

export function readableError(body: string): string {
  if (!body) return '';
  try {
    const parsed = JSON.parse(body);
    return parsed.message || parsed.error || parsed.detail || body;
  } catch {
    return body.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  }
}

export function errorMessage(err: unknown, fallback: string): string {
  return err instanceof Error && err.message ? err.message : fallback;
}

export function sqlLiteral(value: string): string {
  return /^-?\d+(\.\d+)?$/.test(value) ? value : `'${value.replaceAll("'", "''")}'`;
}
