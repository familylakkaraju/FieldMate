import { useState, type ReactNode } from 'react';
import { Lightbulb, Table2, ChartColumn } from 'lucide-react';
import { CHART } from '../../theme/chartPalette';
import { cx } from '../../utils/cx';

/** Card wrapper for a chart: title, legend, optional table view and a text insight underneath. */
export function ChartCard({
  title,
  subtitle,
  insight,
  legend,
  table,
  children,
  className,
}: {
  title: string;
  subtitle?: string;
  insight?: ReactNode;
  legend?: { label: string; color: string }[];
  table?: { columns: string[]; rows: (string | number)[][] };
  children: ReactNode;
  className?: string;
}) {
  const [asTable, setAsTable] = useState(false);
  return (
    <section className={cx('card flex flex-col p-5', className)} aria-label={title}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-[15px] font-bold text-ink">{title}</h2>
          {subtitle && <p className="text-[13px] text-muted">{subtitle}</p>}
        </div>
        {table && (
          <button
            type="button"
            onClick={() => setAsTable((v) => !v)}
            aria-pressed={asTable}
            aria-label={asTable ? `Show ${title} as chart` : `Show ${title} as table`}
            className="grid size-8 shrink-0 place-items-center rounded-lg text-muted hover:bg-subtle hover:text-ink"
          >
            {asTable ? <ChartColumn className="size-4" /> : <Table2 className="size-4" />}
          </button>
        )}
      </div>
      {legend && legend.length > 1 && !asTable && (
        <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-2">
          {legend.map((l) => (
            <li key={l.label} className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-[3px]" style={{ background: l.color }} aria-hidden /> {l.label}
            </li>
          ))}
        </ul>
      )}
      <div className="mt-3 flex-1">
        {asTable && table ? (
          <div className="max-h-72 overflow-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase tracking-wide text-muted">
                <tr>
                  {table.columns.map((c) => (
                    <th key={c} className="pb-2 pr-3 font-semibold">
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {table.rows.map((r, i) => (
                  <tr key={i}>
                    {r.map((cell, k) => (
                      <td key={k} className={cx('tabular py-1.5 pr-3', k === 0 ? 'text-ink' : 'text-ink-2')}>
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          children
        )}
      </div>
      {insight && (
        <p className="mt-4 flex items-start gap-2 rounded-xl bg-canvas p-3 text-[13px] leading-relaxed text-ink-2">
          <Lightbulb className="mt-0.5 size-4 shrink-0 text-warning-ink" aria-hidden /> <span>{insight}</span>
        </p>
      )}
    </section>
  );
}

export const axisProps = {
  tick: { fill: CHART.muted, fontSize: 12 },
  tickLine: false,
  axisLine: { stroke: CHART.axis },
} as const;

/** Tooltip styled with text tokens (values in ink, identity carried by a swatch). */
export function ChartTooltip({ active, payload, label, money: isMoney = true, suffix = '' }: { active?: boolean; payload?: { name: string; value: number; color: string; dataKey: string }[]; label?: string; money?: boolean; suffix?: string }) {
  if (!active || !payload?.length) return null;
  const fmt = (v: number) => (isMoney ? `£${Math.round(v).toLocaleString('en-GB')}` : `${Math.round(v * 10) / 10}${suffix}`);
  const total = payload.reduce((a, p) => a + (Number(p.value) || 0), 0);
  return (
    <div className="rounded-xl border border-line bg-surface px-3 py-2.5 text-xs shadow-float">
      {label && <p className="mb-1.5 font-bold text-ink">{label}</p>}
      <ul className="space-y-1">
        {payload.map((p) => (
          <li key={p.dataKey} className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5 text-ink-2">
              <span className="size-2.5 rounded-[3px]" style={{ background: p.color }} aria-hidden /> {p.name}
            </span>
            <span className="tabular font-semibold text-ink">{fmt(Number(p.value))}</span>
          </li>
        ))}
      </ul>
      {payload.length > 1 && isMoney && (
        <p className="mt-1.5 flex justify-between border-t border-line pt-1.5 font-bold text-ink">
          <span>Total</span>
          <span className="tabular">{fmt(total)}</span>
        </p>
      )}
    </div>
  );
}
