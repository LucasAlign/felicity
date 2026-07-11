import { Link, useLocation } from "wouter";
import NotificationBell from "@/components/NotificationBell";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard" },
  { href: "/calendar", label: "Calendar" },
  { href: "/tasks", label: "Tasks" },
  { href: "/what-i-know", label: "What I Know" },
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  return (
    <div className="min-h-screen">
      <header className="border-b border-forest-100 bg-white/60">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <h1 className="text-2xl text-forest-700">Felicity</h1>
            <nav className="flex items-center gap-5">
              {NAV_ITEMS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={
                    location === item.href
                      ? "text-forest-700 font-medium"
                      : "text-forest-400 hover:text-forest-600"
                  }
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <NotificationBell />
            <a
              href="/api/logout"
              className="text-sm text-forest-400 hover:text-forest-600"
            >
              Sign out
            </a>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-10">{children}</main>
    </div>
  );
}
