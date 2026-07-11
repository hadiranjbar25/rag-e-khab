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
  LoadingOverlay,
  Menu,
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
  Zap
} from 'lucide-react';

import {
  ProjectItem,
  WorkspaceHealthStatus,
  WorkspaceHealthCheck,
  WorkspaceHealth,
  DocumentItem,
  SearchResult,
  ChatResponse,
  OptimizedContext,
  ContextPreviewItem,
  ConversationTurn,
  AdminStatus,
  AgentActivity,
  RuntimeSettings,
  DeleteProjectResult,
  MemoryFreshness,
  MemoryItem,
  RepositoryFileMetadata,
  RepositorySummary,
  RepositoryAgentStatus,
  RepositoryItem,
  RepositoryDeleteResult,
  DebugSession,
  DebugInputType,
  DebugSanitizerMode,
  DebugWarning,
  DebugTokenMapping,
  DebugArtifact,
  DebugArtifactSlice,
  DebugArtifactReference,
  DebugArtifactDiffLine,
  DebugArtifactComparison,
  DebugDataRequest,
  DebugNote,
  DebugAuditEvent,
  DebugMemorySuggestion,
  DebugSessionDetail,
  SanitizeDebugResponse,
  SanitizationProfile,
  View,
  IngestMode,
  viewRoutes,
  PROJECT_QUERY_PARAM,
  CUSTOM_MODEL,
  DISABLED_MODEL,
  chatModelOptions,
  compressionModelOptions,
  embeddingModelOptions,
  contextBudgetProfiles,
  contextBudgetProfileOptions,
  memoryTypes,
  memoryLabels,
  taskTemplates,
  memoryBadgeColor,
  formatBytes,
  activityTitle,
  safeDebugInstructionFor,
  relationSqlTemplates,
  selectValue,
  viewFromPath,
  projectIdFromSearch,
  routeFor,
  request,
  readableError,
  errorMessage,
  sqlLiteral
} from '../appSupport';

