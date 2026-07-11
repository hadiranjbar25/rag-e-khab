import {
  ActionIcon,
  Alert,
  Badge,
  Button,
  Group,
  NumberInput,
  Paper,
  Select,
  SimpleGrid,
  Stack,
  Text,
  Title,
} from '@mantine/core';
import { Copy, FileText } from 'lucide-react';
import type React from 'react';
import type { DebugArtifact } from '../appSupport';

type DebugArtifactSlice = {
  artifactId: string;
  startLine: number;
  endLine: number;
  text: string;
};

type DebugArtifactDiffLine = {
  type: 'added' | 'removed';
  lineNumber: number;
  text: string;
};

type DebugArtifactComparison = {
  summary: string;
  unchangedLineCount: number;
  totalChangedLines: number;
  addedLines: DebugArtifactDiffLine[];
  removedLines: DebugArtifactDiffLine[];
};

type SelectOption = {
  value: string;
  label: string;
};

type Props = {
  artifacts: DebugArtifact[];
  busy: boolean;
  sliceStart: number;
  sliceEnd: number;
  artifactSlice: DebugArtifactSlice | null;
  compareLeftId: string;
  compareRightId: string;
  artifactComparison: DebugArtifactComparison | null;
  artifactOptions: SelectOption[];
  preWrapStyle: React.CSSProperties;
  setSliceStart: (value: number) => void;
  setSliceEnd: (value: number) => void;
  setCompareLeftId: (value: string) => void;
  setCompareRightId: (value: string) => void;
  clearArtifactComparison: () => void;
  artifactTextFor: (artifact: DebugArtifact) => string;
  copyDebugText: (text: string, artifactId?: string) => void;
  expandArtifactSlice: (artifactId: string) => void;
  compareArtifacts: () => void;
};

