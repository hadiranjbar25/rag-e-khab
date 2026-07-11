import type { RageKhabAppModel } from '../useRageKhabAppModel';
import { renderKnowledgePage } from './renderers/renderKnowledgePage';

type PageProps = { app: RageKhabAppModel };

export function KnowledgePage({ app }: PageProps) {
  return renderKnowledgePage(app);
}
