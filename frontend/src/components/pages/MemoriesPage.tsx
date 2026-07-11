import type { RageKhabAppModel } from '../useRageKhabAppModel';
import { renderMemoriesPage } from './renderers/renderMemoriesPage';

type PageProps = { app: RageKhabAppModel };

export function MemoriesPage({ app }: PageProps) {
  return renderMemoriesPage(app);
}
