import AiArena from './AiArena';
import DiscoveryPage, { discoveryPaths } from './DiscoveryPage';
import { renderToString } from 'react-dom/server';
import AuthPage from './AuthPage';
import LegalPage, { legalPaths } from './LegalPage';
import GuidePage from './GuidePage';
export function renderPublic(path: string) {
  return renderToString(
    path.startsWith('/ai-arena') ? (
      <AiArena path={path} />
    ) : discoveryPaths.includes(path) ? (
      <DiscoveryPage path={path} />
    ) : path === '/how-it-works' ? (
      <GuidePage />
    ) : legalPaths.includes(path) ? (
      <LegalPage pathname={path} />
    ) : (
      <AuthPage
        pathname={path}
        loading={false}
        error=""
        busy={false}
        health={{ local: false, github: true, google: true }}
        choose={() => {}}
      />
    ),
  );
}
