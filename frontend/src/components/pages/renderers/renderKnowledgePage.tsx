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
import type { IngestMode } from '../../../appSupport';

export function renderKnowledgePage(app: RageKhabAppModel) {
  const { view, setView, ingestMode, setIngestMode, uploadFile, setUploadFile, projects, setProjects, selectedProjectId, setSelectedProjectId, projectName, setProjectName, textTitle, setTextTitle, textBody, setTextBody, documents, setDocuments, memories, setMemories, allMemories, setAllMemories, repositoryStatus, setRepositoryStatus, repositories, setRepositories, projectRepositories, setProjectRepositories, workspaceHealth, setWorkspaceHealth, agentActivities, setAgentActivities, debugSessions, setDebugSessions, activeDebugSessionId, setActiveDebugSessionId, debugDetail, setDebugDetail, debugTitle, setDebugTitle, debugRawText, setDebugRawText, debugInputType, setDebugInputType, debugSanitizerMode, setDebugSanitizerMode, debugSourceName, setDebugSourceName, debugDataRequestId, setDebugDataRequestId, debugSanitizedText, setDebugSanitizedText, debugWarnings, setDebugWarnings, debugArtifactSliceStart, setDebugArtifactSliceStart, debugArtifactSliceEnd, setDebugArtifactSliceEnd, debugArtifactSlice, setDebugArtifactSlice, debugCompareLeftId, setDebugCompareLeftId, debugCompareRightId, setDebugCompareRightId, debugArtifactComparison, setDebugArtifactComparison, debugTokenQuery, setDebugTokenQuery, debugResolvedToken, setDebugResolvedToken, debugTokenSearch, setDebugTokenSearch, agentRequestDraft, setAgentRequestDraft, repositoryToLink, setRepositoryToLink, deleteRepositoryKnowledge, setDeleteRepositoryKnowledge, memoryFilter, setMemoryFilter, memorySearch, setMemorySearch, memoryPage, setMemoryPage, memoryPageSize, setMemoryPageSize, repositoryFilePage, setRepositoryFilePage, repositoryFilePageSize, setRepositoryFilePageSize, memoryTypeDraft, setMemoryTypeDraft, memoryContentDraft, setMemoryContentDraft, memoryRepositoryDraft, setMemoryRepositoryDraft, memoryToLink, setMemoryToLink, debugMemoryTypeDraft, setDebugMemoryTypeDraft, debugMemoryContentDraft, setDebugMemoryContentDraft, debugMemoryRepositoryDraft, setDebugMemoryRepositoryDraft, debugMemoryModuleDraft, setDebugMemoryModuleDraft, debugMemoryConfidenceDraft, setDebugMemoryConfidenceDraft, status, setStatus, settingsDraft, setSettingsDraft, question, setQuestion, task, setTask, selectedTaskTemplate, setSelectedTaskTemplate, optimizerTokenBudget, setOptimizerTokenBudget, optimizerBudgetProfile, setOptimizerBudgetProfile, optimizedContext, setOptimizedContext, history, setHistory, activeSource, setActiveSource, busy, setBusy, error, setError, colorScheme, setColorScheme, selectedProject, showToast, reportError, navigate, refresh, totalChunks, tokenSavings, lastSync, linkedRepositoryIds, discoveredFiles, repositoryFilePageCount, normalizedRepositoryFilePage, repositoryFilePageStart, pagedRepositoryFiles, repositoryFileRangeStart, repositoryFileRangeEnd, sortedDebugSessions, activeDebugSession, activeWorkspaceHealth, workspaceHealthColor, workspaceHealthTitle, currentBudgetProfile, stats, navItems, suggestedQuestions, memoryCounts, filteredMemories, memoryPageCount, normalizedMemoryPage, memoryPageStart, pagedMemories, memoryRangeStart, memoryRangeEnd, staleMemoryCount, recentActivity, upload, addText, ask, applyTaskTemplate, optimizeContext, deleteDocument, reindex, createProject, deleteProject, deleteMemory, rememberMemory, linkMemoryToProject, unlinkMemoryFromProject, saveSettings, linkRepositoryToProject, unlinkRepositoryFromProject, deleteRepository, createDebugSession, openDebugSession, archiveDebugSession, sanitizeDebugData, resolveDebugToken, recordAgentRequest, promoteDebugMemory, applyDebugMemorySuggestion, updateDebugDataRequest, copyDebugText, expandDebugArtifactSlice, compareDebugArtifacts, filteredDebugMappings, pendingDebugRequests, debugMemorySuggestions, latestDebugArtifact, latestDebugText, debugArtifactOptions, tokenMappingFor, artifactTextFor, suggestedSqlFor, activeSafeDebugInstruction, pageCopy, pageTitles, preWrapStyle, wideGridItemStyle } = app;
  return (
	          <SimpleGrid component="section" cols={{ base: 1, md: 2 }} spacing="lg">
	            <Paper component={Stack} gap="md" p="md" radius="sm" withBorder>
	              <SegmentedControl
	                fullWidth
	                value={ingestMode}
	                onChange={(value) => setIngestMode(value as IngestMode)}
	                data={[
	                  { value: 'text', label: 'Text' },
	                  { value: 'upload', label: 'File' },
	                ]}
	              />
	              {ingestMode === 'text' ? (
	                <Stack gap="md">
	                  <TextInput value={textTitle} onChange={(event) => setTextTitle(event.target.value)} placeholder="Title" />
	                  <Textarea value={textBody} onChange={(event) => setTextBody(event.target.value)} placeholder="Paste notes, snippets, summaries, or any text..." minRows={8} autosize />
	                  <Button onClick={addText} disabled={busy || !textBody.trim()} leftSection={<FilePlus2 size={18} />}>Add text</Button>
	                </Stack>
	              ) : (
	                <Paper component={Stack} gap="sm" align="center" ta="center" p="xl" radius="sm" withBorder>
	                  <Upload size={28} />
	                  <Text fw={700}>Choose a document, sheet, slide deck, or text file</Text>
	                  <Text size="sm" c="dimmed">{selectedProject?.name ?? 'General'}</Text>
	                  <FileInput
	                    value={uploadFile}
	                    onChange={upload}
	                    accept=".pdf,.doc,.docx,.odt,.rtf,.ppt,.pptx,.odp,.xls,.xlsx,.ods,.csv,.tsv,.html,.htm,.md,.markdown,.txt,text/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
	                    placeholder="Select file"
	                    disabled={busy}
	                    clearable
	                    leftSection={<Upload size={16} />}
	                  />
	                </Paper>
	              )}
	            </Paper>

            <Paper component="section" p="md" radius="sm" withBorder>
              <Group justify="space-between" align="center" mb="md">
	                <Title order={2} size="h4">Indexed items</Title>
	                <Button variant="light" color="gray" onClick={reindex} disabled={busy} leftSection={<RefreshCw size={16} />}>Reindex</Button>
	              </Group>
              <Stack gap="md">
                {documents.map((doc) => (
                  <Paper component={Group} key={doc.id} p="sm" radius="sm" withBorder gap="sm" wrap="nowrap">
                    <FileText size={20} />
                    <Stack gap={2} flex={1} miw={0}>
                      <Text fw={700} truncate>{doc.name}</Text>
                      <Text size="sm" c="dimmed" truncate>{doc.projectName} · {doc.format} · {doc.chunkCount} source units · {(doc.sizeBytes / 1024).toFixed(1)} KB</Text>
                    </Stack>
	                    <ActionIcon variant="light" color="red" onClick={() => deleteDocument(doc.id)} disabled={busy} title="Delete document"><Trash2 size={18} /></ActionIcon>
                  </Paper>
                ))}
                {documents.length === 0 && (
                  <Paper p="md" radius="sm" withBorder>
                    <Text fw={700}>No sources indexed yet</Text>
                    <Text size="sm" c="dimmed">Add text, upload a file, or sync a repository so coding agents can retrieve useful context.</Text>
                  </Paper>
                )}
              </Stack>
            </Paper>
          </SimpleGrid>
        
  );
}
