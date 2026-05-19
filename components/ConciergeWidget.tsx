"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

interface Msg {
  role: "user" | "assistant";
  content: string;
}

const GREETING =
  "Hey there — I'm the BarndoBuilt concierge. Ask me anything about barndominiums: cost, financing, the build process, or whether your land's a fit. Happy to help.";

export default function ConciergeWidget() {
  const [open, setOpen] = useState(false);
  const [nudged, setNudged] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([
    { role: "assistant", content: GREETING },
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setNudged(true), 20000);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages, open]);

  async function send() {
    const text = input.trim();
    if (!text || busy) return;
    const next: Msg[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    setInput("");
    setBusy(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: next.map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      if (!res.ok || !res.body) throw new Error("chat failed");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      setMessages((m) => [...m, { role: "assistant", content: "" }]);

      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        setMessages((m) => {
          const copy = [...m];
          copy[copy.length - 1] = { role: "assistant", content: acc };
          return copy;
        });
      }
    } catch {
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content:
            "Sorry — I hit a snag. You can still get matched directly at the qualify page.",
        },
      ]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-3">
      {!open && nudged && (
        <button
          onClick={() => setOpen(true)}
          className="max-w-[16rem] rounded-xl bg-cream border border-sand shadow-lg px-4 py-3 text-left text-sm text-charcoal hover:border-rust"
        >
          Questions about building a barndo? I can walk you through it. →
        </button>
      )}

      {open && (
        <div className="w-[22rem] max-w-[calc(100vw-2rem)] h-[30rem] rounded-xl bg-cream border border-sand shadow-2xl flex flex-col overflow-hidden">
          <div className="flex items-center justify-between bg-rust text-cream px-4 py-3">
            <span className="font-semibold text-sm">BarndoBuilt Concierge</span>
            <button
              onClick={() => setOpen(false)}
              aria-label="Close chat"
              className="text-cream/80 hover:text-cream text-lg leading-none"
            >
              ×
            </button>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-3">
            {messages.map((m, i) => (
              <div
                key={i}
                className={
                  m.role === "user" ? "flex justify-end" : "flex justify-start"
                }
              >
                <div
                  className={
                    "rounded-lg px-3 py-2 text-sm max-w-[85%] whitespace-pre-wrap " +
                    (m.role === "user"
                      ? "bg-rust text-cream"
                      : "bg-sand text-ink")
                  }
                >
                  {m.content || "…"}
                </div>
              </div>
            ))}
          </div>

          <div className="border-t border-sand p-2">
            <Link
              href="/qualify"
              className="block text-center text-xs text-rust font-semibold pb-2 hover:underline"
            >
              Ready? Check if you qualify →
            </Link>
            <div className="flex gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && send()}
                placeholder="Ask a question…"
                className="flex-1 rounded-md border border-sand bg-cream px-3 py-2 text-sm outline-none focus:border-rust"
              />
              <button
                onClick={send}
                disabled={busy}
                className="rounded-md bg-rust px-3 py-2 text-sm font-semibold text-cream hover:bg-rust-dark disabled:opacity-50"
              >
                Send
              </button>
            </div>
          </div>
        </div>
      )}

      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="rounded-full bg-rust text-cream w-14 h-14 shadow-xl hover:bg-rust-dark flex items-center justify-center text-2xl"
          aria-label="Open concierge chat"
        >
          ☰
        </button>
      )}
    </div>
  );
}
