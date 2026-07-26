import {
  Alert,
  ActionIcon,
  Badge,
  Box,
  Button,
  Checkbox,
  FileInput,
  Group,
  Menu,
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
} from '@mantine/core';
import { AlertCircle, Archive, Brain, CheckCircle2, Clipboard, Copy, FilePlus2, FileText, FolderPlus, KeyRound, Layers, Plus, RefreshCw, Search, Send, ShieldCheck, Sparkles, Trash2, Upload } from 'lucide-react';
import { SafeDebugArtifactsPanel } from '../../SafeDebugArtifactsPanel';
import type { RageKhabAppModel } from '../../useRageKhabAppModel';
import { contextBudgetProfileOptions, contextBudgetProfiles, CUSTOM_MODEL, DISABLED_MODEL, chatModelOptions, compressionModelOptions, embeddingModelOptions, formatBytes, memoryBadgeColor, memoryLabels, memoryTypes, selectValue, taskTemplates } from '../../../appSupport';

export function renderWorkspacesPage(app: RageKhabAppModel) {
  const { view, setView, ingestMode, setIngestMode, uploadFile, setUploadFile, projects, setProjects, selectedProjectId, setSelectedProjectId, projectName, setProjectName, textTitle, setTextTitle, textBody, setTextBody, documents, setDocuments, memories, setMemories, allMemories, setAllMemories, repositoryStatus, setRepositoryStatus, repositories, setRepositories, projectRepositories, setProjectRepositories, workspaceHealth, setWorkspaceHealth, agentActivities, setAgentActivities, debugSessions, setDebugSessions, activeDebugSessionId, setActiveDebugSessionId, debugDetail, setDebugDetail, debugTitle, setDebugTitle, debugRawText, setDebugRawText, debugInputType, setDebugInputType, debugSanitizerMode, setDebugSanitizerMode, debugSourceName, setDebugSourceName, debugDataRequestId, setDebugDataRequestId, debugSanitizedText, setDebugSanitizedText, debugWarnings, setDebugWarnings, debugArtifactSliceStart, setDebugArtifactSliceStart, debugArtifactSliceEnd, setDebugArtifactSliceEnd, debugArtifactSlice, setDebugArtifactSlice, debugCompareLeftId, setDebugCompareLeftId, debugCompareRightId, setDebugCompareRightId, debugArtifactComparison, setDebugArtifactComparison, debugTokenQuery, setDebugTokenQuery, debugResolvedToken, setDebugResolvedToken, debugTokenSearch, setDebugTokenSearch, agentRequestDraft, setAgentRequestDraft, repositoryToLink, setRepositoryToLink, deleteRepositoryKnowledge, setDeleteRepositoryKnowledge, memoryFilter, setMemoryFilter, memorySearch, setMemorySearch, memoryPage, setMemoryPage, memoryPageSize, setMemoryPageSize, repositoryFilePage, setRepositoryFilePage, repositoryFilePageSize, setRepositoryFilePageSize, memoryTypeDraft, setMemoryTypeDraft, memoryContentDraft, setMemoryContentDraft, memoryRepositoryDraft, setMemoryRepositoryDraft, memoryToLink, setMemoryToLink, debugMemoryTypeDraft, setDebugMemoryTypeDraft, debugMemoryContentDraft, setDebugMemoryContentDraft, debugMemoryRepositoryDraft, setDebugMemoryRepositoryDraft, debugMemoryModuleDraft, setDebugMemoryModuleDraft, debugMemoryConfidenceDraft, setDebugMemoryConfidenceDraft, status, setStatus, settingsDraft, setSettingsDraft, question, setQuestion, task, setTask, selectedTaskTemplate, setSelectedTaskTemplate, optimizerTokenBudget, setOptimizerTokenBudget, optimizerBudgetProfile, setOptimizerBudgetProfile, optimizedContext, setOptimizedContext, history, setHistory, activeSource, setActiveSource, busy, setBusy, error, setError, colorScheme, setColorScheme, selectedProject, showToast, reportError, navigate, refresh, totalChunks, tokenSavings, lastSync, linkedRepositoryIds, discoveredFiles, repositoryFilePageCount, normalizedRepositoryFilePage, repositoryFilePageStart, pagedRepositoryFiles, repositoryFileRangeStart, repositoryFileRangeEnd, sortedDebugSessions, activeDebugSession, activeWorkspaceHealth, workspaceHealthColor, workspaceHealthTitle, currentBudgetProfile, stats, navItems, suggestedQuestions, memoryCounts, filteredMemories, memoryPageCount, normalizedMemoryPage, memoryPageStart, pagedMemories, memoryRangeStart, memoryRangeEnd, staleMemoryCount, recentActivity, upload, addText, ask, applyTaskTemplate, optimizeContext, deleteDocument, reindex, createProject, deleteProject, deleteMemory, rememberMemory, linkMemoryToProject, unlinkMemoryFromProject, saveSettings, linkRepositoryToProject, unlinkRepositoryFromProject, deleteRepository, createDebugSession, openDebugSession, archiveDebugSession, sanitizeDebugData, resolveDebugToken, recordAgentRequest, promoteDebugMemory, applyDebugMemorySuggestion, updateDebugDataRequest, copyDebugText, expandDebugArtifactSlice, compareDebugArtifacts, filteredDebugMappings, pendingDebugRequests, debugMemorySuggestions, latestDebugArtifact, latestDebugText, debugArtifactOptions, tokenMappingFor, artifactTextFor, suggestedSqlFor, activeSafeDebugInstruction, pageCopy, pageTitles, preWrapStyle, wideGridItemStyle } = app;
  return (
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
                      bg={selected ? (colorScheme === 'dark' ? 'emerald.8' : 'emerald.0') : undefined}
                      c={selected && colorScheme === 'dark' ? 'white' : undefined}
                      style={selected ? { borderColor: colorScheme === 'dark' ? 'var(--mantine-color-emerald-4)' : 'var(--mantine-color-emerald-5)' } : undefined}
                    >
                      <Group justify="space-between" align="flex-start" gap="sm">
                        <Stack gap={2} miw={0}>
                          <Text fw={700}>{project.name}</Text>
                          <Group gap="xs">
                            <Text fw={700}>{project.documentCount}</Text>
                            <Text size="sm" c={selected && colorScheme === 'dark' ? 'emerald.1' : 'dimmed'}>created {new Date(project.createdAt).toLocaleDateString()}</Text>
                          </Group>
                        </Stack>
                        {selected && <Badge color="emerald" variant={colorScheme === 'dark' ? 'filled' : 'light'}>Selected</Badge>}
                      </Group>
                      <Group gap="sm">
                        <Button variant={selected ? 'filled' : 'subtle'} color={selected ? 'emerald' : 'gray'} onClick={() => setSelectedProjectId(project.id)} disabled={busy || selected}>
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
        
  );
}
