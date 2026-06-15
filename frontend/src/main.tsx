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
};

type View = 'home' | 'projects' | 'knowledge' | 'chat' | 'admin';
type IngestMode = 'upload' | 'text';

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  if (!response.ok) throw new Error(await response.text());
  return response.json() as Promise<T>;
}

function App() {
  const [view, setView] = useState<View>('home');
  const [ingestMode, setIngestMode] = useState<IngestMode>('text');
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [projectName, setProjectName] = useState('');
  const [textTitle, setTextTitle] = useState('');
  const [textBody, setTextBody] = useState('');
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [status, setStatus] = useState<AdminStatus | null>(null);
  const [question, setQuestion] = useState('');
  const [history, setHistory] = useState<ConversationTurn[]>([]);
  const [activeSource, setActiveSource] = useState<SearchResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedProject = projects.find((project) => project.id === selectedProjectId);

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
  };

  useEffect(() => {
    refresh().catch((err) => setError(err.message));
  }, [selectedProjectId]);

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
              <button className={view === item.id ? 'navItem active' : 'navItem'} onClick={() => setView(item.id)} key={item.id}>
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
            <button onClick={() => setView('knowledge')}><FilePlus2 size={18} /><span>Add</span></button>
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
                  <button className="ghostButton" onClick={() => setView('knowledge')}>View all</button>
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
                <button
                  className={project.id === selectedProjectId ? 'projectCard active' : 'projectCard'}
                  onClick={() => setSelectedProjectId(project.id)}
                  key={project.id}
                >
                  <span>{project.name}</span>
                  <strong>{project.documentCount}</strong>
                  <small>{new Date(project.createdAt).toLocaleDateString()}</small>
                </button>
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
          </section>
        )}
      </section>
    </main>
  );
}

createRoot(document.getElementById('root')!).render(<App />);
