import type { RageKhabAppModel } from '../useRageKhabAppModel';
import { renderChatPage } from './renderers/renderChatPage';

type PageProps = { app: RageKhabAppModel };

export function ChatPage({ app }: PageProps) {
  return renderChatPage(app);
}
