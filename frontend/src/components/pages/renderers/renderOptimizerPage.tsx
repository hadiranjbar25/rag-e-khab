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

export function renderOptimizerPage(app: RageKhabAppModel) {
  const { view, setView, ingestMode, setIngestMode, uploadFile, setUploadFile, projects, setProjects, selectedProjectId, setSelectedProjectId, projectName, setProjectName, textTitle, setTextTitle, textBody, setTextBody, documents, setDocuments, memories, setMemories, allMemories, setAllMemories, repositoryStatus, setRepositoryStatus, repositories, setRepositories, projectRepositories, setProjectRepositories, workspaceHealth, setWorkspaceHealth, agentActivities, setAgentActivities, debugSessions, setDebugSessions, activeDebugSessionId, setActiveDebugSessionId, debugDetail, setDebugDetail, debugTitle, setDebugTitle, debugRawText, setDebugRawText, debugInputType, setDebugInputType, debugSanitizerMode, setDebugSanitizerMode, debugSourceName, setDebugSourceName, debugDataRequestId, setDebugDataRequestId, debugSanitizedText, setDebugSanitizedText, debugWarnings, setDebugWarnings, debugArtifactSliceStart, setDebugArtifactSliceStart, debugArtifactSliceEnd, setDebugArtifactSliceEnd, debugArtifactSlice, setDebugArtifactSlice, debugCompareLeftId, setDebugCompareLeftId, debugCompareRightId, setDebugCompareRightId, debugArtifactComparison, setDebugArtifactComparison, debugTokenQuery, setDebugTokenQuery, debugResolvedToken, setDebugResolvedToken, debugTokenSearch, setDebugTokenSearch, agentRequestDraft, setAgentRequestDraft, repositoryToLink, setRepositoryToLink, deleteRepositoryKnowledge, setDeleteRepositoryKnowledge, memoryFilter, setMemoryFilter, memorySearch, setMemorySearch, memoryPage, setMemoryPage, memoryPageSize, setMemoryPageSize, repositoryFilePage, setRepositoryFilePage, repositoryFilePageSize, setRepositoryFilePageSize, memoryTypeDraft, setMemoryTypeDraft, memoryContentDraft, setMemoryContentDraft, memoryRepositoryDraft, setMemoryRepositoryDraft, memoryToLink, setMemoryToLink, debugMemoryTypeDraft, setDebugMemoryTypeDraft, debugMemoryContentDraft, setDebugMemoryContentDraft, debugMemoryRepositoryDraft, setDebugMemoryRepositoryDraft, debugMemoryModuleDraft, setDebugMemoryModuleDraft, debugMemoryConfidenceDraft, setDebugMemoryConfidenceDraft, status, setStatus, settingsDraft, setSettingsDraft, question, setQuestion, task, setTask, selectedTaskTemplate, setSelectedTaskTemplate, optimizerTokenBudget, setOptimizerTokenBudget, optimizerBudgetProfile, setOptimizerBudgetProfile, optimizedContext, setOptimizedContext, history, setHistory, activeSource, setActiveSource, busy, setBusy, error, setError, colorScheme, setColorScheme, selectedProject, showToast, reportError, navigate, refresh, totalChunks, tokenSavings, lastSync, linkedRepositoryIds, discoveredFiles, repositoryFilePageCount, normalizedRepositoryFilePage, repositoryFilePageStart, pagedRepositoryFiles, repositoryFileRangeStart, repositoryFileRangeEnd, sortedDebugSessions, activeDebugSession, activeWorkspaceHealth, workspaceHealthColor, workspaceHealthTitle, currentBudgetProfile, stats, navItems, suggestedQuestions, memoryCounts, filteredMemories, memoryPageCount, normalizedMemoryPage, memoryPageStart, pagedMemories, memoryRangeStart, memoryRangeEnd, staleMemoryCount, recentActivity, upload, addText, ask, applyTaskTemplate, optimizeContext, deleteDocument, reindex, createProject, deleteProject, deleteMemory, rememberMemory, linkMemoryToProject, unlinkMemoryFromProject, saveSettings, linkRepositoryToProject, unlinkRepositoryFromProject, deleteRepository, createDebugSession, openDebugSession, archiveDebugSession, sanitizeDebugData, resolveDebugToken, recordAgentRequest, promoteDebugMemory, applyDebugMemorySuggestion, updateDebugDataRequest, copyDebugText, expandDebugArtifactSlice, compareDebugArtifacts, filteredDebugMappings, pendingDebugRequests, debugMemorySuggestions, latestDebugArtifact, latestDebugText, debugArtifactOptions, tokenMappingFor, artifactTextFor, suggestedSqlFor, activeSafeDebugInstruction, pageCopy, pageTitles, preWrapStyle, wideGridItemStyle } = app;
  return (
          <SimpleGrid component="section" cols={{ base: 1, md: 2 }} spacing="lg">
            <Paper component={Stack} gap="md" p="md" radius="sm" withBorder>
              <Group justify="space-between" align="flex-start">
                <Stack gap={4}>
                  <Text size="xs" fw={700} tt="uppercase" c="emerald">MCP tool: optimize_context</Text>
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
              <Stack gap="xs">
                <SegmentedControl
                  value={optimizerBudgetProfile}
                  onChange={(value) => {
                    setOptimizerBudgetProfile(value);
                    const profile = contextBudgetProfiles.find((item) => item.value === value);
                    if (profile) setOptimizerTokenBudget(profile.maxTokens);
                  }}
                  data={[
                    ...contextBudgetProfileOptions,
                    { value: 'custom', label: 'Custom' },
                  ]}
                />
                <Text size="sm" c="dimmed">{currentBudgetProfile?.description ?? 'Use a custom token budget for this run.'}</Text>
              </Stack>
              <Group align="end" gap="sm">
                <NumberInput
                  label="Token budget"
                  min={300}
                  max={8000}
                  step={500}
                  value={optimizerTokenBudget}
                  onChange={(value) => {
                    setOptimizerBudgetProfile('custom');
                    setOptimizerTokenBudget(Number(value) || 300);
                  }}
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
                  <Text fw={700}>{settingsDraft?.optimizer.budgetProfile ?? 'standard'} · {settingsDraft?.optimizer.maxTokens ?? 3000} tokens</Text>
                </Box>
              </SimpleGrid>
            </Paper>

            <Paper component={Stack} gap="md" p="md" radius="sm" withBorder>
              {optimizedContext ? (
                <>
                  <SimpleGrid cols={{ base: 1, sm: 4 }} spacing="sm">
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
                    <Box>
                      <Text size="xs" fw={700} tt="uppercase" c="dimmed">Budget</Text>
                      <Text fw={700}>{optimizedContext.budgetProfile ?? optimizerBudgetProfile}</Text>
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
                        <Badge color="emerald" variant="light">{optimizedContext.preview?.length} selected</Badge>
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
                                {item.compressed && <Badge color="emerald" variant="light">Compressed</Badge>}
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
        
  );
}