export function useRageKhabAppModel() {
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
  const [workspaceHealth, setWorkspaceHealth] = useState<WorkspaceHealth | null>(null);
  const [agentActivities, setAgentActivities] = useState<AgentActivity[]>([]);
  const [debugSessions, setDebugSessions] = useState<DebugSession[]>([]);
  const [sanitizationProfiles, setSanitizationProfiles] = useState<SanitizationProfile[]>([]);
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
  const [debugCompareLeftId, setDebugCompareLeftId] = useState('');
  const [debugCompareRightId, setDebugCompareRightId] = useState('');
  const [debugArtifactComparison, setDebugArtifactComparison] = useState<DebugArtifactComparison | null>(null);
  const [debugTokenQuery, setDebugTokenQuery] = useState('');
  const [debugResolvedToken, setDebugResolvedToken] = useState<DebugTokenMapping | null>(null);
  const [debugTokenSearch, setDebugTokenSearch] = useState('');
  const [agentRequestDraft, setAgentRequestDraft] = useState('');
  const [repositoryToLink, setRepositoryToLink] = useState('');
  const [repositorySearch, setRepositorySearch] = useState('');
  const [repositoryPage, setRepositoryPage] = useState(1);
  const [repositoryPageSize, setRepositoryPageSize] = useState(9);
  const [repositoryFilesExpanded, setRepositoryFilesExpanded] = useState(false);
  const [deleteRepositoryKnowledge, setDeleteRepositoryKnowledge] = useState(false);
  const [memoryFilter, setMemoryFilter] = useState<string>('all');
  const [memorySearch, setMemorySearch] = useState('');
  const [memoryPage, setMemoryPage] = useState(1);
  const [memoryPageSize, setMemoryPageSize] = useState(12);
  const [expandedMemoryIds, setExpandedMemoryIds] = useState<Record<string, boolean>>({});
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
  const [optimizerBudgetProfile, setOptimizerBudgetProfile] = useState('standard');
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
    const [memoryList, allMemoryList, repoStatus, health] = await Promise.all([
      request<MemoryItem[]>(selectedProjectId ? `/api/memories?projectId=${selectedProjectId}` : '/api/memories').catch(() => []),
      request<MemoryItem[]>('/api/memories').catch(() => []),
      request<RepositoryAgentStatus>('/api/repository-agent/status').catch(() => null),
      selectedProjectId ? request<WorkspaceHealth>(`/api/projects/${selectedProjectId}/health`).catch(() => null) : Promise.resolve(null)
    ]);
    const [repositoryList, linkedRepositories] = await Promise.all([
      request<RepositoryItem[]>('/api/repositories').catch(() => []),
      selectedProjectId ? request<RepositoryItem[]>(`/api/projects/${selectedProjectId}/repositories`).catch(() => []) : Promise.resolve([])
    ]);
    const [safeDebugSessions, safeDebugProfiles, activities] = await Promise.all([
      request<DebugSession[]>('/api/debug-sessions').catch(() => []),
      request<SanitizationProfile[]>('/api/debug-sessions/sanitization-profiles').catch(() => []),
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
    setWorkspaceHealth(health);
    setRepositories(repositoryList);
    setProjectRepositories(linkedRepositories);
    setDebugSessions(safeDebugSessions);
    setSanitizationProfiles(safeDebugProfiles);
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
    const artifacts = debugDetail?.artifacts ?? [];
    if (artifacts.length < 2) {
      setDebugCompareLeftId('');
      setDebugCompareRightId('');
      setDebugArtifactComparison(null);
      return;
    }
    if (!artifacts.some((artifact) => artifact.id === debugCompareLeftId)) {
      setDebugCompareLeftId(artifacts[1].id);
    }
    if (!artifacts.some((artifact) => artifact.id === debugCompareRightId)) {
      setDebugCompareRightId(artifacts[0].id);
    }
  }, [debugCompareLeftId, debugCompareRightId, debugDetail?.artifacts]);

  useEffect(() => {
    if (settingsDraft?.optimizer.maxTokens) {
      setOptimizerTokenBudget(settingsDraft.optimizer.maxTokens);
      setOptimizerBudgetProfile(settingsDraft.optimizer.budgetProfile ?? 'standard');
    }
  }, [settingsDraft?.optimizer.budgetProfile, settingsDraft?.optimizer.maxTokens]);

  const totalChunks = documents.reduce((sum, doc) => sum + doc.chunkCount, 0);
  const tokenSavings = optimizedContext ? (optimizedContext.tokenSavings?.savedTokens ?? Math.max(0, totalChunks * 650 - optimizedContext.estimatedTokens)) : 0;
  const lastSync = repositoryStatus?.lastIndexedAt ?? repositoryStatus?.repositories.find((repo) => repo.lastIndexedAt)?.lastIndexedAt;
  const linkedRepositoryIds = new Set(projectRepositories.map((repository) => repository.id));
  const repositoryCards = useMemo<RepositoryItem[]>(() => {
    const catalog = repositories.length > 0 ? repositories : (repositoryStatus?.repositories ?? []).map((repo) => ({
      id: repo.repositoryId,
      name: repo.repository,
      path: repo.repositoryRoot,
      language: repo.language,
      lastSyncedAt: repo.lastIndexedAt,
      status: repo.status,
    }));
    return [...catalog].sort((a, b) => a.name.localeCompare(b.name));
  }, [repositories, repositoryStatus?.repositories]);
  const filteredRepositories = useMemo(() => {
    const query = repositorySearch.trim().toLowerCase();
    if (!query) return repositoryCards;
    return repositoryCards.filter((repository) =>
      [repository.name, repository.path, repository.language, repository.status]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(query)),
    );
  }, [repositoryCards, repositorySearch]);
  const repositoryPageCount = Math.max(1, Math.ceil(filteredRepositories.length / repositoryPageSize));
  const normalizedRepositoryPage = Math.min(repositoryPage, repositoryPageCount);
  const repositoryPageStart = (normalizedRepositoryPage - 1) * repositoryPageSize;
  const pagedRepositories = filteredRepositories.slice(repositoryPageStart, repositoryPageStart + repositoryPageSize);
  const repositoryRangeStart = filteredRepositories.length === 0 ? 0 : repositoryPageStart + 1;
  const repositoryRangeEnd = Math.min(repositoryPageStart + repositoryPageSize, filteredRepositories.length);
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
  const activeWorkspaceHealth = workspaceHealth?.projectId === selectedProjectId ? workspaceHealth : null;
  const workspaceHealthColor = activeWorkspaceHealth?.status === 'ready' ? 'green' : activeWorkspaceHealth?.status === 'review' ? 'yellow' : 'gray';
  const workspaceHealthTitle = !activeWorkspaceHealth
    ? 'Workspace health'
    : activeWorkspaceHealth.status === 'ready'
    ? 'Ready for agents'
    : activeWorkspaceHealth.status === 'review'
      ? 'Needs review'
      : 'Setup needed';
  const currentBudgetProfile = contextBudgetProfiles.find((profile) => profile.value === optimizerBudgetProfile);

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
  const staleMemoryCount = filteredMemories.filter((memory) => memory.freshness?.status === 'stale').length;

  const toggleMemoryExpanded = (id: string) => {
    setExpandedMemoryIds((current) => ({ ...current, [id]: !current[id] }));
  };

  useEffect(() => {
    setMemoryPage(1);
  }, [memoryFilter, memorySearch, selectedProjectId, memoryPageSize]);

  useEffect(() => {
    if (memoryPage > memoryPageCount) setMemoryPage(memoryPageCount);
  }, [memoryPage, memoryPageCount]);

  useEffect(() => {
    setRepositoryPage(1);
  }, [repositorySearch, repositoryPageSize, repositoryCards.length]);

  useEffect(() => {
    if (repositoryPage > repositoryPageCount) setRepositoryPage(repositoryPageCount);
  }, [repositoryPage, repositoryPageCount]);

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
    setOptimizerBudgetProfile(template.budgetProfile);
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
          budgetProfile: optimizerBudgetProfile !== 'custom' ? optimizerBudgetProfile : undefined,
          maxTokens: optimizerBudgetProfile === 'custom'
            ? Math.max(300, Math.min(8000, Math.floor(optimizerTokenBudget || settingsDraft?.optimizer.maxTokens || 3000)))
            : undefined
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
          projectId: selectedProjectId || undefined,
          global: false
        })
      });
      setMemoryContentDraft('');
      setMemoryRepositoryDraft('');
      await refresh();
      showToast({ type: 'success', title: 'Memory saved', message: `${memory.type} · ${selectedProject?.name ?? 'selected workspace'}` });
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
          projectId: selectedProjectId || undefined,
          global: false
        })
      });
      setDebugMemoryContentDraft('');
      setDebugMemoryRepositoryDraft('');
      setDebugMemoryModuleDraft('');
      setDebugDetail(await request<DebugSessionDetail>(`/api/debug-sessions/${activeDebugSessionId}`));
      await refresh();
      showToast({ type: 'success', title: 'Lesson promoted to memory', message: `${memory.type} · ${selectedProject?.name ?? 'selected workspace'}` });
    } catch (err) {
      reportError(err, 'Memory promotion failed');
    } finally {
      setBusy(false);
    }
  };

  const applyDebugMemorySuggestion = (suggestion: DebugMemorySuggestion) => {
    setDebugMemoryTypeDraft(suggestion.type);
    setDebugMemoryContentDraft(suggestion.content);
    setDebugMemoryConfidenceDraft(suggestion.confidence);
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

  const compareDebugArtifacts = async () => {
    if (!activeDebugSessionId || !debugCompareLeftId || !debugCompareRightId || debugCompareLeftId === debugCompareRightId) return;
    setBusy(true);
    setError(null);
    try {
      const comparison = await request<DebugArtifactComparison>(
        `/api/debug-sessions/${activeDebugSessionId}/artifacts/compare?leftArtifactId=${debugCompareLeftId}&rightArtifactId=${debugCompareRightId}`
      );
      setDebugArtifactComparison(comparison);
      showToast({ type: 'success', title: 'Artifacts compared', message: comparison.summary });
    } catch (err) {
      reportError(err, 'Artifact comparison failed');
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
  const debugMemorySuggestions = debugDetail?.memorySuggestions ?? [];
  const latestDebugArtifact = debugDetail?.artifacts[0];
  const latestDebugText = debugSanitizedText || latestDebugArtifact?.compactText || latestDebugArtifact?.sanitizedText || '';
  const debugArtifactOptions = (debugDetail?.artifacts ?? []).map((artifact) => ({
    value: artifact.id,
    label: `${artifact.sourceName} · ${new Date(artifact.createdAt).toLocaleString()}`,
  }));

  const tokenMappingFor = (token?: string): DebugTokenMapping | undefined =>
    token ? debugDetail?.tokenMappings.find((mapping) => mapping.token.toLowerCase() === token.toLowerCase()) : undefined;

  const artifactTextFor = (artifact: DebugArtifact): string =>
    artifact.compactText || artifact.sanitizedContent || artifact.sanitizedText;

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


  return {
    view,
    setView,
    ingestMode,
    setIngestMode,
    uploadFile,
    setUploadFile,
    projects,
    setProjects,
    selectedProjectId,
    setSelectedProjectId,
    projectName,
    setProjectName,
    textTitle,
    setTextTitle,
    textBody,
    setTextBody,
    documents,
    setDocuments,
    memories,
    setMemories,
    allMemories,
    setAllMemories,
    repositoryStatus,
    setRepositoryStatus,
    repositories,
    setRepositories,
    projectRepositories,
    setProjectRepositories,
    workspaceHealth,
    setWorkspaceHealth,
    agentActivities,
    setAgentActivities,
    debugSessions,
    setDebugSessions,
    sanitizationProfiles,
    setSanitizationProfiles,
    activeDebugSessionId,
    setActiveDebugSessionId,
    debugDetail,
    setDebugDetail,
    debugTitle,
    setDebugTitle,
    debugRawText,
    setDebugRawText,
    debugInputType,
    setDebugInputType,
    debugSanitizerMode,
    setDebugSanitizerMode,
    debugSourceName,
    setDebugSourceName,
    debugDataRequestId,
    setDebugDataRequestId,
    debugSanitizedText,
    setDebugSanitizedText,
    debugWarnings,
    setDebugWarnings,
    debugArtifactSliceStart,
    setDebugArtifactSliceStart,
    debugArtifactSliceEnd,
    setDebugArtifactSliceEnd,
    debugArtifactSlice,
    setDebugArtifactSlice,
    debugCompareLeftId,
    setDebugCompareLeftId,
    debugCompareRightId,
    setDebugCompareRightId,
    debugArtifactComparison,
    setDebugArtifactComparison,
    debugTokenQuery,
    setDebugTokenQuery,
    debugResolvedToken,
    setDebugResolvedToken,
    debugTokenSearch,
    setDebugTokenSearch,
    agentRequestDraft,
    setAgentRequestDraft,
    repositoryToLink,
    setRepositoryToLink,
    repositorySearch,
    setRepositorySearch,
    repositoryPage,
    setRepositoryPage,
    repositoryPageSize,
    setRepositoryPageSize,
    repositoryFilesExpanded,
    setRepositoryFilesExpanded,
    deleteRepositoryKnowledge,
    setDeleteRepositoryKnowledge,
    memoryFilter,
    setMemoryFilter,
    memorySearch,
    setMemorySearch,
    memoryPage,
    setMemoryPage,
    memoryPageSize,
    setMemoryPageSize,
    expandedMemoryIds,
    setExpandedMemoryIds,
    repositoryFilePage,
    setRepositoryFilePage,
    repositoryFilePageSize,
    setRepositoryFilePageSize,
    memoryTypeDraft,
    setMemoryTypeDraft,
    memoryContentDraft,
    setMemoryContentDraft,
    memoryRepositoryDraft,
    setMemoryRepositoryDraft,
    memoryToLink,
    setMemoryToLink,
    debugMemoryTypeDraft,
    setDebugMemoryTypeDraft,
    debugMemoryContentDraft,
    setDebugMemoryContentDraft,
    debugMemoryRepositoryDraft,
    setDebugMemoryRepositoryDraft,
    debugMemoryModuleDraft,
    setDebugMemoryModuleDraft,
    debugMemoryConfidenceDraft,
    setDebugMemoryConfidenceDraft,
    status,
    setStatus,
    settingsDraft,
    setSettingsDraft,
    question,
    setQuestion,
    task,
    setTask,
    selectedTaskTemplate,
    setSelectedTaskTemplate,
    optimizerTokenBudget,
    setOptimizerTokenBudget,
    optimizerBudgetProfile,
    setOptimizerBudgetProfile,
    optimizedContext,
    setOptimizedContext,
    history,
    setHistory,
    activeSource,
    setActiveSource,
    busy,
    setBusy,
    error,
    setError,
    colorScheme,
    setColorScheme,
    selectedProject,
    showToast,
    reportError,
    navigate,
    refresh,
    totalChunks,
    tokenSavings,
    lastSync,
    linkedRepositoryIds,
    repositoryCards,
    filteredRepositories,
    repositoryPageCount,
    normalizedRepositoryPage,
    repositoryPageStart,
    pagedRepositories,
    repositoryRangeStart,
    repositoryRangeEnd,
    discoveredFiles,
    repositoryFilePageCount,
    normalizedRepositoryFilePage,
    repositoryFilePageStart,
    pagedRepositoryFiles,
    repositoryFileRangeStart,
    repositoryFileRangeEnd,
    sortedDebugSessions,
    activeDebugSession,
    activeWorkspaceHealth,
    workspaceHealthColor,
    workspaceHealthTitle,
    currentBudgetProfile,
    stats,
    navItems,
    suggestedQuestions,
    memoryCounts,
    filteredMemories,
    memoryPageCount,
    normalizedMemoryPage,
    memoryPageStart,
    pagedMemories,
    memoryRangeStart,
    memoryRangeEnd,
    staleMemoryCount,
    toggleMemoryExpanded,
    recentActivity,
    upload,
    addText,
    ask,
    applyTaskTemplate,
    optimizeContext,
    deleteDocument,
    reindex,
    createProject,
    deleteProject,
    deleteMemory,
    rememberMemory,
    linkMemoryToProject,
    unlinkMemoryFromProject,
    saveSettings,
    linkRepositoryToProject,
    unlinkRepositoryFromProject,
    deleteRepository,
    createDebugSession,
    openDebugSession,
    archiveDebugSession,
    sanitizeDebugData,
    resolveDebugToken,
    recordAgentRequest,
    promoteDebugMemory,
    applyDebugMemorySuggestion,
    updateDebugDataRequest,
    copyDebugText,
    expandDebugArtifactSlice,
    compareDebugArtifacts,
    filteredDebugMappings,
    pendingDebugRequests,
    debugMemorySuggestions,
    latestDebugArtifact,
    latestDebugText,
    debugArtifactOptions,
    tokenMappingFor,
    artifactTextFor,
    suggestedSqlFor,
    activeSafeDebugInstruction,
    pageCopy,
    pageTitles,
    preWrapStyle,
    wideGridItemStyle
  };
}

export type RageKhabAppModel = ReturnType<typeof useRageKhabAppModel>;
