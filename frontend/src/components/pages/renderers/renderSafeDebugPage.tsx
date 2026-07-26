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
import type { DebugInputType, DebugSanitizerMode } from '../../../appSupport';

export function renderSafeDebugPage(app: RageKhabAppModel) {
  const { view, setView, ingestMode, setIngestMode, uploadFile, setUploadFile, projects, setProjects, selectedProjectId, setSelectedProjectId, projectName, setProjectName, textTitle, setTextTitle, textBody, setTextBody, documents, setDocuments, memories, setMemories, allMemories, setAllMemories, repositoryStatus, setRepositoryStatus, repositories, setRepositories, projectRepositories, setProjectRepositories, workspaceHealth, setWorkspaceHealth, agentActivities, setAgentActivities, debugSessions, setDebugSessions, activeDebugSessionId, setActiveDebugSessionId, debugDetail, setDebugDetail, debugTitle, setDebugTitle, debugRawText, setDebugRawText, debugInputType, setDebugInputType, debugSanitizerMode, setDebugSanitizerMode, debugSourceName, setDebugSourceName, debugDataRequestId, setDebugDataRequestId, debugSanitizedText, setDebugSanitizedText, debugWarnings, setDebugWarnings, debugArtifactSliceStart, setDebugArtifactSliceStart, debugArtifactSliceEnd, setDebugArtifactSliceEnd, debugArtifactSlice, setDebugArtifactSlice, debugCompareLeftId, setDebugCompareLeftId, debugCompareRightId, setDebugCompareRightId, debugArtifactComparison, setDebugArtifactComparison, debugTokenQuery, setDebugTokenQuery, debugResolvedToken, setDebugResolvedToken, debugTokenSearch, setDebugTokenSearch, agentRequestDraft, setAgentRequestDraft, repositoryToLink, setRepositoryToLink, deleteRepositoryKnowledge, setDeleteRepositoryKnowledge, memoryFilter, setMemoryFilter, memorySearch, setMemorySearch, memoryPage, setMemoryPage, memoryPageSize, setMemoryPageSize, repositoryFilePage, setRepositoryFilePage, repositoryFilePageSize, setRepositoryFilePageSize, memoryTypeDraft, setMemoryTypeDraft, memoryContentDraft, setMemoryContentDraft, memoryRepositoryDraft, setMemoryRepositoryDraft, memoryToLink, setMemoryToLink, debugMemoryTypeDraft, setDebugMemoryTypeDraft, debugMemoryContentDraft, setDebugMemoryContentDraft, debugMemoryRepositoryDraft, setDebugMemoryRepositoryDraft, debugMemoryModuleDraft, setDebugMemoryModuleDraft, debugMemoryConfidenceDraft, setDebugMemoryConfidenceDraft, status, setStatus, settingsDraft, setSettingsDraft, question, setQuestion, task, setTask, selectedTaskTemplate, setSelectedTaskTemplate, optimizerTokenBudget, setOptimizerTokenBudget, optimizerBudgetProfile, setOptimizerBudgetProfile, optimizedContext, setOptimizedContext, history, setHistory, activeSource, setActiveSource, busy, setBusy, error, setError, colorScheme, setColorScheme, selectedProject, showToast, reportError, navigate, refresh, totalChunks, tokenSavings, lastSync, linkedRepositoryIds, discoveredFiles, repositoryFilePageCount, normalizedRepositoryFilePage, repositoryFilePageStart, pagedRepositoryFiles, repositoryFileRangeStart, repositoryFileRangeEnd, sortedDebugSessions, activeDebugSession, activeWorkspaceHealth, workspaceHealthColor, workspaceHealthTitle, currentBudgetProfile, stats, navItems, suggestedQuestions, memoryCounts, filteredMemories, memoryPageCount, normalizedMemoryPage, memoryPageStart, pagedMemories, memoryRangeStart, memoryRangeEnd, staleMemoryCount, recentActivity, upload, addText, ask, applyTaskTemplate, optimizeContext, deleteDocument, reindex, createProject, deleteProject, deleteMemory, rememberMemory, linkMemoryToProject, unlinkMemoryFromProject, saveSettings, linkRepositoryToProject, unlinkRepositoryFromProject, deleteRepository, createDebugSession, openDebugSession, archiveDebugSession, sanitizeDebugData, resolveDebugToken, recordAgentRequest, promoteDebugMemory, applyDebugMemorySuggestion, updateDebugDataRequest, copyDebugText, expandDebugArtifactSlice, compareDebugArtifacts, filteredDebugMappings, pendingDebugRequests, debugMemorySuggestions, latestDebugArtifact, latestDebugText, debugArtifactOptions, tokenMappingFor, artifactTextFor, suggestedSqlFor, activeSafeDebugInstruction, pageCopy, pageTitles, preWrapStyle, wideGridItemStyle } = app;
  return (
          <Stack component="section" gap="md">
            <SimpleGrid component="section" cols={{ base: 1, md: 2 }} spacing="md">
              <Paper component={Stack} gap="md" p="md" radius="sm" withBorder>
                <Group justify="space-between" align="center">
                  <Title order={2} size="h4">New session</Title>
                  <Plus size={18} />
                </Group>
                <Group align="end" gap="sm" grow>
                  <TextInput value={debugTitle} onChange={(event) => setDebugTitle(event.target.value)} placeholder="BUG-123 or checkout failure" />
                  <Button onClick={createDebugSession} disabled={busy || !debugTitle.trim()} title="Create session" leftSection={<Plus size={18} />}>Create</Button>
                </Group>
              </Paper>

              <Paper component={Stack} gap="md" p="md" radius="sm" withBorder>
                <Group justify="space-between" align="center">
                  <Title order={2} size="h4">Active session</Title>
                  <Badge color={activeDebugSession?.status === 'active' ? 'emerald' : 'gray'} variant="light">
                    {activeDebugSession?.status ?? `${debugSessions.length} total`}
                  </Badge>
                </Group>
                <Select
                  value={activeDebugSessionId || null}
                  onChange={(value) => value && openDebugSession(value)}
                  data={sortedDebugSessions.map((session) => ({
                    value: session.id,
                    label: `${session.title} · updated ${new Date(session.updatedAt).toLocaleDateString()}`,
                  }))}
                  placeholder="Select session"
                  searchable
                  nothingFoundMessage="No sessions"
                  disabled={debugSessions.length === 0}
                />
                {activeDebugSession ? (
                  <Stack gap={4}>
                    <Text size="sm" c="dimmed" ff="monospace">{activeDebugSession.id}</Text>
                    <Text size="sm" c="dimmed">Updated {new Date(activeDebugSession.updatedAt).toLocaleString()}</Text>
                    <Group gap="sm" mt="xs">
                      <Button variant="subtle" color="gray" onClick={() => openDebugSession(activeDebugSession.id)} disabled={busy}>Refresh</Button>
                      <ActionIcon variant="light" color="gray" onClick={() => archiveDebugSession(activeDebugSession.id)} disabled={busy} title="Archive session"><Archive size={17} /></ActionIcon>
                    </Group>
                  </Stack>
                ) : (
                  <Text size="sm" c="dimmed">Create or select a session before pasting query output.</Text>
                )}
              </Paper>
            </SimpleGrid>

            {debugDetail ? (
              <Stack gap="md">
                <Paper p="md" radius="sm" withBorder>
                  <Group justify="space-between" align="flex-start">
                    <Stack gap={4} miw={0}>
                      <Text size="xs" fw={700} tt="uppercase" c="dimmed">Session</Text>
                      <Title order={2} size="h3">{debugDetail.session.title}</Title>
                      <Text size="sm" c="dimmed" ff="monospace" truncate>{debugDetail.session.id}</Text>
                    </Stack>
                    <Stack gap={4} align="flex-end">
                      <Badge color={debugDetail.session.status === 'active' ? 'emerald' : 'gray'} variant="light">{debugDetail.session.status}</Badge>
                      <Text size="xs" c="dimmed">Created {new Date(debugDetail.session.createdAt).toLocaleString()}</Text>
                    </Stack>
                  </Group>
                </Paper>

                <Tabs defaultValue="data" keepMounted={false}>
                  <Tabs.List>
                    <Tabs.Tab value="data">Data</Tabs.Tab>
                    <Tabs.Tab value="requests">Requests</Tabs.Tab>
                    <Tabs.Tab value="tokens">Tokens</Tabs.Tab>
                    <Tabs.Tab value="lessons">Lessons</Tabs.Tab>
                    <Tabs.Tab value="artifacts">Artifacts</Tabs.Tab>
                    <Tabs.Tab value="instruction">Agent instruction</Tabs.Tab>
                    <Tabs.Tab value="profiles">Profiles</Tabs.Tab>
                  </Tabs.List>

                  <Tabs.Panel value="instruction" pt="md">
                    <Paper component={Stack} gap="md" p="md" radius="sm" withBorder>
                      <Group justify="space-between" align="center">
                        <Title order={2} size="h4">Agent instruction</Title>
                        <ActionIcon variant="light" color="gray" onClick={() => copyDebugText(activeSafeDebugInstruction)} title="Copy instruction"><Copy size={17} /></ActionIcon>
                      </Group>
                      <Paper component="pre" p="sm" radius="sm" withBorder bg="var(--mantine-color-default-hover)" style={preWrapStyle}>
                        {activeSafeDebugInstruction}
                      </Paper>
                    </Paper>
                  </Tabs.Panel>

                  <Tabs.Panel value="data" pt="md">
                    <Stack gap="md">
                      <SimpleGrid component="section" cols={{ base: 1, lg: 2 }} spacing="lg">
                        <Paper component={Stack} gap="md" p="md" radius="sm" withBorder>
                          <Group justify="space-between" align="center">
                            <Title order={2} size="h4">Paste data</Title>
                            <ShieldCheck size={18} />
                          </Group>
                          <Textarea value={debugRawText} onChange={(event) => setDebugRawText(event.target.value)} placeholder="Paste CSV, JSON, or log output here..." minRows={8} autosize />
                          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
                            <NativeSelect value={debugInputType} onChange={(event) => setDebugInputType(event.target.value as DebugInputType)} data={[
                              { value: 'csv', label: 'CSV' },
                              { value: 'json', label: 'JSON' },
                              { value: 'log', label: 'LOG' },
                            ]} />
                            <NativeSelect value={debugSanitizerMode} onChange={(event) => setDebugSanitizerMode(event.target.value as DebugSanitizerMode)} data={[
                              { value: 'balanced', label: 'Balanced' },
                              { value: 'strict', label: 'Strict' },
                              { value: 'permissive', label: 'Permissive' },
                            ]} />
                            <TextInput value={debugSourceName} onChange={(event) => setDebugSourceName(event.target.value)} placeholder="users, orders, payments, custom" />
                            <Button onClick={sanitizeDebugData} disabled={busy || !debugRawText.trim()} leftSection={<ShieldCheck size={18} />}>Sanitize</Button>
                          </SimpleGrid>
                          <NativeSelect
                            value={debugDataRequestId}
                            onChange={(event) => setDebugDataRequestId(event.target.value)}
                            data={[
                              { value: '', label: 'No linked agent request' },
                              ...pendingDebugRequests.map((item) => ({
                                value: item.id,
                                label: `${item.entity}${item.parentToken ? ` for ${item.parentToken}` : ''}`,
                              })),
                            ]}
                          />
                        </Paper>

                        <Paper component={Stack} gap="md" p="md" radius="sm" withBorder>
                          <Group justify="space-between" align="center">
                            <Stack gap={2}>
                              <Title order={2} size="h4">Compact agent output</Title>
                              <Text size="xs" c="dimmed">Sanitized first, then compacted for agent context.</Text>
                            </Stack>
                            <Group gap="sm">
                              {latestDebugArtifact?.reductionPercent !== undefined && (
                                <Badge color="emerald" variant="light">{latestDebugArtifact.reductionPercent}% smaller</Badge>
                              )}
                              <ActionIcon variant="light" color="gray" onClick={() => copyDebugText(latestDebugText, latestDebugArtifact?.id)} disabled={!latestDebugText} title="Copy compact output"><Clipboard size={17} /></ActionIcon>
                              <Button variant="subtle" color="gray" onClick={() => copyDebugText(latestDebugText, latestDebugArtifact?.id)} disabled={!latestDebugText}>Copy compact</Button>
                            </Group>
                          </Group>
                          <Paper component="pre" p="sm" radius="sm" withBorder bg="var(--mantine-color-default-hover)" style={preWrapStyle}>
                            {latestDebugText || 'Compacted sanitized data will appear here.'}
                          </Paper>
                        </Paper>
                      </SimpleGrid>
                    </Stack>
                  </Tabs.Panel>

                  <Tabs.Panel value="requests" pt="md">
                    <Stack gap="md">
                      <Paper component={Stack} gap="md" p="md" radius="sm" withBorder>
                        <Group justify="space-between" align="center">
                          <Title order={2} size="h4">Pending agent requests</Title>
                          <Badge color="gray" variant="light">{pendingDebugRequests.length} pending</Badge>
                        </Group>
                        <SimpleGrid cols={{ base: 1, md: 2, xl: 3 }} spacing="md">
                          {debugDetail.dataRequests.map((item) => {
                            const mapping = tokenMappingFor(item.parentToken);
                            const suggestedSql = suggestedSqlFor(item);
                            return (
                              <Paper component={Stack} gap="sm" key={item.id} p="md" radius="sm" withBorder>
                                <Group justify="space-between" align="flex-start">
                                  <Stack gap={2} miw={0}>
                                    <Text fw={700}>{item.entity}</Text>
                                    <Text size="sm" c="dimmed">{item.relation || 'No relation'}{item.parentToken ? ` · ${item.parentToken}` : ''}</Text>
                                  </Stack>
                                  <Badge color={item.status === 'pending' ? 'emerald' : 'gray'} variant="light">{item.status}</Badge>
                                </Group>
                                <Text size="sm">{item.reason}</Text>
                                {item.requestedFields.length > 0 && <Text size="xs" c="dimmed">Fields: {item.requestedFields.join(', ')}</Text>}
                                {mapping && <Text size="xs" c="dimmed">{item.parentToken} -&gt; {mapping.table}.{mapping.column} = {mapping.realValue}</Text>}
                                {suggestedSql && (
                                  <Paper component="pre" p="sm" radius="sm" withBorder bg="var(--mantine-color-default-hover)" style={preWrapStyle}>
                                    {suggestedSql}
                                  </Paper>
                                )}
                                <Group gap="sm">
                                  <Button variant="subtle" color="gray" onClick={() => copyDebugText(suggestedSql)} disabled={!suggestedSql} leftSection={<Copy size={16} />}>Copy SQL</Button>
                                  <Button variant="light" color="emerald" onClick={() => updateDebugDataRequest(item.id, 'complete')} disabled={busy || item.status !== 'pending'}>Mark Completed</Button>
                                  <Button variant="light" color="red" onClick={() => updateDebugDataRequest(item.id, 'reject')} disabled={busy || item.status !== 'pending'}>Reject</Button>
                                </Group>
                              </Paper>
                            );
                          })}
                          {debugDetail.dataRequests.length === 0 && <Text c="dimmed">No structured agent data requests yet.</Text>}
                        </SimpleGrid>
                      </Paper>
                      <Paper component={Stack} gap="md" p="md" radius="sm" withBorder>
                        <Group justify="space-between" align="center">
                          <Title order={2} size="h4">Agent requests</Title>
                          <Badge color="gray" variant="light">{debugDetail.notes.length}</Badge>
                        </Group>
                        <Group align="end" gap="sm" grow>
                          <TextInput value={agentRequestDraft} onChange={(event) => setAgentRequestDraft(event.target.value)} placeholder="Need orders for USER_001" />
                          <Button onClick={recordAgentRequest} disabled={busy || !agentRequestDraft.trim()}>Record</Button>
                        </Group>
                        <Stack gap="sm">
                          {debugDetail.notes.slice(0, 4).map((note) => (
                            <Paper component={Stack} gap={2} key={note.id} p="sm" radius="sm" withBorder>
                              <Text fw={700}>{note.request}</Text>
                              <Text size="xs" c="dimmed">{new Date(note.createdAt).toLocaleString()}</Text>
                            </Paper>
                          ))}
                          {debugDetail.notes.length === 0 && <Text c="dimmed">No agent requests recorded yet.</Text>}
                        </Stack>
                      </Paper>
                    </Stack>
                  </Tabs.Panel>

                  <Tabs.Panel value="tokens" pt="md">
                    <Stack gap="md">
                        <Paper component={Stack} gap="md" p="md" radius="sm" withBorder>
                          <Group justify="space-between" align="center">
                            <Title order={2} size="h4">Resolve token</Title>
                            <KeyRound size={18} />
                          </Group>
                          <Group align="end" gap="sm" grow>
                            <TextInput value={debugTokenQuery} onChange={(event) => setDebugTokenQuery(event.target.value)} placeholder="USER_001" />
                            <Button onClick={resolveDebugToken} disabled={busy || !debugTokenQuery.trim()}>Resolve</Button>
                          </Group>
                          {debugResolvedToken ? (
                            <Paper component={Stack} gap="xs" p="sm" radius="sm" withBorder>
                              <Text size="xs" c="dimmed">{debugResolvedToken.token}</Text>
                              <Text fw={700}>{debugResolvedToken.table}.{debugResolvedToken.column} = {debugResolvedToken.realValue}</Text>
                              <Button variant="subtle" color="gray" onClick={() => copyDebugText(debugResolvedToken.realValue)} leftSection={<Copy size={16} />}>Copy real id</Button>
                            </Paper>
                          ) : (
                            <Text size="sm" c="dimmed">Resolve a token to manually query the database without asking an agent for raw data.</Text>
                          )}
                        </Paper>

                      <Paper component={Stack} gap="md" p="md" radius="sm" withBorder>
                        <Group justify="space-between" align="center">
                          <Title order={2} size="h4">Token map</Title>
                          <TextInput value={debugTokenSearch} onChange={(event) => setDebugTokenSearch(event.target.value)} placeholder="Search tokens..." leftSection={<Search size={16} />} />
                        </Group>
                        <ScrollArea>
                          <Table miw={720} verticalSpacing="xs">
                            <Table.Thead>
                              <Table.Tr>
                                <Table.Th>Token</Table.Th>
                                <Table.Th>Table</Table.Th>
                                <Table.Th>Column</Table.Th>
                                <Table.Th>Real value</Table.Th>
                                <Table.Th>Created</Table.Th>
                              </Table.Tr>
                            </Table.Thead>
                            <Table.Tbody>
                              {filteredDebugMappings.map((mapping) => (
                                <Table.Tr key={mapping.token}>
                                  <Table.Td><Text fw={700}>{mapping.token}</Text></Table.Td>
                                  <Table.Td>{mapping.table}</Table.Td>
                                  <Table.Td>{mapping.column}</Table.Td>
                                  <Table.Td>{mapping.realValue}</Table.Td>
                                  <Table.Td>{new Date(mapping.createdAt).toLocaleString()}</Table.Td>
                                </Table.Tr>
                              ))}
                            </Table.Tbody>
                          </Table>
                        </ScrollArea>
                        {filteredDebugMappings.length === 0 && <Text c="dimmed">No token mappings yet.</Text>}
                      </Paper>
                    </Stack>
                  </Tabs.Panel>

                  <Tabs.Panel value="lessons" pt="md">
                    <Paper component={Stack} gap="md" p="md" radius="sm" withBorder>
                      <Group justify="space-between" align="flex-start">
                        <Stack gap={2}>
                          <Title order={2} size="h4">Promote lesson to memory</Title>
                          <Text size="sm" c="dimmed">Save only durable, sanitized conclusions. Tokens, raw IDs, PII, and SQL with real IDs are blocked.</Text>
                          <Badge color="emerald" variant="light">Scope: {selectedProject?.name ?? 'selected workspace'}</Badge>
                        </Stack>
                        <Brain size={18} />
                      </Group>
                      {debugMemorySuggestions.length > 0 && (
                        <Stack gap="sm">
                          <Group justify="space-between" align="center">
                            <Text fw={700}>Suggested lessons</Text>
                            <Badge color="emerald" variant="light">{debugMemorySuggestions.length}</Badge>
                          </Group>
                          {debugMemorySuggestions.map((suggestion) => (
                            <Paper component={Stack} gap="xs" key={suggestion.id} p="sm" radius="sm" withBorder>
                              <Group justify="space-between" align="flex-start">
                                <Stack gap={2} miw={0}>
                                  <Text size="sm">{suggestion.content}</Text>
                                  <Text size="xs" c="dimmed">{memoryLabels[suggestion.type] ?? suggestion.type} · {suggestion.reason}</Text>
                                </Stack>
                                <Button size="xs" variant="light" color="emerald" onClick={() => applyDebugMemorySuggestion(suggestion)}>Use</Button>
                              </Group>
                            </Paper>
                          ))}
                        </Stack>
                      )}
                      <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
                        <NativeSelect value={debugMemoryTypeDraft} onChange={(event) => setDebugMemoryTypeDraft(event.target.value)} data={memoryTypes.map((type) => ({ value: type, label: memoryLabels[type] ?? type }))} />
                        <TextInput value={debugMemoryRepositoryDraft} onChange={(event) => setDebugMemoryRepositoryDraft(event.target.value)} placeholder="repository optional" />
                        <TextInput value={debugMemoryModuleDraft} onChange={(event) => setDebugMemoryModuleDraft(event.target.value)} placeholder="module optional" />
                        <NumberInput min={0} max={1} step={0.05} value={debugMemoryConfidenceDraft} onChange={(value) => setDebugMemoryConfidenceDraft(Number(value) || 0)} />
                        <Textarea style={wideGridItemStyle} value={debugMemoryContentDraft} onChange={(event) => setDebugMemoryContentDraft(event.target.value)} placeholder="Example: Payment retries can fail when an order is archived before the payment attempt reaches terminal status." minRows={4} autosize />
                        <Button onClick={promoteDebugMemory} disabled={busy || !debugMemoryContentDraft.trim() || !selectedProjectId} leftSection={<Brain size={18} />}>Promote</Button>
                      </SimpleGrid>
                    </Paper>
                  </Tabs.Panel>

                  <Tabs.Panel value="artifacts" pt="md">
                    <SimpleGrid component="section" cols={{ base: 1, lg: 2 }} spacing="lg">
                        <SafeDebugArtifactsPanel
                          artifacts={debugDetail.artifacts}
                          busy={busy}
                          sliceStart={debugArtifactSliceStart}
                          sliceEnd={debugArtifactSliceEnd}
                          artifactSlice={debugArtifactSlice}
                          compareLeftId={debugCompareLeftId}
                          compareRightId={debugCompareRightId}
                          artifactComparison={debugArtifactComparison}
                          artifactOptions={debugArtifactOptions}
                          preWrapStyle={preWrapStyle}
                          setSliceStart={setDebugArtifactSliceStart}
                          setSliceEnd={setDebugArtifactSliceEnd}
                          setCompareLeftId={setDebugCompareLeftId}
                          setCompareRightId={setDebugCompareRightId}
                          clearArtifactComparison={() => setDebugArtifactComparison(null)}
                          artifactTextFor={artifactTextFor}
                          copyDebugText={copyDebugText}
                          expandArtifactSlice={expandDebugArtifactSlice}
                          compareArtifacts={compareDebugArtifacts}
                        />

                        <Paper component={Stack} gap="md" p="md" radius="sm" withBorder>
                          <Group justify="space-between" align="center">
                            <Title order={2} size="h4">Warnings</Title>
                            <AlertCircle size={18} />
                          </Group>
                          <Stack gap="sm">
                            {(debugWarnings.length ? debugWarnings : debugDetail.artifacts[0]?.warningSummary ?? []).map((warning, index) => (
                              <Paper component={Stack} gap={2} key={`${warning.type}-${warning.field}-${index}`} p="sm" radius="sm" withBorder>
                                <Text fw={700}>{warning.type.replace('_', ' ')}</Text>
                                <Text size="sm" c="dimmed">{warning.message}{warning.field ? ` · ${warning.field}` : ''}{warning.count ? ` · ${warning.count}` : ''}</Text>
                              </Paper>
                            ))}
                            {debugWarnings.length === 0 && (debugDetail.artifacts[0]?.warningSummary.length ?? 0) === 0 && <Text c="dimmed">No warnings for the latest artifact.</Text>}
                          </Stack>
                        </Paper>
                      </SimpleGrid>
                  </Tabs.Panel>

                  <Tabs.Panel value="profiles" pt="md">
                    <Paper component={Stack} gap="md" p="md" radius="sm" withBorder>
                      <Group justify="space-between" align="center">
                        <Stack gap={2}>
                          <Title order={2} size="h4">Sanitization profiles</Title>
                          <Text size="sm" c="dimmed">Built-in profiles are secure by default. Artifact summaries show the effective profile and matched rule sources.</Text>
                        </Stack>
                        <Badge color="emerald" variant="light">{app.sanitizationProfiles.length || 3} profiles</Badge>
                      </Group>
                      <SimpleGrid cols={{ base: 1, md: 3 }} spacing="sm">
                        {(app.sanitizationProfiles.length ? app.sanitizationProfiles : [
                          { id: 'strict', name: 'Strict', scope: 'built_in', enabled: true, unknownFieldBehavior: 'remove', rules: [], detectors: [] },
                          { id: 'balanced', name: 'Balanced', scope: 'built_in', enabled: true, unknownFieldBehavior: 'warn', rules: [], detectors: [] },
                          { id: 'developer', name: 'Developer-friendly', scope: 'built_in', enabled: true, unknownFieldBehavior: 'warn', rules: [], detectors: [] },
                        ]).map((profile) => (
                          <Paper component={Stack} gap="xs" key={profile.id} p="sm" radius="sm" withBorder>
                            <Group justify="space-between" align="flex-start">
                              <Text fw={700}>{profile.name}</Text>
                              <Badge color={profile.name === 'Balanced' ? 'emerald' : 'gray'} variant="light">{profile.scope.replace('_', ' ')}</Badge>
                            </Group>
                            <Text size="xs" c="dimmed">Unknown fields: {profile.unknownFieldBehavior}</Text>
                            <Group gap="xs">
                              <Badge color="gray" variant="light">{profile.rules.length} rules</Badge>
                              <Badge color="gray" variant="light">{profile.detectors.length} detectors</Badge>
                            </Group>
                          </Paper>
                        ))}
                      </SimpleGrid>
                    </Paper>
                  </Tabs.Panel>
                </Tabs>
              </Stack>
            ) : (
              <Paper p="md" radius="sm" withBorder>
                <Stack gap={4}>
                  <Text fw={700}>Select or create a debug session</Text>
                  <Text size="sm" c="dimmed">Sessions keep deterministic fake-to-real mappings so follow-up CSV, JSON, and logs reuse the same tokens.</Text>
                </Stack>
              </Paper>
            )}
          </Stack>
        
  );
}
