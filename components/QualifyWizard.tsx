"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  STATE_OPTIONS,
  LAND_OPTIONS,
  ACREAGE_OPTIONS,
  TIMELINE_OPTIONS,
  STAGE_OPTIONS,
  BUDGET_OPTIONS,
  BEST_TIME_OPTIONS,
  type Option,
} from "@/lib/form-options";

const STORAGE_KEY = "bb_qualify_progress";
const TOTAL_STEPS = 5;

interface FormState {
  state: string;
  landOwnership: string;
  acreage: string;
  timeline: string;
  buildStage: string;
  budget: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  bestTime: string;
}

const EMPTY: FormState = {
  state: "",
  landOwnership: "",
  acreage: "",
  timeline: "",
  buildStage: "",
  budget: "",
  firstName: "",
  lastName: "",
  phone: "",
  email: "",
  bestTime: "",
};

function ChoiceGroup({
  options,
  value,
  onSelect,
}: {
  options: Option[];
  value: string;
  onSelect: (v: string) => void;
}) {
  return (
    <div className="grid gap-3">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onSelect(o.value)}
          className={
            "rounded-lg border px-4 py-3 text-left text-base transition-colors " +
            (value === o.value
              ? "border-rust bg-rust/10 font-semibold text-ink"
              : "border-sand bg-cream text-charcoal hover:border-rust")
          }
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export default function QualifyWizard({
  initialState = "",
  variant = "A",
}: {
  initialState?: string;
  variant?: string;
}) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormState>({
    ...EMPTY,
    state: initialState,
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as Partial<FormState>;
        setForm((f) => ({ ...f, ...parsed, state: initialState || (parsed.state ?? "") }));
      }
    } catch {
      /* ignore */
    }
  }, [initialState]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(form));
    } catch {
      /* ignore */
    }
  }, [form]);

  function set<K extends keyof FormState>(key: K, val: FormState[K]) {
    setForm((f) => ({ ...f, [key]: val }));
  }

  const stepValid = (() => {
    switch (step) {
      case 1:
        return !!form.state;
      case 2:
        return !!form.landOwnership && !!form.acreage;
      case 3:
        return !!form.timeline && !!form.buildStage;
      case 4:
        return !!form.budget;
      case 5:
        return (
          form.firstName.trim().length > 0 &&
          form.phone.trim().length >= 7 &&
          /\S+@\S+\.\S+/.test(form.email)
        );
      default:
        return false;
    }
  })();

  async function submit() {
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, source: "form", variant }),
      });
      if (!res.ok) throw new Error("submit failed");
      localStorage.removeItem(STORAGE_KEY);
      router.push("/thank-you");
    } catch {
      setError("Something went wrong. Please try again.");
      setSubmitting(false);
    }
  }

  if (form.state === "OTHER") {
    return (
      <div className="rounded-lg border border-sand bg-cream p-6 text-center">
        <h2 className="text-xl font-bold text-ink">
          We&apos;re not in your state yet
        </h2>
        <p className="mt-3 text-charcoal">
          Right now we match builders in Texas, Tennessee, Oklahoma, and
          Louisiana. Leave your email and we&apos;ll reach out when we expand.
        </p>
        <a
          href="mailto:hello@barndobuilt.com"
          className="mt-5 inline-block rounded-md bg-rust px-6 py-3 font-semibold text-cream hover:bg-rust-dark"
        >
          Email us to get notified
        </a>
        <button
          type="button"
          onClick={() => set("state", "")}
          className="mt-4 block mx-auto text-sm text-steel hover:text-rust"
        >
          ← Pick a different state
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-sand bg-cream p-6">
      {/* Progress */}
      <div className="mb-6">
        <div className="flex justify-between text-sm text-steel">
          <span>
            Step {step} of {TOTAL_STEPS}
          </span>
          <span>{Math.round((step / TOTAL_STEPS) * 100)}%</span>
        </div>
        <div className="mt-2 h-2 rounded-full bg-sand">
          <div
            className="h-2 rounded-full bg-rust transition-all"
            style={{ width: `${(step / TOTAL_STEPS) * 100}%` }}
          />
        </div>
      </div>

      {step === 1 && (
        <div>
          <h2 className="text-xl font-bold text-ink">
            Which state is your land in?
          </h2>
          <p className="mt-1 text-sm text-charcoal">
            We match you with a builder who knows your region.
          </p>
          <div className="mt-5">
            <ChoiceGroup
              options={STATE_OPTIONS}
              value={form.state}
              onSelect={(v) => set("state", v)}
            />
          </div>
        </div>
      )}

      {step === 2 && (
        <div>
          <h2 className="text-xl font-bold text-ink">
            Do you own the land you want to build on?
          </h2>
          <div className="mt-5">
            <ChoiceGroup
              options={LAND_OPTIONS}
              value={form.landOwnership}
              onSelect={(v) => set("landOwnership", v)}
            />
          </div>
          <p className="mt-6 font-semibold text-ink">How much acreage?</p>
          <div className="mt-3">
            <ChoiceGroup
              options={ACREAGE_OPTIONS}
              value={form.acreage}
              onSelect={(v) => set("acreage", v)}
            />
          </div>
        </div>
      )}

      {step === 3 && (
        <div>
          <h2 className="text-xl font-bold text-ink">
            When do you want to break ground?
          </h2>
          <div className="mt-5">
            <ChoiceGroup
              options={TIMELINE_OPTIONS}
              value={form.timeline}
              onSelect={(v) => set("timeline", v)}
            />
          </div>
          <p className="mt-6 font-semibold text-ink">
            Where are you in the process?
          </p>
          <div className="mt-3">
            <ChoiceGroup
              options={STAGE_OPTIONS}
              value={form.buildStage}
              onSelect={(v) => set("buildStage", v)}
            />
          </div>
        </div>
      )}

      {step === 4 && (
        <div>
          <h2 className="text-xl font-bold text-ink">
            What&apos;s your rough construction budget?
          </h2>
          <p className="mt-1 text-sm text-charcoal">
            A ballpark is fine — your builder confirms real numbers after a site
            visit.
          </p>
          <div className="mt-5">
            <ChoiceGroup
              options={BUDGET_OPTIONS}
              value={form.budget}
              onSelect={(v) => set("budget", v)}
            />
          </div>
        </div>
      )}

      {step === 5 && (
        <div>
          <h2 className="text-xl font-bold text-ink">
            Where should your builder reach you?
          </h2>
          <div className="mt-5 grid gap-3">
            <div className="grid grid-cols-2 gap-3">
              <input
                placeholder="First name"
                value={form.firstName}
                onChange={(e) => set("firstName", e.target.value)}
                className="rounded-md border border-sand bg-cream px-3 py-2.5 outline-none focus:border-rust"
              />
              <input
                placeholder="Last name"
                value={form.lastName}
                onChange={(e) => set("lastName", e.target.value)}
                className="rounded-md border border-sand bg-cream px-3 py-2.5 outline-none focus:border-rust"
              />
            </div>
            <input
              placeholder="Phone number"
              type="tel"
              value={form.phone}
              onChange={(e) => set("phone", e.target.value)}
              className="rounded-md border border-sand bg-cream px-3 py-2.5 outline-none focus:border-rust"
            />
            <input
              placeholder="Email address"
              type="email"
              value={form.email}
              onChange={(e) => set("email", e.target.value)}
              className="rounded-md border border-sand bg-cream px-3 py-2.5 outline-none focus:border-rust"
            />
            <div>
              <p className="text-sm font-semibold text-ink mb-2">
                Best time to call
              </p>
              <div className="flex gap-2">
                {BEST_TIME_OPTIONS.map((o) => (
                  <button
                    key={o.value}
                    type="button"
                    onClick={() => set("bestTime", o.value)}
                    className={
                      "flex-1 rounded-md border px-3 py-2 text-sm transition-colors " +
                      (form.bestTime === o.value
                        ? "border-rust bg-rust/10 font-semibold"
                        : "border-sand hover:border-rust")
                    }
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <p className="mt-4 text-xs text-steel">
            Your information is shared only with the matched regional builder. No
            spam, no reselling your data.
          </p>
        </div>
      )}

      {error && <p className="mt-4 text-sm text-rust">{error}</p>}

      {/* Nav */}
      <div className="mt-7 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setStep((s) => Math.max(1, s - 1))}
          disabled={step === 1}
          className="text-sm font-semibold text-steel hover:text-rust disabled:opacity-0"
        >
          ← Back
        </button>
        {step < TOTAL_STEPS ? (
          <button
            type="button"
            onClick={() => setStep((s) => s + 1)}
            disabled={!stepValid}
            className="rounded-md bg-rust px-6 py-2.5 font-semibold text-cream hover:bg-rust-dark disabled:opacity-40"
          >
            Continue
          </button>
        ) : (
          <button
            type="button"
            onClick={submit}
            disabled={!stepValid || submitting}
            className="rounded-md bg-rust px-6 py-2.5 font-semibold text-cream hover:bg-rust-dark disabled:opacity-40"
          >
            {submitting ? "Submitting…" : "Connect Me With My Builder"}
          </button>
        )}
      </div>
    </div>
  );
}
