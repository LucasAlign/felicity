import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { MemoryCategory } from "@shared/schema";

interface Question {
  category: MemoryCategory;
  prompt: string;
}

const QUESTIONS: Question[] = [
  {
    category: "family",
    prompt: "Tell me a bit about your household — who's home with you day to day?",
  },
  {
    category: "homeschool",
    prompt: "Are you homeschooling any of your kids right now?",
  },
  {
    category: "church",
    prompt: "Are you part of a church or faith community I should keep in mind?",
  },
  {
    category: "meals",
    prompt: "How do you usually handle meals — plan ahead, or figure it out as you go?",
  },
  {
    category: "work",
    prompt: "Are you working outside the home, running a business, or is home your main focus right now?",
  },
];

interface Exchange {
  prompt: string;
  answer: string;
}

export default function Onboarding() {
  const queryClient = useQueryClient();
  const [index, setIndex] = useState(0);
  const [history, setHistory] = useState<Exchange[]>([]);
  const [input, setInput] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [finishing, setFinishing] = useState(false);

  const done = index >= QUESTIONS.length;
  const question = QUESTIONS[index];

  async function complete() {
    setFinishing(true);
    await apiRequest("POST", "/api/onboarding/complete");
    await queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
  }

  async function submitAnswer(skip: boolean) {
    const trimmed = input.trim();
    if (!skip && trimmed) {
      setSubmitting(true);
      try {
        await apiRequest("POST", "/api/onboarding/answer", {
          category: question.category,
          content: trimmed,
        });
      } finally {
        setSubmitting(false);
      }
    }
    setHistory((h) => [
      ...h,
      { prompt: question.prompt, answer: trimmed && !skip ? trimmed : "Skipped" },
    ]);
    setInput("");
    setIndex((i) => i + 1);
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-lg space-y-5">
        <div className="text-center space-y-1">
          <h1 className="text-2xl text-forest-700">Welcome to Felicity</h1>
          <p className="text-forest-400 text-sm">
            A few quick questions so I can actually be useful — skip anything
            you'd rather not share.
          </p>
        </div>

        <div className="rounded-2xl bg-white/70 border border-forest-100 shadow-soft p-5 space-y-4 max-h-[26rem] overflow-y-auto">
          {history.map((h, i) => (
            <div key={i} className="flex flex-col gap-2">
              <div className="self-start bg-forest-50 text-forest-700 rounded-xl rounded-bl-sm px-3 py-2 text-sm max-w-[85%]">
                {h.prompt}
              </div>
              <div className="self-end bg-forest-600 text-cream-50 rounded-xl rounded-br-sm px-3 py-2 text-sm max-w-[85%]">
                {h.answer}
              </div>
            </div>
          ))}

          {!done && (
            <div className="self-start bg-forest-50 text-forest-700 rounded-xl rounded-bl-sm px-3 py-2 text-sm max-w-[85%]">
              {question.prompt}
            </div>
          )}

          {done && (
            <div className="self-start bg-forest-50 text-forest-700 rounded-xl rounded-bl-sm px-3 py-2 text-sm max-w-[85%]">
              Thank you for sharing that with me — I'll keep it in mind. You
              can see, edit, or remove anything I know about you anytime from
              "What I Know About You."
            </div>
          )}
        </div>

        {!done ? (
          <>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                submitAnswer(false);
              }}
              className="flex items-center gap-2"
            >
              <input
                autoFocus
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type your answer..."
                className="flex-1 rounded-lg border border-forest-100 px-3 py-2 bg-white text-forest-700"
              />
              <button
                type="submit"
                disabled={submitting}
                className="rounded-lg bg-forest-600 text-cream-50 px-4 py-2 text-sm shadow-soft hover:bg-forest-700 transition-colors disabled:opacity-50"
              >
                Send
              </button>
            </form>
            <div className="flex items-center justify-between text-xs text-forest-300 px-1">
              <span>
                Question {index + 1} of {QUESTIONS.length}
              </span>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => submitAnswer(true)}
                  className="hover:text-forest-500"
                >
                  Skip this question
                </button>
                <button onClick={complete} className="hover:text-forest-500">
                  Skip for now
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="text-center">
            <button
              onClick={complete}
              disabled={finishing}
              className="rounded-lg bg-forest-600 text-cream-50 px-5 py-2.5 text-sm shadow-soft hover:bg-forest-700 transition-colors disabled:opacity-50"
            >
              {finishing ? "Getting things ready…" : "Let's go"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
