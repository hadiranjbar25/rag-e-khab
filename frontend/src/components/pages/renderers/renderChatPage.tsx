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

export function renderChatPage(app: RageKhabAppModel) {
  const { view, setView, ingestMode, setIngestMode, uploadFile, setUploadFile, projects, setProjects, selectedProjectId, setSelectedProjectId, projectName, setProjectName, textTitle, setTextTitle, textBody, setTextBody, documents, setDocuments, memories, setMemories, allMemories, setAllMemories, repositoryStatus, setRepositoryStatus, repositories, setRepositories, projectRepositories, setProjectRepositories, workspaceHealth, setWorkspaceHealth, agentActivities, setAgentActivities, debugSessions, setDebugSessions, activeDebugSessionId, setActiveDebugSessionId, debugDetail, setDebugDetail, debugTitle, setDebugTitle, debugRawText, setDebugRawText, debugInputType, setDebugInputType, debugSanitizerMode, setDebugSanitizerMode, debugSourceName, setDebugSourceName, debugDataRequestId, setDebugDataRequestId, debugSanitizedText, setDebugSanitizedText, debugWarnings, setDebugWarnings, debugArtifactSliceStart, setDebugArtifactSliceStart, debugArtifactSliceEnd, setDebugArtifactSliceEnd, debugArtifactSlice, setDebugArtifactSlice, debugCompareLeftId, setDebugCompareLeftId, debugCompareRightId, setDebugCompareRightId, debugArtifactComparison, setDebugArtifactComparison, debugTokenQuery, setDebugTokenQuery, debugResolvedToken, setDebugResolvedToken, debugTokenSearch, setDebugTokenSearch, agentRequestDraft, setAgentRequestDraft, repositoryToLink, setRepositoryToLink, deleteRepositoryKnowledge, setDeleteRepositoryKnowledge, memoryFilter, setMemoryFilter, memorySearch, setMemorySearch, memoryPage, setMemoryPage, memoryPageSize, setMemoryPageSize, repositoryFilePage, setRepositoryFilePage, repositoryFilePageSize, setRepositoryFilePageSize, memoryTypeDraft, setMemoryTypeDraft, memoryContentDraft, setMemoryContentDraft, memoryRepositoryDraft, setMemoryRepositoryDraft, memoryToLink, setMemoryToLink, debugMemoryTypeDraft, setDebugMemoryTypeDraft, debugMemoryContentDraft, setDebugMemoryContentDraft, debugMemoryRepositoryDraft, setDebugMemoryRepositoryDraft, debugMemoryModuleDraft, setDebugMemoryModuleDraft, debugMemoryConfidenceDraft, setDebugMemoryConfidenceDraft, status, setStatus, settingsDraft, setSettingsDraft, question, setQuestion, task, setTask, selectedTaskTemplate, setSelectedTaskTemplate, optimizerTokenBudget, setOptimizerTokenBudget, optimizerBudgetProfile, setOptimizerBudgetProfile, optimizedContext, setOptimizedContext, history, setHistory, activeSource, setActiveSource, busy, setBusy, error, setError, colorScheme, setColorScheme, selectedProject, showToast, reportError, navigate, refresh, totalChunks, tokenSavings, lastSync, linkedRepositoryIds, discoveredFiles, repositoryFilePageCount, normalizedRepositoryFilePage, repositoryFilePageStart, pagedRepositoryFiles, repositoryFileRangeStart, repositoryFileRangeEnd, sortedDebugSessions, activeDebugSession, activeWorkspaceHealth, workspaceHealthColor, workspaceHealthTitle, currentBudgetProfile, stats, navItems, suggestedQuestions, memoryCounts, filteredMemories, memoryPageCount, normalizedMemoryPage, memoryPageStart, pagedMemories, memoryRangeStart, memoryRangeEnd, staleMemoryCount, recentActivity, upload, addText, ask, applyTaskTemplate, optimizeContext, deleteDocument, reindex, createProject, deleteProject, deleteMemory, rememberMemory, linkMemoryToProject, unlinkMemoryFromProject, saveSettings, linkRepositoryToProject, unlinkRepositoryFromProject, deleteRepository, createDebugSession, openDebugSession, archiveDebugSession, sanitizeDebugData, resolveDebugToken, recordAgentRequest, promoteDebugMemory, applyDebugMemorySuggestion, updateDebugDataRequest, copyDebugText, expandDebugArtifactSlice, compareDebugArtifacts, filteredDebugMappings, pendingDebugRequests, debugMemorySuggestions, latestDebugArtifact, latestDebugText, debugArtifactOptions, tokenMappingFor, artifactTextFor, suggestedSqlFor, activeSafeDebugInstruction, pageCopy, pageTitles, preWrapStyle, wideGridItemStyle } = app;
  return (
	          <SimpleGrid component="section" cols={{ base: 1, lg: 2 }} spacing="lg">
	            <Paper component={Stack} gap="md" p="md" radius="sm" withBorder>
	              <Group align="flex-start" gap="sm" wrap="nowrap">
	                <Textarea style={{ flex: 1 }} value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="Ask your knowledge base..." minRows={4} autosize />
	                <ActionIcon size="xl" onClick={() => ask()} disabled={busy || !question.trim()} title="Send question"><Send size={18} /></ActionIcon>
	              </Group>
              <Stack gap="md">
                {history.map((turn) => (
                  <Paper component={Stack} gap="md" key={turn.id} p="md" radius="sm" withBorder>
                    <Paper p="sm" radius="sm" bg="teal.6" c="white" maw="80%" ml="auto">
                      <Text>{turn.question}</Text>
                    </Paper>
                    <Stack gap="sm">
                      <Text size="xs" c="dimmed">{turn.response.provider} - {new Date(turn.response.createdAt).toLocaleString()}</Text>
                      <Text>{turn.response.answer}</Text>
	                      <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
	                        {turn.response.sources.map((source) => (
	                          <Paper component="button" onClick={() => setActiveSource(source)} key={source.chunkId} p="sm" radius="sm" withBorder ta="left">
	                            <Text fw={700}>{source.documentName}</Text>
	                            <Text size="xs" c="dimmed">{source.pageNumber ? `page ${source.pageNumber}` : 'text'} - score {source.score.toFixed(2)}</Text>
	                          </Paper>
	                        ))}
	                      </SimpleGrid>
                    </Stack>
                  </Paper>
                ))}
                {history.length === 0 && (
                  <Paper p="md" radius="sm" withBorder>
                    <Text fw={700}>No conversation yet</Text>
                    <Text size="sm" c="dimmed">Ask a question to inspect cited answers from memories, documents, and repository knowledge.</Text>
                  </Paper>
                )}
              </Stack>
            </Paper>

            <Paper component={Stack} gap="md" p="md" radius="sm" withBorder>
              <Group justify="space-between" align="center">
                <Title order={2} size="h4">Source</Title>
                <Layers size={18} />
              </Group>
              {activeSource ? (
                <Stack gap="sm">
                  <Text fw={700}>{activeSource.documentName}</Text>
                  <Text size="sm" c="dimmed">{activeSource.projectName}{activeSource.pageNumber ? ` - page ${activeSource.pageNumber}` : ''}</Text>
                  <Text>{activeSource.text}</Text>
                  <Text size="xs" c="dimmed" ff="monospace">{activeSource.chunkId}</Text>
                </Stack>
              ) : (
                <Paper p="md" radius="sm" withBorder>
                  <Text fw={700}>No source selected</Text>
                  <Text size="sm" c="dimmed">Select a citation from an answer to inspect the exact retrieved context.</Text>
                </Paper>
              )}
            </Paper>
          </SimpleGrid>
        
  );
}
