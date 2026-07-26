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
import { AlertCircle, Archive, Brain, CheckCircle2, Clipboard, Clock3, Copy, FilePlus2, FileText, FolderPlus, KeyRound, Layers, Plus, RefreshCw, Search, Send, ShieldCheck, Sparkles, Trash2, Upload } from 'lucide-react';
import { SafeDebugArtifactsPanel } from '../../SafeDebugArtifactsPanel';
import type { RageKhabAppModel } from '../../useRageKhabAppModel';
import { contextBudgetProfileOptions, contextBudgetProfiles, CUSTOM_MODEL, DISABLED_MODEL, chatModelOptions, compressionModelOptions, embeddingModelOptions, formatBytes, memoryBadgeColor, memoryLabels, memoryTypes, selectValue, taskTemplates } from '../../../appSupport';

export function renderMemoriesPage(app: RageKhabAppModel) {
  const { view, setView, ingestMode, setIngestMode, uploadFile, setUploadFile, projects, setProjects, selectedProjectId, setSelectedProjectId, projectName, setProjectName, textTitle, setTextTitle, textBody, setTextBody, documents, setDocuments, memories, setMemories, allMemories, setAllMemories, repositoryStatus, setRepositoryStatus, repositories, setRepositories, projectRepositories, setProjectRepositories, workspaceHealth, setWorkspaceHealth, agentActivities, setAgentActivities, debugSessions, setDebugSessions, activeDebugSessionId, setActiveDebugSessionId, debugDetail, setDebugDetail, debugTitle, setDebugTitle, debugRawText, setDebugRawText, debugInputType, setDebugInputType, debugSanitizerMode, setDebugSanitizerMode, debugSourceName, setDebugSourceName, debugDataRequestId, setDebugDataRequestId, debugSanitizedText, setDebugSanitizedText, debugWarnings, setDebugWarnings, debugArtifactSliceStart, setDebugArtifactSliceStart, debugArtifactSliceEnd, setDebugArtifactSliceEnd, debugArtifactSlice, setDebugArtifactSlice, debugCompareLeftId, setDebugCompareLeftId, debugCompareRightId, setDebugCompareRightId, debugArtifactComparison, setDebugArtifactComparison, debugTokenQuery, setDebugTokenQuery, debugResolvedToken, setDebugResolvedToken, debugTokenSearch, setDebugTokenSearch, agentRequestDraft, setAgentRequestDraft, repositoryToLink, setRepositoryToLink, deleteRepositoryKnowledge, setDeleteRepositoryKnowledge, memoryFilter, setMemoryFilter, memorySearch, setMemorySearch, memoryPage, setMemoryPage, memoryPageSize, setMemoryPageSize, expandedMemoryIds, repositoryFilePage, setRepositoryFilePage, repositoryFilePageSize, setRepositoryFilePageSize, memoryTypeDraft, setMemoryTypeDraft, memoryContentDraft, setMemoryContentDraft, memoryRepositoryDraft, setMemoryRepositoryDraft, memoryToLink, setMemoryToLink, debugMemoryTypeDraft, setDebugMemoryTypeDraft, debugMemoryContentDraft, setDebugMemoryContentDraft, debugMemoryRepositoryDraft, setDebugMemoryRepositoryDraft, debugMemoryModuleDraft, setDebugMemoryModuleDraft, debugMemoryConfidenceDraft, setDebugMemoryConfidenceDraft, status, setStatus, settingsDraft, setSettingsDraft, question, setQuestion, task, setTask, selectedTaskTemplate, setSelectedTaskTemplate, optimizerTokenBudget, setOptimizerTokenBudget, optimizerBudgetProfile, setOptimizerBudgetProfile, optimizedContext, setOptimizedContext, history, setHistory, activeSource, setActiveSource, busy, setBusy, error, setError, colorScheme, setColorScheme, selectedProject, showToast, reportError, navigate, refresh, totalChunks, tokenSavings, lastSync, linkedRepositoryIds, discoveredFiles, repositoryFilePageCount, normalizedRepositoryFilePage, repositoryFilePageStart, pagedRepositoryFiles, repositoryFileRangeStart, repositoryFileRangeEnd, sortedDebugSessions, activeDebugSession, activeWorkspaceHealth, workspaceHealthColor, workspaceHealthTitle, currentBudgetProfile, stats, navItems, suggestedQuestions, memoryCounts, filteredMemories, memoryPageCount, normalizedMemoryPage, memoryPageStart, pagedMemories, memoryRangeStart, memoryRangeEnd, staleMemoryCount, toggleMemoryExpanded, recentActivity, upload, addText, ask, applyTaskTemplate, optimizeContext, deleteDocument, reindex, createProject, deleteProject, deleteMemory, rememberMemory, linkMemoryToProject, unlinkMemoryFromProject, saveSettings, linkRepositoryToProject, unlinkRepositoryFromProject, deleteRepository, createDebugSession, openDebugSession, archiveDebugSession, sanitizeDebugData, resolveDebugToken, recordAgentRequest, promoteDebugMemory, applyDebugMemorySuggestion, updateDebugDataRequest, copyDebugText, expandDebugArtifactSlice, compareDebugArtifacts, filteredDebugMappings, pendingDebugRequests, debugMemorySuggestions, latestDebugArtifact, latestDebugText, debugArtifactOptions, tokenMappingFor, artifactTextFor, suggestedSqlFor, activeSafeDebugInstruction, pageCopy, pageTitles, preWrapStyle, wideGridItemStyle } = app;
  return (
          <Stack component="section" gap="md">
            <Paper p="lg" radius="sm" withBorder>
              <Stack gap="md">
                <Stack gap={4}>
                  <Title order={2} size="h3">{filteredMemories.length} memories</Title>
                  <Text c="dimmed">{selectedProject?.name ?? 'General'} workspace · search decisions, conventions, fixes, and patterns.</Text>
                </Stack>
              {staleMemoryCount > 0 && (
                <Alert color="yellow" variant="light" icon={<AlertCircle size={18} />}>
                  {staleMemoryCount} memories may need review because related repository files changed after they were saved.
                </Alert>
              )}
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
                  <Badge color="emerald" variant="light">Scope: {selectedProject?.name ?? 'selected workspace'}</Badge>
                </Stack>
                <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
                  <Select
                    value={memoryTypeDraft}
                    onChange={(value) => setMemoryTypeDraft(value ?? 'CodingConvention')}
                    data={memoryTypes.map((type) => ({ value: type, label: memoryLabels[type] ?? type }))}
                  />
                  <TextInput value={memoryRepositoryDraft} onChange={(event) => setMemoryRepositoryDraft(event.currentTarget.value)} placeholder="repository optional" />
                  <Textarea
                    style={{ gridColumn: '1 / -1' }}
                    value={memoryContentDraft}
                    onChange={(event) => setMemoryContentDraft(event.currentTarget.value)}
                    placeholder="Store one concise, reusable lesson. Do not paste files or implementation details."
                    description={`${memoryContentDraft.length}/600 characters`}
                    maxLength={600}
                    autosize
                    minRows={3}
                  />
                  <Button onClick={rememberMemory} disabled={busy || !memoryContentDraft.trim() || !selectedProjectId}>Remember</Button>
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
                <Button variant="light" color="emerald" onClick={linkMemoryToProject} disabled={busy || !memoryToLink}>Link</Button>
              </Group>
            </Paper>

            <SimpleGrid cols={{ base: 1, sm: 2, lg: 3, xl: 4 }} spacing="md">
              {pagedMemories.map((memory) => {
                const expanded = Boolean(expandedMemoryIds[memory.id]);
                const canExpand = memory.content.length > 220 || memory.content.split('\n').length > 4;
                return (
                <Paper component={Stack} gap="sm" key={memory.id} p="md" radius="sm" miw={0} withBorder>
                  <Group justify="space-between" align="flex-start">
                    <Group gap="xs">
                      <Badge color={memoryBadgeColor(memory.type)} variant="light">{memoryLabels[memory.type] ?? memory.type}</Badge>
                      {memory.freshness?.status === 'stale' && <Badge color="yellow" variant="light">Review</Badge>}
                    </Group>
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
                  <Stack gap={4} miw={0}>
                    <Text
                      lineClamp={expanded ? undefined : 4}
                      style={{ overflowWrap: 'anywhere', wordBreak: 'break-word' }}
                    >
                      {memory.content}
                    </Text>
                    {canExpand && (
                      <Button
                        variant="subtle"
                        color="emerald"
                        size="compact-sm"
                        onClick={() => toggleMemoryExpanded(memory.id)}
                        style={{ alignSelf: 'flex-start' }}
                      >
                        {expanded ? 'Show less' : 'Read more'}
                      </Button>
                    )}
                  </Stack>
                  <Group gap="xs">
                    <Badge color="gray" variant="light">{Math.round(memory.confidence * 100)}% confidence</Badge>
                    <Badge
                      color="gray"
                      variant="outline"
                      maw="100%"
                      h="auto"
                      style={{ whiteSpace: 'normal', overflowWrap: 'anywhere', wordBreak: 'break-word' }}
                    >
                      {memory.repository ?? 'global'}
                    </Badge>
                  </Group>
                  {memory.freshness?.status === 'stale' && (
                    <Alert color="yellow" variant="light" icon={<Clock3 size={16} />}>
                      <Stack gap={4}>
                        <Text size="sm">{memory.freshness.reason ?? 'Related repository files changed after this memory was saved.'}</Text>
                        {memory.freshness.changedFiles.length > 0 && (
                          <Text
                            size="xs"
                            ff="monospace"
                            style={{ overflowWrap: 'anywhere', wordBreak: 'break-word' }}
                          >
                            {memory.freshness.changedFiles.slice(0, 3).join(', ')}
                          </Text>
                        )}
                      </Stack>
                    </Alert>
                  )}
                </Paper>
                );
              })}
              {filteredMemories.length === 0 && (
                <Paper p="md" radius="sm" withBorder>
                  <Text fw={700}>No memories in this view</Text>
                  <Text size="sm" c="dimmed">Use the MCP `remember` tool to store architecture decisions, conventions, bug fixes, patterns, and workspace knowledge.</Text>
                </Paper>
              )}
            </SimpleGrid>
          </Stack>
        
  );
}
