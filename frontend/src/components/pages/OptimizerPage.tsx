import type { RageKhabAppModel } from '../useRageKhabAppModel';
import { renderOptimizerPage } from './renderers/renderOptimizerPage';

type PageProps = { app: RageKhabAppModel };

export function OptimizerPage({ app }: PageProps) {
  return renderOptimizerPage(app);
}
