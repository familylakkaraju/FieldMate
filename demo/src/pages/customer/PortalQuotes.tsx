import { Link } from 'react-router-dom';
import { ArrowRight, ChevronRight, FileText } from 'lucide-react';
import type { Quote } from '../../types/domain';
import { quoteTotal } from '../../app/selectors';
import { dayMonthYear, money } from '../../utils/format';
import { cx } from '../../utils/cx';
import { EmptyState } from '../../components/common/Card';
import { isQuotePending, PortalHeading, PortalNoAccount, QuoteStatusBadge, SectionTitle, ServiceTile, usePortal } from '../../components/customer/PortalUi';

export default function PortalQuotes() {
  const { customer, lead, quotes } = usePortal();
  if (!customer && !lead) return <PortalNoAccount />;
  const awaiting = quotes.filter((q) => isQuotePending(q.status));
  const others = quotes.filter((q) => !isQuotePending(q.status));
  return (
    <>
      <PortalHeading title="Quotes" subtitle="Review, accept or ask us about your quotes — all prices are fixed." />
      {quotes.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No quotes yet"
          text={!customer ? 'We’re preparing your quote — it will appear here as soon as it’s ready.' : 'Quotes we send you will appear here.'}
        />
      ) : (
        <div className="space-y-10">
          {awaiting.length > 0 && (
            <section aria-labelledby="q-awaiting">
              <SectionTitle id="q-awaiting" title="Awaiting your approval" count={awaiting.length} />
              <ul className="grid gap-3">
                {awaiting.map((q) => (
                  <li key={q.id}>
                    <QuoteRow quote={q} />
                  </li>
                ))}
              </ul>
            </section>
          )}
          {others.length > 0 && (
            <section aria-labelledby="q-past">
              <SectionTitle id="q-past" title={awaiting.length ? 'Other quotes' : 'Your quotes'} count={others.length} />
              <ul className="grid gap-3">
                {others.map((q) => (
                  <li key={q.id}>
                    <QuoteRow quote={q} />
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}
    </>
  );
}

function QuoteRow({ quote }: { quote: Quote }) {
  const pending = isQuotePending(quote.status);
  const dates =
    quote.status === 'accepted' && quote.acceptedAt
      ? `Accepted ${dayMonthYear(quote.acceptedAt)}`
      : quote.status === 'declined' && quote.declinedAt
        ? `Declined ${dayMonthYear(quote.declinedAt)}`
        : `Sent ${dayMonthYear(quote.sentAt ?? quote.createdAt)} · valid until ${dayMonthYear(quote.validUntil)}`;
  return (
    <Link
      to={`/portal/quotes/${quote.id}`}
      className={cx('card group flex flex-col gap-4 p-4 transition hover:-translate-y-0.5 hover:shadow-raised sm:flex-row sm:items-center sm:p-5', pending && 'border-secondary-tint ring-1 ring-secondary-tint')}
    >
      <div className="flex min-w-0 flex-1 items-start gap-4">
        <ServiceTile service={quote.service} />
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-display text-base font-bold text-ink">{quote.title}</p>
            <QuoteStatusBadge status={quote.status} />
          </div>
          <p className="mt-0.5 text-[13px] text-muted">
            {quote.ref} · {dates}
          </p>
        </div>
      </div>
      <div className="flex items-center justify-between gap-4 border-t border-line pt-3 sm:border-0 sm:pt-0">
        <p className="tabular font-display text-xl font-extrabold text-ink">{money(quoteTotal(quote), true)}</p>
        {pending ? (
          <span className="inline-flex h-9 items-center gap-1.5 rounded-control bg-secondary-solid px-3.5 text-[13px] font-semibold text-secondary-on shadow-sm transition group-hover:brightness-110">
            Review & accept <ArrowRight className="size-3.5" aria-hidden />
          </span>
        ) : (
          <span className="inline-flex items-center gap-0.5 text-sm font-semibold text-secondary-ink">
            View <ChevronRight className="size-4 transition group-hover:translate-x-0.5" aria-hidden />
          </span>
        )}
      </div>
    </Link>
  );
}
