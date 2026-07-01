import React, { useEffect, useMemo, useState } from 'react';
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
  Network,
  Plus,
  RefreshCw,
  Search,
  Send,
  Settings,
  ShieldCheck,
  Sparkles,
  Trash2,
  Upload,
  X,
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

type Toast = {
  id: string;
  type: 'success' | 'error';
  title: string;
  message?: string;
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

const safeDebugInstruction = `You are connected to a Safe Debug Session.

Use only sanitized artifacts from the session.
Do not ask the developer for raw production data.
Do not ask for names, emails, phone numbers, addresses, or other PII.

When you need more data, call create_debug_data_request with:
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
  const [view, setView] = useState<View>(() => viewFromPath(window.location.pathname));
  const [ingestMode, setIngestMode] = useState<IngestMode>('text');
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
  const [debugSourceName, setDebugSourceName] = useState('users');
  const [debugDataRequestId, setDebugDataRequestId] = useState('');
  const [debugSanitizedText, setDebugSanitizedText] = useState('');
  const [debugWarnings, setDebugWarnings] = useState<DebugWarning[]>([]);
  const [debugTokenQuery, setDebugTokenQuery] = useState('');
  const [debugResolvedToken, setDebugResolvedToken] = useState<DebugTokenMapping | null>(null);
  const [debugTokenSearch, setDebugTokenSearch] = useState('');
  const [claudeRequestDraft, setClaudeRequestDraft] = useState('');
  const [repositoryToLink, setRepositoryToLink] = useState('');
  const [deleteRepositoryKnowledge, setDeleteRepositoryKnowledge] = useState(false);
  const [memoryFilter, setMemoryFilter] = useState<string>('all');
  const [memorySearch, setMemorySearch] = useState('');
  const [memoryTypeDraft, setMemoryTypeDraft] = useState('CodingConvention');
  const [memoryContentDraft, setMemoryContentDraft] = useState('');
  const [memoryRepositoryDraft, setMemoryRepositoryDraft] = useState('');
  const [memoryToLink, setMemoryToLink] = useState('');
  const [status, setStatus] = useState<AdminStatus | null>(null);
  const [settingsDraft, setSettingsDraft] = useState<RuntimeSettings | null>(null);
  const [question, setQuestion] = useState('');
  const [task, setTask] = useState('');
  const [optimizedContext, setOptimizedContext] = useState<OptimizedContext | null>(null);
  const [history, setHistory] = useState<ConversationTurn[]>([]);
  const [activeSource, setActiveSource] = useState<SearchResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const selectedProject = projects.find((project) => project.id === selectedProjectId);

  const dismissToast = (id: string) => {
    setToasts((items) => items.filter((toast) => toast.id !== id));
  };

  const showToast = (toast: Omit<Toast, 'id'>) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setToasts((items) => [{ ...toast, id }, ...items].slice(0, 4));
    window.setTimeout(() => dismissToast(id), toast.type === 'error' ? 6500 : 4200);
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
    safeDebug: 'Sanitize production-like query output before sharing it with Claude.',
    optimizer: 'Create the smallest useful context for Claude Code.',
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

  const filteredMemories = memories.filter((memory) => {
    const matchesType = memoryFilter === 'all' || memory.type === memoryFilter;
    const query = memorySearch.trim().toLowerCase();
    const matchesSearch = !query || [memory.content, memory.repository, memory.module, memory.type]
      .filter(Boolean)
      .some((value) => value!.toLowerCase().includes(query));
    return matchesType && matchesSearch;
  });

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

  const upload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
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
      event.target.value = '';
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

  const recordClaudeRequest = async () => {
    if (!activeDebugSessionId || !claudeRequestDraft.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await request<DebugNote>(`/api/debug-sessions/${activeDebugSessionId}/claude-requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ request: claudeRequestDraft })
      });
      setClaudeRequestDraft('');
      setDebugDetail(await request<DebugSessionDetail>(`/api/debug-sessions/${activeDebugSessionId}`));
      showToast({ type: 'success', title: 'Claude request recorded' });
    } catch (err) {
      reportError(err, 'Request note failed');
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

  return (
    <main className={busy ? 'shell isBusy' : 'shell'}>
      <div className="toastStack" aria-live="polite" aria-atomic="true">
        {toasts.map((toast) => {
          const Icon = toast.type === 'success' ? CheckCircle2 : AlertCircle;
          return (
            <div className={`toast ${toast.type}`} key={toast.id}>
              <Icon size={18} />
              <div>
                <strong>{toast.title}</strong>
                {toast.message && <span>{toast.message}</span>}
              </div>
              <button className="toastClose" onClick={() => dismissToast(toast.id)} aria-label="Dismiss notification">
                <X size={15} />
              </button>
            </div>
          );
        })}
      </div>

      <aside className="sidebar">
        <div className="brand">
          <div className="brandMark"><img src="/favicon.svg" alt="" /></div>
          <div>
            <strong>RAG-e Khab</strong>
            <span>Coding-agent memory</span>
          </div>
        </div>
        <label className="workspaceSwitcher">
          <span>Project</span>
          <select value={selectedProjectId} onChange={(event) => setSelectedProjectId(event.target.value)}>
            {projects.map((project) => (
              <option value={project.id} key={project.id}>{project.name}</option>
            ))}
          </select>
        </label>
        <div className="systemPill">
          <span className={status?.index.vectorStore === 'qdrant' ? 'statusDot online' : 'statusDot'} />
          <span>{status?.index.vectorStore ?? 'starting'}</span>
        </div>
        <nav>
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                className={view === item.id ? 'navItem active' : 'navItem'}
                onClick={() => navigate(item.id)}
                aria-current={view === item.id ? 'page' : undefined}
                key={item.id}
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div>
            <h1>{pageTitles[view]}</h1>
            <p>{pageCopy[view]}</p>
          </div>
        </header>
        {busy && <div className="loadingBar" aria-label="Working" />}

        {error && <div className="notice">{error}</div>}

        {view === 'home' && (
          <section className="view">
            <div className="commandPanel projectOverview">
              <div>
                <span className="eyebrow">Project health</span>
                <h2>{status?.index.vectorStore === 'qdrant' ? 'Ready for agents' : 'Local memory ready'}</h2>
                <p>{projectRepositories.length} repositories, {memories.length} memories, {totalChunks} source units available in this project.</p>
              </div>
            </div>

            <div className="metrics">
              {stats.map((item) => {
                const Icon = item.icon;
                return (
                <div className={`metric ${item.tone}`} key={item.label}>
                  <div className="metricIcon"><Icon size={18} /></div>
                  <span>{item.label}</span>
                  <strong>{item.value}</strong>
                  <small>{item.detail}</small>
                </div>
                );
              })}
            </div>

            <div className="homeGrid">
              <section className="surface quietSurface">
                <div className="surfaceHeader">
                  <h2>System health</h2>
                  <span className="badge success"><CheckCircle2 size={14} /> operational</span>
                </div>
                <div className="compactState">
                  <div><span>Last sync</span><strong>{lastSync ? new Date(lastSync).toLocaleString() : 'No sync yet'}</strong></div>
                  <div><span>Optimizer</span><strong>{settingsDraft?.optimizer.mode ?? 'retrieval'} · {settingsDraft?.optimizer.maxTokens ?? 3000} tokens</strong></div>
                </div>
              </section>

              <section className="surface">
                <div className="surfaceHeader">
                  <h2>Recent activity</h2>
                  <Clock3 size={18} />
                </div>
                <div className="activityList">
                  {recentActivity.map((item) => {
                    const Icon = item.icon;
                    return (
                    <div className="activityRow" key={item.id}>
                      <div className={`activityIcon ${item.tone}`}><Icon size={16} /></div>
                      <div>
                        <strong>{item.title}</strong>
                        <span>{item.detail}</span>
                      </div>
                      <time>{new Date(item.at).toLocaleDateString()}</time>
                    </div>
                    );
                  })}
                  {recentActivity.length === 0 && <div className="empty richEmpty"><strong>No activity yet</strong><span>Scan a repository, add a memory, or index knowledge to make this project useful for coding agents.</span></div>}
                </div>
              </section>
            </div>
          </section>
        )}

        {view === 'repositories' && (
          <section className="view">
            <div className="repoToolbar">
              <div>
                <h2>{repositories.length || repositoryStatus?.repositories.length || 0} repositories</h2>
                <p>Repositories are registered by local agents. Link them to the active project when they should contribute knowledge and memories here. {repositoryStatus?.trackedFiles ?? 0} indexed files · last sync {lastSync ? new Date(lastSync).toLocaleString() : 'not available'}</p>
              </div>
              <details className="advancedPanel">
                <summary>Link repository</summary>
                <div className="linkRepositoryControls">
                  <select value={repositoryToLink} onChange={(event) => setRepositoryToLink(event.target.value)}>
                    <option value="">Select repository</option>
                    {repositories.filter((repository) => !linkedRepositoryIds.has(repository.id)).map((repository) => (
                      <option value={repository.id} key={repository.id}>{repository.name}</option>
                    ))}
                  </select>
                  <button onClick={() => linkRepositoryToProject()} disabled={busy || !repositoryToLink}>Link</button>
                </div>
              </details>
            </div>

            <div className="repositoryList">
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
                <article className="repoCard" key={repo.id}>
                  <div className="repoCardHeader">
                    <div>
                      <strong>{repo.name}</strong>
                      <span>Last sync {repo.lastSyncedAt ? new Date(repo.lastSyncedAt).toLocaleString() : 'not available'}</span>
                    </div>
                    <div className="repoStatusStack">
                      <span className={repo.status === 'synced' ? 'badge success' : 'badge'}>{repo.status}</span>
                      <span className={linked ? 'linkState linked' : 'linkState'}>{linked ? 'In this project' : 'Not in project'}</span>
                    </div>
                  </div>
                  <div className="repoStats">
                    <div><span>Knowledge</span><strong>{files.length}</strong></div>
                    <div><span>Memories</span><strong>{linkedMemories}</strong></div>
                  </div>
                  <div className="repoActions">
                    {linked ? (
                      <button className="ghostButton" onClick={() => unlinkRepositoryFromProject(repo.id)} disabled={busy}>Remove</button>
                    ) : (
                      <button onClick={() => linkRepositoryToProject(repo.id)} disabled={busy}>Link to project</button>
                    )}
                    <details className="compactMenu">
                      <summary>More</summary>
                      <button className="dangerButton" onClick={() => deleteRepository(repo)} disabled={busy}><Trash2 size={16} /><span>Delete repository</span></button>
                    </details>
                  </div>
                  <details className="repoDetails">
                    <summary>Details</summary>
                    <div>
                      <span>{repo.path}</span>
                      <span>{linked ? 'Linked to project' : 'Not linked'}</span>
                      <span>{(languages.length > 0 ? languages : [repo.language]).join(', ')}</span>
                    </div>
                  </details>
                </article>
                );
              })}
              {repositories.length === 0 && (repositoryStatus?.repositories.length ?? 0) === 0 && <div className="empty richEmpty"><strong>No repositories yet</strong><span>Run the RAG-e Khab agent from a codebase to register a repository, then link it to this project.</span></div>}
            </div>

            <details className="advancedPanel">
              <summary>Repository deletion options</summary>
              <label className="inlineToggle deletionToggle">
                <input type="checkbox" checked={deleteRepositoryKnowledge} onChange={(event) => setDeleteRepositoryKnowledge(event.target.checked)} />
                Delete indexed knowledge when deleting a repository
              </label>
            </details>

            <details className="advancedPanel workspacePanel">
              <summary>Projects</summary>
              <div className="surfaceHeader">
                <h2>Projects</h2>
                <div className="createInline">
                  <input value={projectName} onChange={(event) => setProjectName(event.target.value)} placeholder="New project" />
                  <button onClick={createProject} disabled={busy || !projectName.trim()} title="Create project"><FolderPlus size={18} /><span>Create</span></button>
                </div>
              </div>
              <div className="projectGrid">
                {projects.map((project) => (
                  <div className={project.id === selectedProjectId ? 'projectCard active' : 'projectCard'} key={project.id}>
                  <div>
                    <span>{project.name}</span>
                    <strong>{project.documentCount}</strong>
                    <small>created {new Date(project.createdAt).toLocaleDateString()}</small>
                  </div>
                  <div className="projectActions">
                    <button className="ghostButton" onClick={() => setSelectedProjectId(project.id)} disabled={busy}>
                      <span>Select</span>
                    </button>
                    {project.name !== 'General' && (
                      <button className="iconButton dangerButton" onClick={() => deleteProject(project)} disabled={busy} title="Delete project">
                        <Trash2 size={18} />
                      </button>
                    )}
                  </div>
                  </div>
                ))}
              </div>
            </details>
          </section>
        )}

        {view === 'memories' && (
          <section className="view">
            <div className="memoryToolbar surface">
              <div>
                <h2>{filteredMemories.length} memories</h2>
                <p>{selectedProject?.name ?? 'General'} project · search decisions, conventions, fixes, and patterns.</p>
              </div>
              <div className="memorySearch">
                <Search size={16} />
                <input value={memorySearch} onChange={(event) => setMemorySearch(event.target.value)} placeholder="Search memories..." />
              </div>
              <div className="filterTabs">
                <button className={memoryFilter === 'all' ? 'active' : ''} onClick={() => setMemoryFilter('all')}>All <span>{memories.length}</span></button>
                {memoryTypes.map((type) => (
                  <button className={memoryFilter === type ? 'active' : ''} onClick={() => setMemoryFilter(type)} key={type}>
                    {memoryLabels[type] ?? type} <span>{memoryCounts.get(type) ?? 0}</span>
                  </button>
                ))}
              </div>
            </div>

            <details className="advancedPanel memoryComposer">
              <summary>Remember something</summary>
              <div className="memoryComposerBody">
                <div>
                  <h2>Remember for this project</h2>
                  <p>Store rules like coding conventions, architecture decisions, and project-specific preferences.</p>
                </div>
                <div className="memoryComposerGrid">
                  <select value={memoryTypeDraft} onChange={(event) => setMemoryTypeDraft(event.target.value)}>
                    {memoryTypes.map((type) => <option value={type} key={type}>{memoryLabels[type] ?? type}</option>)}
                  </select>
                  <input value={memoryRepositoryDraft} onChange={(event) => setMemoryRepositoryDraft(event.target.value)} placeholder="repository optional" />
                  <textarea value={memoryContentDraft} onChange={(event) => setMemoryContentDraft(event.target.value)} placeholder="Do not use uppercase UI labels in this project. Prefer sentence case." />
                  <button onClick={rememberMemory} disabled={busy || !memoryContentDraft.trim()}>Remember</button>
                </div>
              </div>
            </details>

            <details className="advancedPanel memoryLinkPanel">
              <summary>Link existing memory to this project</summary>
              <div className="linkRepositoryControls">
                <select value={memoryToLink} onChange={(event) => setMemoryToLink(event.target.value)}>
                  <option value="">Select memory</option>
                  {allMemories
                    .filter((memory) => !memory.projectIds.includes(selectedProjectId))
                    .map((memory) => (
                      <option value={memory.id} key={memory.id}>{memoryLabels[memory.type] ?? memory.type}: {memory.content.slice(0, 70)}</option>
                    ))}
                </select>
                <button onClick={linkMemoryToProject} disabled={busy || !memoryToLink}>Link</button>
              </div>
            </details>

            <div className="memoryGrid">
              {filteredMemories.map((memory) => (
                <article className="memoryCard" key={memory.id}>
                  <div className="memoryCardHeader">
                    <span className={`memoryType ${memory.type}`}>{memoryLabels[memory.type] ?? memory.type}</span>
                    <details className="compactMenu">
                      <summary>More</summary>
                      <button className="ghostButton" onClick={() => unlinkMemoryFromProject(memory.id)} disabled={busy}>Remove from project</button>
                      <button className="dangerButton" onClick={() => deleteMemory(memory.id)} disabled={busy}><Trash2 size={16} /><span>Delete memory</span></button>
                    </details>
                  </div>
                  <p>{memory.content}</p>
                  <div className="memoryMeta">
                    <span>{Math.round(memory.confidence * 100)}% confidence</span>
                    <span>{memory.repository ?? 'global'}</span>
                  </div>
                </article>
              ))}
              {filteredMemories.length === 0 && <div className="empty richEmpty"><strong>No memories in this view</strong><span>Use the MCP `remember` tool to store architecture decisions, conventions, bug fixes, patterns, and project knowledge.</span></div>}
            </div>
          </section>
        )}

        {view === 'knowledge' && (
          <section className="view knowledgeLayout">
            <section className="surface ingestSurface">
              <div className="segmented">
                <button className={ingestMode === 'text' ? 'active' : ''} onClick={() => setIngestMode('text')}><FilePlus2 size={18} />Text</button>
                <button className={ingestMode === 'upload' ? 'active' : ''} onClick={() => setIngestMode('upload')}><Upload size={18} />File</button>
              </div>
              {ingestMode === 'text' ? (
                <div className="textIngest">
                  <input value={textTitle} onChange={(event) => setTextTitle(event.target.value)} placeholder="Title" />
                  <textarea value={textBody} onChange={(event) => setTextBody(event.target.value)} placeholder="Paste notes, snippets, summaries, or any text..." />
                  <button onClick={addText} disabled={busy || !textBody.trim()}><FilePlus2 size={18} /><span>Add text</span></button>
                </div>
              ) : (
                <label className="dropZone">
                  <Upload size={28} />
                  <strong>Choose a PDF, Markdown, or text file</strong>
                  <span>{selectedProject?.name ?? 'General'}</span>
                  <input type="file" accept=".pdf,.md,.markdown,.txt,text/plain,application/pdf" onChange={upload} />
                </label>
              )}
            </section>

            <section className="surface">
              <div className="surfaceHeader">
                <h2>Indexed items</h2>
                <details className="compactMenu">
                  <summary>More</summary>
                  <button className="ghostButton" onClick={reindex} disabled={busy}><RefreshCw size={16} /><span>Reindex</span></button>
                </details>
              </div>
              <div className="documentList">
                {documents.map((doc) => (
                  <div className="documentRow" key={doc.id}>
                    <FileText size={20} />
                    <div>
                      <strong>{doc.name}</strong>
                        <span>{doc.projectName} · {doc.format} · {doc.chunkCount} source units · {(doc.sizeBytes / 1024).toFixed(1)} KB</span>
                    </div>
                    <button className="iconButton" onClick={() => deleteDocument(doc.id)} disabled={busy} title="Delete document"><Trash2 size={18} /></button>
                  </div>
                ))}
                {documents.length === 0 && <div className="empty richEmpty"><strong>No sources indexed yet</strong><span>Add text, upload a file, or sync a repository so coding agents can retrieve useful context.</span></div>}
              </div>
            </section>
          </section>
        )}

        {view === 'safeDebug' && (
          <section className="view safeDebugLayout">
            <section className="safeDebugColumn">
              <div className="safeDebugCreate">
                <input value={debugTitle} onChange={(event) => setDebugTitle(event.target.value)} placeholder="BUG-123 or checkout failure" />
                <button onClick={createDebugSession} disabled={busy || !debugTitle.trim()} title="Create session"><Plus size={18} /><span>Create</span></button>
              </div>

              <section className="debugList">
                <div className="surfaceHeader">
                  <h2>Sessions</h2>
                  <span>{debugSessions.length} active</span>
                </div>
                {debugSessions.map((session) => (
                  <article className={session.id === activeDebugSessionId ? 'debugSessionRow active' : 'debugSessionRow'} key={session.id}>
                    <div>
                      <strong>{session.title}</strong>
                      <span>{session.id}</span>
                      <small>Created {new Date(session.createdAt).toLocaleString()}</small>
                      <small>Updated {new Date(session.updatedAt).toLocaleString()}</small>
                    </div>
                    <span className={session.status === 'active' ? 'badge success' : 'badge'}>{session.status}</span>
                    <div className="debugRowActions">
                      <button className="ghostButton" onClick={() => openDebugSession(session.id)} disabled={busy}>Open</button>
                      <button className="iconButton" onClick={() => archiveDebugSession(session.id)} disabled={busy} title="Archive session"><Archive size={17} /></button>
                    </div>
                  </article>
                ))}
                {debugSessions.length === 0 && <div className="empty richEmpty"><strong>No debug sessions</strong><span>Create a session before pasting query output. Raw pasted data stays local to the sanitize request and is not stored.</span></div>}
              </section>

              <section className="debugInstruction">
                <div className="surfaceHeader">
                  <h2>Claude instruction</h2>
                  <button className="iconButton" onClick={() => copyDebugText(safeDebugInstruction)} title="Copy instruction"><Copy size={17} /></button>
                </div>
                <pre>{safeDebugInstruction}</pre>
              </section>
            </section>

            <section className="safeDebugDetail">
              {debugDetail ? (
                <>
                  <section className="debugHeader">
                    <div>
                      <span className="eyebrow">Session header</span>
                      <h2>{debugDetail.session.title}</h2>
                      <p>{debugDetail.session.id}</p>
                    </div>
                    <div className="debugHeaderMeta">
                      <span className={debugDetail.session.status === 'active' ? 'badge success' : 'badge'}>{debugDetail.session.status}</span>
                      <small>Created {new Date(debugDetail.session.createdAt).toLocaleString()}</small>
                    </div>
                  </section>

                  <section className="debugPanel">
                    <div className="surfaceHeader">
                      <h2>Pending Claude Requests</h2>
                      <span>{pendingDebugRequests.length} pending</span>
                    </div>
                    <div className="debugRequestGrid">
                      {debugDetail.dataRequests.map((item) => {
                        const mapping = tokenMappingFor(item.parentToken);
                        const suggestedSql = suggestedSqlFor(item);
                        return (
                          <article className="debugRequestCard" key={item.id}>
                            <div className="debugRequestHeader">
                              <div>
                                <strong>{item.entity}</strong>
                                <span>{item.relation || 'No relation'}{item.parentToken ? ` · ${item.parentToken}` : ''}</span>
                              </div>
                              <span className={item.status === 'pending' ? 'badge success' : 'badge'}>{item.status}</span>
                            </div>
                            <p>{item.reason}</p>
                            {item.requestedFields.length > 0 && <small>Fields: {item.requestedFields.join(', ')}</small>}
                            {mapping && <small>{item.parentToken} -&gt; {mapping.table}.{mapping.column} = {mapping.realValue}</small>}
                            {suggestedSql && <pre>{suggestedSql}</pre>}
                            <div className="debugRequestActions">
                              <button className="ghostButton" onClick={() => copyDebugText(suggestedSql)} disabled={!suggestedSql}><Copy size={16} /><span>Copy SQL</span></button>
                              <button className="ghostButton" onClick={() => updateDebugDataRequest(item.id, 'complete')} disabled={busy || item.status !== 'pending'}>Mark Completed</button>
                              <button className="dangerButton" onClick={() => updateDebugDataRequest(item.id, 'reject')} disabled={busy || item.status !== 'pending'}>Reject</button>
                            </div>
                          </article>
                        );
                      })}
                      {debugDetail.dataRequests.length === 0 && <div className="empty">Claude has not created any structured data requests yet.</div>}
                    </div>
                  </section>

                  <section className="debugTwoColumn">
                    <div className="debugPanel">
                      <div className="surfaceHeader">
                        <h2>Paste data</h2>
                        <ShieldCheck size={18} />
                      </div>
                      <textarea value={debugRawText} onChange={(event) => setDebugRawText(event.target.value)} placeholder="Paste CSV, JSON, or log output here..." />
                      <div className="debugControls">
                        <select value={debugInputType} onChange={(event) => setDebugInputType(event.target.value as DebugInputType)}>
                          <option value="csv">CSV</option>
                          <option value="json">JSON</option>
                          <option value="log">LOG</option>
                        </select>
                        <input value={debugSourceName} onChange={(event) => setDebugSourceName(event.target.value)} placeholder="users, orders, payments, custom" />
                        <button onClick={sanitizeDebugData} disabled={busy || !debugRawText.trim()}><ShieldCheck size={18} /><span>Sanitize</span></button>
                      </div>
                      <select className="debugRequestSelect" value={debugDataRequestId} onChange={(event) => setDebugDataRequestId(event.target.value)}>
                        <option value="">No linked Claude request</option>
                        {pendingDebugRequests.map((item) => (
                          <option value={item.id} key={item.id}>{item.entity}{item.parentToken ? ` for ${item.parentToken}` : ''}</option>
                        ))}
                      </select>
                    </div>

                    <div className="debugPanel">
                      <div className="surfaceHeader">
                        <h2>Sanitized output</h2>
                        <div className="debugInlineActions">
                          <button className="iconButton" onClick={() => copyDebugText(debugSanitizedText, debugDetail.artifacts[0]?.id)} disabled={!debugSanitizedText} title="Copy sanitized output"><Clipboard size={17} /></button>
                          <button className="ghostButton" onClick={() => copyDebugText(debugSanitizedText, debugDetail.artifacts[0]?.id)} disabled={!debugSanitizedText}>Save artifact</button>
                        </div>
                      </div>
                      <pre className="debugOutput">{debugSanitizedText || 'Sanitized data will appear here.'}</pre>
                    </div>
                  </section>

                  <section className="debugTwoColumn">
                    <div className="debugPanel">
                      <div className="surfaceHeader">
                        <h2>Resolve token</h2>
                        <KeyRound size={18} />
                      </div>
                      <div className="debugResolve">
                        <input value={debugTokenQuery} onChange={(event) => setDebugTokenQuery(event.target.value)} placeholder="USER_001" />
                        <button onClick={resolveDebugToken} disabled={busy || !debugTokenQuery.trim()}>Resolve</button>
                      </div>
                      {debugResolvedToken ? (
                        <div className="resolvedToken">
                          <span>{debugResolvedToken.token}</span>
                          <strong>{debugResolvedToken.table}.{debugResolvedToken.column} = {debugResolvedToken.realValue}</strong>
                          <button className="ghostButton" onClick={() => copyDebugText(debugResolvedToken.realValue)}><Copy size={16} /><span>Copy real id</span></button>
                        </div>
                      ) : (
                        <div className="empty">Resolve a token to manually query the database without asking Claude for raw data.</div>
                      )}
                    </div>

                    <div className="debugPanel">
                      <div className="surfaceHeader">
                        <h2>Claude requests</h2>
                        <span>{debugDetail.notes.length}</span>
                      </div>
                      <div className="debugResolve">
                        <input value={claudeRequestDraft} onChange={(event) => setClaudeRequestDraft(event.target.value)} placeholder="Need orders for USER_001" />
                        <button onClick={recordClaudeRequest} disabled={busy || !claudeRequestDraft.trim()}>Record</button>
                      </div>
                      <div className="debugMiniList">
                        {debugDetail.notes.slice(0, 4).map((note) => (
                          <div key={note.id}><strong>{note.request}</strong><span>{new Date(note.createdAt).toLocaleString()}</span></div>
                        ))}
                      </div>
                    </div>
                  </section>

                  <section className="debugPanel">
                    <div className="surfaceHeader">
                      <h2>Token map</h2>
                      <div className="memorySearch debugSearch">
                        <Search size={16} />
                        <input value={debugTokenSearch} onChange={(event) => setDebugTokenSearch(event.target.value)} placeholder="Search tokens..." />
                      </div>
                    </div>
                    <div className="debugTable">
                      <div className="debugTableHead">
                        <span>Token</span>
                        <span>Table</span>
                        <span>Column</span>
                        <span>Real value</span>
                        <span>Created</span>
                      </div>
                      {filteredDebugMappings.map((mapping) => (
                        <div className="debugTableRow" key={mapping.token}>
                          <strong>{mapping.token}</strong>
                          <span>{mapping.table}</span>
                          <span>{mapping.column}</span>
                          <span>{mapping.realValue}</span>
                          <span>{new Date(mapping.createdAt).toLocaleString()}</span>
                        </div>
                      ))}
                      {filteredDebugMappings.length === 0 && <div className="empty">No token mappings yet.</div>}
                    </div>
                  </section>

                  <section className="debugTwoColumn">
                    <div className="debugPanel">
                      <div className="surfaceHeader">
                        <h2>Shared artifacts</h2>
                        <span>{debugDetail.artifacts.length}</span>
                      </div>
                      <div className="debugArtifactList">
                        {debugDetail.artifacts.map((artifact) => (
                          <article key={artifact.id}>
                            <div>
                              <strong>{artifact.inputType.toUpperCase()} · {artifact.sourceName}</strong>
                              <span>{new Date(artifact.createdAt).toLocaleString()}</span>
                              <small>{artifact.warningSummary.length} warning group(s)</small>
                            </div>
                            <button className="iconButton" onClick={() => copyDebugText(artifact.sanitizedText, artifact.id)} title="Copy artifact"><Copy size={17} /></button>
                          </article>
                        ))}
                        {debugDetail.artifacts.length === 0 && <div className="empty">No sanitized artifacts saved yet.</div>}
                      </div>
                    </div>

                    <div className="debugPanel">
                      <div className="surfaceHeader">
                        <h2>Warnings</h2>
                        <AlertCircle size={18} />
                      </div>
                      <div className="debugWarningList">
                        {(debugWarnings.length ? debugWarnings : debugDetail.artifacts[0]?.warningSummary ?? []).map((warning, index) => (
                          <div key={`${warning.type}-${warning.field}-${index}`}>
                            <strong>{warning.type.replace('_', ' ')}</strong>
                            <span>{warning.message}{warning.field ? ` · ${warning.field}` : ''}{warning.count ? ` · ${warning.count}` : ''}</span>
                          </div>
                        ))}
                        {debugWarnings.length === 0 && (debugDetail.artifacts[0]?.warningSummary.length ?? 0) === 0 && <div className="empty">No warnings for the latest artifact.</div>}
                      </div>
                    </div>
                  </section>
                </>
              ) : (
                <div className="empty richEmpty"><strong>Select or create a debug session</strong><span>Sessions keep deterministic fake-to-real mappings so follow-up CSV, JSON, and logs reuse the same tokens.</span></div>
              )}
            </section>
          </section>
        )}

        {view === 'optimizer' && (
          <section className="optimizerLayout">
            <section className="surface optimizerComposer flagshipCard">
              <div className="surfaceHeader">
                <div>
                  <span className="eyebrow">MCP tool: optimize_context</span>
                  <h2>Task in, smallest useful context out.</h2>
                </div>
                <Sparkles size={18} />
              </div>
              <textarea value={task} onChange={(event) => setTask(event.target.value)} placeholder="Add pagination to Orders API" />
              <button onClick={optimizeContext} disabled={busy || !task.trim()}><Sparkles size={18} /><span>Optimize context</span></button>
              <div className="optimizerHints">
                <div><span>Mode</span><strong>{settingsDraft?.optimizer.mode ?? 'retrieval'}</strong></div>
                <div><span>Budget</span><strong>{settingsDraft?.optimizer.maxTokens ?? 3000} tokens</strong></div>
              </div>
            </section>

            <section className="surface optimizedResult flagshipResult">
              {optimizedContext ? (
                <>
                  <div className="optimizedHero">
                    <div>
                      <span>Token estimate</span>
                      <strong>{optimizedContext.estimatedTokens.toLocaleString()} tokens</strong>
                    </div>
                    <div>
                      <span>Token savings</span>
                      <strong>{optimizedContext.tokenSavings ? `${optimizedContext.tokenSavings.savingsPercent.toFixed(0)}%` : 'optimized'}</strong>
                    </div>
                    <div>
                      <span>Sources</span>
                      <strong>{optimizedContext.sources.length}</strong>
                    </div>
                  </div>
                  <div className="optimizedSummary">
                    <span>Summary</span>
                    <p>{optimizedContext.summary}</p>
                  </div>
                  <div className="contextColumns">
                    <div>
                      <h2>Critical</h2>
                      {optimizedContext.criticalContext.map((item) => <p className="contextLine" key={item}>{item}</p>)}
                    </div>
                  </div>
                  <div className="sourceChips">
                    {optimizedContext.sources.map((source) => <span key={source}>{source}</span>)}
                  </div>
                  {optimizedContext.importantContext.length > 0 && (
                    <details className="advancedPanel optionalContext">
                      <summary>Show supporting context</summary>
                      <div className="contextStack">
                        {optimizedContext.importantContext.map((item) => <p className="contextLine" key={item}>{item}</p>)}
                      </div>
                    </details>
                  )}
                </>
              ) : (
                <div className="empty richEmpty"><strong>Ready to optimize</strong><span>Enter a coding task and RAG-e Khab will retrieve, rank, deduplicate, compress when configured, and return context within the token budget.</span></div>
              )}
            </section>
          </section>
        )}

        {view === 'chat' && (
          <section className="chatLayout">
            <section className="surface chatSurface">
              <div className="composer">
                <textarea value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="Ask your knowledge base..." />
                <button onClick={() => ask()} disabled={busy || !question.trim()} title="Send question"><Send size={18} /></button>
              </div>
              <div className="answers">
                {history.map((turn) => (
                  <article className="turn" key={turn.id}>
                    <div className="questionBubble">{turn.question}</div>
                    <div className="answerBubble">
                      <div className="answerMeta">{turn.response.provider} - {new Date(turn.response.createdAt).toLocaleString()}</div>
                      <p>{turn.response.answer}</p>
                      <div className="sources">
                        {turn.response.sources.map((source) => (
                          <button className="sourceCard" onClick={() => setActiveSource(source)} key={source.chunkId}>
                            <strong>{source.documentName}</strong>
                            <span>{source.pageNumber ? `page ${source.pageNumber}` : 'text'} - score {source.score.toFixed(2)}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </article>
                ))}
                {history.length === 0 && <div className="empty richEmpty"><strong>No conversation yet</strong><span>Ask a question to inspect cited answers from memories, documents, and repository knowledge.</span></div>}
              </div>
            </section>

            <aside className="sourcePanel">
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
            </aside>
          </section>
        )}

        {view === 'settings' && (
          <section className="view">
            {settingsDraft && (
              <section className="surface settingsPanel">
                <div className="surfaceHeader">
                  <h2>Settings</h2>
                  <button onClick={saveSettings} disabled={busy}>Save</button>
                </div>
                <div className="settingsSections">
                  <details className="settingsGroup" open>
                    <summary>Models</summary>
                    <div className="settingsGrid">
                  <label>
                    <span>Chat provider</span>
                    <select
                      value={settingsDraft.llm.provider}
                      onChange={(event) => setSettingsDraft({
                        ...settingsDraft,
                        llm: { ...settingsDraft.llm, provider: event.target.value }
                      })}
                    >
                      {status?.availableProviders.map((provider) => (
                        <option value={provider} key={provider}>{provider}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <span>Chat model</span>
                    <select
                      value={selectValue(settingsDraft.llm.model, chatModelOptions)}
                      onChange={(event) => {
                        const value = event.target.value;
                        setSettingsDraft({
                          ...settingsDraft,
                          llm: { ...settingsDraft.llm, model: value === CUSTOM_MODEL ? '' : value }
                        });
                      }}
                    >
                      {chatModelOptions.map((model) => (
                        <option value={model} key={model}>{model}</option>
                      ))}
                      <option value={CUSTOM_MODEL}>custom</option>
                    </select>
                  </label>
                  {selectValue(settingsDraft.llm.model, chatModelOptions) === CUSTOM_MODEL && (
                    <label>
                      <span>Custom chat model</span>
                      <input
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
                    <input
                      value={settingsDraft.llm.baseUrl}
                      onChange={(event) => setSettingsDraft({
                        ...settingsDraft,
                        llm: { ...settingsDraft.llm, baseUrl: event.target.value }
                      })}
                    />
                  </label>
                  <label>
                    <span>Chat API key</span>
                    <input
                      type="password"
                      value={settingsDraft.llm.apiKey}
                      onChange={(event) => setSettingsDraft({
                        ...settingsDraft,
                        llm: { ...settingsDraft.llm, apiKey: event.target.value }
                      })}
                    />
                  </label>
                    </div>
                  </details>
                  <details className="settingsGroup">
                    <summary>Optimizer</summary>
                    <div className="settingsGrid">
                  <label>
                    <span>Optimizer mode</span>
                    <select
                      value={settingsDraft.optimizer.mode}
                      onChange={(event) => setSettingsDraft({
                        ...settingsDraft,
                        optimizer: { ...settingsDraft.optimizer, mode: event.target.value }
                      })}
                    >
                      <option value="retrieval">Retrieval only</option>
                      <option value="compression" disabled={!settingsDraft.localLlm.enabled}>Compression</option>
                    </select>
                    {!settingsDraft.localLlm.enabled && <small className="settingHint">Enable local LLM compression to use compression mode.</small>}
                  </label>
                  <label>
                    <span>Optimizer max tokens</span>
                    <input
                      type="number"
                      min="300"
                      max="8000"
                      value={settingsDraft.optimizer.maxTokens}
                      onChange={(event) => setSettingsDraft({
                        ...settingsDraft,
                        optimizer: { ...settingsDraft.optimizer, maxTokens: Number(event.target.value) }
                      })}
                    />
                  </label>
                  <label className="toggleRow">
                    <input
                      type="checkbox"
                      checked={settingsDraft.localLlm.enabled}
                      onChange={(event) => setSettingsDraft({
                        ...settingsDraft,
                        optimizer: event.target.checked ? settingsDraft.optimizer : { ...settingsDraft.optimizer, mode: 'retrieval' },
                        localLlm: { ...settingsDraft.localLlm, enabled: event.target.checked }
                      })}
                    />
                      <span>Enable local LLM compression</span>
                  </label>
                  <label>
                    <span>Local LLM provider</span>
                    <select
                      value={settingsDraft.localLlm.provider}
                      onChange={(event) => setSettingsDraft({
                        ...settingsDraft,
                        localLlm: { ...settingsDraft.localLlm, provider: event.target.value }
                      })}
                    >
                      <option value="ollama">Ollama</option>
                    </select>
                  </label>
                  <label>
                    <span>Local LLM base URL</span>
                    <input
                      value={settingsDraft.localLlm.baseUrl}
                      onChange={(event) => setSettingsDraft({
                        ...settingsDraft,
                        localLlm: { ...settingsDraft.localLlm, baseUrl: event.target.value }
                      })}
                    />
                  </label>
                  <label>
                    <span>Compression model</span>
                    <select
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
                    >
                      <option value={DISABLED_MODEL}>disabled</option>
                      {compressionModelOptions.map((model) => (
                        <option value={model} key={model}>{model}</option>
                      ))}
                      <option value={CUSTOM_MODEL}>custom</option>
                    </select>
                  </label>
                  {settingsDraft.localLlm.enabled && selectValue(settingsDraft.localLlm.model, compressionModelOptions) === CUSTOM_MODEL && (
                    <label>
                      <span>Custom compression model</span>
                      <input
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
                  </details>
                  <details className="settingsGroup">
                    <summary>Advanced settings</summary>
                    <div className="settingsGrid">
                  <label>
                    <span>Embedding provider</span>
                    <select
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
                    >
                      <option value="hash">Hash fallback</option>
                      <option value="ollama">Ollama</option>
                    </select>
                  </label>
                  <label>
                    <span>Embedding model</span>
                    <select
                      value={settingsDraft.embedding.provider === 'hash' ? 'hash-based embedder' : selectValue(settingsDraft.embedding.model, embeddingModelOptions)}
                      disabled={settingsDraft.embedding.provider === 'hash'}
                      onChange={(event) => {
                        const value = event.target.value;
                        setSettingsDraft({
                          ...settingsDraft,
                          embedding: { ...settingsDraft.embedding, model: value === CUSTOM_MODEL ? '' : value }
                        });
                      }}
                    >
                      {settingsDraft.embedding.provider === 'hash' ? (
                        <option value="hash-based embedder">hash-based embedder</option>
                      ) : (
                        <>
                          {embeddingModelOptions.map((model) => (
                            <option value={model} key={model}>{model}</option>
                          ))}
                          <option value={CUSTOM_MODEL}>custom</option>
                        </>
                      )}
                    </select>
                  </label>
                  {settingsDraft.embedding.provider === 'ollama' && selectValue(settingsDraft.embedding.model, embeddingModelOptions) === CUSTOM_MODEL && (
                    <label>
                      <span>Custom embedding model</span>
                      <input
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
                    <input
                      value={settingsDraft.embedding.baseUrl}
                      onChange={(event) => setSettingsDraft({
                        ...settingsDraft,
                        embedding: { ...settingsDraft.embedding, baseUrl: event.target.value }
                      })}
                    />
                  </label>
                  <label>
                    <span>Embedding dimensions</span>
                    <input
                      type="number"
                      min="1"
                      max="8192"
                      value={settingsDraft.embedding.dimensions}
                      onChange={(event) => setSettingsDraft({
                        ...settingsDraft,
                        embedding: { ...settingsDraft.embedding, dimensions: Number(event.target.value) }
                      })}
                    />
                  </label>
                    </div>
                  </details>
                  <details className="settingsGroup">
                    <summary>Repository Agent</summary>
                    <div className="settingsGrid">
                  <label className="wideSetting">
                    <span>Repository path</span>
                    <input
                      value={settingsDraft.repositoryAgent.path}
                      onChange={(event) => setSettingsDraft({
                        ...settingsDraft,
                        repositoryAgent: { ...settingsDraft.repositoryAgent, path: event.target.value }
                      })}
                    />
                  </label>
                  <label className="toggleRow">
                    <input
                      type="checkbox"
                      checked={settingsDraft.repositoryAgent.scheduled}
                      onChange={(event) => setSettingsDraft({
                        ...settingsDraft,
                        repositoryAgent: { ...settingsDraft.repositoryAgent, scheduled: event.target.checked }
                      })}
                    />
                    <span>Enable scheduled repository scan</span>
                  </label>
                  <label>
                    <span>Repository scan interval ms</span>
                    <input
                      type="number"
                      min="30000"
                      value={settingsDraft.repositoryAgent.intervalMs}
                      onChange={(event) => setSettingsDraft({
                        ...settingsDraft,
                        repositoryAgent: { ...settingsDraft.repositoryAgent, intervalMs: Number(event.target.value) }
                      })}
                    />
                  </label>
                  <div className="wideSetting settingHint">
                    Repositories are registered by the external agent or MCP tooling. Use the Repositories page to link discovered repositories to projects.
                  </div>
                    </div>
                  </details>
                  <details className="settingsGroup">
                    <summary>Storage diagnostics</summary>
                    <div className="adminGrid storageGrid">
                      <div><span>Vector store</span><strong>{status?.index.vectorStore ?? 'unknown'}</strong></div>
                      <div><span>Collection</span><strong>{status?.index.collection ?? 'unknown'}</strong></div>
                      <div><span>Qdrant</span><strong>{status?.qdrantUrl ?? 'unknown'}</strong></div>
                      <div><span>Documents</span><strong>{status?.index.documentCount ?? 0}</strong></div>
                    </div>
                  </details>
                </div>
              </section>
            )}
          </section>
        )}
      </section>
    </main>
  );
}
