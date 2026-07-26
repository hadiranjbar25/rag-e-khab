import {
  ActionIcon,
  AppShell,
  Badge,
  Box,
  Group,
  Image,
  NavLink,
  Paper,
  ScrollArea,
  Select,
  Stack,
  Text,
  ThemeIcon,
  Title,
} from '@mantine/core';
import type { MantineColorScheme } from '@mantine/core';
import { Layers, Moon, Sun } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { AdminStatus, ProjectItem, View } from '../appSupport';

type NavItem = {
  id: View;
  label: string;
  icon: LucideIcon;
};

type AppSidebarProps = {
  colorScheme: MantineColorScheme;
  setColorScheme: (scheme: MantineColorScheme) => void;
  projects: ProjectItem[];
  selectedProject?: ProjectItem;
  selectedProjectId: string;
  setSelectedProjectId: (projectId: string) => void;
  status: AdminStatus | null;
  navItems: NavItem[];
  view: View;
  navigate: (view: View) => void;
};

export function AppSidebar({
  colorScheme,
  setColorScheme,
  projects,
  selectedProject,
  selectedProjectId,
  setSelectedProjectId,
  status,
  navItems,
  view,
  navigate,
}: AppSidebarProps) {
  return (
    <AppShell.Navbar p="lg">
      <Stack gap="lg" h="100%">
        <Group gap="sm" wrap="nowrap">
          <ThemeIcon size={42} radius="sm" color="emerald">
            <Image src="/favicon.svg" alt="" w={24} h={24} />
          </ThemeIcon>
          <Box flex={1}>
            <Title order={3} size="h4">RAG-e Khab</Title>
            <Text size="sm" c="dimmed">Coding-agent memory</Text>
          </Box>
          <ActionIcon
            variant="subtle"
            color="emerald"
            aria-label={colorScheme === 'dark' ? 'Use light theme' : 'Use dark theme'}
            onClick={() => setColorScheme(colorScheme === 'dark' ? 'light' : 'dark')}
          >
            {colorScheme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </ActionIcon>
        </Group>

        <Paper
          component={Stack}
          gap="xs"
          p="sm"
          radius="sm"
          withBorder
          bg={colorScheme === 'dark' ? 'emerald.9' : 'emerald.0'}
          c={colorScheme === 'dark' ? 'white' : 'emerald.9'}
          style={{ borderColor: colorScheme === 'dark' ? 'var(--mantine-color-emerald-5)' : 'var(--mantine-color-emerald-3)' }}
        >
          <Group gap="xs" wrap="nowrap">
            <ThemeIcon color="emerald" variant={colorScheme === 'dark' ? 'filled' : 'light'} size="sm" radius="sm">
              <Layers size={14} />
            </ThemeIcon>
            <Box flex={1} miw={0}>
              <Text size="xs" fw={700} tt="uppercase" c={colorScheme === 'dark' ? 'emerald.1' : 'emerald.8'}>Active workspace</Text>
              <Text fw={700} truncate>{selectedProject?.name ?? 'General'}</Text>
            </Box>
          </Group>
          <Select
            label="Switch workspace"
            value={selectedProjectId}
            onChange={(value) => setSelectedProjectId(value ?? '')}
            data={projects.map((project) => ({ value: project.id, label: project.name }))}
            searchable
            variant={colorScheme === 'dark' ? 'default' : 'filled'}
            leftSection={<Layers size={16} />}
            nothingFoundMessage="No workspaces"
          />
        </Paper>

        <Badge
          color={status?.index.vectorStore === 'qdrant' ? 'emerald' : 'gray'}
          variant="light"
          leftSection={<Box w={8} h={8} bg={status?.index.vectorStore === 'qdrant' ? 'emerald.6' : 'yellow.6'} style={{ borderRadius: 999 }} />}
        >
          {status?.index.vectorStore ?? 'starting'}
        </Badge>

        <ScrollArea flex={1}>
          <Stack gap={4}>
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  active={view === item.id}
                  onClick={() => navigate(item.id)}
                  aria-current={view === item.id ? 'page' : undefined}
                  key={item.id}
                  label={item.label}
                  leftSection={<Icon size={18} />}
                  variant="filled"
                />
              );
            })}
          </Stack>
        </ScrollArea>
      </Stack>
    </AppShell.Navbar>
  );
}
