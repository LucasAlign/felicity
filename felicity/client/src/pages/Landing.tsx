export default function Landing() {
  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="max-w-md w-full text-center space-y-8">
        <div className="space-y-3">
          <h1 className="text-4xl text-forest-700">Felicity</h1>
          <p className="text-forest-500 leading-relaxed">
            Your trusted AI executive assistant. It's like having the world's
            best personal assistant &mdash; organizing the chaos, so you don't
            have to carry it alone.
          </p>
        </div>

        <a
          href="/api/login"
          className="inline-block w-full rounded-xl bg-forest-600 text-cream-50 px-6 py-3 shadow-soft hover:bg-forest-700 transition-colors"
        >
          Sign in to get started
        </a>

        <p className="text-sm text-forest-300">
          Warm. Calm. Competent. Never judgmental.
        </p>
      </div>
    </div>
  );
}
