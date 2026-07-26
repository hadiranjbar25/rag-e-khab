import { Alert, AppShell, LoadingOverlay, Progress, Stack } from '@mantine/core';
import { AlertCircle } from 'lucide-react';
import { AppSidebar } from './AppSidebar';
import { PageHeader } from './PageHeader';
import { ChatPage } from './pages/ChatPage';
import { HomePage } from './pages/HomePage';
import { KnowledgePage } from './pages/KnowledgePage';
import { MemoriesPage } from './pages/MemoriesPage';
import { OptimizerPage } from './pages/OptimizerPage';
import { RepositoriesPage } from './pages/RepositoriesPage';
import { SafeDebugPage } from './pages/SafeDebugPage';
import { SettingsPage } from './pages/SettingsPage';
import { WorkspacesPage } from './pages/WorkspacesPage';
import type { RageKhabAppModel } from './useRageKhabAppModel';

export function renderRageKhabApp(app: RageKhabAppModel) {
  const showPageHeader = app.view !== 'repositories';

  return (
    <AppShell navbar={{ width: 280, breakpoint: 'sm' }} padding="lg">
      <LoadingOverlay visible={app.busy} overlayProps={{ radius: 'sm', blur: 1 }} />
      <AppSidebar
        colorScheme={app.colorScheme}
        setColorScheme={app.setColorScheme}
        projects={app.projects}
        selectedProject={app.selectedProject}
        selectedProjectId={app.selectedProjectId}
        setSelectedProjectId={app.setSelectedProjectId}
        status={app.status}
        navItems={app.navItems}
        view={app.view}
        navigate={app.navigate}
      />

      <AppShell.Main>
        <Stack gap="lg">
          {showPageHeader && <PageHeader title={app.pageTitles[app.view]} description={app.pageCopy[app.view]} />}
          {app.busy && <Progress value={38} animated color="emerald" aria-label="Working" />}
          {app.error && <Alert color="red" icon={<AlertCircle size={18} />}>{app.error}</Alert>}
          <ActivePage app={app} />
        </Stack>
      </AppShell.Main>
    </AppShell>
  );
}

function ActivePage({ app }: { app: RageKhabAppModel }) {
  if (app.view === 'home') return <HomePage app={app} />;
  if (app.view === 'repositories') return <RepositoriesPage app={app} />;
  if (app.view === 'workspaces') return <WorkspacesPage app={app} />;
  if (app.view === 'memories') return <MemoriesPage app={app} />;
  if (app.view === 'knowledge') return <KnowledgePage app={app} />;
  if (app.view === 'safeDebug') return <SafeDebugPage app={app} />;
  if (app.view === 'optimizer') return <OptimizerPage app={app} />;
  if (app.view === 'chat') return <ChatPage app={app} />;
  return <SettingsPage app={app} />;
}
