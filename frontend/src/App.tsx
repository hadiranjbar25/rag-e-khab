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
  sources: string[];
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
  warningSummary: DebugWarning[];
  dataRequestId?: string;
  createdAt: string;
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

type View = 'home' | 'repositories' | 'memories' | 'knowledge' | 'safeDebug' | 'optimizer' | 'settings' | 'chat';
type IngestMode = 'upload' | 'text';

const viewRoutes: Record<View, string> = {
  home: '/',
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
  ProjectKnowledge: 'Project',
  DomainKnowledge: 'Domain',
  TechnicalDebt: 'Debt'
};

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

const safeDebugInstructionFor = (sessionId?: string) => `You are connected to a Safe Debug Session.

Current sessionId: ${sessionId || '<select a debug session>'}

Use only sanitized artifacts from the session.
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
    const safeDebugSessions = await request<DebugSession[]>('/api/debug-sessions').catch(() => []);
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
    if (!activeDebugSessionId && safeDebugSessions.length > 0) setActiveDebugSessionId(safeDebugSessions[0].id);
    setStatus(admin);
    setSettingsDraft(admin.settings);
  };

  useEffect(() => {
    refresh().catch((err) => reportError(err, 'Failed to load project'));
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
    { label: 'Repositories', value: projectRepositories.length, detail: 'linked to this project', icon: Network, tone: 'purple' },
    { label: 'Memories', value: memories.length, detail: `${new Set(memories.map((memory) => memory.type)).size} memory types`, icon: Brain, tone: 'purple' },
    { label: 'System', value: status?.index.vectorStore === 'qdrant' ? 'Healthy' : 'Local', detail: `${documents.length} project source(s)`, icon: CheckCircle2, tone: 'green' },
    { label: 'Token savings', value: tokenSavings ? tokenSavings.toLocaleString() : 'Ready', detail: optimizedContext ? 'latest optimization' : `${settingsDraft?.optimizer.maxTokens ?? 3000} token target`, icon: Zap, tone: 'amber' }
  ], [documents.length, memories, optimizedContext, projectRepositories.length, settingsDraft?.optimizer.maxTokens, status?.index.vectorStore, tokenSavings]);

  const navItems = [
    { id: 'home' as const, label: 'Dashboard', icon: Home },
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
    'What project conventions should I follow?'
  ];

  const pageCopy: Record<View, string> = {
    home: 'Health, activity, and context value for this project.',
    repositories: 'Codebases linked to the active project.',
    memories: 'Decisions, conventions, fixes, and patterns for this project.',
    knowledge: 'Documents and notes available to coding agents.',
    safeDebug: 'Sanitize production-like query output before sharing it with coding agents.',
    optimizer: 'Create the smallest useful context for coding agents.',
    settings: 'Configure models, optimization, repository sync, and advanced infrastructure.',
    chat: 'Ask cited questions against the active project.'
  };

  const pageTitles: Record<View, string> = {
    home: selectedProject ? selectedProject.name : 'General',
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
  }, [documents, memories, repositoryStatus?.repositories]);

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

  const optimizeContext = async () => {
    const prompt = task.trim();
    if (!prompt) return;
    setBusy(true);
    setError(null);
    try {
      const response = await request<OptimizedContext>('/api/context/optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task: prompt, projectId: selectedProjectId || undefined, targetTokens: 2000 })
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
      showToast({ type: 'success', title: 'Project created', message: project.name });
    } catch (err) {
      reportError(err, 'Project creation failed');
    } finally {
      setBusy(false);
    }
  };

  const deleteProject = async (project: ProjectItem) => {
    if (project.name === 'General') return;
    const confirmed = window.confirm(`Delete project "${project.name}" and ${project.documentCount} document(s)?`);
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
      showToast({ type: 'success', title: 'Project deleted', message: project.name });
    } catch (err) {
      reportError(err, 'Project deletion failed');
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
      showToast({ type: 'success', title: 'Memory linked to project' });
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
      showToast({ type: 'success', title: 'Memory removed from project' });
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
      showToast({ type: 'success', title: 'Repository removed from project' });
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
      setDebugSanitizedText(response.sanitizedText);
      setDebugWarnings(response.warnings);
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
      await request<DebugNote>(`/api/debug-sessions/${activeDebugSessionId}/claude-requests`, {
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

  const filteredDebugMappings = (debugDetail?.tokenMappings ?? []).filter((mapping) => {
    const query = debugTokenSearch.trim().toLowerCase();
    if (!query) return true;
    return [mapping.token, mapping.table, mapping.column, mapping.realValue]
      .some((value) => value.toLowerCase().includes(query));
  });

  const pendingDebugRequests = (debugDetail?.dataRequests ?? []).filter((item) => item.status === 'pending');

  const tokenMappingFor = (token?: string): DebugTokenMapping | undefined =>
    token ? debugDetail?.tokenMappings.find((mapping) => mapping.token.toLowerCase() === token.toLowerCase()) : undefined;

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

  return (
    <AppShell
      navbar={{ width: 280, breakpoint: 'sm' }}
      padding="lg"
      className={busy ? 'mantineShell isBusy' : 'mantineShell'}
    >
      <LoadingOverlay visible={busy} overlayProps={{ radius: 'sm', blur: 1 }} />

      <AppShell.Navbar className="mantineNavbar">
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

          <Select
            label="Project"
            value={selectedProjectId}
            onChange={(value) => setSelectedProjectId(value ?? '')}
            data={projects.map((project) => ({ value: project.id, label: project.name }))}
            searchable
            nothingFoundMessage="No projects"
          />

          <Badge
            color={status?.index.vectorStore === 'qdrant' ? 'teal' : 'gray'}
            variant="light"
            leftSection={<span className={status?.index.vectorStore === 'qdrant' ? 'statusDot online' : 'statusDot'} />}
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

      <AppShell.Main className="mantineWorkspace">
        <Paper className="mantineTopbar" p="lg" radius="sm" withBorder>
          <Title order={1}>{pageTitles[view]}</Title>
          <Text c="dimmed" mt={4}>{pageCopy[view]}</Text>
        </Paper>
        {busy && <div className="loadingBar" aria-label="Working" />}

        {error && <Alert color="red" icon={<AlertCircle size={18} />}>{error}</Alert>}

        {view === 'home' && (
          <section className="view">
            <Paper className="commandPanel projectOverview" p="md" radius="sm" withBorder>
              <div>
                <span className="eyebrow">Project health</span>
                <h2>{status?.index.vectorStore === 'qdrant' ? 'Ready for agents' : 'Local memory ready'}</h2>
                <p>{projectRepositories.length} repositories, {memories.length} memories, {totalChunks} source units available in this project.</p>
              </div>
            </Paper>

            <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="md">
              {stats.map((item) => {
                const Icon = item.icon;
                return (
                <Paper className={`metric ${item.tone}`} key={item.label} p="md" radius="sm" withBorder>
                  <div className="metricIcon"><Icon size={18} /></div>
                  <span>{item.label}</span>
                  <strong>{item.value}</strong>
                  <small>{item.detail}</small>
                </Paper>
                );
              })}
            </SimpleGrid>

            <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="lg">
              <Paper component="section" className="surface quietSurface" p="md" radius="sm" withBorder>
                  <Group justify="space-between" align="center" mb="md">
                  <h2>System health</h2>
                  <Badge color="green" variant="light" leftSection={<CheckCircle2 size={14} />}>operational</Badge>
                </Group>
                <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
                  <Box>
                    <Text size="xs" fw={700} tt="uppercase" c="dimmed">Last sync</Text>
                    <Text fw={700}>{lastSync ? new Date(lastSync).toLocaleString() : 'No sync yet'}</Text>
                  </Box>
                  <Box>
                    <Text size="xs" fw={700} tt="uppercase" c="dimmed">Optimizer</Text>
                    <Text fw={700}>{settingsDraft?.optimizer.mode ?? 'retrieval'} · {settingsDraft?.optimizer.maxTokens ?? 3000} tokens</Text>
                  </Box>
                </SimpleGrid>
              </Paper>

              <Paper component="section" className="surface" p="md" radius="sm" withBorder>
                <div className="surfaceHeader">
                  <h2>Recent activity</h2>
                  <Clock3 size={18} />
                </div>
                <Stack gap="md">
                  {recentActivity.map((item) => {
                    const Icon = item.icon;
                    return (
                    <Paper className="activityRow" key={item.id} p="sm" radius="sm" withBorder>
                      <div className={`activityIcon ${item.tone}`}><Icon size={16} /></div>
                      <Box>
                        <Text fw={700}>{item.title}</Text>
                        <Text size="sm" c="dimmed">{item.detail}</Text>
                      </Box>
                      <Text component="time" size="sm" c="dimmed">{new Date(item.at).toLocaleDateString()}</Text>
                    </Paper>
                    );
                  })}
                  {recentActivity.length === 0 && <div className="empty richEmpty"><strong>No activity yet</strong><span>Scan a repository, add a memory, or index knowledge to make this project useful for coding agents.</span></div>}
                </Stack>
              </Paper>
            </SimpleGrid>
          </section>
        )}

        {view === 'repositories' && (
          <section className="view">
            <Paper p="md" radius="sm" withBorder>
              <Group justify="space-between" align="flex-start">
              <Box flex={1} miw={320}>
                <Title order={2} size="h3">{repositories.length || repositoryStatus?.repositories.length || 0} repositories</Title>
                <Text c="dimmed">Repositories are registered by local agents. Link them to the active project when they should contribute knowledge and memories here. {repositoryStatus?.trackedFiles ?? 0} indexed files · last sync {lastSync ? new Date(lastSync).toLocaleString() : 'not available'}</Text>
              </Box>
              <details className="advancedPanel">
                <summary>Link repository</summary>
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
              </details>
              </Group>
            </Paper>

            <Stack gap="md">
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
                <Paper component="article" className="repoCard" key={repo.id} p="md" radius="sm" withBorder>
	                  <Group justify="space-between" align="flex-start">
	                    <Stack gap={2}>
	                      <Text fw={700}>{repo.name}</Text>
	                      <Text size="sm" c="dimmed">Last sync {repo.lastSyncedAt ? new Date(repo.lastSyncedAt).toLocaleString() : 'not available'}</Text>
	                    </Stack>
	                    <Group gap="sm">
	                      <Badge color={repo.status === 'synced' ? 'green' : 'gray'} variant="light">{repo.status}</Badge>
	                      <Badge color={linked ? 'violet' : 'gray'} variant="outline">{linked ? 'In this project' : 'Not in project'}</Badge>
	                    </Group>
                  </Group>
                  <SimpleGrid cols={2} spacing="sm" maw={360}>
                    <Stack gap={2}>
                      <Text size="xs" fw={700} tt="uppercase" c="dimmed">Knowledge</Text>
                      <Text fw={700}>{files.length}</Text>
                    </Stack>
                    <Stack gap={2}>
                      <Text size="xs" fw={700} tt="uppercase" c="dimmed">Memories</Text>
                      <Text fw={700}>{linkedMemories}</Text>
                    </Stack>
                  </SimpleGrid>
	                  <Group gap="sm">
	                    {linked ? (
	                      <Button variant="subtle" color="gray" onClick={() => unlinkRepositoryFromProject(repo.id)} disabled={busy}>Remove</Button>
	                    ) : (
	                      <Button variant="light" color="teal" onClick={() => linkRepositoryToProject(repo.id)} disabled={busy}>Link to project</Button>
	                    )}
	                    <Menu shadow="md" width={210} position="bottom-end">
	                      <Menu.Target>
	                        <Button variant="light" color="gray">More</Button>
	                      </Menu.Target>
	                      <Menu.Dropdown>
	                        <Menu.Item color="red" leftSection={<Trash2 size={16} />} onClick={() => deleteRepository(repo)} disabled={busy}>
	                          Delete repository
	                        </Menu.Item>
	                      </Menu.Dropdown>
	                    </Menu>
	                  </Group>
                  <details className="repoDetails">
                    <summary>Details</summary>
                    <div>
                      <span>{repo.path}</span>
                      <span>{linked ? 'Linked to project' : 'Not linked'}</span>
                      <span>{(languages.length > 0 ? languages : [repo.language]).join(', ')}</span>
                    </div>
                  </details>
                </Paper>
                );
              })}
              {repositories.length === 0 && (repositoryStatus?.repositories.length ?? 0) === 0 && <div className="empty richEmpty"><strong>No repositories yet</strong><span>Run the RAG-e Khab agent from a codebase to register a repository, then link it to this project.</span></div>}
            </Stack>

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

	            <details className="advancedPanel">
	              <summary>Repository deletion options</summary>
	              <Checkbox
	                className="deletionToggle"
	                checked={deleteRepositoryKnowledge}
	                onChange={(event) => setDeleteRepositoryKnowledge(event.currentTarget.checked)}
	                label="Delete indexed knowledge when deleting a repository"
	              />
	            </details>

            <details className="advancedPanel workspacePanel">
              <summary>Projects</summary>
	              <div className="surfaceHeader">
	                <h2>Projects</h2>
	                <Group gap="sm" grow>
	                  <TextInput value={projectName} onChange={(event) => setProjectName(event.target.value)} placeholder="New project" />
	                  <Button onClick={createProject} disabled={busy || !projectName.trim()} title="Create project" leftSection={<FolderPlus size={18} />}>Create</Button>
	                </Group>
	              </div>
              <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="md">
                {projects.map((project) => (
                  <Paper component={Stack} gap="md" className={project.id === selectedProjectId ? 'projectCard active' : 'projectCard'} key={project.id} p="md" radius="sm" withBorder>
                    <Stack gap={2}>
                      <Text fw={700}>{project.name}</Text>
                      <Group gap="xs">
                        <Text fw={700}>{project.documentCount}</Text>
                        <Text size="sm" c="dimmed">created {new Date(project.createdAt).toLocaleDateString()}</Text>
                      </Group>
	                  </Stack>
                    <Group gap="sm">
	                    <Button variant="subtle" color="gray" onClick={() => setSelectedProjectId(project.id)} disabled={busy}>
	                      Select
	                    </Button>
	                    {project.name !== 'General' && (
	                      <ActionIcon variant="light" color="red" onClick={() => deleteProject(project)} disabled={busy} title="Delete project">
	                        <Trash2 size={18} />
	                      </ActionIcon>
	                    )}
	                  </Group>
                  </Paper>
                ))}
              </SimpleGrid>
            </details>
          </section>
        )}

        {view === 'memories' && (
          <section className="view">
            <Paper className="memoryToolbar" p="lg" radius="sm" withBorder>
              <div>
                <h2>{filteredMemories.length} memories</h2>
                <p>{selectedProject?.name ?? 'General'} project · search decisions, conventions, fixes, and patterns.</p>
              </div>
              <TextInput
                value={memorySearch}
                onChange={(event) => setMemorySearch(event.currentTarget.value)}
                placeholder="Search memories..."
                leftSection={<Search size={16} />}
              />
              <SegmentedControl
                className="memoryFilterTabs"
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
            </Paper>

            <Paper className="memoryComposer" p="lg" radius="sm" withBorder>
              <div className="memoryComposerBody">
                <div>
                  <h2>Remember for this project</h2>
                  <p>Store rules like coding conventions, architecture decisions, and project-specific preferences.</p>
                </div>
                <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
                  <Select
                    value={memoryTypeDraft}
                    onChange={(value) => setMemoryTypeDraft(value ?? 'CodingConvention')}
                    data={memoryTypes.map((type) => ({ value: type, label: memoryLabels[type] ?? type }))}
                  />
                  <TextInput value={memoryRepositoryDraft} onChange={(event) => setMemoryRepositoryDraft(event.currentTarget.value)} placeholder="repository optional" />
                  <Textarea style={{ gridColumn: '1 / -1' }} value={memoryContentDraft} onChange={(event) => setMemoryContentDraft(event.currentTarget.value)} placeholder="Do not use uppercase UI labels in this project. Prefer sentence case." autosize minRows={3} />
                  <Button onClick={rememberMemory} disabled={busy || !memoryContentDraft.trim()}>Remember</Button>
                </SimpleGrid>
              </div>
            </Paper>

            <Paper className="memoryLinkPanel" p="lg" radius="sm" withBorder>
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
                <Paper component="article" className="memoryCard" key={memory.id} p="md" radius="sm" withBorder>
                  <div className="memoryCardHeader">
                    <Badge color={memoryBadgeColor(memory.type)} variant="light">{memoryLabels[memory.type] ?? memory.type}</Badge>
                    <Menu shadow="md" width={190} position="bottom-end">
                      <Menu.Target>
                        <Button variant="subtle" size="compact-sm">More</Button>
                      </Menu.Target>
                      <Menu.Dropdown>
                        <Menu.Item onClick={() => unlinkMemoryFromProject(memory.id)} disabled={busy}>Remove from project</Menu.Item>
                        <Menu.Item color="red" leftSection={<Trash2 size={16} />} onClick={() => deleteMemory(memory.id)} disabled={busy}>Delete memory</Menu.Item>
                      </Menu.Dropdown>
                    </Menu>
                  </div>
                  <p>{memory.content}</p>
                  <Group gap="xs">
                    <Badge color="gray" variant="light">{Math.round(memory.confidence * 100)}% confidence</Badge>
                    <Badge color="gray" variant="outline">{memory.repository ?? 'global'}</Badge>
                  </Group>
                </Paper>
              ))}
              {filteredMemories.length === 0 && <div className="empty richEmpty"><strong>No memories in this view</strong><span>Use the MCP `remember` tool to store architecture decisions, conventions, bug fixes, patterns, and project knowledge.</span></div>}
            </SimpleGrid>
          </section>
        )}

	        {view === 'knowledge' && (
	          <SimpleGrid component="section" className="view" cols={{ base: 1, md: 2 }} spacing="lg">
	            <Paper component="section" className="surface ingestSurface" p="md" radius="sm" withBorder>
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
	                <div className="textIngest">
	                  <TextInput value={textTitle} onChange={(event) => setTextTitle(event.target.value)} placeholder="Title" />
	                  <Textarea value={textBody} onChange={(event) => setTextBody(event.target.value)} placeholder="Paste notes, snippets, summaries, or any text..." minRows={8} autosize />
	                  <Button onClick={addText} disabled={busy || !textBody.trim()} leftSection={<FilePlus2 size={18} />}>Add text</Button>
	                </div>
	              ) : (
	                <Paper className="dropZone" p="xl" radius="sm" withBorder>
	                  <Upload size={28} />
	                  <strong>Choose a PDF, Markdown, or text file</strong>
	                  <span>{selectedProject?.name ?? 'General'}</span>
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

            <Paper component="section" className="surface" p="md" radius="sm" withBorder>
              <div className="surfaceHeader">
	                <h2>Indexed items</h2>
	                <Button variant="light" color="gray" onClick={reindex} disabled={busy} leftSection={<RefreshCw size={16} />}>Reindex</Button>
	              </div>
              <Stack gap="md">
                {documents.map((doc) => (
                  <Paper className="documentRow" key={doc.id} p="sm" radius="sm" withBorder>
                    <FileText size={20} />
                    <div>
                      <strong>{doc.name}</strong>
                        <span>{doc.projectName} · {doc.format} · {doc.chunkCount} source units · {(doc.sizeBytes / 1024).toFixed(1)} KB</span>
                    </div>
	                    <ActionIcon variant="light" color="red" onClick={() => deleteDocument(doc.id)} disabled={busy} title="Delete document"><Trash2 size={18} /></ActionIcon>
                  </Paper>
                ))}
                {documents.length === 0 && <div className="empty richEmpty"><strong>No sources indexed yet</strong><span>Add text, upload a file, or sync a repository so coding agents can retrieve useful context.</span></div>}
              </Stack>
            </Paper>
          </SimpleGrid>
        )}

        {view === 'safeDebug' && (
	          <section className="view safeDebugLayout">
	            <SimpleGrid component="section" className="safeDebugControls" cols={{ base: 1, md: 2 }} spacing="md">
	              <Paper component="section" p="md" radius="sm" withBorder>
	                <div className="surfaceHeader">
	                  <h2>New session</h2>
	                  <Plus size={18} />
	                </div>
	                <Group align="end" gap="sm" grow>
	                  <TextInput value={debugTitle} onChange={(event) => setDebugTitle(event.target.value)} placeholder="BUG-123 or checkout failure" />
	                  <Button onClick={createDebugSession} disabled={busy || !debugTitle.trim()} title="Create session" leftSection={<Plus size={18} />}>Create</Button>
	                </Group>
	              </Paper>

              <Paper component="section" p="md" radius="sm" withBorder>
                <div className="surfaceHeader">
                  <h2>Active session</h2>
                  <Badge color={activeDebugSession?.status === 'active' ? 'green' : 'gray'} variant="light">
                    {activeDebugSession?.status ?? `${debugSessions.length} total`}
                  </Badge>
                </div>
                <Stack gap="sm">
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
                    <Stack gap={2}>
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
                </Stack>
              </Paper>
            </SimpleGrid>

            <Stack component="section" gap="md">
              {debugDetail ? (
                <>
                  <Paper component="section" className="debugHeader" p="md" radius="sm" withBorder>
                    <div>
                      <span className="eyebrow">Session header</span>
                      <h2>{debugDetail.session.title}</h2>
                      <p>{debugDetail.session.id}</p>
                    </div>
                    <div className="debugHeaderMeta">
                      <Badge color={debugDetail.session.status === 'active' ? 'green' : 'gray'} variant="light">{debugDetail.session.status}</Badge>
                      <small>Created {new Date(debugDetail.session.createdAt).toLocaleString()}</small>
                    </div>
                  </Paper>

                  <Tabs defaultValue="workspace" keepMounted={false}>
                    <Tabs.List>
                      <Tabs.Tab value="workspace">Workspace</Tabs.Tab>
                      <Tabs.Tab value="instruction">Agent instruction</Tabs.Tab>
                    </Tabs.List>

                    <Tabs.Panel value="instruction" pt="md">
                      <Paper component="section" className="debugInstruction" p="md" radius="sm" withBorder>
                        <div className="surfaceHeader">
                          <h2>Agent instruction</h2>
                          <ActionIcon variant="light" color="gray" onClick={() => copyDebugText(activeSafeDebugInstruction)} title="Copy instruction"><Copy size={17} /></ActionIcon>
                        </div>
                        <pre>{activeSafeDebugInstruction}</pre>
                      </Paper>
                    </Tabs.Panel>

                    <Tabs.Panel value="workspace" pt="md">
                      <Stack gap="md">
                  <Paper component="section" className="debugPanel" p="md" radius="sm" withBorder>
                    <div className="surfaceHeader">
                      <h2>Pending agent requests</h2>
                      <span>{pendingDebugRequests.length} pending</span>
                    </div>
                    <SimpleGrid cols={{ base: 1, md: 2, xl: 3 }} spacing="md">
                      {debugDetail.dataRequests.map((item) => {
                        const mapping = tokenMappingFor(item.parentToken);
                        const suggestedSql = suggestedSqlFor(item);
                        return (
                          <Paper component="article" className="debugRequestCard" key={item.id} p="md" radius="sm" withBorder>
                            <div className="debugRequestHeader">
                              <div>
                                <strong>{item.entity}</strong>
                                <span>{item.relation || 'No relation'}{item.parentToken ? ` · ${item.parentToken}` : ''}</span>
                              </div>
                              <Badge color={item.status === 'pending' ? 'green' : 'gray'} variant="light">{item.status}</Badge>
                            </div>
                            <p>{item.reason}</p>
                            {item.requestedFields.length > 0 && <small>Fields: {item.requestedFields.join(', ')}</small>}
	                            {mapping && <small>{item.parentToken} -&gt; {mapping.table}.{mapping.column} = {mapping.realValue}</small>}
	                            {suggestedSql && <pre>{suggestedSql}</pre>}
	                            <Group gap="sm">
	                              <Button variant="subtle" color="gray" onClick={() => copyDebugText(suggestedSql)} disabled={!suggestedSql} leftSection={<Copy size={16} />}>Copy SQL</Button>
	                              <Button variant="light" color="teal" onClick={() => updateDebugDataRequest(item.id, 'complete')} disabled={busy || item.status !== 'pending'}>Mark Completed</Button>
	                              <Button variant="light" color="red" onClick={() => updateDebugDataRequest(item.id, 'reject')} disabled={busy || item.status !== 'pending'}>Reject</Button>
	                            </Group>
                          </Paper>
                        );
                      })}
                      {debugDetail.dataRequests.length === 0 && <div className="empty">No structured agent data requests yet.</div>}
                    </SimpleGrid>
                  </Paper>

                  <SimpleGrid component="section" cols={{ base: 1, lg: 2 }} spacing="lg">
                    <Paper className="debugPanel" p="md" radius="sm" withBorder>
                      <div className="surfaceHeader">
                        <h2>Paste data</h2>
                        <ShieldCheck size={18} />
                      </div>
	                      <Textarea value={debugRawText} onChange={(event) => setDebugRawText(event.target.value)} placeholder="Paste CSV, JSON, or log output here..." minRows={8} autosize />
	                      <Group align="end" gap="sm" grow>
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
	                      </Group>
	                      <NativeSelect
	                        className="debugRequestSelect"
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

                    <Paper className="debugPanel" p="md" radius="sm" withBorder>
                      <div className="surfaceHeader">
	                        <h2>Sanitized output</h2>
	                        <Group gap="sm">
	                          <ActionIcon variant="light" color="gray" onClick={() => copyDebugText(debugSanitizedText, debugDetail.artifacts[0]?.id)} disabled={!debugSanitizedText} title="Copy sanitized output"><Clipboard size={17} /></ActionIcon>
	                          <Button variant="subtle" color="gray" onClick={() => copyDebugText(debugSanitizedText, debugDetail.artifacts[0]?.id)} disabled={!debugSanitizedText}>Save artifact</Button>
	                        </Group>
                      </div>
                      <pre className="debugOutput">{debugSanitizedText || 'Sanitized data will appear here.'}</pre>
                    </Paper>
                  </SimpleGrid>

                  <SimpleGrid component="section" cols={{ base: 1, lg: 2 }} spacing="lg">
                    <Paper className="debugPanel" p="md" radius="sm" withBorder>
                      <div className="surfaceHeader">
                        <h2>Resolve token</h2>
                        <KeyRound size={18} />
	                      </div>
	                      <Group align="end" gap="sm" grow>
	                        <TextInput value={debugTokenQuery} onChange={(event) => setDebugTokenQuery(event.target.value)} placeholder="USER_001" />
	                        <Button onClick={resolveDebugToken} disabled={busy || !debugTokenQuery.trim()}>Resolve</Button>
	                      </Group>
                      {debugResolvedToken ? (
                        <div className="resolvedToken">
	                          <span>{debugResolvedToken.token}</span>
	                          <strong>{debugResolvedToken.table}.{debugResolvedToken.column} = {debugResolvedToken.realValue}</strong>
	                          <Button variant="subtle" color="gray" onClick={() => copyDebugText(debugResolvedToken.realValue)} leftSection={<Copy size={16} />}>Copy real id</Button>
                        </div>
                      ) : (
                        <div className="empty">Resolve a token to manually query the database without asking an agent for raw data.</div>
                      )}
                    </Paper>

                    <Paper className="debugPanel" p="md" radius="sm" withBorder>
                      <div className="surfaceHeader">
                        <h2>Agent requests</h2>
                        <span>{debugDetail.notes.length}</span>
	                      </div>
	                      <Group align="end" gap="sm" grow>
	                        <TextInput value={agentRequestDraft} onChange={(event) => setAgentRequestDraft(event.target.value)} placeholder="Need orders for USER_001" />
	                        <Button onClick={recordAgentRequest} disabled={busy || !agentRequestDraft.trim()}>Record</Button>
	                      </Group>
                      <Stack gap="md">
                        {debugDetail.notes.slice(0, 4).map((note) => (
                          <div key={note.id}><strong>{note.request}</strong><span>{new Date(note.createdAt).toLocaleString()}</span></div>
                        ))}
                      </Stack>
                    </Paper>
                  </SimpleGrid>

                  <Paper component="section" className="debugPanel promoteMemoryPanel" p="md" radius="sm" withBorder>
                    <div className="surfaceHeader">
                      <div>
                        <h2>Promote Lesson to Memory</h2>
                        <span>Save only durable, sanitized conclusions. Tokens, raw IDs, PII, and SQL with real IDs are blocked.</span>
                      </div>
                      <Brain size={18} />
	                    </div>
	                    <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
	                      <NativeSelect value={debugMemoryTypeDraft} onChange={(event) => setDebugMemoryTypeDraft(event.target.value)} data={memoryTypes.map((type) => ({ value: type, label: memoryLabels[type] ?? type }))} />
	                      <TextInput value={debugMemoryRepositoryDraft} onChange={(event) => setDebugMemoryRepositoryDraft(event.target.value)} placeholder="repository optional" />
	                      <TextInput value={debugMemoryModuleDraft} onChange={(event) => setDebugMemoryModuleDraft(event.target.value)} placeholder="module optional" />
	                      <NumberInput min={0} max={1} step={0.05} value={debugMemoryConfidenceDraft} onChange={(value) => setDebugMemoryConfidenceDraft(Number(value) || 0)} />
	                      <Textarea style={{ gridColumn: '1 / -1' }} value={debugMemoryContentDraft} onChange={(event) => setDebugMemoryContentDraft(event.target.value)} placeholder="Example: Payment retries can fail when an order is archived before the payment attempt reaches terminal status." minRows={4} autosize />
	                      <Button onClick={promoteDebugMemory} disabled={busy || !debugMemoryContentDraft.trim()} leftSection={<Brain size={18} />}>Promote</Button>
	                    </SimpleGrid>
                  </Paper>

                  <Paper component="section" className="debugPanel" p="md" radius="sm" withBorder>
                    <div className="surfaceHeader">
	                      <h2>Token map</h2>
	                      <div className="memorySearch debugSearch">
	                        <Search size={16} />
	                        <TextInput value={debugTokenSearch} onChange={(event) => setDebugTokenSearch(event.target.value)} placeholder="Search tokens..." variant="unstyled" />
	                      </div>
                    </div>
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
                              <Table.Td><strong>{mapping.token}</strong></Table.Td>
                              <Table.Td>{mapping.table}</Table.Td>
                              <Table.Td>{mapping.column}</Table.Td>
                              <Table.Td>{mapping.realValue}</Table.Td>
                              <Table.Td>{new Date(mapping.createdAt).toLocaleString()}</Table.Td>
                            </Table.Tr>
                          ))}
                        </Table.Tbody>
                      </Table>
                    </ScrollArea>
                    {filteredDebugMappings.length === 0 && <div className="empty">No token mappings yet.</div>}
                  </Paper>

                  <SimpleGrid component="section" cols={{ base: 1, lg: 2 }} spacing="lg">
                    <Paper className="debugPanel" p="md" radius="sm" withBorder>
                      <div className="surfaceHeader">
                        <h2>Shared artifacts</h2>
                        <span>{debugDetail.artifacts.length}</span>
                      </div>
                      <Stack gap="md">
                        {debugDetail.artifacts.map((artifact) => (
                          <article key={artifact.id}>
                            <div>
                              <strong>{artifact.inputType.toUpperCase()} · {artifact.sourceName}</strong>
	                              <span>{new Date(artifact.createdAt).toLocaleString()}</span>
	                              <small>{artifact.warningSummary.length} warning group(s)</small>
	                            </div>
	                            <ActionIcon variant="light" color="gray" onClick={() => copyDebugText(artifact.sanitizedText, artifact.id)} title="Copy artifact"><Copy size={17} /></ActionIcon>
	                          </article>
                        ))}
                        {debugDetail.artifacts.length === 0 && <div className="empty">No sanitized artifacts saved yet.</div>}
                      </Stack>
                    </Paper>

                    <Paper className="debugPanel" p="md" radius="sm" withBorder>
                      <div className="surfaceHeader">
                        <h2>Warnings</h2>
                        <AlertCircle size={18} />
                      </div>
                      <Stack gap="md">
                        {(debugWarnings.length ? debugWarnings : debugDetail.artifacts[0]?.warningSummary ?? []).map((warning, index) => (
                          <div key={`${warning.type}-${warning.field}-${index}`}>
                            <strong>{warning.type.replace('_', ' ')}</strong>
                            <span>{warning.message}{warning.field ? ` · ${warning.field}` : ''}{warning.count ? ` · ${warning.count}` : ''}</span>
                          </div>
                        ))}
                        {debugWarnings.length === 0 && (debugDetail.artifacts[0]?.warningSummary.length ?? 0) === 0 && <div className="empty">No warnings for the latest artifact.</div>}
                      </Stack>
                    </Paper>
                  </SimpleGrid>
                      </Stack>
                    </Tabs.Panel>
                  </Tabs>
                </>
              ) : (
                <div className="empty richEmpty"><strong>Select or create a debug session</strong><span>Sessions keep deterministic fake-to-real mappings so follow-up CSV, JSON, and logs reuse the same tokens.</span></div>
              )}
            </Stack>
          </section>
        )}

        {view === 'optimizer' && (
          <SimpleGrid component="section" cols={{ base: 1, md: 2 }} spacing="lg">
            <Paper component="section" className="surface optimizerComposer flagshipCard" p="md" radius="sm" withBorder>
              <div className="surfaceHeader">
                <div>
                  <span className="eyebrow">MCP tool: optimize_context</span>
                  <h2>Task in, smallest useful context out.</h2>
	                </div>
	                <Sparkles size={18} />
	              </div>
	              <Textarea value={task} onChange={(event) => setTask(event.target.value)} placeholder="Add pagination to Orders API" minRows={7} autosize />
	              <Button onClick={optimizeContext} disabled={busy || !task.trim()} leftSection={<Sparkles size={18} />}>Optimize context</Button>
              <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
                <Box>
                  <Text size="xs" fw={700} tt="uppercase" c="dimmed">Mode</Text>
                  <Text fw={700}>{settingsDraft?.optimizer.mode ?? 'retrieval'}</Text>
                </Box>
                <Box>
                  <Text size="xs" fw={700} tt="uppercase" c="dimmed">Budget</Text>
                  <Text fw={700}>{settingsDraft?.optimizer.maxTokens ?? 3000} tokens</Text>
                </Box>
              </SimpleGrid>
            </Paper>

            <Paper component="section" className="surface optimizedResult flagshipResult" p="md" radius="sm" withBorder>
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
                  <div className="optimizedSummary">
                    <span>Summary</span>
                    <p>{optimizedContext.summary}</p>
                  </div>
                  <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
                    <div>
                      <h2>Critical</h2>
                      {optimizedContext.criticalContext.map((item) => <p className="contextLine" key={item}>{item}</p>)}
                    </div>
                  </SimpleGrid>
                  <Group gap="xs">
                    {optimizedContext.sources.map((source) => <Badge key={source} color="gray" variant="light">{source}</Badge>)}
                  </Group>
                  {optimizedContext.importantContext.length > 0 && (
                    <details className="advancedPanel optionalContext">
                      <summary>Show supporting context</summary>
                      <Stack gap="md">
                        {optimizedContext.importantContext.map((item) => <p className="contextLine" key={item}>{item}</p>)}
                      </Stack>
                    </details>
                  )}
                </>
              ) : (
                <div className="empty richEmpty"><strong>Ready to optimize</strong><span>Enter a coding task and RAG-e Khab will retrieve, rank, deduplicate, compress when configured, and return context within the token budget.</span></div>
              )}
            </Paper>
          </SimpleGrid>
        )}

        {view === 'chat' && (
	          <SimpleGrid component="section" cols={{ base: 1, lg: 2 }} spacing="lg">
	            <Paper component="section" className="surface chatSurface" p="md" radius="sm" withBorder>
	              <Group align="flex-start" gap="sm" wrap="nowrap">
	                <Textarea style={{ flex: 1 }} value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="Ask your knowledge base..." minRows={4} autosize />
	                <ActionIcon size="xl" onClick={() => ask()} disabled={busy || !question.trim()} title="Send question"><Send size={18} /></ActionIcon>
	              </Group>
              <Stack gap="md">
                {history.map((turn) => (
                  <Paper component="article" className="turn" key={turn.id} p="md" radius="sm" withBorder>
                    <div className="questionBubble">{turn.question}</div>
                    <div className="answerBubble">
                      <div className="answerMeta">{turn.response.provider} - {new Date(turn.response.createdAt).toLocaleString()}</div>
                      <p>{turn.response.answer}</p>
	                      <div className="sources">
	                        {turn.response.sources.map((source) => (
	                          <Paper component="button" className="sourceCard" onClick={() => setActiveSource(source)} key={source.chunkId} p="sm" radius="sm" withBorder>
	                            <strong>{source.documentName}</strong>
	                            <span>{source.pageNumber ? `page ${source.pageNumber}` : 'text'} - score {source.score.toFixed(2)}</span>
	                          </Paper>
	                        ))}
	                      </div>
                    </div>
                  </Paper>
                ))}
                {history.length === 0 && <div className="empty richEmpty"><strong>No conversation yet</strong><span>Ask a question to inspect cited answers from memories, documents, and repository knowledge.</span></div>}
              </Stack>
            </Paper>

            <Paper component="aside" className="sourcePanel" p="md" radius="sm" withBorder>
              <div className="surfaceHeader">
                <h2>Source</h2>
                <Layers size={18} />
              </div>
              {activeSource ? (
                <div className="sourceDetail">
                  <strong>{activeSource.documentName}</strong>
                  <span>{activeSource.projectName}{activeSource.pageNumber ? ` - page ${activeSource.pageNumber}` : ''}</span>
                  <p>{activeSource.text}</p>
                  <small>{activeSource.chunkId}</small>
                </div>
              ) : (
                <div className="empty richEmpty"><strong>No source selected</strong><span>Select a citation from an answer to inspect the exact retrieved context.</span></div>
              )}
            </Paper>
          </SimpleGrid>
        )}

        {view === 'settings' && (
          <section className="view">
            {settingsDraft && (
	              <Paper component="section" className="surface settingsPanel" p="md" radius="sm" withBorder>
	                <div className="surfaceHeader">
	                  <h2>Settings</h2>
	                  <Button onClick={saveSettings} disabled={busy}>Save</Button>
	                </div>
                <div className="settingsSections">
                  <Paper component="details" className="settingsGroup" open p="md" radius="sm" withBorder>
                    <summary>Models</summary>
                    <div className="settingsGrid">
	                  <label>
	                    <span>Chat provider</span>
	                    <NativeSelect
	                      value={settingsDraft.llm.provider}
	                      onChange={(event) => setSettingsDraft({
	                        ...settingsDraft,
	                        llm: { ...settingsDraft.llm, provider: event.target.value }
	                      })}
	                      data={(status?.availableProviders ?? []).map((provider) => ({ value: provider, label: provider }))}
	                    />
	                  </label>
	                  <label>
	                    <span>Chat model</span>
	                    <NativeSelect
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
	                  </label>
	                  {selectValue(settingsDraft.llm.model, chatModelOptions) === CUSTOM_MODEL && (
	                    <label>
	                      <span>Custom chat model</span>
	                      <TextInput
	                        value={settingsDraft.llm.model}
	                        placeholder="model name"
                        onChange={(event) => setSettingsDraft({
                          ...settingsDraft,
                          llm: { ...settingsDraft.llm, model: event.target.value }
                        })}
                      />
                    </label>
                  )}
	                  <label>
	                    <span>Chat base URL</span>
	                    <TextInput
	                      value={settingsDraft.llm.baseUrl}
                      onChange={(event) => setSettingsDraft({
                        ...settingsDraft,
                        llm: { ...settingsDraft.llm, baseUrl: event.target.value }
                      })}
                    />
                  </label>
	                  <label>
	                    <span>Chat API key</span>
	                    <TextInput
	                      type="password"
                      value={settingsDraft.llm.apiKey}
                      onChange={(event) => setSettingsDraft({
                        ...settingsDraft,
                        llm: { ...settingsDraft.llm, apiKey: event.target.value }
                      })}
                    />
                  </label>
                    </div>
                  </Paper>
                  <Paper component="details" className="settingsGroup" p="md" radius="sm" withBorder>
                    <summary>Optimizer</summary>
                    <div className="settingsGrid">
	                  <label>
	                    <span>Optimizer mode</span>
	                    <NativeSelect
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
	                  </label>
	                  <label>
	                    <span>Optimizer max tokens</span>
	                    <NumberInput
	                      min={300}
	                      max={8000}
	                      value={settingsDraft.optimizer.maxTokens}
	                      onChange={(value) => setSettingsDraft({
	                        ...settingsDraft,
	                        optimizer: { ...settingsDraft.optimizer, maxTokens: Number(value) || 300 }
	                      })}
	                    />
	                  </label>
	                  {!settingsDraft.localLlm.enabled && (
	                    <Text className="settingHint" size="sm">
	                      Enable local LLM compression to use compression mode.
	                    </Text>
	                  )}
	                  <Checkbox
	                    className="toggleRow"
	                      checked={settingsDraft.localLlm.enabled}
	                      onChange={(event) => setSettingsDraft({
	                        ...settingsDraft,
	                        optimizer: event.currentTarget.checked ? settingsDraft.optimizer : { ...settingsDraft.optimizer, mode: 'retrieval' },
	                        localLlm: { ...settingsDraft.localLlm, enabled: event.currentTarget.checked }
	                      })}
	                    label="Enable local LLM compression"
	                  />
	                  <label>
	                    <span>Local LLM provider</span>
	                    <NativeSelect
	                      value={settingsDraft.localLlm.provider}
	                      onChange={(event) => setSettingsDraft({
	                        ...settingsDraft,
	                        localLlm: { ...settingsDraft.localLlm, provider: event.target.value }
	                      })}
	                      data={[{ value: 'ollama', label: 'Ollama' }]}
	                    />
	                  </label>
	                  <label>
	                    <span>Local LLM base URL</span>
	                    <TextInput
	                      value={settingsDraft.localLlm.baseUrl}
                      onChange={(event) => setSettingsDraft({
                        ...settingsDraft,
                        localLlm: { ...settingsDraft.localLlm, baseUrl: event.target.value }
                      })}
                    />
                  </label>
	                  <label>
	                    <span>Compression model</span>
	                    <NativeSelect
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
	                  </label>
	                  {settingsDraft.localLlm.enabled && selectValue(settingsDraft.localLlm.model, compressionModelOptions) === CUSTOM_MODEL && (
	                    <label>
	                      <span>Custom compression model</span>
	                      <TextInput
	                        value={settingsDraft.localLlm.model}
                        placeholder="model name"
                        disabled={settingsDraft.optimizer.mode === 'retrieval'}
                        onChange={(event) => setSettingsDraft({
                          ...settingsDraft,
                          localLlm: { ...settingsDraft.localLlm, model: event.target.value }
                        })}
                      />
                    </label>
                  )}
                    </div>
                  </Paper>
                  <Paper component="details" className="settingsGroup" p="md" radius="sm" withBorder>
                    <summary>Advanced settings</summary>
                    <div className="settingsGrid">
	                  <label>
	                    <span>Embedding provider</span>
	                    <NativeSelect
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
	                  </label>
	                  <label>
	                    <span>Embedding model</span>
	                    <NativeSelect
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
	                  </label>
	                  {settingsDraft.embedding.provider === 'ollama' && selectValue(settingsDraft.embedding.model, embeddingModelOptions) === CUSTOM_MODEL && (
	                    <label>
	                      <span>Custom embedding model</span>
	                      <TextInput
	                        value={settingsDraft.embedding.model}
                        placeholder="embedding model"
                        onChange={(event) => setSettingsDraft({
                          ...settingsDraft,
                          embedding: { ...settingsDraft.embedding, model: event.target.value }
                        })}
                      />
                    </label>
                  )}
	                  <label className="wideSetting">
	                    <span>Embedding base URL</span>
	                    <TextInput
	                      value={settingsDraft.embedding.baseUrl}
                      onChange={(event) => setSettingsDraft({
                        ...settingsDraft,
                        embedding: { ...settingsDraft.embedding, baseUrl: event.target.value }
                      })}
                    />
                  </label>
	                  <label>
	                    <span>Embedding dimensions</span>
	                    <NumberInput
	                      min={1}
	                      max={8192}
	                      value={settingsDraft.embedding.dimensions}
	                      onChange={(value) => setSettingsDraft({
	                        ...settingsDraft,
	                        embedding: { ...settingsDraft.embedding, dimensions: Number(value) || 1 }
	                      })}
	                    />
                  </label>
                    </div>
                  </Paper>
                  <Paper component="details" className="settingsGroup" p="md" radius="sm" withBorder>
                    <summary>Repository sync</summary>
                    <div className="settingsGrid">
	                  <label className="wideSetting">
	                    <span>Repository path</span>
	                    <TextInput
	                      value={settingsDraft.repositoryAgent.path}
                      onChange={(event) => setSettingsDraft({
                        ...settingsDraft,
                        repositoryAgent: { ...settingsDraft.repositoryAgent, path: event.target.value }
                      })}
                    />
                  </label>
	                  <Checkbox
	                    className="toggleRow"
	                      checked={settingsDraft.repositoryAgent.scheduled}
	                      onChange={(event) => setSettingsDraft({
	                        ...settingsDraft,
	                        repositoryAgent: { ...settingsDraft.repositoryAgent, scheduled: event.currentTarget.checked }
	                      })}
	                    label="Enable scheduled repository scan"
	                  />
	                  <label>
	                    <span>Repository scan interval ms</span>
	                    <NumberInput
	                      min={30000}
	                      value={settingsDraft.repositoryAgent.intervalMs}
	                      onChange={(value) => setSettingsDraft({
	                        ...settingsDraft,
	                        repositoryAgent: { ...settingsDraft.repositoryAgent, intervalMs: Number(value) || 30000 }
	                      })}
	                    />
                  </label>
                  <div className="wideSetting settingHint">
                    Repositories are registered by the external agent or MCP tooling. Use the Repositories page to link discovered repositories to projects.
                  </div>
                    </div>
                  </Paper>
                  <Paper component="details" className="settingsGroup" p="md" radius="sm" withBorder>
                    <summary>Storage diagnostics</summary>
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
                </div>
              </Paper>
            )}
          </section>
        )}
      </AppShell.Main>
    </AppShell>
  );
}
