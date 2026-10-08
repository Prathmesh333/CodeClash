import CookieControls from './CookieControls';
export default function SiteFooter() {
  return (
    <footer className="site-footer">
      <div>
        <strong>CodeClash</strong>
        <span>A shared clock. Your own approach.</span>
      </div>
      <nav aria-label="Policies and support">
        <a href="/privacy">Privacy</a>
        <a href="/cookies">Cookies</a>
        <a href="/terms">Terms</a>
        <a href="/contact">Contact</a>
        <a href="/safety">Safety</a>
        <CookieControls />
      </nav>
      <small>© {new Date().getFullYear()} CodeClash</small>
    </footer>
  );
}
