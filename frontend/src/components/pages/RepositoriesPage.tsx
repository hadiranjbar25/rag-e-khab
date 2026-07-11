import type { RageKhabAppModel } from '../useRageKhabAppModel';
import { renderRepositoriesPage } from './renderers/renderRepositoriesPage';

type PageProps = { app: RageKhabAppModel };

export function RepositoriesPage({ app }: PageProps) {
  return renderRepositoriesPage(app);
}
