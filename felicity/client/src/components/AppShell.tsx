import { Link, useLocation } from "wouter";
import { Home, Calendar, BookOpen, Leaf, LogOut } from "lucide-react";
import NotificationBell from "@/components/NotificationBell";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: Home },
  { href: "/calendar", label: "Calendar", icon: Calendar },
  { href: "/what-i-know", label: "What I Know", icon: BookOpen },
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 backdrop-blur-md bg-white/75 border-b border-forest-100/70 shadow-[0_1px_0_rgba(255,255,255,0.5)_inset,0_6px_20px_-8px_rgba(47,74,60,0.12)]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-2">
              <span className="flex items-center justify-center h-8 w-8 rounded-full bg-forest-600 text-cream-50 shadow-soft">
                <Leaf size={16} strokeWidth={2} />
              </span>
              <h1 className="text-2xl text-forest-700">Felicity</h1>
            </div>
            <nav className="hidden sm:flex items-center gap-1">
              {NAV_ITEMS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={
                    "px-3 py-1.5 rounded-full text-sm transition-colors " +
                    (location === item.href
                      ? "bg-forest-100/80 text-forest-700 font-medium"
                      : "text-forest-400 hover:text-forest-600 hover:bg-forest-50")
                  }
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-3 sm:gap-4">
            <NotificationBell />
            <a
              href="/api/logout"
              className="hidden sm:inline text-sm text-forest-400 hover:text-forest-600 transition-colors"
            >
              Sign out
            </a>
            <a
              href="/api/logout"
              aria-label="Sign out"
              className="sm:hidden text-forest-400 hover:text-forest-600 transition-colors"
            >
              <LogOut size={20} strokeWidth={1.75} />
            </a>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-10 pb-24 sm:pb-10">
        {children}
      </main>

      <nav
        className="sm:hidden fixed bottom-0 inset-x-0 z-40 flex items-stretch justify-around rounded-t-2xl bg-white/85 backdrop-blur-xl border-t border-forest-100/60 shadow-soft-up pb-[env(safe-area-inset-bottom)]"
        aria-label="Primary"
      >
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = location === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-label={item.label}
              aria-current={active ? "page" : undefined}
              className="flex flex-1 flex-col items-center justify-center gap-0.5 py-2.5"
            >
              <span
                className={
                  "flex items-center justify-center h-8 w-8 rounded-full transition-all " +
                  (active
                    ? "bg-forest-700 text-cream-50 shadow-soft"
                    : "text-forest-400")
                }
              >
                <Icon size={18} strokeWidth={active ? 2 : 1.75} />
              </span>
              <span
                className={
                  "text-[10px] leading-none tracking-wide transition-colors " +
                  (active
                    ? "text-forest-700 font-medium"
                    : "text-forest-400")
                }
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
