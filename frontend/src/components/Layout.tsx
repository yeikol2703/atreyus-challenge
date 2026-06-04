import { NavLink, Outlet } from 'react-router-dom'
import AtreyusLogo from './AtreyusLogo'

export default function Layout() {
  return (
    <div className="relative flex min-h-screen flex-col bg-atreyus-bg bg-atreyus-gradient">
      <header className="sticky top-0 z-10 border-b border-atreyus-border/80 bg-atreyus-bg/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <AtreyusLogo />

          <nav className="flex items-center gap-6">
            <NavLink
              to="/"
              end
              className={({ isActive }) =>
                isActive ? 'nav-link nav-link-active' : 'nav-link'
              }
            >
              New Analysis
            </NavLink>
            <NavLink
              to="/history"
              className={({ isActive }) =>
                isActive ? 'nav-link nav-link-active' : 'nav-link'
              }
            >
              History
            </NavLink>
            <a
              href="https://www.atreyus.ai/"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary hidden px-5 py-2 text-xs sm:inline-flex"
            >
              Get a Demo
            </a>
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-8">
        <Outlet />
      </main>

      <footer className="border-t border-atreyus-border/60 bg-atreyus-bg">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-6 py-6 sm:flex-row">
          <div className="flex items-center gap-2">
            <img src="/atreyus-logo.svg" alt="" aria-hidden className="h-5 w-5 opacity-40" />
            <p className="text-xs text-atreyus-muted">
              AI for Construction &amp; Field Services
            </p>
          </div>
          <a
            href="https://www.atreyus.ai/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-atreyus-muted transition-colors hover:text-atreyus-accent"
          >
            atreyus.ai
          </a>
        </div>
      </footer>
    </div>
  )
}
