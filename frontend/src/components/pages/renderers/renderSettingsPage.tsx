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

export function renderSettingsPage(app: RageKhabAppModel) {
  const { view, setView, ingestMode, setIngestMode, uploadFile, setUploadFile, projects, setProjects, selectedProjectId, setSelectedProjectId, projectName, setProjectName, textTitle, setTextTitle, textBody, setTextBody, documents, setDocuments, memories, setMemories, allMemories, setAllMemories, repositoryStatus, setRepositoryStatus, repositories, setRepositories, projectRepositories, setProjectRepositories, workspaceHealth, setWorkspaceHealth, agentActivities, setAgentActivities, debugSessions, setDebugSessions, activeDebugSessionId, setActiveDebugSessionId, debugDetail, setDebugDetail, debugTitle, setDebugTitle, debugRawText, setDebugRawText, debugInputType, setDebugInputType, debugSanitizerMode, setDebugSanitizerMode, debugSourceName, setDebugSourceName, debugDataRequestId, setDebugDataRequestId, debugSanitizedText, setDebugSanitizedText, debugWarnings, setDebugWarnings, debugArtifactSliceStart, setDebugArtifactSliceStart, debugArtifactSliceEnd, setDebugArtifactSliceEnd, debugArtifactSlice, setDebugArtifactSlice, debugCompareLeftId, setDebugCompareLeftId, debugCompareRightId, setDebugCompareRightId, debugArtifactComparison, setDebugArtifactComparison, debugTokenQuery, setDebugTokenQuery, debugResolvedToken, setDebugResolvedToken, debugTokenSearch, setDebugTokenSearch, agentRequestDraft, setAgentRequestDraft, repositoryToLink, setRepositoryToLink, deleteRepositoryKnowledge, setDeleteRepositoryKnowledge, memoryFilter, setMemoryFilter, memorySearch, setMemorySearch, memoryPage, setMemoryPage, memoryPageSize, setMemoryPageSize, repositoryFilePage, setRepositoryFilePage, repositoryFilePageSize, setRepositoryFilePageSize, memoryTypeDraft, setMemoryTypeDraft, memoryContentDraft, setMemoryContentDraft, memoryRepositoryDraft, setMemoryRepositoryDraft, memoryToLink, setMemoryToLink, debugMemoryTypeDraft, setDebugMemoryTypeDraft, debugMemoryContentDraft, setDebugMemoryContentDraft, debugMemoryRepositoryDraft, setDebugMemoryRepositoryDraft, debugMemoryModuleDraft, setDebugMemoryModuleDraft, debugMemoryConfidenceDraft, setDebugMemoryConfidenceDraft, status, setStatus, settingsDraft, setSettingsDraft, question, setQuestion, task, setTask, selectedTaskTemplate, setSelectedTaskTemplate, optimizerTokenBudget, setOptimizerTokenBudget, optimizerBudgetProfile, setOptimizerBudgetProfile, optimizedContext, setOptimizedContext, history, setHistory, activeSource, setActiveSource, busy, setBusy, error, setError, colorScheme, setColorScheme, selectedProject, showToast, reportError, navigate, refresh, totalChunks, tokenSavings, lastSync, linkedRepositoryIds, discoveredFiles, repositoryFilePageCount, normalizedRepositoryFilePage, repositoryFilePageStart, pagedRepositoryFiles, repositoryFileRangeStart, repositoryFileRangeEnd, sortedDebugSessions, activeDebugSession, activeWorkspaceHealth, workspaceHealthColor, workspaceHealthTitle, currentBudgetProfile, stats, navItems, suggestedQuestions, memoryCounts, filteredMemories, memoryPageCount, normalizedMemoryPage, memoryPageStart, pagedMemories, memoryRangeStart, memoryRangeEnd, staleMemoryCount, recentActivity, upload, addText, ask, applyTaskTemplate, optimizeContext, deleteDocument, reindex, createProject, deleteProject, deleteMemory, rememberMemory, linkMemoryToProject, unlinkMemoryFromProject, saveSettings, linkRepositoryToProject, unlinkRepositoryFromProject, deleteRepository, createDebugSession, openDebugSession, archiveDebugSession, sanitizeDebugData, resolveDebugToken, recordAgentRequest, promoteDebugMemory, applyDebugMemorySuggestion, updateDebugDataRequest, copyDebugText, expandDebugArtifactSlice, compareDebugArtifacts, filteredDebugMappings, pendingDebugRequests, debugMemorySuggestions, latestDebugArtifact, latestDebugText, debugArtifactOptions, tokenMappingFor, artifactTextFor, suggestedSqlFor, activeSafeDebugInstruction, pageCopy, pageTitles, preWrapStyle, wideGridItemStyle } = app;
  return (
          <Stack component="section" gap="md">
            {settingsDraft && (
              <Stack gap="md">
                <Paper p="md" radius="sm" withBorder>
                  <Group justify="space-between" align="center">
                    <Title order={2} size="h3">Settings</Title>
                    <Button onClick={saveSettings} disabled={busy}>Save</Button>
                  </Group>
                </Paper>

                <Paper component={Stack} gap="md" p="md" radius="sm" withBorder>
                  <Title order={2} size="h4">Models</Title>
                  <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
                    <NativeSelect
                      label="Chat provider"
                      value={settingsDraft.llm.provider}
                      onChange={(event) => setSettingsDraft({
                        ...settingsDraft,
                        llm: { ...settingsDraft.llm, provider: event.target.value }
                      })}
                      data={(status?.availableProviders ?? []).map((provider) => ({ value: provider, label: provider }))}
                    />
                    <NativeSelect
                      label="Chat model"
                      value={selectValue(settingsDraft.llm.model, chatModelOptions)}
                      onChange={(event) => {
                        const value = event.target.value;
                        setSettingsDraft({
                          ...settingsDraft,
                          llm: { ...settingsDraft.llm, model: value === CUSTOM_MODEL ? '' : value }
                        });
                      }}
                      data={[...chatModelOptions.map((model) => ({ value: model, label: model })), { value: CUSTOM_MODEL, label: 'custom' }]}
                    />
                    {selectValue(settingsDraft.llm.model, chatModelOptions) === CUSTOM_MODEL && (
                      <TextInput
                        label="Custom chat model"
                        value={settingsDraft.llm.model}
                        placeholder="model name"
                        onChange={(event) => setSettingsDraft({
                          ...settingsDraft,
                          llm: { ...settingsDraft.llm, model: event.target.value }
                        })}
                      />
                    )}
                    <TextInput
                      label="Chat base URL"
                      value={settingsDraft.llm.baseUrl}
                      onChange={(event) => setSettingsDraft({
                        ...settingsDraft,
                        llm: { ...settingsDraft.llm, baseUrl: event.target.value }
                      })}
                    />
                    <TextInput
                      label="Chat API key"
                      type="password"
                      value={settingsDraft.llm.apiKey}
                      onChange={(event) => setSettingsDraft({
                        ...settingsDraft,
                        llm: { ...settingsDraft.llm, apiKey: event.target.value }
                      })}
                    />
                  </SimpleGrid>
                </Paper>

                <Paper component={Stack} gap="md" p="md" radius="sm" withBorder>
                  <Title order={2} size="h4">Optimizer</Title>
                  <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
                    <NativeSelect
                      label="Optimizer mode"
                      value={settingsDraft.optimizer.mode}
                      onChange={(event) => setSettingsDraft({
                        ...settingsDraft,
                        optimizer: { ...settingsDraft.optimizer, mode: event.target.value }
                      })}
                      data={[
                        { value: 'retrieval', label: 'Retrieval only' },
                        { value: 'compression', label: 'Compression', disabled: !settingsDraft.localLlm.enabled },
                      ]}
                    />
                    <NativeSelect
                      label="Default budget profile"
                      value={settingsDraft.optimizer.budgetProfile ?? 'standard'}
                      onChange={(event) => {
                        const profile = contextBudgetProfiles.find((item) => item.value === event.target.value);
                        setSettingsDraft({
                          ...settingsDraft,
                          optimizer: {
                            ...settingsDraft.optimizer,
                            budgetProfile: event.target.value,
                            maxTokens: profile?.maxTokens ?? settingsDraft.optimizer.maxTokens
                          }
                        });
                      }}
                      data={contextBudgetProfileOptions}
                    />
                    <NumberInput
                      label="Optimizer max tokens"
                      min={300}
                      max={8000}
                      value={settingsDraft.optimizer.maxTokens}
                      onChange={(value) => setSettingsDraft({
                        ...settingsDraft,
                        optimizer: { ...settingsDraft.optimizer, maxTokens: Number(value) || 300 }
                      })}
                    />
                    {!settingsDraft.localLlm.enabled && (
                      <Alert color="yellow" variant="light" style={wideGridItemStyle}>
                        Enable local LLM compression to use compression mode.
                      </Alert>
                    )}
                    <Checkbox
                      checked={settingsDraft.localLlm.enabled}
                      onChange={(event) => setSettingsDraft({
                        ...settingsDraft,
                        optimizer: event.currentTarget.checked ? settingsDraft.optimizer : { ...settingsDraft.optimizer, mode: 'retrieval' },
                        localLlm: { ...settingsDraft.localLlm, enabled: event.currentTarget.checked }
                      })}
                      label="Enable local LLM compression"
                    />
                    <NativeSelect
                      label="Local LLM provider"
                      value={settingsDraft.localLlm.provider}
                      onChange={(event) => setSettingsDraft({
                        ...settingsDraft,
                        localLlm: { ...settingsDraft.localLlm, provider: event.target.value }
                      })}
                      data={[{ value: 'ollama', label: 'Ollama' }]}
                    />
                    <TextInput
                      label="Local LLM base URL"
                      value={settingsDraft.localLlm.baseUrl}
                      onChange={(event) => setSettingsDraft({
                        ...settingsDraft,
                        localLlm: { ...settingsDraft.localLlm, baseUrl: event.target.value }
                      })}
                    />
                    <NativeSelect
                      label="Compression model"
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
                      data={[
                        { value: DISABLED_MODEL, label: 'disabled' },
                        ...compressionModelOptions.map((model) => ({ value: model, label: model })),
                        { value: CUSTOM_MODEL, label: 'custom' },
                      ]}
                    />
                    {settingsDraft.localLlm.enabled && selectValue(settingsDraft.localLlm.model, compressionModelOptions) === CUSTOM_MODEL && (
                      <TextInput
                        label="Custom compression model"
                        value={settingsDraft.localLlm.model}
                        placeholder="model name"
                        disabled={settingsDraft.optimizer.mode === 'retrieval'}
                        onChange={(event) => setSettingsDraft({
                          ...settingsDraft,
                          localLlm: { ...settingsDraft.localLlm, model: event.target.value }
                        })}
                      />
                    )}
                  </SimpleGrid>
                </Paper>

                <Paper component={Stack} gap="md" p="md" radius="sm" withBorder>
                  <Title order={2} size="h4">Advanced settings</Title>
                  <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
                    <NativeSelect
                      label="Embedding provider"
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
                      data={[
                        { value: 'hash', label: 'Hash fallback' },
                        { value: 'ollama', label: 'Ollama' },
                      ]}
                    />
                    <NativeSelect
                      label="Embedding model"
                      value={settingsDraft.embedding.provider === 'hash' ? 'hash-based embedder' : selectValue(settingsDraft.embedding.model, embeddingModelOptions)}
                      disabled={settingsDraft.embedding.provider === 'hash'}
                      onChange={(event) => {
                        const value = event.target.value;
                        setSettingsDraft({
                          ...settingsDraft,
                          embedding: { ...settingsDraft.embedding, model: value === CUSTOM_MODEL ? '' : value }
                        });
                      }}
                      data={settingsDraft.embedding.provider === 'hash'
                        ? [{ value: 'hash-based embedder', label: 'hash-based embedder' }]
                        : [...embeddingModelOptions.map((model) => ({ value: model, label: model })), { value: CUSTOM_MODEL, label: 'custom' }]}
                    />
                    {settingsDraft.embedding.provider === 'ollama' && selectValue(settingsDraft.embedding.model, embeddingModelOptions) === CUSTOM_MODEL && (
                      <TextInput
                        label="Custom embedding model"
                        value={settingsDraft.embedding.model}
                        placeholder="embedding model"
                        onChange={(event) => setSettingsDraft({
                          ...settingsDraft,
                          embedding: { ...settingsDraft.embedding, model: event.target.value }
                        })}
                      />
                    )}
                    <TextInput
                      label="Embedding base URL"
                      value={settingsDraft.embedding.baseUrl}
                      onChange={(event) => setSettingsDraft({
                        ...settingsDraft,
                        embedding: { ...settingsDraft.embedding, baseUrl: event.target.value }
                      })}
                    />
                    <NumberInput
                      label="Embedding dimensions"
                      min={1}
                      max={8192}
                      value={settingsDraft.embedding.dimensions}
                      onChange={(value) => setSettingsDraft({
                        ...settingsDraft,
                        embedding: { ...settingsDraft.embedding, dimensions: Number(value) || 1 }
                      })}
                    />
                  </SimpleGrid>
                </Paper>

                <Paper component={Stack} gap="md" p="md" radius="sm" withBorder>
                  <Title order={2} size="h4">Storage diagnostics</Title>
                  <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
                      <Box>
                        <Text size="xs" fw={700} tt="uppercase" c="dimmed">Vector store</Text>
                        <Text fw={700}>{status?.index.vectorStore ?? 'unknown'}</Text>
                      </Box>
                      <Box>
                        <Text size="xs" fw={700} tt="uppercase" c="dimmed">Collection</Text>
                        <Text fw={700}>{status?.index.collection ?? 'unknown'}</Text>
                      </Box>
                      <Box>
                        <Text size="xs" fw={700} tt="uppercase" c="dimmed">Qdrant</Text>
                        <Text fw={700}>{status?.qdrantUrl ?? 'unknown'}</Text>
                      </Box>
                      <Box>
                        <Text size="xs" fw={700} tt="uppercase" c="dimmed">Documents</Text>
                        <Text fw={700}>{status?.index.documentCount ?? 0}</Text>
                      </Box>
                    </SimpleGrid>
                  </Paper>
              </Stack>
            )}
          </Stack>
        
  );
}
