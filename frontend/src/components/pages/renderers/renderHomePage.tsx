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
} from '@mantine/core';
import { AlertCircle, Archive, Brain, CheckCircle2, Clipboard, Clock3, Copy, FilePlus2, FileText, FolderPlus, KeyRound, Layers, Plus, RefreshCw, Search, Send, ShieldCheck, Sparkles, Trash2, Upload } from 'lucide-react';
import { SafeDebugArtifactsPanel } from '../../SafeDebugArtifactsPanel';
import type { RageKhabAppModel } from '../../useRageKhabAppModel';
import { contextBudgetProfileOptions, contextBudgetProfiles, CUSTOM_MODEL, DISABLED_MODEL, chatModelOptions, compressionModelOptions, embeddingModelOptions, formatBytes, memoryBadgeColor, memoryLabels, memoryTypes, selectValue, taskTemplates } from '../../../appSupport';

export function renderHomePage(app: RageKhabAppModel) {
  const { view, setView, ingestMode, setIngestMode, uploadFile, setUploadFile, projects, setProjects, selectedProjectId, setSelectedProjectId, projectName, setProjectName, textTitle, setTextTitle, textBody, setTextBody, documents, setDocuments, memories, setMemories, allMemories, setAllMemories, repositoryStatus, setRepositoryStatus, repositories, setRepositories, projectRepositories, setProjectRepositories, workspaceHealth, setWorkspaceHealth, agentActivities, setAgentActivities, debugSessions, setDebugSessions, activeDebugSessionId, setActiveDebugSessionId, debugDetail, setDebugDetail, debugTitle, setDebugTitle, debugRawText, setDebugRawText, debugInputType, setDebugInputType, debugSanitizerMode, setDebugSanitizerMode, debugSourceName, setDebugSourceName, debugDataRequestId, setDebugDataRequestId, debugSanitizedText, setDebugSanitizedText, debugWarnings, setDebugWarnings, debugArtifactSliceStart, setDebugArtifactSliceStart, debugArtifactSliceEnd, setDebugArtifactSliceEnd, debugArtifactSlice, setDebugArtifactSlice, debugCompareLeftId, setDebugCompareLeftId, debugCompareRightId, setDebugCompareRightId, debugArtifactComparison, setDebugArtifactComparison, debugTokenQuery, setDebugTokenQuery, debugResolvedToken, setDebugResolvedToken, debugTokenSearch, setDebugTokenSearch, agentRequestDraft, setAgentRequestDraft, repositoryToLink, setRepositoryToLink, deleteRepositoryKnowledge, setDeleteRepositoryKnowledge, memoryFilter, setMemoryFilter, memorySearch, setMemorySearch, memoryPage, setMemoryPage, memoryPageSize, setMemoryPageSize, repositoryFilePage, setRepositoryFilePage, repositoryFilePageSize, setRepositoryFilePageSize, memoryTypeDraft, setMemoryTypeDraft, memoryContentDraft, setMemoryContentDraft, memoryRepositoryDraft, setMemoryRepositoryDraft, memoryToLink, setMemoryToLink, debugMemoryTypeDraft, setDebugMemoryTypeDraft, debugMemoryContentDraft, setDebugMemoryContentDraft, debugMemoryRepositoryDraft, setDebugMemoryRepositoryDraft, debugMemoryModuleDraft, setDebugMemoryModuleDraft, debugMemoryConfidenceDraft, setDebugMemoryConfidenceDraft, status, setStatus, settingsDraft, setSettingsDraft, question, setQuestion, task, setTask, selectedTaskTemplate, setSelectedTaskTemplate, optimizerTokenBudget, setOptimizerTokenBudget, optimizerBudgetProfile, setOptimizerBudgetProfile, optimizedContext, setOptimizedContext, history, setHistory, activeSource, setActiveSource, busy, setBusy, error, setError, colorScheme, setColorScheme, selectedProject, showToast, reportError, navigate, refresh, totalChunks, tokenSavings, lastSync, linkedRepositoryIds, discoveredFiles, repositoryFilePageCount, normalizedRepositoryFilePage, repositoryFilePageStart, pagedRepositoryFiles, repositoryFileRangeStart, repositoryFileRangeEnd, sortedDebugSessions, activeDebugSession, activeWorkspaceHealth, workspaceHealthColor, workspaceHealthTitle, currentBudgetProfile, stats, navItems, suggestedQuestions, memoryCounts, filteredMemories, memoryPageCount, normalizedMemoryPage, memoryPageStart, pagedMemories, memoryRangeStart, memoryRangeEnd, staleMemoryCount, recentActivity, upload, addText, ask, applyTaskTemplate, optimizeContext, deleteDocument, reindex, createProject, deleteProject, deleteMemory, rememberMemory, linkMemoryToProject, unlinkMemoryFromProject, saveSettings, linkRepositoryToProject, unlinkRepositoryFromProject, deleteRepository, createDebugSession, openDebugSession, archiveDebugSession, sanitizeDebugData, resolveDebugToken, recordAgentRequest, promoteDebugMemory, applyDebugMemorySuggestion, updateDebugDataRequest, copyDebugText, expandDebugArtifactSlice, compareDebugArtifacts, filteredDebugMappings, pendingDebugRequests, debugMemorySuggestions, latestDebugArtifact, latestDebugText, debugArtifactOptions, tokenMappingFor, artifactTextFor, suggestedSqlFor, activeSafeDebugInstruction, pageCopy, pageTitles, preWrapStyle, wideGridItemStyle } = app;
  return (
          <Stack component="section" gap="md">
            <Paper p="md" radius="sm" withBorder>
              <Stack gap="md">
                <Group justify="space-between" align="flex-start">
                  <Stack gap={4}>
                    <Text size="xs" fw={700} tt="uppercase" c="emerald">Workspace health</Text>
                    <Title order={2} size="h3">{workspaceHealthTitle}</Title>
                    <Text c="dimmed">{activeWorkspaceHealth?.summary ?? `${projectRepositories.length} repositories, ${memories.length} memories, ${totalChunks} source units available in this workspace.`}</Text>
                  </Stack>
                  <ThemeIcon variant="light" color={workspaceHealthColor} size={54} radius="sm">
                    <Text fw={800}>{activeWorkspaceHealth?.score ?? 0}</Text>
                  </ThemeIcon>
                </Group>
                <Progress value={activeWorkspaceHealth?.score ?? 0} color={workspaceHealthColor} radius="sm" />
                {activeWorkspaceHealth && (
                  <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="sm">
                    {activeWorkspaceHealth.checks.map((check) => (
                      <Paper component={Stack} gap={4} key={check.name} p="sm" radius="sm" withBorder>
                        <Badge color={check.status === 'ready' ? 'emerald' : check.status === 'review' ? 'yellow' : 'gray'} variant="light">{check.status}</Badge>
                        <Text fw={700}>{check.name}</Text>
                        <Text size="xs" c="dimmed">{check.detail}</Text>
                      </Paper>
                    ))}
                  </SimpleGrid>
                )}
              </Stack>
            </Paper>

            <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="md">
              {stats.map((item) => {
                const Icon = item.icon;
                return (
                <Paper component={Stack} gap={6} key={item.label} p="md" radius="sm" withBorder>
                  <ThemeIcon variant="light" color={item.tone === 'emerald' ? 'emerald' : item.tone === 'purple' ? 'violet' : 'emerald'} size={32} radius="sm"><Icon size={18} /></ThemeIcon>
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
                  <Badge color="emerald" variant="light" leftSection={<CheckCircle2 size={14} />}>operational</Badge>
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
                      <ThemeIcon variant="light" color={item.tone === 'emerald' ? 'emerald' : item.tone === 'purple' ? 'violet' : item.tone === 'red' ? 'red' : 'emerald'} size={32} radius="sm"><Icon size={16} /></ThemeIcon>
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
        
  );
}
