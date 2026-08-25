import { useState } from "react";
import { Link } from "wouter";
import {
  Share,
  MoreVertical,
  SquarePlus,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

type Platform = "ios" | "android";

export default function Landing() {
  const [showInstructions, setShowInstructions] = useState(false);
  const [platform, setPlatform] = useState<Platform>("ios");

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

        <Link
          href="/about"
          className="block text-sm text-forest-400 hover:text-forest-600 transition-colors"
        >
          See what Felicity can do &rarr;
        </Link>

        <div className="text-left">
          <button
            type="button"
            onClick={() => setShowInstructions((v) => !v)}
            className="flex w-full items-center justify-center gap-1.5 text-sm text-forest-400 hover:text-forest-600 transition-colors"
          >
            Add Felicity to your home screen
            {showInstructions ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </button>

          {showInstructions && (
            <div className="mt-4 rounded-xl bg-cream-100 p-5 shadow-soft">
              <div className="flex gap-2 mb-4">
                <button
                  type="button"
                  onClick={() => setPlatform("ios")}
                  className={`flex-1 rounded-lg px-3 py-1.5 text-sm transition-colors ${
                    platform === "ios"
                      ? "bg-forest-600 text-cream-50"
                      : "bg-cream-50 text-forest-500 hover:bg-cream-200"
                  }`}
                >
                  iPhone / iPad
                </button>
                <button
                  type="button"
                  onClick={() => setPlatform("android")}
                  className={`flex-1 rounded-lg px-3 py-1.5 text-sm transition-colors ${
                    platform === "android"
                      ? "bg-forest-600 text-cream-50"
                      : "bg-cream-50 text-forest-500 hover:bg-cream-200"
                  }`}
                >
                  Android
                </button>
              </div>

              {platform === "ios" ? (
                <ol className="space-y-3 text-sm text-forest-500">
                  <li className="flex items-start gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-forest-100 text-forest-600 text-xs">
                      1
                    </span>
                    <span className="pt-0.5">
                      Open this page in Safari, then tap the Share icon{" "}
                      <Share className="inline h-4 w-4 -mt-0.5" /> in the
                      toolbar.
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-forest-100 text-forest-600 text-xs">
                      2
                    </span>
                    <span className="pt-0.5">
                      Scroll down and tap{" "}
                      <span className="text-forest-700">
                        Add to Home Screen
                      </span>{" "}
                      <SquarePlus className="inline h-4 w-4 -mt-0.5" />.
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-forest-100 text-forest-600 text-xs">
                      3
                    </span>
                    <span className="pt-0.5">
                      Tap <span className="text-forest-700">Add</span> in the
                      top right corner to confirm.
                    </span>
                  </li>
                </ol>
              ) : (
                <ol className="space-y-3 text-sm text-forest-500">
                  <li className="flex items-start gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-forest-100 text-forest-600 text-xs">
                      1
                    </span>
                    <span className="pt-0.5">
                      Open this page in Chrome, then tap the menu icon{" "}
                      <MoreVertical className="inline h-4 w-4 -mt-0.5" /> in
                      the top right.
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-forest-100 text-forest-600 text-xs">
                      2
                    </span>
                    <span className="pt-0.5">
                      Tap{" "}
                      <span className="text-forest-700">
                        Add to Home screen
                      </span>{" "}
                      (or <span className="text-forest-700">Install app</span>
                      ).
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-forest-100 text-forest-600 text-xs">
                      3
                    </span>
                    <span className="pt-0.5">
                      Tap <span className="text-forest-700">Add</span> to
                      confirm and Felicity will appear on your home screen.
                    </span>
                  </li>
                </ol>
              )}
            </div>
          )}
        </div>

        <p className="text-sm text-forest-300">
          Warm. Calm. Competent. Never judgmental.
        </p>
      </div>
    </div>
  );
}
