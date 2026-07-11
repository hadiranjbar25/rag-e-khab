import type { RageKhabAppModel } from '../useRageKhabAppModel';
import { renderSafeDebugPage } from './renderers/renderSafeDebugPage';

type PageProps = { app: RageKhabAppModel };

export function SafeDebugPage({ app }: PageProps) {
  return renderSafeDebugPage(app);
}
