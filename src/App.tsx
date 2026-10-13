import { StoreProvider } from './lib/store';
import { Link, useHashRoute } from './nav';
import Home from './pages/Home';
import Practice from './pages/Practice';
import { MockSetup, MockRunner, MockResult } from './pages/Mock';
import { Mistakes, Bookmarks, Progress, Report } from './pages/Review';

function route(hash: string): string {
  const h = hash.replace(/^#/, '') || '/';
  return h;
}

export default function App() {
  const hash = useHashRoute();
  const r = route(hash);
  let page: React.ReactNode = <Home />;
  let current = '/';
  if (r === '/' || r === '') { page = <Home />; current = '/'; }
  else if (r.startsWith('/practice')) { page = <Practice />; current = '/practice'; }
  else if (r === '/mock') { page = <MockSetup />; current = '/mock'; }
  else if (r === '/mock/run') { page = <MockRunner />; current = '/mock'; }
  else if (r.startsWith('/mock/result/')) { page = <MockResult id={r.split('/').pop()!} />; current = '/mock'; }
  else if (r === '/mistakes') { page = <Mistakes />; current = '/mistakes'; }
  else if (r === '/bookmarks') { page = <Bookmarks />; current = '/bookmarks'; }
  else if (r === '/progress') { page = <Progress />; current = '/progress'; }
  else if (r === '/report') { page = <Report />; current = '/report'; }
  else { page = <div><h1>Not found</h1><p><Link href="#/">Home</Link></p></div>; }

  return (
    <StoreProvider>
      <a className="skip" href="#main">Skip to content</a>
      <header className="topbar">
        <div className="topbar-inner">
          <Link className="brand" href="#/">LCAE Practice<small>Independent practice tool</small></Link>
          <nav className="nav" aria-label="Primary">
            <Link href="#/" aria-current={current === '/' ? 'page' : undefined}>Home</Link>
            <Link href="#/practice" aria-current={current === '/practice' ? 'page' : undefined}>Practice</Link>
            <Link href="#/mock" aria-current={current === '/mock' ? 'page' : undefined}>Mock</Link>
            <Link href="#/mistakes" aria-current={current === '/mistakes' ? 'page' : undefined}>Mistakes</Link>
            <Link href="#/progress" aria-current={current === '/progress' ? 'page' : undefined}>Progress</Link>
            <Link href="#/report" aria-current={current === '/report' ? 'page' : undefined}>Bank</Link>
          </nav>
        </div>
      </header>
      <main id="main" className="wrap">
        {page}
        <p className="footer-note">
          Independent practice tool — not affiliated with LangChain and not an official exam simulator.
          Semi-open-book rules, Talview logistics, and the provisioned LangSmith org are referenced for study only.
          Feedback? See the README in the repository.
        </p>
      </main>
    </StoreProvider>
  );
}
