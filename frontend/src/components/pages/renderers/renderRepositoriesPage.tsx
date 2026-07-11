import {
  Alert,
  ActionIcon,
  Badge,
  Box,
  Button,
  Checkbox,
  Collapse,
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
import { AlertCircle, Archive, Brain, CheckCircle2, ChevronDown, ChevronRight, Clipboard, Copy, FilePlus2, FileText, FolderPlus, KeyRound, Layers, MoreHorizontal, Plus, RefreshCw, Search, Send, ShieldCheck, Sparkles, Trash2, Upload } from 'lucide-react';
import { SafeDebugArtifactsPanel } from '../../SafeDebugArtifactsPanel';
import type { RageKhabAppModel } from '../../useRageKhabAppModel';
import { contextBudgetProfileOptions, contextBudgetProfiles, CUSTOM_MODEL, DISABLED_MODEL, chatModelOptions, compressionModelOptions, embeddingModelOptions, formatBytes, memoryBadgeColor, memoryLabels, memoryTypes, selectValue, taskTemplates } from '../../../appSupport';

export function renderRepositoriesPage(app: RageKhabAppModel) {
  const { view, setView, ingestMode, setIngestMode, uploadFile, setUploadFile, projects, setProjects, selectedProjectId, setSelectedProjectId, projectName, setProjectName, textTitle, setTextTitle, textBody, setTextBody, documents, setDocuments, memories, setMemories, allMemories, setAllMemories, repositoryStatus, setRepositoryStatus, repositories, setRepositories, projectRepositories, setProjectRepositories, workspaceHealth, setWorkspaceHealth, agentActivities, setAgentActivities, debugSessions, setDebugSessions, activeDebugSessionId, setActiveDebugSessionId, debugDetail, setDebugDetail, debugTitle, setDebugTitle, debugRawText, setDebugRawText, debugInputType, setDebugInputType, debugSanitizerMode, setDebugSanitizerMode, debugSourceName, setDebugSourceName, debugDataRequestId, setDebugDataRequestId, debugSanitizedText, setDebugSanitizedText, debugWarnings, setDebugWarnings, debugArtifactSliceStart, setDebugArtifactSliceStart, debugArtifactSliceEnd, setDebugArtifactSliceEnd, debugArtifactSlice, setDebugArtifactSlice, debugCompareLeftId, setDebugCompareLeftId, debugCompareRightId, setDebugCompareRightId, debugArtifactComparison, setDebugArtifactComparison, debugTokenQuery, setDebugTokenQuery, debugResolvedToken, setDebugResolvedToken, debugTokenSearch, setDebugTokenSearch, agentRequestDraft, setAgentRequestDraft, repositoryToLink, setRepositoryToLink, repositorySearch, setRepositorySearch, repositoryPage, setRepositoryPage, repositoryPageSize, setRepositoryPageSize, repositoryFilesExpanded, setRepositoryFilesExpanded, deleteRepositoryKnowledge, setDeleteRepositoryKnowledge, memoryFilter, setMemoryFilter, memorySearch, setMemorySearch, memoryPage, setMemoryPage, memoryPageSize, setMemoryPageSize, repositoryFilePage, setRepositoryFilePage, repositoryFilePageSize, setRepositoryFilePageSize, memoryTypeDraft, setMemoryTypeDraft, memoryContentDraft, setMemoryContentDraft, memoryRepositoryDraft, setMemoryRepositoryDraft, memoryToLink, setMemoryToLink, debugMemoryTypeDraft, setDebugMemoryTypeDraft, debugMemoryContentDraft, setDebugMemoryContentDraft, debugMemoryRepositoryDraft, setDebugMemoryRepositoryDraft, debugMemoryModuleDraft, setDebugMemoryModuleDraft, debugMemoryConfidenceDraft, setDebugMemoryConfidenceDraft, status, setStatus, settingsDraft, setSettingsDraft, question, setQuestion, task, setTask, selectedTaskTemplate, setSelectedTaskTemplate, optimizerTokenBudget, setOptimizerTokenBudget, optimizerBudgetProfile, setOptimizerBudgetProfile, optimizedContext, setOptimizedContext, history, setHistory, activeSource, setActiveSource, busy, setBusy, error, setError, colorScheme, setColorScheme, selectedProject, showToast, reportError, navigate, refresh, totalChunks, tokenSavings, lastSync, linkedRepositoryIds, repositoryCards, filteredRepositories, repositoryPageCount, normalizedRepositoryPage, repositoryPageStart, pagedRepositories, repositoryRangeStart, repositoryRangeEnd, discoveredFiles, repositoryFilePageCount, normalizedRepositoryFilePage, repositoryFilePageStart, pagedRepositoryFiles, repositoryFileRangeStart, repositoryFileRangeEnd, sortedDebugSessions, activeDebugSession, activeWorkspaceHealth, workspaceHealthColor, workspaceHealthTitle, currentBudgetProfile, stats, navItems, suggestedQuestions, memoryCounts, filteredMemories, memoryPageCount, normalizedMemoryPage, memoryPageStart, pagedMemories, memoryRangeStart, memoryRangeEnd, staleMemoryCount, recentActivity, upload, addText, ask, applyTaskTemplate, optimizeContext, deleteDocument, reindex, createProject, deleteProject, deleteMemory, rememberMemory, linkMemoryToProject, unlinkMemoryFromProject, saveSettings, linkRepositoryToProject, unlinkRepositoryFromProject, deleteRepository, createDebugSession, openDebugSession, archiveDebugSession, sanitizeDebugData, resolveDebugToken, recordAgentRequest, promoteDebugMemory, applyDebugMemorySuggestion, updateDebugDataRequest, copyDebugText, expandDebugArtifactSlice, compareDebugArtifacts, filteredDebugMappings, pendingDebugRequests, debugMemorySuggestions, latestDebugArtifact, latestDebugText, debugArtifactOptions, tokenMappingFor, artifactTextFor, suggestedSqlFor, activeSafeDebugInstruction, pageCopy, pageTitles, preWrapStyle, wideGridItemStyle } = app;
  return (
          <Stack component="section" gap="md">
            <Paper p="md" radius="sm" withBorder>
              <Stack gap="md">
                <Group justify="space-between" align="flex-start">
                  <Box flex={1} miw={320}>
                    <Title order={2} size="h3">{repositoryCards.length} repositories</Title>
                    <Text c="dimmed">Repositories are registered by local agents. Link them from each card when they should contribute knowledge and memories here. {repositoryStatus?.trackedFiles ?? 0} indexed files · last sync {lastSync ? new Date(lastSync).toLocaleString() : 'not available'}</Text>
                  </Box>
                  <Group gap="xs">
                    <Badge color="violet" variant="light">{projectRepositories.length} linked</Badge>
                    <Badge color="gray" variant="outline">{repositoryCards.length - projectRepositories.length} available</Badge>
                  </Group>
                </Group>
                <Group gap="sm" align="end">
                  <TextInput
                    value={repositorySearch}
                    onChange={(event) => setRepositorySearch(event.currentTarget.value)}
                    placeholder="Search repositories"
                    leftSection={<Search size={16} />}
                    flex={1}
                  />
                  <NativeSelect
                    value={`${repositoryPageSize}`}
                    onChange={(event) => setRepositoryPageSize(Number(event.currentTarget.value))}
                    aria-label="Repositories per page"
                    data={[
                      { value: '6', label: '6 / page' },
                      { value: '9', label: '9 / page' },
                      { value: '12', label: '12 / page' },
                    ]}
                  />
                </Group>
              </Stack>
            </Paper>

            <SimpleGrid cols={{ base: 1, md: 2, xl: 3 }} spacing="sm">
              {pagedRepositories.map((repo) => {
                const files = repositoryStatus?.files.filter((file) => file.repository === repo.name && !file.deleted) ?? [];
                const languages = [...new Set(files.map((file) => file.language).filter(Boolean))].slice(0, 4);
                const linked = linkedRepositoryIds.has(repo.id);
                const linkedMemories = memories.filter((memory) => memory.repository === repo.name).length;
                return (
                <Paper component="article" key={repo.id} p="sm" radius="sm" withBorder>
                  <Stack gap="xs">
                    <Group justify="space-between" align="flex-start" wrap="nowrap">
                      <Stack gap={2} miw={0}>
                        <Text fw={700} truncate>{repo.name}</Text>
                        <Text size="xs" c="dimmed" truncate>
                          Last sync {repo.lastSyncedAt ? new Date(repo.lastSyncedAt).toLocaleString() : 'not available'}
                        </Text>
                      </Stack>
                      <Group gap="xs" wrap="nowrap">
                        <Badge color={repo.status === 'synced' ? 'green' : 'gray'} variant="light" size="sm">{repo.status}</Badge>
                        <Menu shadow="md" width={210} position="bottom-end">
                          <Menu.Target>
                            <ActionIcon size="sm" variant="light" color="gray" aria-label="Repository actions">
                              <MoreHorizontal size={16} />
                            </ActionIcon>
                          </Menu.Target>
                          <Menu.Dropdown>
                            {linked ? (
                              <Menu.Item leftSection={<Archive size={16} />} onClick={() => unlinkRepositoryFromProject(repo.id)} disabled={busy}>
                                Remove from workspace
                              </Menu.Item>
                            ) : (
                              <Menu.Item color="teal" leftSection={<FolderPlus size={16} />} onClick={() => linkRepositoryToProject(repo.id)} disabled={busy}>
                                Link to workspace
                              </Menu.Item>
                            )}
                            <Menu.Item color="red" leftSection={<Trash2 size={16} />} onClick={() => deleteRepository(repo)} disabled={busy}>
                              Delete repository
                            </Menu.Item>
                          </Menu.Dropdown>
                        </Menu>
                      </Group>
                    </Group>

                    <Group gap="xs">
                      <Badge color={linked ? 'violet' : 'gray'} variant="outline" size="sm">{linked ? 'In workspace' : 'Not linked'}</Badge>
                      <Badge color="gray" variant="light" size="sm">{files.length} files</Badge>
                      <Badge color="gray" variant="light" size="sm">{linkedMemories} memories</Badge>
                    </Group>

                    <Text size="xs" c="dimmed">{(languages.length > 0 ? languages : [repo.language]).join(', ')}</Text>
                  </Stack>
                </Paper>
                );
              })}
              {repositoryCards.length === 0 && (
                <Paper p="md" radius="sm" withBorder>
                  <Text fw={700}>No repositories yet</Text>
                  <Text size="sm" c="dimmed">Run the RAG-e Khab agent from a codebase to register a repository, then link it to this workspace.</Text>
                </Paper>
              )}
              {repositoryCards.length > 0 && filteredRepositories.length === 0 && (
                <Paper p="md" radius="sm" withBorder>
                  <Text fw={700}>No repositories match</Text>
                  <Text size="sm" c="dimmed">Try a different repository name, path, language, or status.</Text>
                </Paper>
              )}
            </SimpleGrid>
            {filteredRepositories.length > 0 && (
              <Group justify="space-between" gap="sm">
                <Text size="sm" c="dimmed">
                  {repositoryRangeStart}-{repositoryRangeEnd} of {filteredRepositories.length}
                </Text>
                <Pagination
                  total={repositoryPageCount}
                  value={normalizedRepositoryPage}
                  onChange={setRepositoryPage}
                  size="sm"
                />
              </Group>
            )}

            <Paper p="md" radius="sm" withBorder>
              <Group justify="space-between" align="center" wrap="nowrap">
                <Box miw={0}>
                  <Group gap="xs" wrap="nowrap">
                    <ActionIcon
                      variant="subtle"
                      color="gray"
                      size="sm"
                      onClick={() => setRepositoryFilesExpanded(!repositoryFilesExpanded)}
                      aria-label={repositoryFilesExpanded ? 'Collapse discovered files' : 'Expand discovered files'}
                    >
                      {repositoryFilesExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    </ActionIcon>
                    <Title order={2} size="h4">Discovered files</Title>
                  </Group>
                  <Text size="sm" c="dimmed" truncate>File metadata used to decide what changed between repository syncs.</Text>
                </Box>
                <Group gap="xs">
                  <Badge color="teal" variant="light">{repositoryStatus?.trackedFiles ?? 0} tracked</Badge>
                  <Badge color="gray" variant="outline">{repositoryStatus?.deletedFiles ?? 0} deleted</Badge>
                  <Button
                    size="xs"
                    variant="subtle"
                    color="gray"
                    onClick={() => setRepositoryFilesExpanded(!repositoryFilesExpanded)}
                  >
                    {repositoryFilesExpanded ? 'Hide' : 'Show'}
                  </Button>
                </Group>
              </Group>
              <Collapse expanded={repositoryFilesExpanded}>
                <Stack gap="md" mt="md">
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
                    <Group justify="space-between" gap="sm">
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
                  {discoveredFiles.length === 0 && <Text c="dimmed">No discovered file metadata yet.</Text>}
                </Stack>
              </Collapse>
            </Paper>

            <Paper component={Stack} gap="md" p="md" radius="sm" withBorder>
              <Title order={2} size="h4">Repository deletion options</Title>
              <Checkbox
                checked={deleteRepositoryKnowledge}
                onChange={(event) => setDeleteRepositoryKnowledge(event.currentTarget.checked)}
                label="Delete indexed knowledge when deleting a repository"
              />
            </Paper>

          </Stack>
        
  );
}