export function SafeDebugArtifactsPanel({
  artifacts,
  busy,
  sliceStart,
  sliceEnd,
  artifactSlice,
  compareLeftId,
  compareRightId,
  artifactComparison,
  artifactOptions,
  preWrapStyle,
  setSliceStart,
  setSliceEnd,
  setCompareLeftId,
  setCompareRightId,
  clearArtifactComparison,
  artifactTextFor,
  copyDebugText,
  expandArtifactSlice,
  compareArtifacts,
}: Props) {
  return (
    <Paper component={Stack} gap="md" p="md" radius="sm" withBorder>
      <Group justify="space-between" align="center">
        <Stack gap={2}>
          <Title order={2} size="h4">Shared artifacts</Title>
          <Text size="xs" c="dimmed">Agents see compact text by default. Expand only the sanitized raw lines you need.</Text>
        </Stack>
        <Badge color="gray" variant="light">{artifacts.length}</Badge>
      </Group>
      <Group align="end" gap="sm">
        <NumberInput label="Start line" min={1} value={sliceStart} onChange={(value) => setSliceStart(Number(value) || 1)} />
        <NumberInput label="End line" min={1} value={sliceEnd} onChange={(value) => setSliceEnd(Number(value) || 1)} />
      </Group>
      <Stack gap="sm">
        {artifacts.map((artifact) => (
          <Paper component={Stack} gap="sm" key={artifact.id} p="sm" radius="sm" withBorder>
            <Group justify="space-between" align="flex-start" gap="sm">
              <Stack gap={2} miw={0}>
                <Text fw={700}>{artifact.inputType.toUpperCase()} · {artifact.sourceName}</Text>
                <Text size="xs" c="dimmed">{new Date(artifact.createdAt).toLocaleString()}</Text>
                <Text size="xs" c="dimmed">{artifact.profileName ?? 'Balanced'} profile · {artifact.warningSummary.length} warning group(s)</Text>
              </Stack>
              <Group gap="xs">
                {artifact.publishable === false && <Badge color="red" variant="light">Review required</Badge>}
                {artifact.reductionPercent !== undefined && <Badge color="teal" variant="light">{artifact.reductionPercent}% smaller</Badge>}
                <ActionIcon variant="light" color="gray" onClick={() => copyDebugText(artifactTextFor(artifact), artifact.id)} title="Copy compact artifact">
                  <Copy size={17} />
                </ActionIcon>
              </Group>
            </Group>
            {artifact.summary && (
              <Group gap="xs">
                <Badge color="gray" variant="light">{artifact.summary.kept} kept</Badge>
                <Badge color="teal" variant="light">{artifact.summary.tokenized} tokenized</Badge>
                <Badge color="red" variant="light">{artifact.summary.removed} removed</Badge>
                <Badge color="yellow" variant="light">{artifact.summary.warnings} warnings</Badge>
              </Group>
            )}
            {(artifact.audit?.length ?? 0) > 0 && (
              <Stack gap={4}>
                <Text size="xs" fw={700} tt="uppercase" c="dimmed">Effective rules</Text>
                <Group gap="xs">
                  {artifact.audit?.slice(0, 4).map((entry) => (
                    <Badge key={`${artifact.id}-${entry.field}-${entry.matchedRule}`} color={entry.action === 'keep' ? 'gray' : entry.action === 'tokenize' ? 'teal' : 'red'} variant="light">
                      {entry.field}: {entry.action} · {entry.source}
                    </Badge>
                  ))}
                </Group>
              </Stack>
            )}
            {(artifact.rawTokenEstimate !== undefined || artifact.compressedTokenEstimate !== undefined) && (
              <Text size="xs" c="dimmed">
                {artifact.rawTokenEstimate?.toLocaleString() ?? '-'} raw tokens - {artifact.compressedTokenEstimate?.toLocaleString() ?? '-'} compact tokens
              </Text>
            )}
            <Group gap="sm">
              <Button variant="subtle" color="gray" onClick={() => copyDebugText(artifactTextFor(artifact), artifact.id)} leftSection={<Copy size={16} />}>Copy compact</Button>
              <Button variant="light" color="gray" onClick={() => expandArtifactSlice(artifact.id)} disabled={busy} leftSection={<FileText size={16} />}>Expand slice</Button>
            </Group>
          </Paper>
        ))}
        {artifacts.length === 0 && <Text c="dimmed">No sanitized artifacts saved yet.</Text>}
      </Stack>
      {artifactSlice && (
        <Paper component={Stack} gap="sm" p="sm" radius="sm" withBorder>
          <Group justify="space-between" align="center">
            <Text fw={700}>Sanitized raw slice · lines {artifactSlice.startLine}-{artifactSlice.endLine}</Text>
            <ActionIcon variant="light" color="gray" onClick={() => copyDebugText(artifactSlice.text, artifactSlice.artifactId)} title="Copy slice">
              <Copy size={17} />
            </ActionIcon>
          </Group>
          <Paper component="pre" p="sm" radius="sm" withBorder bg="var(--mantine-color-default-hover)" style={preWrapStyle}>
            {artifactSlice.text}
          </Paper>
        </Paper>
      )}
      {artifacts.length >= 2 && (
        <Paper component={Stack} gap="md" p="sm" radius="sm" withBorder>
          <Group justify="space-between" align="flex-start">
            <Stack gap={2}>
              <Text fw={700}>Compare sanitized artifacts</Text>
              <Text size="xs" c="dimmed">Compare sanitized full artifacts to spot changed rows, errors, and log lines.</Text>
            </Stack>
            <Badge color="teal" variant="light">{artifactComparison?.totalChangedLines ?? 0} changes</Badge>
          </Group>
          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
            <Select
              label="Before"
              value={compareLeftId || null}
              onChange={(value) => {
                setCompareLeftId(value ?? '');
                clearArtifactComparison();
              }}
              data={artifactOptions}
            />
            <Select
              label="After"
              value={compareRightId || null}
              onChange={(value) => {
                setCompareRightId(value ?? '');
                clearArtifactComparison();
              }}
              data={artifactOptions}
            />
          </SimpleGrid>
          <Button
            variant="light"
            color="teal"
            onClick={compareArtifacts}
            disabled={busy || !compareLeftId || !compareRightId || compareLeftId === compareRightId}
          >
            Compare artifacts
          </Button>
          {artifactComparison && (
            <Stack gap="sm">
              <Alert color={artifactComparison.totalChangedLines > 0 ? 'yellow' : 'green'} variant="light">
                {artifactComparison.summary} {artifactComparison.unchangedLineCount} sanitized line(s) unchanged.
              </Alert>
              <SimpleGrid cols={{ base: 1, md: 2 }} spacing="sm">
                <DiffLines title="Added" color="green" marker="+" lines={artifactComparison.addedLines} emptyText="No added sanitized lines." preWrapStyle={preWrapStyle} />
                <DiffLines title="Removed" color="red" marker="-" lines={artifactComparison.removedLines} emptyText="No removed sanitized lines." preWrapStyle={preWrapStyle} />
              </SimpleGrid>
            </Stack>
          )}
        </Paper>
      )}
    </Paper>
  );
}

function DiffLines({
  title,
  color,
  marker,
  lines,
  emptyText,
  preWrapStyle,
}: {
  title: string;
  color: 'green' | 'red';
  marker: '+' | '-';
  lines: DebugArtifactDiffLine[];
  emptyText: string;
  preWrapStyle: React.CSSProperties;
}) {
  return (
    <Stack gap="xs">
      <Group justify="space-between">
        <Text fw={700}>{title}</Text>
        <Badge color={color} variant="light">{lines.length}</Badge>
      </Group>
      {lines.map((line) => (
        <Paper component="pre" key={`${title}-${line.lineNumber}-${line.text}`} p="xs" radius="sm" withBorder bg="var(--mantine-color-default-hover)" style={preWrapStyle}>
          {marker}{line.lineNumber}: {line.text}
        </Paper>
      ))}
      {lines.length === 0 && <Text size="sm" c="dimmed">{emptyText}</Text>}
    </Stack>
  );
}
