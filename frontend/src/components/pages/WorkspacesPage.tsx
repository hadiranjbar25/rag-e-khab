import type { RageKhabAppModel } from '../useRageKhabAppModel';
import { renderWorkspacesPage } from './renderers/renderWorkspacesPage';

type PageProps = { app: RageKhabAppModel };

export function WorkspacesPage({ app }: PageProps) {
  return renderWorkspacesPage(app);
}
