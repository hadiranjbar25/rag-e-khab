import { renderRageKhabApp } from './renderRageKhabApp';
import { useRageKhabAppModel } from './useRageKhabAppModel';

export function RageKhabApp() {
  return renderRageKhabApp(useRageKhabAppModel());
}
