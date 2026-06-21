import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  BookOpen,
  Database,
  FilePlus2,
  FileText,
  FolderPlus,
  Home,
  Layers,
  MessageSquare,
  RefreshCw,
  Send,
  Settings,
  Sparkles,
  Trash2,
  Upload
} from 'lucide-react';
import './styles.css';

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

type RepositoryScanResult = {
  repository: string;
  repositoryRoot: string;
  scannedFiles: number;
  indexedFiles: number;
  unchangedFiles: number;
  deletedFiles: number;
  skippedFiles: number;
};

type DeleteProjectResult = {
  deleted: boolean;
  projectId: string;
  projectName: string;
  deletedDocuments: number;
  deletedRepositoryMetadata: number;
};

type View = 'home' | 'projects' | 'knowledge' | 'optimizer' | 'chat' | 'admin';
type IngestMode = 'upload' | 'text';

const viewRoutes: Record<View, string> = {
  home: '/',
  projects: '/projects',
  knowledge: '/knowledge',
  optimizer: '/optimize',
  chat: '/chat',
  admin: '/admin'
};

const CUSTOM_MODEL = '__custom__';
const DISABLED_MODEL = '__disabled__';
const chatModelOptions = ['llama3.1', 'qwen2.5:7b', 'mistral', 'codellama'];
const compressionModelOptions = ['qwen2.5:7b', 'llama3.1', 'mistral'];
const embeddingModelOptions = ['nomic-embed-text', 'bge-m3'];

function selectValue(value: string, options: string[]): string {
  return options.includes(value) ? value : CUSTOM_MODEL;
}

function viewFromPath(pathname: string): View {
  const normalized = pathname.replace(/\/+$/, '') || '/';
  const match = Object.entries(viewRoutes).find(([, path]) => path === normalized);
  return (match?.[0] as View | undefined) ?? 'home';
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  if (!response.ok) {
    const body = await response.text();
    if (response.status === 502 || body.includes('Bad Gateway')) {
      throw new Error('Backend is unavailable. Start or restart the backend service, then retry.');
    }
    throw new Error(body);
  }
  return response.json() as Promise<T>;
}

