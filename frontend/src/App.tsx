import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  AppShell,
  ActionIcon,
  Badge,
  Box,
  Button,
  Checkbox,
  FileInput,
  Group,
  Image,
  LoadingOverlay,
  Menu,
  NavLink,
  NativeSelect,
  NumberInput,
  Paper,
  Pagination,
  Progress,
  ScrollArea,
  SegmentedControl,
  Select,
  SimpleGrid,
  Stack,
  Table,
  Tabs,
  Text,
  Textarea,
  TextInput,
  ThemeIcon,
  Title,
  useMantineColorScheme,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
  AlertCircle,
  Archive,
  BookOpen,
  Brain,
  CheckCircle2,
  Clock3,
  Clipboard,
  Copy,
  FilePlus2,
  FileText,
  FolderPlus,
  Home,
  KeyRound,
  Layers,
  Moon,
  Network,
  Plus,
  RefreshCw,
  Search,
  Send,
  Settings,
  ShieldCheck,
  Sparkles,
  Sun,
  Trash2,
  Upload,
  Zap
} from 'lucide-react';

type ProjectItem = {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  documentCount: number;
};

type DocumentItem = {
  id: string;
  projectId: string;
  projectName: string;
  name: string;
  format: string;
  sizeBytes: number;
  createdAt: string;
  chunkCount: number;
};

type SearchResult = {
  projectId: string;
  projectName: string;
  documentId: string;
  documentName: string;
  pageNumber?: number;
  chunkId: string;
  score: number;
  text: string;
};

type ChatResponse = {
  answer: string;
  sources: SearchResult[];
  provider: string;
  createdAt: string;
};

type OptimizedContext = {
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
};

type ContextPreviewItem = {
  source: string;
  documentId: string;
  chunkId: string;
  score: number;
  estimatedTokens: number;
  reason: string;
  artifactKind?: string;
  compressed: boolean;
};

type ConversationTurn = {
  id: string;
  question: string;
  response: ChatResponse;
};

