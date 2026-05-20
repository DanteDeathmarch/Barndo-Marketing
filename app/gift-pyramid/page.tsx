"use client";

// Capital campaign gift-pyramid planner.
// Drag the goal slider; the table + bars update live. Fill in your actual
// qualified-prospect counts to see which tiers are thin.
//
// Model: classic gift-range chart. The pyramid totals ~107% of the goal to
// absorb the gifts that come in below ask. Prospect ratios: 4× at the
// lead/major tiers, 5–6× at mid/grassroots (cold response drops with size).

import { useMemo, useState } from "react";

interface TierSpec {
  name: string;
  count: number;
  pctOfGoal: number; // each gift = goal × pctOfGoal
  prospectsRatio: number; // qualified prospects needed per gift
}

const TIERS: TierSpec[] = [
  { name: "Lead gift", count: 1, pctOfGoal: 0.15, prospectsRatio: 4 },
  { name: "Principal", count: 2, pctOfGoal: 0.1, prospectsRatio: 4 },
  { name: "Leadership", count: 4, pctOfGoal: 0.05, prospectsRatio: 4 },
  { name: "Major", count: 8, pctOfGoal: 0.025, prospectsRatio: 4 },
  { name: "Mid-level", count: 20, pctOfGoal: 0.01, prospectsRatio: 5 },
  { name: "Sustaining", count: 50, pctOfGoal: 0.0025, prospectsRatio: 5 },
];

