import { Paper, Text, Title } from '@mantine/core';

type PageHeaderProps = {
  title: string;
  description: string;
};

export function PageHeader({ title, description }: PageHeaderProps) {
  return (
    <Paper p="lg" radius="sm" withBorder>
      <Title order={1}>{title}</Title>
      <Text c="dimmed" mt={4}>{description}</Text>
    </Paper>
  );
}