type AdminStatus = {
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

type AgentActivity = {
  id: string;
  type: string;
  action: string;
  detail: string;
  status: 'success' | 'failure';
  projectId?: string;
  sessionId?: string;
  createdAt: string;
};

type RuntimeSettings = {
  llm: {
    provider: string;
    model: string;
    apiKey: string;
    baseUrl: string;
  };
  optimizer: {
    mode: string;
    maxTokens: number;
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

type DeleteProjectResult = {
  deleted: boolean;
  projectId: string;
  projectName: string;
  deletedDocuments: number;
  deletedRepositoryMetadata: number;
};

type MemoryItem = {
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
};

type RepositoryFileMetadata = {
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

type RepositorySummary = {
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

type RepositoryAgentStatus = {
  configuredPath?: string;
  trackedFiles: number;
  deletedFiles: number;
  lastIndexedAt?: string;
  repositories: RepositorySummary[];
  files: RepositoryFileMetadata[];
};

type RepositoryItem = {
  id: string;
  name: string;
  path: string;
  language: string;
  lastSyncedAt?: string;
  status: string;
};

type RepositoryDeleteResult = {
  deleted: boolean;
  repositoryId: string;
  repositoryName: string;
  deletedIndexedKnowledge: number;
};

type DebugSession = {
  id: string;
  title: string;
  status: 'active' | 'archived';
  createdAt: string;
  updatedAt: string;
};

type DebugInputType = 'csv' | 'json' | 'log';
type DebugSanitizerMode = 'strict' | 'balanced' | 'permissive';

type DebugWarning = {
  type: 'email' | 'phone' | 'name' | 'address' | 'unknown_pii' | 'risky_column';
  message: string;
  field?: string;
  count?: number;
};

type DebugTokenMapping = {
  sessionId: string;
  token: string;
  entityType: string;
  table: string;
  column: string;
  realValue: string;
  createdAt: string;
};

type DebugArtifact = {
  id: string;
  sessionId: string;
  inputType: DebugInputType;
  sourceName: string;
  sanitizedText: string;
  compactText?: string;
  rawTokenEstimate?: number;
  compressedTokenEstimate?: number;
  reductionPercent?: number;
  warningSummary: DebugWarning[];
  dataRequestId?: string;
  createdAt: string;
};

type DebugArtifactSlice = {
  artifactId: string;
  startLine: number;
  endLine: number;
  text: string;
};

type DebugDataRequest = {
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

type DebugNote = {
  id: string;
  sessionId: string;
  request: string;
  createdAt: string;
};

type DebugAuditEvent = {
  id: string;
  sessionId: string;
  action: string;
  detail: string;
  createdAt: string;
};

type DebugSessionDetail = {
  session: DebugSession;
  tokenMappings: DebugTokenMapping[];
  artifacts: DebugArtifact[];
  dataRequests: DebugDataRequest[];
  notes: DebugNote[];
  auditEvents: DebugAuditEvent[];
};

type SanitizeDebugResponse = {
  session: DebugSession;
  sanitizedText: string;
  artifact: DebugArtifact;
  warnings: DebugWarning[];
  tokenMappings: DebugTokenMapping[];
};

type View = 'home' | 'workspaces' | 'repositories' | 'memories' | 'knowledge' | 'safeDebug' | 'optimizer' | 'settings' | 'chat';
type IngestMode = 'upload' | 'text';

const viewRoutes: Record<View, string> = {
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

const PROJECT_QUERY_PARAM = 'project';
const CUSTOM_MODEL = '__custom__';
const DISABLED_MODEL = '__disabled__';
const chatModelOptions = ['llama3.1', 'qwen2.5:7b', 'mistral', 'codellama'];
const compressionModelOptions = ['qwen2.5:7b', 'llama3.1', 'mistral'];
const embeddingModelOptions = ['nomic-embed-text', 'bge-m3'];
const memoryTypes = ['ArchitectureDecision', 'CodingConvention', 'BugFix', 'Pattern', 'ProjectKnowledge', 'DomainKnowledge', 'TechnicalDebt'];
const memoryLabels: Record<string, string> = {
  ArchitectureDecision: 'Architecture',
  CodingConvention: 'Conventions',
  BugFix: 'Bug fixes',
  Pattern: 'Patterns',
  ProjectKnowledge: 'Workspace',
  DomainKnowledge: 'Domain',
  TechnicalDebt: 'Debt'
};

const taskTemplates = [
  {
    value: 'bug-fix',
    label: 'Bug fix',
    description: 'Find failure context, likely owner code, related tests, and prior bug lessons.',
    task: 'Fix a bug. Include the failing behavior, likely affected module, relevant tests, previous bug-fix memories, and the smallest code context needed to make the change safely.',
    maxTokens: 3000,
  },
  {
    value: 'add-endpoint',
    label: 'Add endpoint',
    description: 'Pull controller, service, DTO, validation, API conventions, and tests.',
    task: 'Add a new API endpoint. Include controller conventions, service flow, DTO/entity naming patterns, validation rules, error handling style, and related endpoint tests.',
    maxTokens: 4500,
  },
  {
    value: 'ui-change',
    label: 'UI change',
    description: 'Focus on frontend components, design-system usage, routes, and state.',
    task: 'Implement a UI change. Include relevant React components, Mantine design-system patterns, route/state handling, accessibility concerns, and nearby UI tests or build constraints.',
    maxTokens: 3000,
  },
  {
    value: 'refactor',
    label: 'Refactor',
    description: 'Prioritize dependencies, contracts, callers, tests, and behavior risks.',
    task: 'Refactor existing code without changing behavior. Include dependency chains, public contracts, callers, related tests, conventions, and known risks.',
    maxTokens: 6000,
  },
  {
    value: 'safe-debug',
    label: 'Safe Debug',
    description: 'Use sanitized artifacts, compact logs, token mappings, and data requests.',
    task: 'Debug a production-like issue using Safe Debug only. Include compact sanitized artifacts, exception and failed-request clues, tokenized identifiers, related memories, and any small sanitized slices needed.',
    maxTokens: 4500,
  },
];

const memoryBadgeColor = (type: string) => {
  if (type === 'BugFix') return 'red';
  if (type === 'CodingConvention') return 'blue';
  if (type === 'TechnicalDebt') return 'yellow';
  return 'teal';
};

const formatBytes = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
};

const activityTitle = (action: string) => {
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

const safeDebugInstructionFor = (sessionId?: string) => `You are connected to a Safe Debug Session.

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

const relationSqlTemplates: Record<string, Record<string, string>> = {
  users: {
    orders: 'SELECT *\nFROM orders\nWHERE user_id = {{realValue}};',
    payments: 'SELECT *\nFROM payments\nWHERE user_id = {{realValue}};'
  },
  orders: {
    payment_attempts: 'SELECT *\nFROM payment_attempts\nWHERE order_id = {{realValue}};',
    order_items: 'SELECT *\nFROM order_items\nWHERE order_id = {{realValue}};'
  }
};

function selectValue(value: string, options: string[]): string {
  return options.includes(value) ? value : CUSTOM_MODEL;
}

function viewFromPath(pathname: string): View {
  const normalized = pathname.replace(/\/+$/, '') || '/';
  const match = Object.entries(viewRoutes).find(([, path]) => path === normalized);
  return (match?.[0] as View | undefined) ?? 'home';
}

function projectIdFromSearch(search: string): string {
  return new URLSearchParams(search).get(PROJECT_QUERY_PARAM) ?? '';
}

function routeFor(view: View, projectId: string): string {
  const params = new URLSearchParams(window.location.search);
  if (projectId) {
    params.set(PROJECT_QUERY_PARAM, projectId);
  } else {
    params.delete(PROJECT_QUERY_PARAM);
  }
  const query = params.toString();
  return `${viewRoutes[view]}${query ? `?${query}` : ''}`;
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
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

function readableError(body: string): string {
  if (!body) return '';
  try {
    const parsed = JSON.parse(body);
    return parsed.message || parsed.error || parsed.detail || body;
  } catch {
    return body.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  }
}

function errorMessage(err: unknown, fallback: string): string {
  return err instanceof Error && err.message ? err.message : fallback;
}

function sqlLiteral(value: string): string {
  return /^-?\d+(\.\d+)?$/.test(value) ? value : `'${value.replaceAll("'", "''")}'`;
}

export default function App() {
  const { colorScheme, setColorScheme } = useMantineColorScheme();
  const [view, setView] = useState<View>(() => viewFromPath(window.location.pathname));
  const [ingestMode, setIngestMode] = useState<IngestMode>('text');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>(() => projectIdFromSearch(window.location.search));
  const [projectName, setProjectName] = useState('');
  const [textTitle, setTextTitle] = useState('');
  const [textBody, setTextBody] = useState('');
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [memories, setMemories] = useState<MemoryItem[]>([]);
  const [allMemories, setAllMemories] = useState<MemoryItem[]>([]);
  const [repositoryStatus, setRepositoryStatus] = useState<RepositoryAgentStatus | null>(null);
  const [repositories, setRepositories] = useState<RepositoryItem[]>([]);
  const [projectRepositories, setProjectRepositories] = useState<RepositoryItem[]>([]);
  const [agentActivities, setAgentActivities] = useState<AgentActivity[]>([]);
  const [debugSessions, setDebugSessions] = useState<DebugSession[]>([]);
  const [activeDebugSessionId, setActiveDebugSessionId] = useState('');
  const [debugDetail, setDebugDetail] = useState<DebugSessionDetail | null>(null);
  const [debugTitle, setDebugTitle] = useState('');
  const [debugRawText, setDebugRawText] = useState('');
  const [debugInputType, setDebugInputType] = useState<DebugInputType>('csv');
  const [debugSanitizerMode, setDebugSanitizerMode] = useState<DebugSanitizerMode>('balanced');
  const [debugSourceName, setDebugSourceName] = useState('users');
  const [debugDataRequestId, setDebugDataRequestId] = useState('');
  const [debugSanitizedText, setDebugSanitizedText] = useState('');
  const [debugWarnings, setDebugWarnings] = useState<DebugWarning[]>([]);
  const [debugArtifactSliceStart, setDebugArtifactSliceStart] = useState(1);
  const [debugArtifactSliceEnd, setDebugArtifactSliceEnd] = useState(80);
  const [debugArtifactSlice, setDebugArtifactSlice] = useState<DebugArtifactSlice | null>(null);
  const [debugTokenQuery, setDebugTokenQuery] = useState('');
  const [debugResolvedToken, setDebugResolvedToken] = useState<DebugTokenMapping | null>(null);
  const [debugTokenSearch, setDebugTokenSearch] = useState('');
  const [agentRequestDraft, setAgentRequestDraft] = useState('');
  const [repositoryToLink, setRepositoryToLink] = useState('');
  const [deleteRepositoryKnowledge, setDeleteRepositoryKnowledge] = useState(false);
  const [memoryFilter, setMemoryFilter] = useState<string>('all');
  const [memorySearch, setMemorySearch] = useState('');
  const [memoryPage, setMemoryPage] = useState(1);
  const [memoryPageSize, setMemoryPageSize] = useState(12);
  const [repositoryFilePage, setRepositoryFilePage] = useState(1);
  const [repositoryFilePageSize, setRepositoryFilePageSize] = useState(25);
  const [memoryTypeDraft, setMemoryTypeDraft] = useState('CodingConvention');
  const [memoryContentDraft, setMemoryContentDraft] = useState('');
  const [memoryRepositoryDraft, setMemoryRepositoryDraft] = useState('');
  const [memoryToLink, setMemoryToLink] = useState('');
  const [debugMemoryTypeDraft, setDebugMemoryTypeDraft] = useState('BugFix');
  const [debugMemoryContentDraft, setDebugMemoryContentDraft] = useState('');
  const [debugMemoryRepositoryDraft, setDebugMemoryRepositoryDraft] = useState('');
  const [debugMemoryModuleDraft, setDebugMemoryModuleDraft] = useState('');
  const [debugMemoryConfidenceDraft, setDebugMemoryConfidenceDraft] = useState(0.9);
  const [status, setStatus] = useState<AdminStatus | null>(null);
  const [settingsDraft, setSettingsDraft] = useState<RuntimeSettings | null>(null);
  const [question, setQuestion] = useState('');
  const [task, setTask] = useState('');
  const [selectedTaskTemplate, setSelectedTaskTemplate] = useState('');
  const [optimizerTokenBudget, setOptimizerTokenBudget] = useState(3000);
  const [optimizedContext, setOptimizedContext] = useState<OptimizedContext | null>(null);
  const [history, setHistory] = useState<ConversationTurn[]>([]);
  const [activeSource, setActiveSource] = useState<SearchResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedProject = projects.find((project) => project.id === selectedProjectId);

  const showToast = (toast: { type: 'success' | 'error'; title: string; message?: string }) => {
    notifications.show({
      color: toast.type === 'success' ? 'teal' : 'red',
      title: toast.title,
      message: toast.message,
      icon: toast.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />,
      autoClose: toast.type === 'error' ? 6500 : 4200,
    });
  };

  const reportError = (err: unknown, fallback: string) => {
    const message = errorMessage(err, fallback);
    setError(message);
    showToast({ type: 'error', title: fallback, message });
  };

  const navigate = (nextView: View) => {
    const route = routeFor(nextView, selectedProjectId);
    if (`${window.location.pathname}${window.location.search}` !== route) {
      window.history.pushState({}, '', route);
    }
    setView(nextView);
  };

  const refresh = async () => {
    const [projectList, docs, admin] = await Promise.all([
      request<ProjectItem[]>('/api/projects'),
      request<DocumentItem[]>(selectedProjectId ? `/api/documents?projectId=${selectedProjectId}` : '/api/documents'),
      request<AdminStatus>('/api/admin/status')
    ]);
    const [memoryList, allMemoryList, repoStatus] = await Promise.all([
      request<MemoryItem[]>(selectedProjectId ? `/api/memories?projectId=${selectedProjectId}` : '/api/memories').catch(() => []),
      request<MemoryItem[]>('/api/memories').catch(() => []),
      request<RepositoryAgentStatus>('/api/repository-agent/status').catch(() => null)
    ]);
    const [repositoryList, linkedRepositories] = await Promise.all([
      request<RepositoryItem[]>('/api/repositories').catch(() => []),
      selectedProjectId ? request<RepositoryItem[]>(`/api/projects/${selectedProjectId}/repositories`).catch(() => []) : Promise.resolve([])
    ]);
    const [safeDebugSessions, activities] = await Promise.all([
      request<DebugSession[]>('/api/debug-sessions').catch(() => []),
      request<AgentActivity[]>('/api/activity?limit=20').catch(() => []),
    ]);
    setProjects(projectList);
    if (projectList.length > 0) {
      const hasSelectedProject = projectList.some((project) => project.id === selectedProjectId);
      if (!selectedProjectId || !hasSelectedProject) setSelectedProjectId(projectList[0].id);
    }
    setDocuments(docs);
    setMemories(memoryList);
    setAllMemories(allMemoryList);
    setRepositoryStatus(repoStatus);
    setRepositories(repositoryList);
    setProjectRepositories(linkedRepositories);
    setDebugSessions(safeDebugSessions);
    setAgentActivities(activities);
    if (!activeDebugSessionId && safeDebugSessions.length > 0) setActiveDebugSessionId(safeDebugSessions[0].id);
    setStatus(admin);
    setSettingsDraft(admin.settings);
  };

  useEffect(() => {
    refresh().catch((err) => reportError(err, 'Failed to load workspace'));
  }, [selectedProjectId]);

  useEffect(() => {
    const onPopState = () => {
      setView(viewFromPath(window.location.pathname));
      setSelectedProjectId(projectIdFromSearch(window.location.search));
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  useEffect(() => {
    const route = routeFor(view, selectedProjectId);
    if (`${window.location.pathname}${window.location.search}` !== route) {
      window.history.replaceState({}, '', route);
    }
  }, [selectedProjectId, view]);

  useEffect(() => {
    if (!activeDebugSessionId) {
      setDebugDetail(null);
      return;
    }
    request<DebugSessionDetail>(`/api/debug-sessions/${activeDebugSessionId}`)
      .then(setDebugDetail)
      .catch((err) => reportError(err, 'Debug session load failed'));
  }, [activeDebugSessionId]);

  useEffect(() => {
    if (settingsDraft?.optimizer.maxTokens) {
      setOptimizerTokenBudget(settingsDraft.optimizer.maxTokens);
    }
  }, [settingsDraft?.optimizer.maxTokens]);

  const totalChunks = documents.reduce((sum, doc) => sum + doc.chunkCount, 0);
  const tokenSavings = optimizedContext ? (optimizedContext.tokenSavings?.savedTokens ?? Math.max(0, totalChunks * 650 - optimizedContext.estimatedTokens)) : 0;
  const lastSync = repositoryStatus?.lastIndexedAt ?? repositoryStatus?.repositories.find((repo) => repo.lastIndexedAt)?.lastIndexedAt;
  const linkedRepositoryIds = new Set(projectRepositories.map((repository) => repository.id));
  const discoveredFiles = useMemo(() => [...(repositoryStatus?.files ?? [])]
    .sort((a, b) => {
      if (a.deleted !== b.deleted) return a.deleted ? 1 : -1;
      return `${a.repository}/${a.filePath}`.localeCompare(`${b.repository}/${b.filePath}`);
    }), [repositoryStatus?.files]);
  const repositoryFilePageCount = Math.max(1, Math.ceil(discoveredFiles.length / repositoryFilePageSize));
  const normalizedRepositoryFilePage = Math.min(repositoryFilePage, repositoryFilePageCount);
  const repositoryFilePageStart = (normalizedRepositoryFilePage - 1) * repositoryFilePageSize;
  const pagedRepositoryFiles = discoveredFiles.slice(repositoryFilePageStart, repositoryFilePageStart + repositoryFilePageSize);
  const repositoryFileRangeStart = discoveredFiles.length === 0 ? 0 : repositoryFilePageStart + 1;
  const repositoryFileRangeEnd = Math.min(repositoryFilePageStart + repositoryFilePageSize, discoveredFiles.length);
  const sortedDebugSessions = useMemo(() => [...debugSessions]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()), [debugSessions]);
  const activeDebugSession = sortedDebugSessions.find((session) => session.id === activeDebugSessionId);

  const stats = useMemo(() => [
    { label: 'Repositories', value: projectRepositories.length, detail: 'linked to this workspace', icon: Network, tone: 'purple' },
    { label: 'Memories', value: memories.length, detail: `${new Set(memories.map((memory) => memory.type)).size} memory types`, icon: Brain, tone: 'purple' },
    { label: 'System', value: status?.index.vectorStore === 'qdrant' ? 'Healthy' : 'Local', detail: `${documents.length} workspace source(s)`, icon: CheckCircle2, tone: 'green' },
    { label: 'Token savings', value: tokenSavings ? tokenSavings.toLocaleString() : 'Ready', detail: optimizedContext ? 'latest optimization' : `${settingsDraft?.optimizer.maxTokens ?? 3000} token target`, icon: Zap, tone: 'amber' }
  ], [documents.length, memories, optimizedContext, projectRepositories.length, settingsDraft?.optimizer.maxTokens, status?.index.vectorStore, tokenSavings]);

  const navItems = [
    { id: 'home' as const, label: 'Dashboard', icon: Home },
    { id: 'workspaces' as const, label: 'Workspaces', icon: Layers },
    { id: 'repositories' as const, label: 'Repositories', icon: Network },
    { id: 'memories' as const, label: 'Memories', icon: Brain },
    { id: 'knowledge' as const, label: 'Sources', icon: BookOpen },
    { id: 'safeDebug' as const, label: 'Safe Debug', icon: ShieldCheck },
    { id: 'optimizer' as const, label: 'Optimize', icon: Sparkles },
    { id: 'settings' as const, label: 'Settings', icon: Settings }
  ];

  const suggestedQuestions = [
    'Use RAG-e Khab memory before answering this task.',
    'Find the smallest context for the current coding task.',
    'What workspace conventions should I follow?'
  ];

  const pageCopy: Record<View, string> = {
    home: 'Health, activity, and context value for this workspace.',
    workspaces: 'Create, select, and manage workspace boundaries.',
    repositories: 'Codebases linked to the active workspace.',
    memories: 'Decisions, conventions, fixes, and patterns for this workspace.',
    knowledge: 'Documents and notes available to coding agents.',
    safeDebug: 'Sanitize production-like query output before sharing it with coding agents.',
    optimizer: 'Create the smallest useful context for coding agents.',
    settings: 'Configure models, optimization, repository sync, and advanced infrastructure.',
    chat: 'Ask cited questions against the active workspace.'
  };

  const pageTitles: Record<View, string> = {
    home: selectedProject ? selectedProject.name : 'General',
    workspaces: 'Workspaces',
    repositories: 'Repositories',
    memories: 'Memories',
    knowledge: 'Sources',
    safeDebug: 'Safe Debug',
    optimizer: 'Context Optimizer',
    settings: 'Settings',
    chat: 'Chat'
  };

  const memoryCounts = useMemo(() => {
    const counts = new Map<string, number>();
    memories.forEach((memory) => counts.set(memory.type, (counts.get(memory.type) ?? 0) + 1));
    return counts;
  }, [memories]);

  const filteredMemories = useMemo(() => memories.filter((memory) => {
    const matchesType = memoryFilter === 'all' || memory.type === memoryFilter;
    const query = memorySearch.trim().toLowerCase();
    const matchesSearch = !query || [memory.content, memory.repository, memory.module, memory.type]
      .filter(Boolean)
      .some((value) => value!.toLowerCase().includes(query));
    return matchesType && matchesSearch;
  }), [memories, memoryFilter, memorySearch]);

  const memoryPageCount = Math.max(1, Math.ceil(filteredMemories.length / memoryPageSize));
  const normalizedMemoryPage = Math.min(memoryPage, memoryPageCount);
  const memoryPageStart = (normalizedMemoryPage - 1) * memoryPageSize;
  const pagedMemories = filteredMemories.slice(memoryPageStart, memoryPageStart + memoryPageSize);
  const memoryRangeStart = filteredMemories.length === 0 ? 0 : memoryPageStart + 1;
  const memoryRangeEnd = Math.min(memoryPageStart + memoryPageSize, filteredMemories.length);

  useEffect(() => {
    setMemoryPage(1);
  }, [memoryFilter, memorySearch, selectedProjectId, memoryPageSize]);

  useEffect(() => {
    if (memoryPage > memoryPageCount) setMemoryPage(memoryPageCount);
  }, [memoryPage, memoryPageCount]);

  useEffect(() => {
    setRepositoryFilePage(1);
  }, [repositoryStatus?.files, repositoryFilePageSize]);

  useEffect(() => {
    if (repositoryFilePage > repositoryFilePageCount) setRepositoryFilePage(repositoryFilePageCount);
  }, [repositoryFilePage, repositoryFilePageCount]);

  const recentActivity = useMemo(() => {
    const activities = [
      ...agentActivities.map((activity) => ({
        id: `agent-${activity.id}`,
        icon: activity.status === 'failure' ? AlertCircle : Sparkles,
        title: activityTitle(activity.action),
        detail: activity.detail,
        at: activity.createdAt,
        tone: activity.status === 'failure' ? 'red' : 'teal'
      })),
      ...documents.slice(0, 4).map((doc) => ({
        id: `doc-${doc.id}`,
        icon: FileText,
        title: `Indexed ${doc.name}`,
        detail: `${doc.projectName} · ${doc.chunkCount} knowledge units`,
        at: doc.createdAt,
        tone: 'blue'
      })),
      ...memories.slice(0, 4).map((memory) => ({
        id: `memory-${memory.id}`,
        icon: Brain,
        title: `${memoryLabels[memory.type] ?? memory.type} memory saved`,
        detail: memory.repository ? `${memory.repository}${memory.module ? ` · ${memory.module}` : ''}` : 'Available to MCP agents',
        at: memory.createdAt,
        tone: 'purple'
      })),
      ...(repositoryStatus?.repositories ?? []).slice(0, 4).map((repo) => ({
        id: `repo-${repo.repository}`,
        icon: Network,
        title: `${repo.repository} synchronized`,
        detail: `${repo.trackedFiles} tracked files`,
        at: repo.lastIndexedAt ?? '',
        tone: 'green'
      }))
    ];
    return activities
      .filter((item) => item.at)
      .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
      .slice(0, 8);
  }, [agentActivities, documents, memories, repositoryStatus?.repositories]);

  const upload = async (file: File | null) => {
    if (!file) return;
    setUploadFile(file);
    const body = new FormData();
    body.append('file', file);
    if (selectedProjectId) body.append('projectId', selectedProjectId);
    setBusy(true);
    setError(null);
    try {
      await request<void>('/api/documents', { method: 'POST', body });
      await refresh();
      showToast({ type: 'success', title: 'Document indexed', message: file.name });
    } catch (err) {
      reportError(err, 'Upload failed');
    } finally {
      setBusy(false);
      setUploadFile(null);
    }
  };

  const addText = async () => {
    if (!textBody.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await request<DocumentItem>('/api/texts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: textTitle || 'Text note',
          text: textBody,
          projectId: selectedProjectId || undefined
        })
      });
      setTextTitle('');
      setTextBody('');
      await refresh();
      showToast({ type: 'success', title: 'Knowledge added', message: textTitle || 'Text note' });
    } catch (err) {
      reportError(err, 'Text ingestion failed');
    } finally {
      setBusy(false);
    }
  };

  const ask = async (overrideQuestion?: string) => {
    const prompt = (overrideQuestion ?? question).trim();
    if (!prompt) return;
    setBusy(true);
    setError(null);
    try {
      const response = await request<ChatResponse>('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: prompt, limit: 8, projectId: selectedProjectId || undefined })
      });
      setHistory((items) => [{ id: `${Date.now()}`, question: prompt, response }, ...items]);
      setQuestion('');
      setActiveSource(response.sources[0] ?? null);
      showToast({ type: 'success', title: 'Answer ready', message: `${response.sources.length} source(s) returned` });
    } catch (err) {
      reportError(err, 'Question failed');
    } finally {
      setBusy(false);
    }
  };

  const applyTaskTemplate = (value: string | null) => {
    const template = taskTemplates.find((item) => item.value === value);
    setSelectedTaskTemplate(value ?? '');
    if (!template) return;
    setTask(template.task);
    setOptimizerTokenBudget(template.maxTokens);
  };

  const optimizeContext = async () => {
    const prompt = task.trim();
    if (!prompt) return;
    setBusy(true);
    setError(null);
    try {
      const response = await request<OptimizedContext>('/api/context/optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task: prompt,
          projectId: selectedProjectId || undefined,
          maxTokens: Math.max(300, Math.min(8000, Math.floor(optimizerTokenBudget || settingsDraft?.optimizer.maxTokens || 3000)))
        })
      });
      setOptimizedContext(response);
      showToast({ type: 'success', title: 'Context optimized', message: `${response.estimatedTokens.toLocaleString()} estimated tokens` });
    } catch (err) {
      reportError(err, 'Context optimization failed');
    } finally {
      setBusy(false);
    }
  };

  const deleteDocument = async (id: string) => {
    setBusy(true);
    setError(null);
    try {
      await request<void>(`/api/documents/${id}`, { method: 'DELETE' });
      await refresh();
      showToast({ type: 'success', title: 'Document deleted' });
    } catch (err) {
      reportError(err, 'Delete failed');
    } finally {
      setBusy(false);
    }
  };

  const reindex = async () => {
    setBusy(true);
    setError(null);
    try {
      await request<void>('/api/reindex', { method: 'POST' });
      await refresh();
      showToast({ type: 'success', title: 'Reindex complete' });
    } catch (err) {
      reportError(err, 'Reindex failed');
    } finally {
      setBusy(false);
    }
  };

  const createProject = async () => {
    if (!projectName.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const project = await request<ProjectItem>('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: projectName })
      });
      setProjectName('');
      setSelectedProjectId(project.id);
      showToast({ type: 'success', title: 'Workspace created', message: project.name });
    } catch (err) {
      reportError(err, 'Workspace creation failed');
    } finally {
      setBusy(false);
    }
  };

  const deleteProject = async (project: ProjectItem) => {
    if (project.name === 'General') return;
    const confirmed = window.confirm(`Delete workspace "${project.name}" and ${project.documentCount} document(s)?`);
    if (!confirmed) return;
    setBusy(true);
    setError(null);
    try {
      await request<DeleteProjectResult>(`/api/projects/${project.id}`, { method: 'DELETE' });
      if (selectedProjectId === project.id) {
        const fallback = projects.find((item) => item.id !== project.id)?.id ?? '';
        setSelectedProjectId(fallback);
      }
      await refresh();
      showToast({ type: 'success', title: 'Workspace deleted', message: project.name });
    } catch (err) {
      reportError(err, 'Workspace deletion failed');
    } finally {
      setBusy(false);
    }
  };

  const deleteMemory = async (id: string) => {
    setBusy(true);
    setError(null);
    try {
      await request<void>(`/api/memories/${id}`, { method: 'DELETE' });
      await refresh();
      showToast({ type: 'success', title: 'Memory deleted' });
    } catch (err) {
      reportError(err, 'Memory deletion failed');
    } finally {
      setBusy(false);
    }
  };

  const rememberMemory = async () => {
    if (!memoryContentDraft.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const memory = await request<MemoryItem>('/api/memories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: memoryTypeDraft,
          content: memoryContentDraft,
          confidence: 1,
          repository: memoryRepositoryDraft.trim() || undefined,
          projectId: selectedProjectId || undefined
        })
      });
      setMemoryContentDraft('');
      setMemoryRepositoryDraft('');
      await refresh();
      showToast({ type: 'success', title: 'Memory saved', message: memory.type });
    } catch (err) {
      reportError(err, 'Memory save failed');
    } finally {
      setBusy(false);
    }
  };

  const linkMemoryToProject = async () => {
    if (!selectedProjectId || !memoryToLink) return;
    setBusy(true);
    setError(null);
    try {
      await request<MemoryItem>(`/api/memories/${memoryToLink}/projects/${selectedProjectId}`, { method: 'POST' });
      setMemoryToLink('');
      await refresh();
      showToast({ type: 'success', title: 'Memory linked to workspace' });
    } catch (err) {
      reportError(err, 'Memory link failed');
    } finally {
      setBusy(false);
    }
  };

  const unlinkMemoryFromProject = async (id: string) => {
    if (!selectedProjectId) return;
    setBusy(true);
    setError(null);
    try {
      await request<MemoryItem>(`/api/memories/${id}/projects/${selectedProjectId}`, { method: 'DELETE' });
      await refresh();
      showToast({ type: 'success', title: 'Memory removed from workspace' });
    } catch (err) {
      reportError(err, 'Memory unlink failed');
    } finally {
      setBusy(false);
    }
  };

  const saveSettings = async () => {
    if (!settingsDraft) return;
    if (settingsDraft.optimizer.mode === 'compression' && !settingsDraft.localLlm.enabled) {
      setError('Enable local LLM compression before saving compression mode.');
      showToast({ type: 'error', title: 'Invalid settings', message: 'Enable local LLM compression before saving compression mode.' });
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const settings = await request<RuntimeSettings>('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settingsDraft)
      });
      setSettingsDraft(settings);
      setStatus((current) => current ? { ...current, settings } : current);
      showToast({ type: 'success', title: 'Settings saved' });
    } catch (err) {
      reportError(err, 'Settings update failed');
    } finally {
      setBusy(false);
    }
  };

  const linkRepositoryToProject = async (repositoryId = repositoryToLink) => {
    if (!selectedProjectId || !repositoryId) return;
    setBusy(true);
    setError(null);
    try {
      await request<unknown>('/api/projects/' + selectedProjectId + '/repositories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repositoryId })
      });
      setRepositoryToLink('');
      await refresh();
      showToast({ type: 'success', title: 'Repository linked' });
    } catch (err) {
      reportError(err, 'Repository link failed');
    } finally {
      setBusy(false);
    }
  };

  const unlinkRepositoryFromProject = async (repositoryId: string) => {
    if (!selectedProjectId) return;
    setBusy(true);
    setError(null);
    try {
      await request<void>(`/api/projects/${selectedProjectId}/repositories/${repositoryId}`, { method: 'DELETE' });
      await refresh();
      showToast({ type: 'success', title: 'Repository removed from workspace' });
    } catch (err) {
      reportError(err, 'Repository unlink failed');
    } finally {
      setBusy(false);
    }
  };

  const deleteRepository = async (repository: RepositoryItem) => {
    const message = deleteRepositoryKnowledge
      ? `Delete repository "${repository.name}" and its indexed knowledge?`
      : `Remove repository "${repository.name}" from the repository catalog? Indexed knowledge will remain.`;
    if (!window.confirm(message)) return;
    setBusy(true);
    setError(null);
    try {
      const result = await request<RepositoryDeleteResult>(`/api/repositories/${repository.id}?deleteKnowledge=${deleteRepositoryKnowledge}`, { method: 'DELETE' });
      await refresh();
      showToast({
        type: 'success',
        title: 'Repository deleted',
        message: result.deletedIndexedKnowledge > 0 ? `${result.deletedIndexedKnowledge} indexed item(s) removed` : 'Repository hidden; indexed knowledge kept'
      });
    } catch (err) {
      reportError(err, 'Repository deletion failed');
    } finally {
      setBusy(false);
    }
  };

  const createDebugSession = async () => {
    if (!debugTitle.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const session = await request<DebugSession>('/api/debug-sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: debugTitle })
      });
      setDebugTitle('');
      setActiveDebugSessionId(session.id);
      await refresh();
      showToast({ type: 'success', title: 'Debug session created', message: session.title });
    } catch (err) {
      reportError(err, 'Debug session creation failed');
    } finally {
      setBusy(false);
    }
  };

  const openDebugSession = async (id: string) => {
    setActiveDebugSessionId(id);
    setDebugSanitizedText('');
    setDebugWarnings([]);
    setDebugResolvedToken(null);
    setDebugArtifactSlice(null);
  };

  const archiveDebugSession = async (id: string) => {
    setBusy(true);
    setError(null);
    try {
      await request<DebugSession>(`/api/debug-sessions/${id}/archive`, { method: 'POST' });
      if (activeDebugSessionId === id) {
        setActiveDebugSessionId('');
        setDebugDetail(null);
      }
      await refresh();
      showToast({ type: 'success', title: 'Debug session archived' });
    } catch (err) {
      reportError(err, 'Archive failed');
    } finally {
      setBusy(false);
    }
  };

  const sanitizeDebugData = async () => {
    if (!activeDebugSessionId || !debugRawText.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const response = await request<SanitizeDebugResponse>(`/api/debug-sessions/${activeDebugSessionId}/sanitize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inputType: debugInputType,
          mode: debugSanitizerMode,
          sourceName: debugSourceName || 'custom',
          rawText: debugRawText,
          dataRequestId: debugDataRequestId || undefined
        })
      });
      setDebugRawText('');
      setDebugDataRequestId('');
      setDebugSanitizedText(response.artifact.compactText || response.sanitizedText);
      setDebugWarnings(response.warnings);
      setDebugArtifactSlice(null);
      setDebugDetail(await request<DebugSessionDetail>(`/api/debug-sessions/${activeDebugSessionId}`));
      await refresh();
      showToast({ type: 'success', title: 'Data sanitized', message: `${response.tokenMappings.length} token mapping(s)` });
    } catch (err) {
      reportError(err, 'Sanitization failed');
    } finally {
      setBusy(false);
    }
  };

  const resolveDebugToken = async () => {
    if (!activeDebugSessionId || !debugTokenQuery.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const mapping = await request<DebugTokenMapping>(`/api/debug-sessions/${activeDebugSessionId}/tokens/${encodeURIComponent(debugTokenQuery.trim())}`);
      setDebugResolvedToken(mapping);
      showToast({ type: 'success', title: 'Token resolved', message: `${mapping.table}.${mapping.column} = ${mapping.realValue}` });
    } catch (err) {
      reportError(err, 'Token resolve failed');
    } finally {
      setBusy(false);
    }
  };

  const recordAgentRequest = async () => {
    if (!activeDebugSessionId || !agentRequestDraft.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await request<DebugNote>(`/api/debug-sessions/${activeDebugSessionId}/agent-requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ request: agentRequestDraft })
      });
      setAgentRequestDraft('');
      setDebugDetail(await request<DebugSessionDetail>(`/api/debug-sessions/${activeDebugSessionId}`));
      showToast({ type: 'success', title: 'Agent request recorded' });
    } catch (err) {
      reportError(err, 'Request note failed');
    } finally {
      setBusy(false);
    }
  };

  const promoteDebugMemory = async () => {
    if (!activeDebugSessionId || !debugMemoryContentDraft.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const memory = await request<MemoryItem>(`/api/debug-sessions/${activeDebugSessionId}/promote-memory`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: debugMemoryTypeDraft,
          content: debugMemoryContentDraft,
          confidence: debugMemoryConfidenceDraft,
          repository: debugMemoryRepositoryDraft.trim() || undefined,
          module: debugMemoryModuleDraft.trim() || undefined,
          projectId: selectedProjectId || undefined
        })
      });
      setDebugMemoryContentDraft('');
      setDebugMemoryRepositoryDraft('');
      setDebugMemoryModuleDraft('');
      setDebugDetail(await request<DebugSessionDetail>(`/api/debug-sessions/${activeDebugSessionId}`));
      await refresh();
      showToast({ type: 'success', title: 'Lesson promoted to memory', message: memory.type });
    } catch (err) {
      reportError(err, 'Memory promotion failed');
    } finally {
      setBusy(false);
    }
  };

  const updateDebugDataRequest = async (requestId: string, action: 'complete' | 'reject') => {
    if (!activeDebugSessionId) return;
    setBusy(true);
    setError(null);
    try {
      await request<DebugDataRequest>(`/api/debug-sessions/${activeDebugSessionId}/data-requests/${requestId}/${action}`, { method: 'POST' });
      setDebugDetail(await request<DebugSessionDetail>(`/api/debug-sessions/${activeDebugSessionId}`));
      await refresh();
      showToast({ type: 'success', title: action === 'complete' ? 'Request completed' : 'Request rejected' });
    } catch (err) {
      reportError(err, 'Request update failed');
    } finally {
      setBusy(false);
    }
  };

  const copyDebugText = async (text: string, artifactId?: string) => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      if (activeDebugSessionId) {
        await request<{ recorded: boolean }>(`/api/debug-sessions/${activeDebugSessionId}/exports`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ artifactId })
        }).catch(() => ({ recorded: false }));
      }
      showToast({ type: 'success', title: 'Copied' });
    } catch (err) {
      reportError(err, 'Copy failed');
    }
  };

  const expandDebugArtifactSlice = async (artifactId: string) => {
    if (!activeDebugSessionId) return;
    setBusy(true);
    setError(null);
    try {
      const start = Math.max(1, Math.floor(debugArtifactSliceStart || 1));
      const end = Math.max(start, Math.floor(debugArtifactSliceEnd || start));
      const slice = await request<DebugArtifactSlice>(
        `/api/debug-sessions/${activeDebugSessionId}/artifacts/${artifactId}/slice?beforeLine=${start}&afterLine=${end}`
      );
      setDebugArtifactSlice(slice);
      showToast({ type: 'success', title: 'Slice expanded', message: `Lines ${slice.startLine}-${slice.endLine}` });
    } catch (err) {
      reportError(err, 'Slice expansion failed');
    } finally {
      setBusy(false);
    }
  };

  const filteredDebugMappings = (debugDetail?.tokenMappings ?? []).filter((mapping) => {
    const query = debugTokenSearch.trim().toLowerCase();
    if (!query) return true;
    return [mapping.token, mapping.table, mapping.column, mapping.realValue]
      .some((value) => value.toLowerCase().includes(query));
  });

  const pendingDebugRequests = (debugDetail?.dataRequests ?? []).filter((item) => item.status === 'pending');
  const latestDebugArtifact = debugDetail?.artifacts[0];
  const latestDebugText = debugSanitizedText || latestDebugArtifact?.compactText || latestDebugArtifact?.sanitizedText || '';

  const tokenMappingFor = (token?: string): DebugTokenMapping | undefined =>
    token ? debugDetail?.tokenMappings.find((mapping) => mapping.token.toLowerCase() === token.toLowerCase()) : undefined;

  const artifactTextFor = (artifact: DebugArtifact): string =>
    artifact.compactText || artifact.sanitizedText;

  const suggestedSqlFor = (item: DebugDataRequest): string => {
    const mapping = tokenMappingFor(item.parentToken);
    if (!mapping) return '';
    const table = mapping.table.toLowerCase();
    const relation = (item.relation || item.entity).toLowerCase();
    const template = relationSqlTemplates[table]?.[relation];
    if (template) return template.replaceAll('{{realValue}}', sqlLiteral(mapping.realValue));
    const column = mapping.column.toLowerCase() === 'id' ? `${table.replace(/s$/, '')}_id` : mapping.column;
    return `SELECT *\nFROM ${relation}\nWHERE ${column} = ${sqlLiteral(mapping.realValue)};`;
  };

  const activeSafeDebugInstruction = safeDebugInstructionFor(debugDetail?.session.id ?? activeDebugSessionId);
  const preWrapStyle: React.CSSProperties = {
    margin: 0,
    whiteSpace: 'pre-wrap',
    overflowWrap: 'anywhere',
    maxHeight: 420,
    overflow: 'auto',
  };
  const wideGridItemStyle: React.CSSProperties = { gridColumn: '1 / -1' };

  return (
    <AppShell
      navbar={{ width: 280, breakpoint: 'sm' }}
      padding="lg"
    >
      <LoadingOverlay visible={busy} overlayProps={{ radius: 'sm', blur: 1 }} />

      <AppShell.Navbar p="lg">
        <Stack gap="lg" h="100%">
          <Group gap="sm" wrap="nowrap">
            <ThemeIcon size={42} radius="sm" color="teal">
              <Image src="/favicon.svg" alt="" w={24} h={24} />
            </ThemeIcon>
            <Box flex={1}>
              <Title order={3} size="h4">RAG-e Khab</Title>
              <Text size="sm" c="dimmed">Coding-agent memory</Text>
            </Box>
            <ActionIcon
              variant="subtle"
              color="teal"
              aria-label={colorScheme === 'dark' ? 'Use light theme' : 'Use dark theme'}
              onClick={() => setColorScheme(colorScheme === 'dark' ? 'light' : 'dark')}
            >
              {colorScheme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </ActionIcon>
          </Group>

          <Paper
            component={Stack}
            gap="xs"
            p="sm"
            radius="sm"
            withBorder
            bg={colorScheme === 'dark' ? 'teal.9' : 'teal.0'}
            c={colorScheme === 'dark' ? 'white' : 'teal.9'}
            style={{ borderColor: colorScheme === 'dark' ? 'var(--mantine-color-teal-5)' : 'var(--mantine-color-teal-3)' }}
          >
            <Group gap="xs" wrap="nowrap">
              <ThemeIcon color="teal" variant={colorScheme === 'dark' ? 'filled' : 'light'} size="sm" radius="sm">
                <Layers size={14} />
              </ThemeIcon>
              <Box flex={1} miw={0}>
                <Text size="xs" fw={700} tt="uppercase" c={colorScheme === 'dark' ? 'teal.1' : 'teal.8'}>Active workspace</Text>
                <Text fw={700} truncate>{selectedProject?.name ?? 'General'}</Text>
              </Box>
            </Group>
            <Select
              label="Switch workspace"
              value={selectedProjectId}
              onChange={(value) => setSelectedProjectId(value ?? '')}
              data={projects.map((project) => ({ value: project.id, label: project.name }))}
              searchable
              variant={colorScheme === 'dark' ? 'default' : 'filled'}
              leftSection={<Layers size={16} />}
              nothingFoundMessage="No workspaces"
            />
          </Paper>

          <Badge
            color={status?.index.vectorStore === 'qdrant' ? 'teal' : 'gray'}
            variant="light"
            leftSection={<Box w={8} h={8} bg={status?.index.vectorStore === 'qdrant' ? 'green.6' : 'yellow.6'} style={{ borderRadius: 999 }} />}
          >
            {status?.index.vectorStore ?? 'starting'}
          </Badge>

          <ScrollArea flex={1}>
          <Stack gap={4}>
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                active={view === item.id}
                onClick={() => navigate(item.id)}
                aria-current={view === item.id ? 'page' : undefined}
                key={item.id}
                label={item.label}
                leftSection={<Icon size={18} />}
                variant="filled"
              />
            );
          })}
          </Stack>
          </ScrollArea>
        </Stack>
      </AppShell.Navbar>

      <AppShell.Main>
        <Stack gap="lg">
        <Paper p="lg" radius="sm" withBorder>
          <Title order={1}>{pageTitles[view]}</Title>
          <Text c="dimmed" mt={4}>{pageCopy[view]}</Text>
        </Paper>
        {busy && <Progress value={38} animated color="teal" aria-label="Working" />}

        {error && <Alert color="red" icon={<AlertCircle size={18} />}>{error}</Alert>}

        {view === 'home' && (
          <Stack component="section" gap="md">
            <Paper p="md" radius="sm" withBorder>
              <Stack gap={4}>
                <Text size="xs" fw={700} tt="uppercase" c="teal">Workspace health</Text>
                <Title order={2} size="h3">{status?.index.vectorStore === 'qdrant' ? 'Ready for agents' : 'Local memory ready'}</Title>
                <Text c="dimmed">{projectRepositories.length} repositories, {memories.length} memories, {totalChunks} source units available in this workspace.</Text>
              </Stack>
            </Paper>

            <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="md">
              {stats.map((item) => {
                const Icon = item.icon;
                return (
                <Paper component={Stack} gap={6} key={item.label} p="md" radius="sm" withBorder>
                  <ThemeIcon variant="light" color={item.tone === 'green' ? 'green' : item.tone === 'purple' ? 'violet' : 'teal'} size={32} radius="sm"><Icon size={18} /></ThemeIcon>
                  <Text size="sm" c="dimmed">{item.label}</Text>
                  <Text fw={700} size="xl">{item.value}</Text>
                  <Text size="xs" c="dimmed">{item.detail}</Text>
                </Paper>
                );
              })}
            </SimpleGrid>

            <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="lg">
              <Paper component="section" p="md" radius="sm" withBorder>
                  <Group justify="space-between" align="center" mb="md">
                  <Title order={2} size="h4">System health</Title>
                  <Badge color="green" variant="light" leftSection={<CheckCircle2 size={14} />}>operational</Badge>
                </Group>
                <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
                  <Box>
                    <Text size="xs" fw={700} tt="uppercase" c="dimmed">Last sync</Text>
                    <Text fw={700}>{lastSync ? new Date(lastSync).toLocaleString() : 'No sync yet'}</Text>
                  </Box>
                  <Box>
                    <Text size="xs" fw={700} tt="uppercase" c="dimmed">Optimizer</Text>
                    <Text fw={700}>{settingsDraft?.optimizer.mode ?? 'retrieval'} · {settingsDraft?.optimizer.maxTokens ?? 3000} default tokens</Text>
                  </Box>
                </SimpleGrid>
              </Paper>

              <Paper component="section" p="md" radius="sm" withBorder>
                <Group justify="space-between" align="center" mb="md">
                  <Title order={2} size="h4">Agent activity timeline</Title>
                  <Clock3 size={18} />
                </Group>
                <Stack gap="md">
                  {recentActivity.map((item) => {
                    const Icon = item.icon;
                    return (
                    <Paper component={Group} key={item.id} p="sm" radius="sm" withBorder gap="sm" wrap="nowrap">
                      <ThemeIcon variant="light" color={item.tone === 'green' ? 'green' : item.tone === 'purple' ? 'violet' : item.tone === 'red' ? 'red' : 'teal'} size={32} radius="sm"><Icon size={16} /></ThemeIcon>
                      <Box flex={1} miw={0}>
                        <Text fw={700}>{item.title}</Text>
                        <Text size="sm" c="dimmed">{item.detail}</Text>
                      </Box>
                      <Text component="time" size="sm" c="dimmed">{new Date(item.at).toLocaleDateString()}</Text>
                    </Paper>
                    );
                  })}
                  {recentActivity.length === 0 && (
                    <Paper p="md" radius="sm" withBorder>
                      <Text fw={700}>No agent activity yet</Text>
                      <Text size="sm" c="dimmed">Use MCP tools or optimize context to populate the timeline.</Text>
                    </Paper>
                  )}
                </Stack>
              </Paper>
            </SimpleGrid>
          </Stack>
        )}

        {view === 'repositories' && (
          <Stack component="section" gap="md">
            <Paper p="md" radius="sm" withBorder>
              <Group justify="space-between" align="flex-start">
              <Box flex={1} miw={320}>
                <Title order={2} size="h3">{repositories.length || repositoryStatus?.repositories.length || 0} repositories</Title>
                <Text c="dimmed">Repositories are registered by local agents. Link them to the active workspace when they should contribute knowledge and memories here. {repositoryStatus?.trackedFiles ?? 0} indexed files · last sync {lastSync ? new Date(lastSync).toLocaleString() : 'not available'}</Text>
              </Box>
              <Paper component={Stack} gap="sm" p="sm" radius="sm" withBorder>
                <Text fw={700}>Link repository</Text>
                <Group align="end" gap="sm" grow>
                  <Select
                    placeholder="Select repository"
                    value={repositoryToLink || null}
                    onChange={(value) => setRepositoryToLink(value ?? '')}
                    data={repositories
                      .filter((repository) => !linkedRepositoryIds.has(repository.id))
                      .map((repository) => ({ value: repository.id, label: repository.name }))}
                    searchable
                    clearable
                  />
                  <Button variant="light" color="teal" onClick={() => linkRepositoryToProject()} disabled={busy || !repositoryToLink}>Link</Button>
                </Group>
              </Paper>
              </Group>
            </Paper>

            <SimpleGrid cols={{ base: 1, md: 2, xl: 3 }} spacing="sm">
              {(repositories.length > 0 ? repositories : (repositoryStatus?.repositories ?? []).map((repo) => ({
                id: repo.repositoryId,
                name: repo.repository,
                path: repo.repositoryRoot,
                language: repo.language,
                lastSyncedAt: repo.lastIndexedAt,
                status: repo.status,
              }))).map((repo) => {
                const files = repositoryStatus?.files.filter((file) => file.repository === repo.name && !file.deleted) ?? [];
                const languages = [...new Set(files.map((file) => file.language).filter(Boolean))].slice(0, 4);
                const linked = linkedRepositoryIds.has(repo.id);
                const linkedMemories = memories.filter((memory) => memory.repository === repo.name).length;
                return (
                <Paper component="article" key={repo.id} p="sm" radius="sm" withBorder>
                  <Stack gap="xs">
                    <Group justify="space-between" align="flex-start" wrap="nowrap">
                      <Stack gap={2} miw={0}>
                        <Text fw={700} truncate>{repo.name}</Text>
                        <Text size="xs" c="dimmed" truncate>
                          Last sync {repo.lastSyncedAt ? new Date(repo.lastSyncedAt).toLocaleString() : 'not available'}
                        </Text>
                      </Stack>
                      <Badge color={repo.status === 'synced' ? 'green' : 'gray'} variant="light" size="sm">{repo.status}</Badge>
                    </Group>

                    <Group gap="xs">
                      <Badge color={linked ? 'violet' : 'gray'} variant="outline" size="sm">{linked ? 'In workspace' : 'Not linked'}</Badge>
                      <Badge color="gray" variant="light" size="sm">{files.length} files</Badge>
                      <Badge color="gray" variant="light" size="sm">{linkedMemories} memories</Badge>
                    </Group>

                    <Text size="xs" c="dimmed" truncate>{repo.path}</Text>

                    <Group gap="xs" justify="space-between">
                      {linked ? (
                        <Button size="xs" variant="subtle" color="gray" onClick={() => unlinkRepositoryFromProject(repo.id)} disabled={busy}>Remove</Button>
                      ) : (
                        <Button size="xs" variant="light" color="teal" onClick={() => linkRepositoryToProject(repo.id)} disabled={busy}>Link</Button>
                      )}
                      <Menu shadow="md" width={210} position="bottom-end">
                        <Menu.Target>
                          <Button size="xs" variant="light" color="gray">More</Button>
                        </Menu.Target>
                        <Menu.Dropdown>
                          <Menu.Item color="red" leftSection={<Trash2 size={16} />} onClick={() => deleteRepository(repo)} disabled={busy}>
                            Delete repository
                          </Menu.Item>
                        </Menu.Dropdown>
                      </Menu>
                    </Group>

                    <Stack gap={2}>
                      <Text size="xs" c="dimmed">{linked ? 'Linked to workspace' : 'Not linked'}</Text>
                      <Text size="xs" c="dimmed">{(languages.length > 0 ? languages : [repo.language]).join(', ')}</Text>
                    </Stack>
                  </Stack>
                </Paper>
                );
              })}
              {repositories.length === 0 && (repositoryStatus?.repositories.length ?? 0) === 0 && (
                <Paper p="md" radius="sm" withBorder>
                  <Text fw={700}>No repositories yet</Text>
                  <Text size="sm" c="dimmed">Run the RAG-e Khab agent from a codebase to register a repository, then link it to this workspace.</Text>
                </Paper>
              )}
            </SimpleGrid>

            <Paper p="md" radius="sm" withBorder>
              <Group justify="space-between" align="flex-start" mb="md">
                <Box>
                  <Title order={2} size="h3">Discovered files</Title>
                  <Text c="dimmed">File metadata used to decide what changed between repository syncs.</Text>
                </Box>
                <Group gap="xs">
                  <Badge color="teal" variant="light">{repositoryStatus?.trackedFiles ?? 0} tracked</Badge>
                  <Badge color="gray" variant="outline">{repositoryStatus?.deletedFiles ?? 0} deleted</Badge>
                </Group>
              </Group>
              <ScrollArea>
                <Table miw={960} verticalSpacing="xs">
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>Status</Table.Th>
                      <Table.Th>Repository</Table.Th>
                      <Table.Th>Path</Table.Th>
                      <Table.Th>Module</Table.Th>
                      <Table.Th>Language</Table.Th>
                      <Table.Th>Size</Table.Th>
                      <Table.Th>Hash</Table.Th>
                      <Table.Th>Indexed</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {pagedRepositoryFiles.map((file) => (
                      <Table.Tr key={file.documentId}>
                        <Table.Td>
                          <Badge color={file.deleted ? 'gray' : 'green'} variant="light">{file.deleted ? 'deleted' : 'tracked'}</Badge>
                        </Table.Td>
                        <Table.Td>{file.repository || 'repository'}</Table.Td>
                        <Table.Td>
                          <Text size="sm" maw={360} truncate="end">{file.filePath}</Text>
                        </Table.Td>
                        <Table.Td>{file.module}</Table.Td>
                        <Table.Td>{file.language}</Table.Td>
                        <Table.Td>{formatBytes(file.sizeBytes)}</Table.Td>
                        <Table.Td>
                          <Text size="sm" ff="monospace">{file.contentHash.slice(0, 10)}</Text>
                        </Table.Td>
                        <Table.Td>{new Date(file.indexedAt).toLocaleString()}</Table.Td>
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>
              </ScrollArea>
              {discoveredFiles.length > 0 && (
                <Group justify="space-between" gap="sm" mt="md">
                  <Text size="sm" c="dimmed">
                    {repositoryFileRangeStart}-{repositoryFileRangeEnd} of {discoveredFiles.length}
                  </Text>
                  <Group gap="sm">
                    <NativeSelect
                      value={`${repositoryFilePageSize}`}
                      onChange={(event) => setRepositoryFilePageSize(Number(event.currentTarget.value))}
                      aria-label="Repository files per page"
                      data={[
                        { value: '25', label: '25 / page' },
                        { value: '50', label: '50 / page' },
                        { value: '100', label: '100 / page' },
                      ]}
                    />
                    <Pagination
                      total={repositoryFilePageCount}
                      value={normalizedRepositoryFilePage}
                      onChange={setRepositoryFilePage}
                      size="sm"
                    />
                  </Group>
                </Group>
              )}
              {discoveredFiles.length === 0 && <Text c="dimmed" mt="sm">No discovered file metadata yet.</Text>}
            </Paper>

            <Paper component={Stack} gap="md" p="md" radius="sm" withBorder>
              <Title order={2} size="h4">Repository deletion options</Title>
              <Checkbox
                checked={deleteRepositoryKnowledge}
                onChange={(event) => setDeleteRepositoryKnowledge(event.currentTarget.checked)}
                label="Delete indexed knowledge when deleting a repository"
              />
            </Paper>

          </Stack>
        )}

        {view === 'workspaces' && (
          <Stack component="section" gap="md">
            <Paper component={Stack} gap="md" p="md" radius="sm" withBorder>
              <Group justify="space-between" align="end">
                <Stack gap={2}>
                  <Title order={2} size="h4">Workspaces</Title>
                  <Text size="sm" c="dimmed">Use workspaces to separate memories, sources, repositories, and debug context.</Text>
                </Stack>
                <Group gap="sm" grow>
                  <TextInput value={projectName} onChange={(event) => setProjectName(event.target.value)} placeholder="New workspace" />
                  <Button onClick={createProject} disabled={busy || !projectName.trim()} title="Create workspace" leftSection={<FolderPlus size={18} />}>Create</Button>
                </Group>
              </Group>
              <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="md">
                {projects.map((project) => {
                  const selected = project.id === selectedProjectId;
                  return (
                    <Paper
                      component={Stack}
                      gap="md"
                      key={project.id}
                      p="md"
                      radius="sm"
                      withBorder
                      bg={selected ? (colorScheme === 'dark' ? 'teal.8' : 'teal.0') : undefined}
                      c={selected && colorScheme === 'dark' ? 'white' : undefined}
                      style={selected ? { borderColor: colorScheme === 'dark' ? 'var(--mantine-color-teal-4)' : 'var(--mantine-color-teal-5)' } : undefined}
                    >
                      <Group justify="space-between" align="flex-start" gap="sm">
                        <Stack gap={2} miw={0}>
                          <Text fw={700}>{project.name}</Text>
                          <Group gap="xs">
                            <Text fw={700}>{project.documentCount}</Text>
                            <Text size="sm" c={selected && colorScheme === 'dark' ? 'teal.1' : 'dimmed'}>created {new Date(project.createdAt).toLocaleDateString()}</Text>
                          </Group>
                        </Stack>
                        {selected && <Badge color="teal" variant={colorScheme === 'dark' ? 'filled' : 'light'}>Selected</Badge>}
                      </Group>
                      <Group gap="sm">
                        <Button variant={selected ? 'filled' : 'subtle'} color={selected ? 'teal' : 'gray'} onClick={() => setSelectedProjectId(project.id)} disabled={busy || selected}>
                          {selected ? 'Active' : 'Select'}
                        </Button>
                        {project.name !== 'General' && (
                          <ActionIcon variant="light" color="red" onClick={() => deleteProject(project)} disabled={busy} title="Delete workspace">
                            <Trash2 size={18} />
                          </ActionIcon>
                        )}
                      </Group>
                    </Paper>
                  );
                })}
              </SimpleGrid>
            </Paper>
          </Stack>
        )}

        {view === 'memories' && (
          <Stack component="section" gap="md">
            <Paper p="lg" radius="sm" withBorder>
              <Stack gap="md">
                <Stack gap={4}>
                  <Title order={2} size="h3">{filteredMemories.length} memories</Title>
                  <Text c="dimmed">{selectedProject?.name ?? 'General'} workspace · search decisions, conventions, fixes, and patterns.</Text>
                </Stack>
              <TextInput
                value={memorySearch}
                onChange={(event) => setMemorySearch(event.currentTarget.value)}
                placeholder="Search memories..."
                leftSection={<Search size={16} />}
              />
              <SegmentedControl
                value={memoryFilter}
                onChange={setMemoryFilter}
                data={[
                  { value: 'all', label: `All ${memories.length}` },
                  ...memoryTypes.map((type) => ({
                    value: type,
                    label: `${memoryLabels[type] ?? type} ${memoryCounts.get(type) ?? 0}`,
                  })),
                ]}
              />
              {filteredMemories.length > 0 && (
                <Group justify="space-between" gap="sm">
                  <Text size="sm" c="dimmed">{memoryRangeStart}-{memoryRangeEnd} of {filteredMemories.length}</Text>
                  <Group gap="sm">
                    <NativeSelect
                      value={`${memoryPageSize}`}
                      onChange={(event) => setMemoryPageSize(Number(event.currentTarget.value))}
                      aria-label="Memories per page"
                      data={[
                        { value: '12', label: '12 / page' },
                        { value: '24', label: '24 / page' },
                        { value: '48', label: '48 / page' },
                      ]}
                    />
                    <Pagination
                      total={memoryPageCount}
                      value={normalizedMemoryPage}
                      onChange={setMemoryPage}
                      size="sm"
                    />
                  </Group>
                </Group>
              )}
              </Stack>
            </Paper>

            <Paper component={Stack} gap="md" p="lg" radius="sm" withBorder>
                <Stack gap={4}>
                  <Title order={2} size="h3">Remember for this workspace</Title>
                  <Text c="dimmed">Store rules like coding conventions, architecture decisions, and workspace-specific preferences.</Text>
                </Stack>
                <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
                  <Select
                    value={memoryTypeDraft}
                    onChange={(value) => setMemoryTypeDraft(value ?? 'CodingConvention')}
                    data={memoryTypes.map((type) => ({ value: type, label: memoryLabels[type] ?? type }))}
                  />
                  <TextInput value={memoryRepositoryDraft} onChange={(event) => setMemoryRepositoryDraft(event.currentTarget.value)} placeholder="repository optional" />
                  <Textarea style={{ gridColumn: '1 / -1' }} value={memoryContentDraft} onChange={(event) => setMemoryContentDraft(event.currentTarget.value)} placeholder="Do not use uppercase UI labels in this workspace. Prefer sentence case." autosize minRows={3} />
                  <Button onClick={rememberMemory} disabled={busy || !memoryContentDraft.trim()}>Remember</Button>
                </SimpleGrid>
            </Paper>

            <Paper p="lg" radius="sm" withBorder>
              <Group align="end" gap="sm" grow>
                <Select
                  value={memoryToLink}
                  onChange={(value) => setMemoryToLink(value ?? '')}
                  placeholder="Select memory"
                  searchable
                  data={allMemories
                    .filter((memory) => !memory.projectIds.includes(selectedProjectId))
                    .map((memory) => ({
                      value: memory.id,
                      label: `${memoryLabels[memory.type] ?? memory.type}: ${memory.content.slice(0, 70)}`,
                    }))}
                />
                <Button variant="light" color="teal" onClick={linkMemoryToProject} disabled={busy || !memoryToLink}>Link</Button>
              </Group>
            </Paper>

            <SimpleGrid cols={{ base: 1, sm: 2, lg: 3, xl: 4 }} spacing="md">
              {pagedMemories.map((memory) => (
                <Paper component={Stack} gap="md" key={memory.id} p="md" radius="sm" withBorder>
                  <Group justify="space-between" align="flex-start">
                    <Badge color={memoryBadgeColor(memory.type)} variant="light">{memoryLabels[memory.type] ?? memory.type}</Badge>
                    <Menu shadow="md" width={190} position="bottom-end">
                      <Menu.Target>
                        <Button variant="subtle" size="compact-sm">More</Button>
                      </Menu.Target>
                      <Menu.Dropdown>
                        <Menu.Item onClick={() => unlinkMemoryFromProject(memory.id)} disabled={busy}>Remove from workspace</Menu.Item>
                        <Menu.Item color="red" leftSection={<Trash2 size={16} />} onClick={() => deleteMemory(memory.id)} disabled={busy}>Delete memory</Menu.Item>
                      </Menu.Dropdown>
                    </Menu>
                  </Group>
                  <Text>{memory.content}</Text>
                  <Group gap="xs">
                    <Badge color="gray" variant="light">{Math.round(memory.confidence * 100)}% confidence</Badge>
                    <Badge color="gray" variant="outline">{memory.repository ?? 'global'}</Badge>
                  </Group>
                </Paper>
              ))}
              {filteredMemories.length === 0 && (
                <Paper p="md" radius="sm" withBorder>
                  <Text fw={700}>No memories in this view</Text>
                  <Text size="sm" c="dimmed">Use the MCP `remember` tool to store architecture decisions, conventions, bug fixes, patterns, and workspace knowledge.</Text>
                </Paper>
              )}
            </SimpleGrid>
          </Stack>
        )}

	        {view === 'knowledge' && (
	          <SimpleGrid component="section" cols={{ base: 1, md: 2 }} spacing="lg">
	            <Paper component={Stack} gap="md" p="md" radius="sm" withBorder>
	              <SegmentedControl
	                fullWidth
	                value={ingestMode}
	                onChange={(value) => setIngestMode(value as IngestMode)}
	                data={[
	                  { value: 'text', label: 'Text' },
	                  { value: 'upload', label: 'File' },
	                ]}
	              />
	              {ingestMode === 'text' ? (
	                <Stack gap="md">
	                  <TextInput value={textTitle} onChange={(event) => setTextTitle(event.target.value)} placeholder="Title" />
	                  <Textarea value={textBody} onChange={(event) => setTextBody(event.target.value)} placeholder="Paste notes, snippets, summaries, or any text..." minRows={8} autosize />
	                  <Button onClick={addText} disabled={busy || !textBody.trim()} leftSection={<FilePlus2 size={18} />}>Add text</Button>
	                </Stack>
	              ) : (
	                <Paper component={Stack} gap="sm" align="center" ta="center" p="xl" radius="sm" withBorder>
	                  <Upload size={28} />
	                  <Text fw={700}>Choose a PDF, Markdown, or text file</Text>
	                  <Text size="sm" c="dimmed">{selectedProject?.name ?? 'General'}</Text>
	                  <FileInput
	                    value={uploadFile}
	                    onChange={upload}
	                    accept=".pdf,.md,.markdown,.txt,text/plain,application/pdf"
	                    placeholder="Select file"
	                    disabled={busy}
	                    clearable
	                    leftSection={<Upload size={16} />}
	                  />
	                </Paper>
	              )}
	            </Paper>

            <Paper component="section" p="md" radius="sm" withBorder>
              <Group justify="space-between" align="center" mb="md">
	                <Title order={2} size="h4">Indexed items</Title>
	                <Button variant="light" color="gray" onClick={reindex} disabled={busy} leftSection={<RefreshCw size={16} />}>Reindex</Button>
	              </Group>
              <Stack gap="md">
                {documents.map((doc) => (
                  <Paper component={Group} key={doc.id} p="sm" radius="sm" withBorder gap="sm" wrap="nowrap">
                    <FileText size={20} />
                    <Stack gap={2} flex={1} miw={0}>
                      <Text fw={700} truncate>{doc.name}</Text>
                      <Text size="sm" c="dimmed" truncate>{doc.projectName} · {doc.format} · {doc.chunkCount} source units · {(doc.sizeBytes / 1024).toFixed(1)} KB</Text>
                    </Stack>
	                    <ActionIcon variant="light" color="red" onClick={() => deleteDocument(doc.id)} disabled={busy} title="Delete document"><Trash2 size={18} /></ActionIcon>
                  </Paper>
                ))}
                {documents.length === 0 && (
                  <Paper p="md" radius="sm" withBorder>
                    <Text fw={700}>No sources indexed yet</Text>
                    <Text size="sm" c="dimmed">Add text, upload a file, or sync a repository so coding agents can retrieve useful context.</Text>
                  </Paper>
                )}
              </Stack>
            </Paper>
          </SimpleGrid>
        )}

        {view === 'safeDebug' && (
          <Stack component="section" gap="md">
            <SimpleGrid component="section" cols={{ base: 1, md: 2 }} spacing="md">
              <Paper component={Stack} gap="md" p="md" radius="sm" withBorder>
                <Group justify="space-between" align="center">
                  <Title order={2} size="h4">New session</Title>
                  <Plus size={18} />
                </Group>
                <Group align="end" gap="sm" grow>
                  <TextInput value={debugTitle} onChange={(event) => setDebugTitle(event.target.value)} placeholder="BUG-123 or checkout failure" />
                  <Button onClick={createDebugSession} disabled={busy || !debugTitle.trim()} title="Create session" leftSection={<Plus size={18} />}>Create</Button>
                </Group>
              </Paper>

              <Paper component={Stack} gap="md" p="md" radius="sm" withBorder>
                <Group justify="space-between" align="center">
                  <Title order={2} size="h4">Active session</Title>
                  <Badge color={activeDebugSession?.status === 'active' ? 'green' : 'gray'} variant="light">
                    {activeDebugSession?.status ?? `${debugSessions.length} total`}
                  </Badge>
                </Group>
                <Select
                  value={activeDebugSessionId || null}
                  onChange={(value) => value && openDebugSession(value)}
                  data={sortedDebugSessions.map((session) => ({
                    value: session.id,
                    label: `${session.title} · updated ${new Date(session.updatedAt).toLocaleDateString()}`,
                  }))}
                  placeholder="Select session"
                  searchable
                  nothingFoundMessage="No sessions"
                  disabled={debugSessions.length === 0}
                />
                {activeDebugSession ? (
                  <Stack gap={4}>
                    <Text size="sm" c="dimmed" ff="monospace">{activeDebugSession.id}</Text>
                    <Text size="sm" c="dimmed">Updated {new Date(activeDebugSession.updatedAt).toLocaleString()}</Text>
                    <Group gap="sm" mt="xs">
                      <Button variant="subtle" color="gray" onClick={() => openDebugSession(activeDebugSession.id)} disabled={busy}>Refresh</Button>
                      <ActionIcon variant="light" color="gray" onClick={() => archiveDebugSession(activeDebugSession.id)} disabled={busy} title="Archive session"><Archive size={17} /></ActionIcon>
                    </Group>
                  </Stack>
                ) : (
                  <Text size="sm" c="dimmed">Create or select a session before pasting query output.</Text>
                )}
              </Paper>
            </SimpleGrid>

            {debugDetail ? (
              <Stack gap="md">
                <Paper p="md" radius="sm" withBorder>
                  <Group justify="space-between" align="flex-start">
                    <Stack gap={4} miw={0}>
                      <Text size="xs" fw={700} tt="uppercase" c="dimmed">Session</Text>
                      <Title order={2} size="h3">{debugDetail.session.title}</Title>
                      <Text size="sm" c="dimmed" ff="monospace" truncate>{debugDetail.session.id}</Text>
                    </Stack>
                    <Stack gap={4} align="flex-end">
                      <Badge color={debugDetail.session.status === 'active' ? 'green' : 'gray'} variant="light">{debugDetail.session.status}</Badge>
                      <Text size="xs" c="dimmed">Created {new Date(debugDetail.session.createdAt).toLocaleString()}</Text>
                    </Stack>
                  </Group>
                </Paper>

                <Tabs defaultValue="workspace" keepMounted={false}>
                  <Tabs.List>
                    <Tabs.Tab value="workspace">Workspace</Tabs.Tab>
                    <Tabs.Tab value="instruction">Agent instruction</Tabs.Tab>
                  </Tabs.List>

                  <Tabs.Panel value="instruction" pt="md">
                    <Paper component={Stack} gap="md" p="md" radius="sm" withBorder>
                      <Group justify="space-between" align="center">
                        <Title order={2} size="h4">Agent instruction</Title>
                        <ActionIcon variant="light" color="gray" onClick={() => copyDebugText(activeSafeDebugInstruction)} title="Copy instruction"><Copy size={17} /></ActionIcon>
                      </Group>
                      <Paper component="pre" p="sm" radius="sm" withBorder bg="var(--mantine-color-default-hover)" style={preWrapStyle}>
                        {activeSafeDebugInstruction}
                      </Paper>
                    </Paper>
                  </Tabs.Panel>

                  <Tabs.Panel value="workspace" pt="md">
                    <Stack gap="md">
                      <Paper component={Stack} gap="md" p="md" radius="sm" withBorder>
                        <Group justify="space-between" align="center">
                          <Title order={2} size="h4">Pending agent requests</Title>
                          <Badge color="gray" variant="light">{pendingDebugRequests.length} pending</Badge>
                        </Group>
                        <SimpleGrid cols={{ base: 1, md: 2, xl: 3 }} spacing="md">
                          {debugDetail.dataRequests.map((item) => {
                            const mapping = tokenMappingFor(item.parentToken);
                            const suggestedSql = suggestedSqlFor(item);
                            return (
                              <Paper component={Stack} gap="sm" key={item.id} p="md" radius="sm" withBorder>
                                <Group justify="space-between" align="flex-start">
                                  <Stack gap={2} miw={0}>
                                    <Text fw={700}>{item.entity}</Text>
                                    <Text size="sm" c="dimmed">{item.relation || 'No relation'}{item.parentToken ? ` · ${item.parentToken}` : ''}</Text>
                                  </Stack>
                                  <Badge color={item.status === 'pending' ? 'green' : 'gray'} variant="light">{item.status}</Badge>
                                </Group>
                                <Text size="sm">{item.reason}</Text>
                                {item.requestedFields.length > 0 && <Text size="xs" c="dimmed">Fields: {item.requestedFields.join(', ')}</Text>}
                                {mapping && <Text size="xs" c="dimmed">{item.parentToken} -&gt; {mapping.table}.{mapping.column} = {mapping.realValue}</Text>}
                                {suggestedSql && (
                                  <Paper component="pre" p="sm" radius="sm" withBorder bg="var(--mantine-color-default-hover)" style={preWrapStyle}>
                                    {suggestedSql}
                                  </Paper>
                                )}
                                <Group gap="sm">
                                  <Button variant="subtle" color="gray" onClick={() => copyDebugText(suggestedSql)} disabled={!suggestedSql} leftSection={<Copy size={16} />}>Copy SQL</Button>
                                  <Button variant="light" color="teal" onClick={() => updateDebugDataRequest(item.id, 'complete')} disabled={busy || item.status !== 'pending'}>Mark Completed</Button>
                                  <Button variant="light" color="red" onClick={() => updateDebugDataRequest(item.id, 'reject')} disabled={busy || item.status !== 'pending'}>Reject</Button>
                                </Group>
                              </Paper>
                            );
                          })}
                          {debugDetail.dataRequests.length === 0 && <Text c="dimmed">No structured agent data requests yet.</Text>}
                        </SimpleGrid>
                      </Paper>

                      <SimpleGrid component="section" cols={{ base: 1, lg: 2 }} spacing="lg">
                        <Paper component={Stack} gap="md" p="md" radius="sm" withBorder>
                          <Group justify="space-between" align="center">
                            <Title order={2} size="h4">Paste data</Title>
                            <ShieldCheck size={18} />
                          </Group>
                          <Textarea value={debugRawText} onChange={(event) => setDebugRawText(event.target.value)} placeholder="Paste CSV, JSON, or log output here..." minRows={8} autosize />
                          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
                            <NativeSelect value={debugInputType} onChange={(event) => setDebugInputType(event.target.value as DebugInputType)} data={[
                              { value: 'csv', label: 'CSV' },
                              { value: 'json', label: 'JSON' },
                              { value: 'log', label: 'LOG' },
                            ]} />
                            <NativeSelect value={debugSanitizerMode} onChange={(event) => setDebugSanitizerMode(event.target.value as DebugSanitizerMode)} data={[
                              { value: 'balanced', label: 'Balanced' },
                              { value: 'strict', label: 'Strict' },
                              { value: 'permissive', label: 'Permissive' },
                            ]} />
                            <TextInput value={debugSourceName} onChange={(event) => setDebugSourceName(event.target.value)} placeholder="users, orders, payments, custom" />
                            <Button onClick={sanitizeDebugData} disabled={busy || !debugRawText.trim()} leftSection={<ShieldCheck size={18} />}>Sanitize</Button>
                          </SimpleGrid>
                          <NativeSelect
                            value={debugDataRequestId}
                            onChange={(event) => setDebugDataRequestId(event.target.value)}
                            data={[
                              { value: '', label: 'No linked agent request' },
                              ...pendingDebugRequests.map((item) => ({
                                value: item.id,
                                label: `${item.entity}${item.parentToken ? ` for ${item.parentToken}` : ''}`,
                              })),
                            ]}
                          />
                        </Paper>

                        <Paper component={Stack} gap="md" p="md" radius="sm" withBorder>
                          <Group justify="space-between" align="center">
                            <Stack gap={2}>
                              <Title order={2} size="h4">Compact agent output</Title>
                              <Text size="xs" c="dimmed">Sanitized first, then compacted for agent context.</Text>
                            </Stack>
                            <Group gap="sm">
                              {latestDebugArtifact?.reductionPercent !== undefined && (
                                <Badge color="teal" variant="light">{latestDebugArtifact.reductionPercent}% smaller</Badge>
                              )}
                              <ActionIcon variant="light" color="gray" onClick={() => copyDebugText(latestDebugText, latestDebugArtifact?.id)} disabled={!latestDebugText} title="Copy compact output"><Clipboard size={17} /></ActionIcon>
                              <Button variant="subtle" color="gray" onClick={() => copyDebugText(latestDebugText, latestDebugArtifact?.id)} disabled={!latestDebugText}>Copy compact</Button>
                            </Group>
                          </Group>
                          <Paper component="pre" p="sm" radius="sm" withBorder bg="var(--mantine-color-default-hover)" style={preWrapStyle}>
                            {latestDebugText || 'Compacted sanitized data will appear here.'}
                          </Paper>
                        </Paper>
                      </SimpleGrid>

                      <SimpleGrid component="section" cols={{ base: 1, lg: 2 }} spacing="lg">
                        <Paper component={Stack} gap="md" p="md" radius="sm" withBorder>
                          <Group justify="space-between" align="center">
                            <Title order={2} size="h4">Resolve token</Title>
                            <KeyRound size={18} />
                          </Group>
                          <Group align="end" gap="sm" grow>
                            <TextInput value={debugTokenQuery} onChange={(event) => setDebugTokenQuery(event.target.value)} placeholder="USER_001" />
                            <Button onClick={resolveDebugToken} disabled={busy || !debugTokenQuery.trim()}>Resolve</Button>
                          </Group>
                          {debugResolvedToken ? (
                            <Paper component={Stack} gap="xs" p="sm" radius="sm" withBorder>
                              <Text size="xs" c="dimmed">{debugResolvedToken.token}</Text>
                              <Text fw={700}>{debugResolvedToken.table}.{debugResolvedToken.column} = {debugResolvedToken.realValue}</Text>
                              <Button variant="subtle" color="gray" onClick={() => copyDebugText(debugResolvedToken.realValue)} leftSection={<Copy size={16} />}>Copy real id</Button>
                            </Paper>
                          ) : (
                            <Text size="sm" c="dimmed">Resolve a token to manually query the database without asking an agent for raw data.</Text>
                          )}
                        </Paper>

                        <Paper component={Stack} gap="md" p="md" radius="sm" withBorder>
                          <Group justify="space-between" align="center">
                            <Title order={2} size="h4">Agent requests</Title>
                            <Badge color="gray" variant="light">{debugDetail.notes.length}</Badge>
                          </Group>
                          <Group align="end" gap="sm" grow>
                            <TextInput value={agentRequestDraft} onChange={(event) => setAgentRequestDraft(event.target.value)} placeholder="Need orders for USER_001" />
                            <Button onClick={recordAgentRequest} disabled={busy || !agentRequestDraft.trim()}>Record</Button>
                          </Group>
                          <Stack gap="sm">
                            {debugDetail.notes.slice(0, 4).map((note) => (
                              <Paper component={Stack} gap={2} key={note.id} p="sm" radius="sm" withBorder>
                                <Text fw={700}>{note.request}</Text>
                                <Text size="xs" c="dimmed">{new Date(note.createdAt).toLocaleString()}</Text>
                              </Paper>
                            ))}
                          </Stack>
                        </Paper>
                      </SimpleGrid>

                      <Paper component={Stack} gap="md" p="md" radius="sm" withBorder>
                        <Group justify="space-between" align="flex-start">
                          <Stack gap={2}>
                            <Title order={2} size="h4">Promote lesson to memory</Title>
                            <Text size="sm" c="dimmed">Save only durable, sanitized conclusions. Tokens, raw IDs, PII, and SQL with real IDs are blocked.</Text>
                          </Stack>
                          <Brain size={18} />
                        </Group>
                        <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
                          <NativeSelect value={debugMemoryTypeDraft} onChange={(event) => setDebugMemoryTypeDraft(event.target.value)} data={memoryTypes.map((type) => ({ value: type, label: memoryLabels[type] ?? type }))} />
                          <TextInput value={debugMemoryRepositoryDraft} onChange={(event) => setDebugMemoryRepositoryDraft(event.target.value)} placeholder="repository optional" />
                          <TextInput value={debugMemoryModuleDraft} onChange={(event) => setDebugMemoryModuleDraft(event.target.value)} placeholder="module optional" />
                          <NumberInput min={0} max={1} step={0.05} value={debugMemoryConfidenceDraft} onChange={(value) => setDebugMemoryConfidenceDraft(Number(value) || 0)} />
                          <Textarea style={wideGridItemStyle} value={debugMemoryContentDraft} onChange={(event) => setDebugMemoryContentDraft(event.target.value)} placeholder="Example: Payment retries can fail when an order is archived before the payment attempt reaches terminal status." minRows={4} autosize />
                          <Button onClick={promoteDebugMemory} disabled={busy || !debugMemoryContentDraft.trim()} leftSection={<Brain size={18} />}>Promote</Button>
                        </SimpleGrid>
                      </Paper>

                      <Paper component={Stack} gap="md" p="md" radius="sm" withBorder>
                        <Group justify="space-between" align="center">
                          <Title order={2} size="h4">Token map</Title>
                          <TextInput value={debugTokenSearch} onChange={(event) => setDebugTokenSearch(event.target.value)} placeholder="Search tokens..." leftSection={<Search size={16} />} />
                        </Group>
                        <ScrollArea>
                          <Table miw={720} verticalSpacing="xs">
                            <Table.Thead>
                              <Table.Tr>
                                <Table.Th>Token</Table.Th>
                                <Table.Th>Table</Table.Th>
                                <Table.Th>Column</Table.Th>
                                <Table.Th>Real value</Table.Th>
                                <Table.Th>Created</Table.Th>
                              </Table.Tr>
                            </Table.Thead>
                            <Table.Tbody>
                              {filteredDebugMappings.map((mapping) => (
                                <Table.Tr key={mapping.token}>
                                  <Table.Td><Text fw={700}>{mapping.token}</Text></Table.Td>
                                  <Table.Td>{mapping.table}</Table.Td>
                                  <Table.Td>{mapping.column}</Table.Td>
                                  <Table.Td>{mapping.realValue}</Table.Td>
                                  <Table.Td>{new Date(mapping.createdAt).toLocaleString()}</Table.Td>
                                </Table.Tr>
                              ))}
                            </Table.Tbody>
                          </Table>
                        </ScrollArea>
                        {filteredDebugMappings.length === 0 && <Text c="dimmed">No token mappings yet.</Text>}
                      </Paper>

                      <SimpleGrid component="section" cols={{ base: 1, lg: 2 }} spacing="lg">
                        <Paper component={Stack} gap="md" p="md" radius="sm" withBorder>
                          <Group justify="space-between" align="center">
                            <Stack gap={2}>
                              <Title order={2} size="h4">Shared artifacts</Title>
                              <Text size="xs" c="dimmed">Agents see compact text by default. Expand only the sanitized raw lines you need.</Text>
                            </Stack>
                            <Badge color="gray" variant="light">{debugDetail.artifacts.length}</Badge>
                          </Group>
                          <Group align="end" gap="sm">
                            <NumberInput
                              label="Start line"
                              min={1}
                              value={debugArtifactSliceStart}
                              onChange={(value) => setDebugArtifactSliceStart(Number(value) || 1)}
                            />
                            <NumberInput
                              label="End line"
                              min={1}
                              value={debugArtifactSliceEnd}
                              onChange={(value) => setDebugArtifactSliceEnd(Number(value) || 1)}
                            />
                          </Group>
                          <Stack gap="sm">
                            {debugDetail.artifacts.map((artifact) => (
                              <Paper component={Stack} gap="sm" key={artifact.id} p="sm" radius="sm" withBorder>
                                <Group justify="space-between" align="flex-start" gap="sm">
                                  <Stack gap={2} miw={0}>
                                    <Text fw={700}>{artifact.inputType.toUpperCase()} · {artifact.sourceName}</Text>
                                    <Text size="xs" c="dimmed">{new Date(artifact.createdAt).toLocaleString()}</Text>
                                    <Text size="xs" c="dimmed">{artifact.warningSummary.length} warning group(s)</Text>
                                  </Stack>
                                  <Group gap="xs">
                                    {artifact.reductionPercent !== undefined && <Badge color="teal" variant="light">{artifact.reductionPercent}% smaller</Badge>}
                                    <ActionIcon variant="light" color="gray" onClick={() => copyDebugText(artifactTextFor(artifact), artifact.id)} title="Copy compact artifact"><Copy size={17} /></ActionIcon>
                                  </Group>
                                </Group>
                                {(artifact.rawTokenEstimate !== undefined || artifact.compressedTokenEstimate !== undefined) && (
                                  <Text size="xs" c="dimmed">
                                    {artifact.rawTokenEstimate?.toLocaleString() ?? '-'} raw tokens - {artifact.compressedTokenEstimate?.toLocaleString() ?? '-'} compact tokens
                                  </Text>
                                )}
                                <Group gap="sm">
                                  <Button variant="subtle" color="gray" onClick={() => copyDebugText(artifactTextFor(artifact), artifact.id)} leftSection={<Copy size={16} />}>Copy compact</Button>
                                  <Button variant="light" color="gray" onClick={() => expandDebugArtifactSlice(artifact.id)} disabled={busy} leftSection={<FileText size={16} />}>Expand slice</Button>
                                </Group>
                              </Paper>
                            ))}
                            {debugDetail.artifacts.length === 0 && <Text c="dimmed">No sanitized artifacts saved yet.</Text>}
                          </Stack>
                          {debugArtifactSlice && (
                            <Paper component={Stack} gap="sm" p="sm" radius="sm" withBorder>
                              <Group justify="space-between" align="center">
                                <Text fw={700}>Sanitized raw slice · lines {debugArtifactSlice.startLine}-{debugArtifactSlice.endLine}</Text>
                                <ActionIcon variant="light" color="gray" onClick={() => copyDebugText(debugArtifactSlice.text, debugArtifactSlice.artifactId)} title="Copy slice"><Copy size={17} /></ActionIcon>
                              </Group>
                              <Paper component="pre" p="sm" radius="sm" withBorder bg="var(--mantine-color-default-hover)" style={preWrapStyle}>
                                {debugArtifactSlice.text}
                              </Paper>
                            </Paper>
                          )}
                        </Paper>

                        <Paper component={Stack} gap="md" p="md" radius="sm" withBorder>
                          <Group justify="space-between" align="center">
                            <Title order={2} size="h4">Warnings</Title>
                            <AlertCircle size={18} />
                          </Group>
                          <Stack gap="sm">
                            {(debugWarnings.length ? debugWarnings : debugDetail.artifacts[0]?.warningSummary ?? []).map((warning, index) => (
                              <Paper component={Stack} gap={2} key={`${warning.type}-${warning.field}-${index}`} p="sm" radius="sm" withBorder>
                                <Text fw={700}>{warning.type.replace('_', ' ')}</Text>
                                <Text size="sm" c="dimmed">{warning.message}{warning.field ? ` · ${warning.field}` : ''}{warning.count ? ` · ${warning.count}` : ''}</Text>
                              </Paper>
                            ))}
                            {debugWarnings.length === 0 && (debugDetail.artifacts[0]?.warningSummary.length ?? 0) === 0 && <Text c="dimmed">No warnings for the latest artifact.</Text>}
                          </Stack>
                        </Paper>
                      </SimpleGrid>
                    </Stack>
                  </Tabs.Panel>
                </Tabs>
              </Stack>
            ) : (
              <Paper p="md" radius="sm" withBorder>
                <Stack gap={4}>
                  <Text fw={700}>Select or create a debug session</Text>
                  <Text size="sm" c="dimmed">Sessions keep deterministic fake-to-real mappings so follow-up CSV, JSON, and logs reuse the same tokens.</Text>
                </Stack>
              </Paper>
            )}
          </Stack>
        )}

        {view === 'optimizer' && (
          <SimpleGrid component="section" cols={{ base: 1, md: 2 }} spacing="lg">
            <Paper component={Stack} gap="md" p="md" radius="sm" withBorder>
              <Group justify="space-between" align="flex-start">
                <Stack gap={4}>
                  <Text size="xs" fw={700} tt="uppercase" c="teal">MCP tool: optimize_context</Text>
                  <Title order={2} size="h4">Task in, smallest useful context out.</Title>
                </Stack>
                <Sparkles size={18} />
              </Group>
              <Select
                label="Task template"
                placeholder="Start from a common task"
                value={selectedTaskTemplate || null}
                onChange={applyTaskTemplate}
                data={taskTemplates.map((template) => ({ value: template.value, label: template.label }))}
                clearable
              />
              {selectedTaskTemplate && (
                <Paper p="sm" radius="sm" withBorder bg="var(--mantine-color-default-hover)">
                  <Text size="sm" c="dimmed">
                    {taskTemplates.find((template) => template.value === selectedTaskTemplate)?.description}
                  </Text>
                </Paper>
              )}
	              <Textarea value={task} onChange={(event) => setTask(event.target.value)} placeholder="Add pagination to Orders API" minRows={7} autosize />
              <Group align="end" gap="sm">
                <NumberInput
                  label="Token budget"
                  min={300}
                  max={8000}
                  step={500}
                  value={optimizerTokenBudget}
                  onChange={(value) => setOptimizerTokenBudget(Number(value) || 300)}
                />
                <Button onClick={optimizeContext} disabled={busy || !task.trim()} leftSection={<Sparkles size={18} />}>Optimize context</Button>
              </Group>
              <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
                <Box>
                  <Text size="xs" fw={700} tt="uppercase" c="dimmed">Mode</Text>
                  <Text fw={700}>{settingsDraft?.optimizer.mode ?? 'retrieval'}</Text>
                </Box>
                <Box>
                  <Text size="xs" fw={700} tt="uppercase" c="dimmed">Default budget</Text>
                  <Text fw={700}>{settingsDraft?.optimizer.maxTokens ?? 3000} tokens</Text>
                </Box>
              </SimpleGrid>
            </Paper>

            <Paper component={Stack} gap="md" p="md" radius="sm" withBorder>
              {optimizedContext ? (
                <>
                  <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="sm">
                    <Box>
                      <Text size="xs" fw={700} tt="uppercase" c="dimmed">Token estimate</Text>
                      <Text fw={700}>{optimizedContext.estimatedTokens.toLocaleString()} tokens</Text>
                    </Box>
                    <Box>
                      <Text size="xs" fw={700} tt="uppercase" c="dimmed">Token savings</Text>
                      <Text fw={700}>{optimizedContext.tokenSavings ? `${optimizedContext.tokenSavings.savingsPercent.toFixed(0)}%` : 'optimized'}</Text>
                    </Box>
                    <Box>
                      <Text size="xs" fw={700} tt="uppercase" c="dimmed">Sources</Text>
                      <Text fw={700}>{optimizedContext.sources.length}</Text>
                    </Box>
                  </SimpleGrid>
                  <Stack gap={4}>
                    <Text size="xs" fw={700} tt="uppercase" c="dimmed">Summary</Text>
                    <Text>{optimizedContext.summary}</Text>
                  </Stack>
                  <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
                    <Stack gap="sm">
                      <Title order={3} size="h5">Critical</Title>
                      {optimizedContext.criticalContext.map((item) => (
                        <Paper key={item} p="sm" radius="sm" withBorder bg="var(--mantine-color-default-hover)">
                          <Text size="sm">{item}</Text>
                        </Paper>
                      ))}
                    </Stack>
                  </SimpleGrid>
                  <Group gap="xs">
                    {optimizedContext.sources.map((source) => <Badge key={source} color="gray" variant="light">{source}</Badge>)}
                  </Group>
                  {(optimizedContext.preview?.length ?? 0) > 0 && (
                    <Stack gap="sm">
                      <Group justify="space-between" align="center">
                        <Title order={3} size="h5">Context preview</Title>
                        <Badge color="teal" variant="light">{optimizedContext.preview?.length} selected</Badge>
                      </Group>
                      <Stack gap="xs">
                        {optimizedContext.preview?.map((item) => (
                          <Paper component={Stack} gap="xs" key={`${item.documentId}-${item.chunkId}`} p="sm" radius="sm" withBorder>
                            <Group justify="space-between" align="flex-start" gap="sm">
                              <Stack gap={2} miw={0}>
                                <Text fw={700} truncate>{item.source}</Text>
                                <Text size="sm" c="dimmed">{item.reason}</Text>
                              </Stack>
                              <Group gap="xs">
                                {item.compressed && <Badge color="teal" variant="light">Compressed</Badge>}
                                {item.artifactKind && <Badge color="gray" variant="outline">{item.artifactKind.toLowerCase().replaceAll('_', ' ')}</Badge>}
                              </Group>
                            </Group>
                            <Group gap="xs">
                              <Badge color="gray" variant="light">{item.estimatedTokens.toLocaleString()} tokens</Badge>
                              <Badge color="gray" variant="light">score {item.score.toFixed(2)}</Badge>
                            </Group>
                          </Paper>
                        ))}
                      </Stack>
                    </Stack>
                  )}
                  {optimizedContext.importantContext.length > 0 && (
                    <Stack gap="sm">
                      <Title order={3} size="h5">Supporting context</Title>
                      {optimizedContext.importantContext.map((item) => (
                        <Paper key={item} p="sm" radius="sm" withBorder bg="var(--mantine-color-default-hover)">
                          <Text size="sm">{item}</Text>
                        </Paper>
                      ))}
                    </Stack>
                  )}
                </>
              ) : (
                <Paper p="md" radius="sm" withBorder>
                  <Text fw={700}>Ready to optimize</Text>
                  <Text size="sm" c="dimmed">Enter a coding task and RAG-e Khab will retrieve, rank, deduplicate, compress when configured, and return context within the token budget.</Text>
                </Paper>
              )}
            </Paper>
          </SimpleGrid>
        )}

        {view === 'chat' && (
	          <SimpleGrid component="section" cols={{ base: 1, lg: 2 }} spacing="lg">
	            <Paper component={Stack} gap="md" p="md" radius="sm" withBorder>
	              <Group align="flex-start" gap="sm" wrap="nowrap">
	                <Textarea style={{ flex: 1 }} value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="Ask your knowledge base..." minRows={4} autosize />
	                <ActionIcon size="xl" onClick={() => ask()} disabled={busy || !question.trim()} title="Send question"><Send size={18} /></ActionIcon>
	              </Group>
              <Stack gap="md">
                {history.map((turn) => (
                  <Paper component={Stack} gap="md" key={turn.id} p="md" radius="sm" withBorder>
                    <Paper p="sm" radius="sm" bg="teal.6" c="white" maw="80%" ml="auto">
                      <Text>{turn.question}</Text>
                    </Paper>
                    <Stack gap="sm">
                      <Text size="xs" c="dimmed">{turn.response.provider} - {new Date(turn.response.createdAt).toLocaleString()}</Text>
                      <Text>{turn.response.answer}</Text>
	                      <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
	                        {turn.response.sources.map((source) => (
	                          <Paper component="button" onClick={() => setActiveSource(source)} key={source.chunkId} p="sm" radius="sm" withBorder ta="left">
	                            <Text fw={700}>{source.documentName}</Text>
	                            <Text size="xs" c="dimmed">{source.pageNumber ? `page ${source.pageNumber}` : 'text'} - score {source.score.toFixed(2)}</Text>
	                          </Paper>
	                        ))}
	                      </SimpleGrid>
                    </Stack>
                  </Paper>
                ))}
                {history.length === 0 && (
                  <Paper p="md" radius="sm" withBorder>
                    <Text fw={700}>No conversation yet</Text>
                    <Text size="sm" c="dimmed">Ask a question to inspect cited answers from memories, documents, and repository knowledge.</Text>
                  </Paper>
                )}
              </Stack>
            </Paper>

            <Paper component={Stack} gap="md" p="md" radius="sm" withBorder>
              <Group justify="space-between" align="center">
                <Title order={2} size="h4">Source</Title>
                <Layers size={18} />
              </Group>
              {activeSource ? (
                <Stack gap="sm">
                  <Text fw={700}>{activeSource.documentName}</Text>
                  <Text size="sm" c="dimmed">{activeSource.projectName}{activeSource.pageNumber ? ` - page ${activeSource.pageNumber}` : ''}</Text>
                  <Text>{activeSource.text}</Text>
                  <Text size="xs" c="dimmed" ff="monospace">{activeSource.chunkId}</Text>
                </Stack>
              ) : (
                <Paper p="md" radius="sm" withBorder>
                  <Text fw={700}>No source selected</Text>
                  <Text size="sm" c="dimmed">Select a citation from an answer to inspect the exact retrieved context.</Text>
                </Paper>
              )}
            </Paper>
          </SimpleGrid>
        )}

        {view === 'settings' && (
          <Stack component="section" gap="md">
            {settingsDraft && (
              <Stack gap="md">
                <Paper p="md" radius="sm" withBorder>
                  <Group justify="space-between" align="center">
                    <Title order={2} size="h3">Settings</Title>
                    <Button onClick={saveSettings} disabled={busy}>Save</Button>
                  </Group>
                </Paper>

                <Paper component={Stack} gap="md" p="md" radius="sm" withBorder>
                  <Title order={2} size="h4">Models</Title>
                  <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
                    <NativeSelect
                      label="Chat provider"
                      value={settingsDraft.llm.provider}
                      onChange={(event) => setSettingsDraft({
                        ...settingsDraft,
                        llm: { ...settingsDraft.llm, provider: event.target.value }
                      })}
                      data={(status?.availableProviders ?? []).map((provider) => ({ value: provider, label: provider }))}
                    />
                    <NativeSelect
                      label="Chat model"
                      value={selectValue(settingsDraft.llm.model, chatModelOptions)}
                      onChange={(event) => {
                        const value = event.target.value;
                        setSettingsDraft({
                          ...settingsDraft,
                          llm: { ...settingsDraft.llm, model: value === CUSTOM_MODEL ? '' : value }
                        });
                      }}
                      data={[...chatModelOptions.map((model) => ({ value: model, label: model })), { value: CUSTOM_MODEL, label: 'custom' }]}
                    />
                    {selectValue(settingsDraft.llm.model, chatModelOptions) === CUSTOM_MODEL && (
                      <TextInput
                        label="Custom chat model"
                        value={settingsDraft.llm.model}
                        placeholder="model name"
                        onChange={(event) => setSettingsDraft({
                          ...settingsDraft,
                          llm: { ...settingsDraft.llm, model: event.target.value }
                        })}
                      />
                    )}
                    <TextInput
                      label="Chat base URL"
                      value={settingsDraft.llm.baseUrl}
                      onChange={(event) => setSettingsDraft({
                        ...settingsDraft,
                        llm: { ...settingsDraft.llm, baseUrl: event.target.value }
                      })}
                    />
                    <TextInput
                      label="Chat API key"
                      type="password"
                      value={settingsDraft.llm.apiKey}
                      onChange={(event) => setSettingsDraft({
                        ...settingsDraft,
                        llm: { ...settingsDraft.llm, apiKey: event.target.value }
                      })}
                    />
                  </SimpleGrid>
                </Paper>

                <Paper component={Stack} gap="md" p="md" radius="sm" withBorder>
                  <Title order={2} size="h4">Optimizer</Title>
                  <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
                    <NativeSelect
                      label="Optimizer mode"
                      value={settingsDraft.optimizer.mode}
                      onChange={(event) => setSettingsDraft({
                        ...settingsDraft,
                        optimizer: { ...settingsDraft.optimizer, mode: event.target.value }
                      })}
                      data={[
                        { value: 'retrieval', label: 'Retrieval only' },
                        { value: 'compression', label: 'Compression', disabled: !settingsDraft.localLlm.enabled },
                      ]}
                    />
                    <NumberInput
                      label="Optimizer max tokens"
                      min={300}
                      max={8000}
                      value={settingsDraft.optimizer.maxTokens}
                      onChange={(value) => setSettingsDraft({
                        ...settingsDraft,
                        optimizer: { ...settingsDraft.optimizer, maxTokens: Number(value) || 300 }
                      })}
                    />
                    {!settingsDraft.localLlm.enabled && (
                      <Alert color="yellow" variant="light" style={wideGridItemStyle}>
                        Enable local LLM compression to use compression mode.
                      </Alert>
                    )}
                    <Checkbox
                      checked={settingsDraft.localLlm.enabled}
                      onChange={(event) => setSettingsDraft({
                        ...settingsDraft,
                        optimizer: event.currentTarget.checked ? settingsDraft.optimizer : { ...settingsDraft.optimizer, mode: 'retrieval' },
                        localLlm: { ...settingsDraft.localLlm, enabled: event.currentTarget.checked }
                      })}
                      label="Enable local LLM compression"
                    />
                    <NativeSelect
                      label="Local LLM provider"
                      value={settingsDraft.localLlm.provider}
                      onChange={(event) => setSettingsDraft({
                        ...settingsDraft,
                        localLlm: { ...settingsDraft.localLlm, provider: event.target.value }
                      })}
                      data={[{ value: 'ollama', label: 'Ollama' }]}
                    />
                    <TextInput
                      label="Local LLM base URL"
                      value={settingsDraft.localLlm.baseUrl}
                      onChange={(event) => setSettingsDraft({
                        ...settingsDraft,
                        localLlm: { ...settingsDraft.localLlm, baseUrl: event.target.value }
                      })}
                    />
                    <NativeSelect
                      label="Compression model"
                      value={!settingsDraft.localLlm.enabled ? DISABLED_MODEL : selectValue(settingsDraft.localLlm.model, compressionModelOptions)}
                      disabled={settingsDraft.optimizer.mode === 'retrieval'}
                      onChange={(event) => {
                        const value = event.target.value;
                        setSettingsDraft({
                          ...settingsDraft,
                          optimizer: value === DISABLED_MODEL ? { ...settingsDraft.optimizer, mode: 'retrieval' } : settingsDraft.optimizer,
                          localLlm: {
                            ...settingsDraft.localLlm,
                            enabled: value !== DISABLED_MODEL,
                            model: value === CUSTOM_MODEL ? '' : value === DISABLED_MODEL ? settingsDraft.localLlm.model : value
                          }
                        });
                      }}
                      data={[
                        { value: DISABLED_MODEL, label: 'disabled' },
                        ...compressionModelOptions.map((model) => ({ value: model, label: model })),
                        { value: CUSTOM_MODEL, label: 'custom' },
                      ]}
                    />
                    {settingsDraft.localLlm.enabled && selectValue(settingsDraft.localLlm.model, compressionModelOptions) === CUSTOM_MODEL && (
                      <TextInput
                        label="Custom compression model"
                        value={settingsDraft.localLlm.model}
                        placeholder="model name"
                        disabled={settingsDraft.optimizer.mode === 'retrieval'}
                        onChange={(event) => setSettingsDraft({
                          ...settingsDraft,
                          localLlm: { ...settingsDraft.localLlm, model: event.target.value }
                        })}
                      />
                    )}
                  </SimpleGrid>
                </Paper>

                <Paper component={Stack} gap="md" p="md" radius="sm" withBorder>
                  <Title order={2} size="h4">Advanced settings</Title>
                  <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
                    <NativeSelect
                      label="Embedding provider"
                      value={settingsDraft.embedding.provider}
                      onChange={(event) => setSettingsDraft({
                        ...settingsDraft,
                        embedding: {
                          ...settingsDraft.embedding,
                          provider: event.target.value,
                          model: event.target.value === 'hash' ? 'hash-based embedder' : settingsDraft.embedding.model === 'hash-based embedder' ? 'nomic-embed-text' : settingsDraft.embedding.model,
                          dimensions: event.target.value === 'hash' ? 384 : settingsDraft.embedding.dimensions
                        }
                      })}
                      data={[
                        { value: 'hash', label: 'Hash fallback' },
                        { value: 'ollama', label: 'Ollama' },
                      ]}
                    />
                    <NativeSelect
                      label="Embedding model"
                      value={settingsDraft.embedding.provider === 'hash' ? 'hash-based embedder' : selectValue(settingsDraft.embedding.model, embeddingModelOptions)}
                      disabled={settingsDraft.embedding.provider === 'hash'}
                      onChange={(event) => {
                        const value = event.target.value;
                        setSettingsDraft({
                          ...settingsDraft,
                          embedding: { ...settingsDraft.embedding, model: value === CUSTOM_MODEL ? '' : value }
                        });
                      }}
                      data={settingsDraft.embedding.provider === 'hash'
                        ? [{ value: 'hash-based embedder', label: 'hash-based embedder' }]
                        : [...embeddingModelOptions.map((model) => ({ value: model, label: model })), { value: CUSTOM_MODEL, label: 'custom' }]}
                    />
                    {settingsDraft.embedding.provider === 'ollama' && selectValue(settingsDraft.embedding.model, embeddingModelOptions) === CUSTOM_MODEL && (
                      <TextInput
                        label="Custom embedding model"
                        value={settingsDraft.embedding.model}
                        placeholder="embedding model"
                        onChange={(event) => setSettingsDraft({
                          ...settingsDraft,
                          embedding: { ...settingsDraft.embedding, model: event.target.value }
                        })}
                      />
                    )}
                    <TextInput
                      label="Embedding base URL"
                      value={settingsDraft.embedding.baseUrl}
                      onChange={(event) => setSettingsDraft({
                        ...settingsDraft,
                        embedding: { ...settingsDraft.embedding, baseUrl: event.target.value }
                      })}
                    />
                    <NumberInput
                      label="Embedding dimensions"
                      min={1}
                      max={8192}
                      value={settingsDraft.embedding.dimensions}
                      onChange={(value) => setSettingsDraft({
                        ...settingsDraft,
                        embedding: { ...settingsDraft.embedding, dimensions: Number(value) || 1 }
                      })}
                    />
                  </SimpleGrid>
                </Paper>

                <Paper component={Stack} gap="md" p="md" radius="sm" withBorder>
                  <Title order={2} size="h4">Storage diagnostics</Title>
                  <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
                      <Box>
                        <Text size="xs" fw={700} tt="uppercase" c="dimmed">Vector store</Text>
                        <Text fw={700}>{status?.index.vectorStore ?? 'unknown'}</Text>
                      </Box>
                      <Box>
                        <Text size="xs" fw={700} tt="uppercase" c="dimmed">Collection</Text>
                        <Text fw={700}>{status?.index.collection ?? 'unknown'}</Text>
                      </Box>
                      <Box>
                        <Text size="xs" fw={700} tt="uppercase" c="dimmed">Qdrant</Text>
                        <Text fw={700}>{status?.qdrantUrl ?? 'unknown'}</Text>
                      </Box>
                      <Box>
                        <Text size="xs" fw={700} tt="uppercase" c="dimmed">Documents</Text>
                        <Text fw={700}>{status?.index.documentCount ?? 0}</Text>
                      </Box>
                    </SimpleGrid>
                  </Paper>
              </Stack>
            )}
          </Stack>
        )}
        </Stack>
      </AppShell.Main>
    </AppShell>
  );
}
