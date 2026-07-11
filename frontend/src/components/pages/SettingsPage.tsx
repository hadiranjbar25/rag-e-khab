import type { RageKhabAppModel } from '../useRageKhabAppModel';
import { renderSettingsPage } from './renderers/renderSettingsPage';

type PageProps = { app: RageKhabAppModel };

export function SettingsPage({ app }: PageProps) {
  return renderSettingsPage(app);
}
