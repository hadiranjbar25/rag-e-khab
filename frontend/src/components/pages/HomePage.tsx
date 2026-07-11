import type { RageKhabAppModel } from '../useRageKhabAppModel';
import { renderHomePage } from './renderers/renderHomePage';

type PageProps = { app: RageKhabAppModel };

export function HomePage({ app }: PageProps) {
  return renderHomePage(app);
}
