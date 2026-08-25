import { Link } from "wouter";
import { Leaf } from "lucide-react";

function ScreenshotFrame({ src, alt }: { src: string; alt: string }) {
  return (
    <div className="rounded-2xl border border-forest-100 bg-white shadow-soft-lg overflow-hidden">
      <div className="flex items-center gap-1.5 px-4 py-3 border-b border-forest-100/70 bg-cream-100/60">
        <span className="h-2.5 w-2.5 rounded-full bg-forest-200" />
        <span className="h-2.5 w-2.5 rounded-full bg-forest-200" />
        <span className="h-2.5 w-2.5 rounded-full bg-forest-200" />
      </div>
      <img src={src} alt={alt} loading="lazy" className="w-full h-auto block" />
    </div>
  );
}

function FeatureRow({
  eyebrow,
  title,
  body,
  img,
  alt,
  reverse,
}: {
  eyebrow: string;
  title: string;
  body: string;
  img: string;
  alt: string;
  reverse?: boolean;
}) {
  return (
    <div className="grid gap-10 md:grid-cols-2 items-center">
      <div className={reverse ? "md:order-2" : ""}>
        <p className="text-sm uppercase tracking-wide text-walnut-500 mb-2">
          {eyebrow}
        </p>
        <h3 className="text-3xl text-forest-700 mb-4">{title}</h3>
        <p className="text-forest-500 leading-relaxed">{body}</p>
      </div>
      <div className={reverse ? "md:order-1" : ""}>
        <ScreenshotFrame src={img} alt={alt} />
      </div>
    </div>
  );
}

export default function About() {
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 backdrop-blur-md bg-cream-50/80 border-b border-forest-100/60">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span className="flex items-center justify-center h-8 w-8 rounded-full bg-forest-600 text-cream-50 shadow-soft">
              <Leaf size={16} strokeWidth={2} />
            </span>
            <span className="text-2xl text-forest-700">Felicity</span>
          </Link>
          <a
            href="/api/login"
            className="rounded-lg bg-forest-600 text-cream-50 px-4 py-2 text-sm shadow-soft hover:bg-forest-700 transition-colors"
          >
            Sign in
          </a>
        </div>
      </header>

      <main>
        <section className="max-w-3xl mx-auto px-6 pt-20 pb-14 text-center">
          <h1 className="text-5xl text-forest-700 leading-tight">
            Say it once. Felicity sorts out the rest.
          </h1>
          <p className="mt-5 text-lg text-forest-500 leading-relaxed max-w-2xl mx-auto">
            Felicity is a second brain for the hundreds of moving pieces in
            your life — the permission slips, the appointments, the shopping
            list, the things you're carrying for everyone else. Talk, type,
            or snap a photo of the sticky note, and Felicity takes it from
            there.
          </p>
          <a
            href="/api/login"
            className="mt-8 inline-block rounded-xl bg-forest-600 text-cream-50 px-8 py-3.5 shadow-soft-md hover:bg-forest-700 transition-colors"
          >
            Sign in to get started
          </a>
        </section>

        <section className="max-w-3xl mx-auto px-6 pb-24">
          <ScreenshotFrame
            src="/screenshots/braindump.webp"
            alt="Felicity sorting a Brain Dump into an appointment, tasks, and a shopping list"
          />
        </section>

        <section className="max-w-5xl mx-auto px-6 py-8 space-y-28">
          <FeatureRow
            eyebrow="Every morning"
            title="One calm view, not a wall of red badges"
            body="No overwhelming to-do list, no notifications shouting how far behind you are. Just what's actually on your plate today, and what's coming this week — nothing more."
            img="/screenshots/dashboard.webp"
            alt="Felicity dashboard showing today's tasks and appointments"
          />
          <FeatureRow
            eyebrow="Calendar"
            title="Appointments and tasks live where they belong"
            body="Appointments are fixed and protected. Tasks are flexible until you decide otherwise. Two-way Google Calendar sync means anything you add here shows up there too, and anything added in Google shows up here."
            img="/screenshots/calendar.webp"
            alt="Felicity monthly calendar view with synced appointments and a flexible tasks panel"
            reverse
          />
          <FeatureRow
            eyebrow="What I Know About You"
            title="Nothing is remembered without asking first"
            body="Felicity notices patterns — grocery day, who sees which doctor, when small group meets — and asks before remembering anything long-term. Everything it knows stays visible, editable, and removable, always."
            img="/screenshots/whatiknow.webp"
            alt="Felicity's What I Know page showing a pending suggestion and confirmed memories by category"
          />
        </section>

        <section className="bg-forest-700 text-cream-50">
          <div className="max-w-3xl mx-auto px-6 py-20">
            <h2 className="text-3xl text-cream-50 mb-6">Why I built this</h2>
            <div className="space-y-5 text-forest-100 leading-relaxed">
              <p>
                I built Felicity for anyone who's the one who remembers
                everything — the permission slips, the pediatrician
                appointments, the small group schedule, the grocery list, and
                the hundred other things nobody else is tracking.
              </p>
              <p>
                Most productivity apps make that worse. They hand you another
                list, another inbox, another red number telling you how far
                behind you are.
              </p>
              <p>
                Felicity is different on purpose. It isn't a calendar app —
                it's a second brain, something that carries the mental load
                with you instead of just organizing it at you. Warm instead
                of clinical. Calm instead of urgent. Competent instead of
                complicated. It assumes you're doing your best, because you
                are.
              </p>
              <p>
                It's like having the world's best personal assistant —
                someone who quietly keeps things organized so you can be
                present for what actually matters.
              </p>
            </div>
          </div>
        </section>

        <section className="max-w-2xl mx-auto px-6 py-20 text-center">
          <h2 className="text-3xl text-forest-700 mb-3">
            Ready to hand some of this off?
          </h2>
          <a
            href="/api/login"
            className="mt-4 inline-block rounded-xl bg-forest-600 text-cream-50 px-8 py-3.5 shadow-soft-md hover:bg-forest-700 transition-colors"
          >
            Sign in to get started
          </a>
          <p className="mt-6 text-sm text-forest-300">
            Warm. Calm. Competent. Never judgmental.
          </p>
        </section>
      </main>
    </div>
  );
}