function fmtMoney(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(n >= 10_000_000 ? 1 : 2)}M`;
  if (n >= 1_000) return `$${Math.round(n / 1_000)}K`;
  return `$${Math.round(n)}`;
}

export default function GiftPyramidPage() {
  const [goal, setGoal] = useState(2_000_000);
  const [actuals, setActuals] = useState<Record<string, string>>({});

  const tiers = useMemo(() => {
    return TIERS.map((t) => {
      const giftSize = goal * t.pctOfGoal;
      const subtotal = giftSize * t.count;
      const prospectsNeeded = t.count * t.prospectsRatio;
      const actualRaw = actuals[t.name];
      const actual =
        actualRaw && actualRaw.trim() !== "" ? Number(actualRaw) : null;
      const thin = actual !== null && actual < prospectsNeeded;
      return { ...t, giftSize, subtotal, prospectsNeeded, actual, thin };
    });
  }, [goal, actuals]);

  const total = tiers.reduce((s, t) => s + t.subtotal, 0);
  const cushion = Math.round((total / goal - 1) * 100);
  const totalProspects = tiers.reduce((s, t) => s + t.prospectsNeeded, 0);
  const maxCount = Math.max(...tiers.map((t) => t.count));
  const thinTiers = tiers.filter((t) => t.thin);

  return (
    <div className="container-x py-12 max-w-3xl">
      <h1 className="text-3xl font-bold text-ink">
        Capital Campaign Gift Pyramid
      </h1>
      <p className="mt-2 text-charcoal">
        Drag the goal. The table updates live. Type your actual qualified
        prospects per tier to flag where you&apos;re thin.
      </p>

      {/* Goal slider */}
      <div className="mt-8 rounded-lg border border-sand bg-cream p-5">
        <div className="flex items-baseline justify-between">
          <label className="text-sm font-semibold text-ink">Campaign goal</label>
          <span className="text-2xl font-bold text-rust">{fmtMoney(goal)}</span>
        </div>
        <input
          type="range"
          min={100_000}
          max={10_000_000}
          step={50_000}
          value={goal}
          onChange={(e) => setGoal(parseInt(e.target.value))}
          className="w-full mt-3 accent-rust"
          aria-label="Campaign goal"
        />
        <div className="flex justify-between text-xs text-steel mt-1">
          <span>$100K</span>
          <span>$10M</span>
        </div>
      </div>

      {/* Pyramid bars */}
      <div className="mt-8 space-y-2">
        {tiers.map((t) => {
          const widthPct = (t.count / maxCount) * 100;
          return (
            <div key={t.name} className="flex items-center gap-3 text-sm">
              <div className="w-28 text-right text-charcoal shrink-0">
                {t.name}
              </div>
              <div className="flex-1">
                <div
                  className={
                    "h-8 rounded flex items-center text-cream font-medium " +
                    (t.thin ? "bg-rust" : "bg-rust/75")
                  }
                  style={{ width: `${Math.max(widthPct, 12)}%` }}
                >
                  <span className="px-2 text-xs whitespace-nowrap">
                    {t.count} × {fmtMoney(t.giftSize)} = {fmtMoney(t.subtotal)}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Detail table */}
      <table className="mt-8 w-full text-sm">
        <thead>
          <tr className="border-b border-sand text-left text-steel">
            <th className="pb-2 font-medium">Tier</th>
            <th className="pb-2 font-medium text-right">Gifts</th>
            <th className="pb-2 font-medium text-right">Each</th>
            <th className="pb-2 font-medium text-right">Subtotal</th>
            <th className="pb-2 font-medium text-right">Prospects needed</th>
            <th className="pb-2 font-medium text-right">You have</th>
          </tr>
        </thead>
        <tbody>
          {tiers.map((t) => (
            <tr
              key={t.name}
              className={
                "border-b border-sand " + (t.thin ? "bg-rust/10" : "")
              }
            >
              <td className="py-2 text-charcoal">{t.name}</td>
              <td className="py-2 text-right">{t.count}</td>
              <td className="py-2 text-right">{fmtMoney(t.giftSize)}</td>
              <td className="py-2 text-right">{fmtMoney(t.subtotal)}</td>
              <td className="py-2 text-right text-steel">
                {t.prospectsNeeded}{" "}
                <span className="text-xs">({t.prospectsRatio}×)</span>
              </td>
              <td className="py-2 text-right">
                <input
                  type="number"
                  min={0}
                  placeholder="—"
                  value={actuals[t.name] ?? ""}
                  onChange={(e) =>
                    setActuals({ ...actuals, [t.name]: e.target.value })
                  }
                  className="w-20 rounded border border-sand bg-cream px-2 py-1 text-right outline-none focus:border-rust"
                  aria-label={`Actual prospects for ${t.name}`}
                />
              </td>
            </tr>
          ))}
          <tr className="font-semibold">
            <td className="pt-3 text-ink">Total</td>
            <td className="pt-3 text-right">
              {tiers.reduce((s, t) => s + t.count, 0)}
            </td>
            <td></td>
            <td className="pt-3 text-right">{fmtMoney(total)}</td>
            <td className="pt-3 text-right">{totalProspects}</td>
            <td></td>
          </tr>
        </tbody>
      </table>

      <p className="mt-4 text-sm text-charcoal">
        Pyramid sums to <strong>{fmtMoney(total)}</strong>{" "}
        <span className="text-steel">({cushion}% over goal)</span> — the
        cushion absorbs gifts that come in below ask. Aim for the pyramid to
        total <strong>105–115%</strong> of the goal.
      </p>

      {/* Thin-tier callout */}
      {thinTiers.length > 0 && (
        <div className="mt-4 rounded-lg border border-rust bg-rust/10 p-4 text-sm">
          <p className="font-semibold text-rust">
            Thin tiers: {thinTiers.map((t) => t.name).join(", ")}
          </p>
          <p className="mt-2 text-charcoal">
            You need roughly {thinTiers[0].prospectsRatio}× as many qualified
            prospects as gifts at the top tiers to realistically close the
            count. Options: (1) expand the prospect pool with research and
            cultivation, (2) extend the campaign timeline so cultivation can
            mature, or (3) lower the goal and rebuild the pyramid against the
            prospects you actually have.
          </p>
        </div>
      )}

      <p className="mt-8 text-xs text-steel">
        Classic gift-range chart. Prospect ratios: 4× at lead/major tiers, 5×
        at mid, scaling for cold response. Adjust the tier counts and
        percentages in <code>TIERS</code> if your sector or campaign style
        differs from the default.
      </p>
    </div>
  );
}
