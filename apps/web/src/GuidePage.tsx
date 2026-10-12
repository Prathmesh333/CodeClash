import SiteFooter from './SiteFooter';
export default function GuidePage() {
  return (
    <>
      <header className="legal-header">
        <a href="/">CodeClash</a>
        <a href="/login">Sign in</a>
      </header>
      <main className="legal-page" id="main">
        <h1>Live Python coding duels and DSA practice</h1>
        <p>
          CodeClash brings a competitive edge to solving data structures and algorithms problems.
          Play a live one-on-one coding duel, or work through an original question on your own.
          Python runs in your browser, so you can start without installing a local development
          environment.
        </p>
        <section>
          <h2>How a coding duel works</h2>
          <ol>
            <li>Sign in with Google or GitHub and choose your unique username.</li>
            <li>
              Join matchmaking. When an opponent is found, both players confirm they are ready.
            </li>
            <li>Receive the same Python problem and a shared 20-minute clock.</li>
            <li>
              Write your solution and run the public examples. In casual mode, the first reported
              successful completion ends the round.
            </li>
            <li>Review your result in match history and find another opponent.</li>
          </ol>
          <p>
            Matchmaking needs another player to join. It does not guarantee an opponent or an
            immediate match.
          </p>
        </section>
        <section>
          <h2>Practice DSA without a timer</h2>
          <p>
            Solo practice lets you filter original CodeClash questions by topic and difficulty or
            choose a random problem. Run examples, try custom input, save drafts, and revisit your
            attempts. Reference explanations help you compare approaches after working on a problem.
          </p>
          <p>
            The library contains 153 original questions covering arrays, strings, graphs, dynamic
            programming, and other foundations. It is not an official LeetCode or NeetCode question
            collection. Some questions are reserved for solo practice while their suitability for
            duels is reviewed.
          </p>
        </section>
        <section>
          <h2>What does browser execution mean?</h2>
          <p>
            Your Python code runs on your device through WebAssembly. The first run downloads the
            Python runtime; later runs can use cached files. Results and execution times depend on
            your device. A browser-reported pass is not a verified server verdict.
          </p>
        </section>
        <section>
          <h2>Does a duel change my rating?</h2>
          <p>
            No. The current casual beta does not change ratings. An authoritative judge and further
            fairness testing are needed before verified ranked play is enabled.
          </p>
        </section>
        <section>
          <h2>Is CodeClash free?</h2>
          <p>
            The current casual beta and solo practice are free to use. You need an account to enter
            the app and save progress.
          </p>
        </section>
        <section>
          <h2>Your profile and progress</h2>
          <p>
            Settings lets you edit your profile, select a theme, and sign out. Saved matches and
            practice attempts belong to your account. Read our <a href="/privacy">privacy notice</a>{' '}
            and <a href="/safety">fair-play guidance</a>, or <a href="/contact">contact us</a> with
            a question.
          </p>
        </section>
        <p>
          <a className="button primary" href="/register">
            Join CodeClash
          </a>
        </p>
      </main>
      <SiteFooter />
    </>
  );
}