function App() {
  const [view, setView] = useState<View>(() => viewFromPath(window.location.pathname));
  const [ingestMode, setIngestMode] = useState<IngestMode>('text');
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [projectName, setProjectName] = useState('');
  const [textTitle, setTextTitle] = useState('');
  const [textBody, setTextBody] = useState('');
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [status, setStatus] = useState<AdminStatus | null>(null);
  const [settingsDraft, setSettingsDraft] = useState<RuntimeSettings | null>(null);
  const [repositoryName, setRepositoryName] = useState('');
  const [repositoryPath, setRepositoryPath] = useState('');
  const [repositoryFullScan, setRepositoryFullScan] = useState(false);
  const [repositoryScan, setRepositoryScan] = useState<RepositoryScanResult | null>(null);
  const [question, setQuestion] = useState('');
  const [task, setTask] = useState('');
  const [optimizedContext, setOptimizedContext] = useState<OptimizedContext | null>(null);
  const [history, setHistory] = useState<ConversationTurn[]>([]);
  const [activeSource, setActiveSource] = useState<SearchResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedProject = projects.find((project) => project.id === selectedProjectId);

  const navigate = (nextView: View) => {
    const path = viewRoutes[nextView];
    if (window.location.pathname !== path) {
      window.history.pushState({}, '', path);
    }
    setView(nextView);
  };

  const refresh = async () => {
    const [projectList, docs, admin] = await Promise.all([
      request<ProjectItem[]>('/api/projects'),
      request<DocumentItem[]>(selectedProjectId ? `/api/documents?projectId=${selectedProjectId}` : '/api/documents'),
      request<AdminStatus>('/api/admin/status')
    ]);
    setProjects(projectList);
    if (!selectedProjectId && projectList.length > 0) setSelectedProjectId(projectList[0].id);
    setDocuments(docs);
    setStatus(admin);
    setSettingsDraft(admin.settings);
    if (!repositoryPath && admin.settings.repositoryAgent.path) {
      setRepositoryPath(admin.settings.repositoryAgent.path);
    }
  };

  useEffect(() => {
    refresh().catch((err) => setError(err.message));
  }, [selectedProjectId]);

  useEffect(() => {
    const onPopState = () => setView(viewFromPath(window.location.pathname));
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const stats = useMemo(() => [
    ['Projects', projects.length],
    ['Documents', status?.index.documentCount ?? documents.length],
    ['Chunks', status?.index.chunkCount ?? documents.reduce((sum, doc) => sum + doc.chunkCount, 0)],
    ['Provider', status?.provider ?? 'unknown']
  ], [documents, projects.length, status]);

  const navItems = [
    { id: 'home' as const, label: 'Home', icon: Home },
    { id: 'projects' as const, label: 'Projects', icon: FolderPlus },
    { id: 'knowledge' as const, label: 'Knowledge', icon: BookOpen },
    { id: 'optimizer' as const, label: 'Optimize', icon: Sparkles },
    { id: 'chat' as const, label: 'Chat', icon: MessageSquare },
    { id: 'admin' as const, label: 'Admin', icon: Settings }
  ];

  const suggestedQuestions = [
    'What are the main points in this project?',
    'Which documents mention onboarding?',
    'Summarize the latest notes.'
  ];

  const upload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const body = new FormData();
    body.append('file', file);
    if (selectedProjectId) body.append('projectId', selectedProjectId);
    setBusy(true);
    setError(null);
    try {
      await fetch('/api/documents', { method: 'POST', body });
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Text ingestion failed');
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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Question failed');
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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Context optimization failed');
    } finally {
      setBusy(false);
    }
  };

  const deleteDocument = async (id: string) => {
    setBusy(true);
    setError(null);
    try {
      await fetch(`/api/documents/${id}`, { method: 'DELETE' });
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    } finally {
      setBusy(false);
    }
  };

  const reindex = async () => {
    setBusy(true);
    setError(null);
    try {
      await fetch('/api/reindex', { method: 'POST' });
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Reindex failed');
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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Project creation failed');
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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Project deletion failed');
    } finally {
      setBusy(false);
    }
  };

  const saveSettings = async () => {
    if (!settingsDraft) return;
    if (settingsDraft.optimizer.mode === 'compression' && !settingsDraft.localLlm.enabled) {
      setError('Enable local LLM compression before saving compression mode.');
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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Settings update failed');
    } finally {
      setBusy(false);
    }
  };

  const scanRepository = async () => {
    const path = repositoryPath.trim() || settingsDraft?.repositoryAgent.path.trim();
    if (!path) {
      setError('Repository path is required.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const result = await request<RepositoryScanResult>('/api/repository-agent/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repository: repositoryName.trim() || undefined,
          path,
          full: repositoryFullScan
        })
      });
      setRepositoryScan(result);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Repository scan failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brandMark"><Database size={22} /></div>
          <div>
            <strong>RAG-e Khab</strong>
            <span>Private knowledge</span>
          </div>
        </div>
        <nav>
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <button className={view === item.id ? 'navItem active' : 'navItem'} onClick={() => navigate(item.id)} key={item.id}>
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
            <h1>{view === 'home' ? 'Private knowledge, ready to ask' : navItems.find((item) => item.id === view)?.label}</h1>
            <p>{selectedProject ? selectedProject.name : 'General'} workspace</p>
          </div>
          <div className="topActions">
            <select value={selectedProjectId} onChange={(event) => setSelectedProjectId(event.target.value)}>
              {projects.map((project) => (
                <option value={project.id} key={project.id}>{project.name}</option>
              ))}
            </select>
            <button onClick={() => navigate('knowledge')}><FilePlus2 size={18} /><span>Add</span></button>
          </div>
        </header>

        {error && <div className="notice">{error}</div>}

        {view === 'home' && (
          <section className="view">
            <div className="commandPanel">
              <div>
                <span className="eyebrow">Current project</span>
                <h2>{selectedProject?.name ?? 'General'}</h2>
                <p>{documents.length} indexed items in this project</p>
              </div>
              <div className="quickAsk">
                <input value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="Ask this project..." />
                <button onClick={() => ask()} disabled={busy || !question.trim()}><Send size={18} /></button>
              </div>
            </div>

            <div className="metrics">
              {stats.map(([label, value]) => (
                <div className="metric" key={label}>
                  <span>{label}</span>
                  <strong>{value}</strong>
                </div>
              ))}
            </div>

            <div className="homeGrid">
              <section className="surface">
                <div className="surfaceHeader">
                  <h2>Recent knowledge</h2>
                  <button className="ghostButton" onClick={() => navigate('knowledge')}>View all</button>
                </div>
                <div className="documentList compact">
                  {documents.slice(0, 5).map((doc) => (
                    <div className="documentRow" key={doc.id}>
                      <FileText size={20} />
                      <div>
                        <strong>{doc.name}</strong>
                        <span>{doc.format} - {doc.chunkCount} chunks</span>
                      </div>
                    </div>
                  ))}
                  {documents.length === 0 && <div className="empty">No knowledge in this project yet.</div>}
                </div>
              </section>

              <section className="surface">
                <div className="surfaceHeader">
                  <h2>Project prompts</h2>
                </div>
                <div className="promptList">
                  {suggestedQuestions.map((item) => (
                    <button className="promptButton" onClick={() => ask(item)} key={item}>{item}</button>
                  ))}
                </div>
              </section>
            </div>
          </section>
        )}

        {view === 'projects' && (
          <section className="view">
            <div className="createBar surface">
              <input value={projectName} onChange={(event) => setProjectName(event.target.value)} placeholder="New project name" />
              <button onClick={createProject} disabled={busy || !projectName.trim()} title="Create project"><FolderPlus size={18} /><span>Create</span></button>
            </div>
            <div className="projectGrid">
              {projects.map((project) => (
                <div
                  className={project.id === selectedProjectId ? 'projectCard active' : 'projectCard'}
                  key={project.id}
                >
                  <div>
                    <span>{project.name}</span>
                    <strong>{project.documentCount}</strong>
                    <small>{new Date(project.createdAt).toLocaleDateString()}</small>
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
                <button className="iconButton" onClick={reindex} disabled={busy} title="Reindex"><RefreshCw size={18} /></button>
              </div>
              <div className="documentList">
                {documents.map((doc) => (
                  <div className="documentRow" key={doc.id}>
                    <FileText size={20} />
                    <div>
                      <strong>{doc.name}</strong>
                      <span>{doc.projectName} - {doc.format} - {doc.chunkCount} chunks - {(doc.sizeBytes / 1024).toFixed(1)} KB</span>
                    </div>
                    <button className="iconButton" onClick={() => deleteDocument(doc.id)} disabled={busy} title="Delete document"><Trash2 size={18} /></button>
                  </div>
                ))}
                {documents.length === 0 && <div className="empty">No indexed items yet.</div>}
              </div>
            </section>
          </section>
        )}

        {view === 'optimizer' && (
          <section className="optimizerLayout">
            <section className="surface optimizerComposer">
              <div className="surfaceHeader">
                <h2>Context optimizer</h2>
                <Sparkles size={18} />
              </div>
              <textarea value={task} onChange={(event) => setTask(event.target.value)} placeholder="Add pagination to Orders API" />
              <button onClick={optimizeContext} disabled={busy || !task.trim()}><Sparkles size={18} /><span>Optimize context</span></button>
            </section>

            <section className="surface optimizedResult">
              {optimizedContext ? (
                <>
                  <div className="optimizedSummary">
                    <span>Estimated tokens</span>
                    <strong>{optimizedContext.estimatedTokens}</strong>
                    <p>{optimizedContext.summary}</p>
                  </div>
                  <div className="contextColumns">
                    <div>
                      <h2>Critical</h2>
                      {optimizedContext.criticalContext.map((item) => <p className="contextLine" key={item}>{item}</p>)}
                    </div>
                    <div>
                      <h2>Important</h2>
                      {optimizedContext.importantContext.map((item) => <p className="contextLine" key={item}>{item}</p>)}
                    </div>
                  </div>
                  <div className="sourceChips">
                    {optimizedContext.sources.map((source) => <span key={source}>{source}</span>)}
                  </div>
                </>
              ) : (
                <div className="empty">Enter a coding task to produce the smallest useful context for Claude Code.</div>
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
                {history.length === 0 && <div className="empty">Ask a question to start a cited conversation.</div>}
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
                <div className="empty">Select a citation to inspect the source chunk.</div>
              )}
            </aside>
          </section>
        )}

        {view === 'admin' && (
          <section className="view">
            <div className="metrics">
              {stats.map(([label, value]) => (
                <div className="metric" key={label}>
                  <span>{label}</span>
                  <strong>{value}</strong>
                </div>
              ))}
            </div>
            <div className="adminGrid">
              <div><span>Model</span><strong>{status?.model ?? 'unknown'}</strong></div>
              <div><span>Qdrant</span><strong>{status?.qdrantUrl ?? 'unknown'}</strong></div>
              <div><span>Providers</span><strong>{status?.availableProviders.join(', ') ?? 'unknown'}</strong></div>
              <div><span>MCP endpoint</span><strong>/mcp</strong></div>
              <div><span>Vector store</span><strong>{status?.index.vectorStore ?? 'unknown'}</strong></div>
              <div><span>Collection</span><strong>{status?.index.collection ?? 'unknown'}</strong></div>
            </div>
            {settingsDraft && (
              <section className="surface settingsPanel">
                <div className="surfaceHeader">
                  <h2>Settings</h2>
                  <button onClick={saveSettings} disabled={busy}>Save</button>
                </div>
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
                  <label>
                    <span>Scan repository name</span>
                    <input
                      value={repositoryName}
                      placeholder="billing-api"
                      onChange={(event) => setRepositoryName(event.target.value)}
                    />
                  </label>
                  <label className="wideSetting">
                    <span>Scan repository path</span>
                    <input
                      value={repositoryPath}
                      placeholder="/path/to/repository"
                      onChange={(event) => setRepositoryPath(event.target.value)}
                    />
                  </label>
                  <label className="toggleRow">
                    <input
                      type="checkbox"
                      checked={repositoryFullScan}
                      onChange={(event) => setRepositoryFullScan(event.target.checked)}
                    />
                    <span>Full scan</span>
                  </label>
                  <div className="wideSetting scanActions">
                    <button onClick={scanRepository} disabled={busy || !repositoryPath.trim()}>
                      <RefreshCw size={18} />
                      <span>Scan repository</span>
                    </button>
                    {repositoryScan && (
                      <small>
                        {repositoryScan.repository}: {repositoryScan.indexedFiles} indexed, {repositoryScan.unchangedFiles} unchanged, {repositoryScan.deletedFiles} deleted, {repositoryScan.skippedFiles} skipped
                      </small>
                    )}
                  </div>
                </div>
              </section>
            )}
          </section>
        )}
      </section>
    </main>
  );
}

createRoot(document.getElementById('root')!).render(<App />);
