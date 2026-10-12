import { renderToString } from 'react-dom/server';
import AuthPage from './AuthPage';
import LegalPage, { legalPaths } from './LegalPage';
import GuidePage from './GuidePage';
export function renderPublic(path: string) {
  return renderToString(
    path === '/how-it-works' ? (
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
