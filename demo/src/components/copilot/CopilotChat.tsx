import { memo, useCallback, useEffect, useId, useImperativeHandle, useLayoutEffect, useRef, useState, type FormEvent, type KeyboardEvent, type ReactNode, type Ref } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  ArrowUp,
  ArrowUpRight,
  CalendarClock,
  Check,
  CheckCircle2,
  ClipboardList,
  FilePen,
  FilePlus,
  Info,
  Lightbulb,
  Loader2,
  MapPin,
  Repeat,
  Send,
  Sparkles,
  Square,
  Timer,
  TrendingUp,
  TriangleAlert,
  UserCheck,
  Wand2,
  type LucideIcon,
} from 'lucide-react';
import { useDemo } from '../../app/DemoProvider';
import { getLead } from '../../app/selectors';
import { PRIYA_LEAD_ID, SARAH_LEAD_ID } from '../../data/leads';
import { useToast } from '../common/Toast';
import {
  ASK_KEYS,
  PRESET_PROMPTS,
  WORKER_PROMPTS,
  pendingReminders,
  respond,
  type Block,
  type Chip,
  type ChipAction,
  type CopilotAnswer,
  type CopilotAudience,
  type PresetPrompt,
} from '../../utils/demoResponses';
import { MORRISON_JOB_ID, MORRISON_NEW, routeSuggestion } from '../../utils/insights';
import { cx } from '../../utils/cx';

// ---------------------------------------------------------------- types & constants
type UserMsg = { id: string; role: 'user'; text: string };
type AssistantMsg = { id: string; role: 'assistant'; prompt: string; answer: CopilotAnswer; done: number[] };
type Msg = UserMsg | AssistantMsg;

interface StreamState {
  id: string;
  steps: number; // steps completed so far
  revealed: number; // characters (or table-row units) revealed so far
  total: number;
}

export interface CopilotChatHandle {
  ask: (prompt: string) => void;
  clear: () => void;
}

export interface CopilotChatProps {
  variant?: 'full' | 'compact';
  /** An `?ask=` key (plan, risk, sarah…) or a full prompt; run once when it changes. */
  initialAsk?: string;
  /** Optional imperative handle so a page can ask questions or clear the conversation. */
  handleRef?: Ref<CopilotChatHandle>;
  onCountChange?: (count: number) => void;
  className?: string;
}

const STEP_MS = 350;
const TICK_MS = 15;
const ROW_COST = 28; // a table row "costs" this many characters of streaming time

const PROMPT_ICONS: Record<string, LucideIcon> = {
  plan: CalendarClock,
  next: MapPin,
  risk: TriangleAlert,
  sarah: FilePen,
  shah: ClipboardList,
  recurring: Repeat,
  time: Timer,
  profitable: TrendingUp,
};

const ACTION_ICONS: Record<ChipAction, LucideIcon> = {
  'apply-route': Wand2,
  'create-quote-sarah': FilePlus,
  'convert-priya': UserCheck,
  'send-reminders': Send,
};

// Conversations survive navigating away (e.g. following a chip) and back again.
const memory: Record<'full' | 'compact', Msg[]> = { full: [], compact: [] };

let seq = 0;
const nextId = (p: string) => `${p}-${Date.now().toString(36)}-${(++seq).toString(36)}`;
const prefersReducedMotion = () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
const hasFinePointer = () => typeof window !== 'undefined' && !!window.matchMedia?.('(pointer: fine)').matches;

const plainLen = (t: string) => t.replace(/\*\*/g, '').length;

function blockCost(b: Block): number {
  switch (b.type) {
    case 'p':
    case 'callout':
      return Math.max(1, plainLen(b.text));
    case 'bullets':
      return Math.max(1, b.items.reduce((a, t) => a + plainLen(t), 0));
    case 'table':
      return Math.max(1, b.rows.length) * ROW_COST;
  }
}

const answerCost = (a: CopilotAnswer) => a.blocks.reduce((s, b) => s + blockCost(b), 0);

// ---------------------------------------------------------------- inline text (**bold**) with partial reveal
function parseInline(text: string) {
  const out: { t: string; b: boolean }[] = [];
  const re = /\*\*(.+?)\*\*/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push({ t: text.slice(last, m.index), b: false });
    out.push({ t: m[1], b: true });
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push({ t: text.slice(last), b: false });
  return out;
}

function Inline({ text, limit }: { text: string; limit?: number }) {
  let left = limit ?? Number.POSITIVE_INFINITY;
  const nodes: ReactNode[] = [];
  parseInline(text).forEach((s, i) => {
    if (left <= 0) return;
    const t = s.t.slice(0, left);
    left -= s.t.length;
    nodes.push(
      s.b ? (
        <strong key={i} className="font-semibold text-ink">
          {t}
        </strong>
      ) : (
        <span key={i}>{t}</span>
      ),
    );
  });
  return <>{nodes}</>;
}

function Caret() {
  return <span className="ml-0.5 inline-block h-[1.05em] w-[3px] translate-y-[3px] animate-pulse rounded-full bg-secondary" aria-hidden />;
}

// ---------------------------------------------------------------- brand mark
export function CopilotMark({ size = 'md', className }: { size?: 'xs' | 'sm' | 'md' | 'lg'; className?: string }) {
  const box = { xs: 'size-6 rounded-lg', sm: 'size-8 rounded-[10px]', md: 'size-10 rounded-xl', lg: 'size-16 rounded-2xl' }[size];
  const icon = { xs: 'size-3.5', sm: 'size-4', md: 'size-5', lg: 'size-8' }[size];
  return (
    <span className={cx('relative grid shrink-0 place-items-center bg-gradient-to-br from-secondary-solid to-accent-solid text-white shadow-raised ring-1 ring-inset ring-white/20', box, className)} aria-hidden>
      <Sparkles className={icon} />
    </span>
  );
}

// ---------------------------------------------------------------- blocks
const CALLOUT_TONES = {
  info: { box: 'border-secondary/20 bg-secondary-soft', ink: 'text-secondary-ink', icon: Lightbulb },
  warning: { box: 'border-warning/40 bg-warning-soft', ink: 'text-warning-ink', icon: TriangleAlert },
  success: { box: 'border-success/25 bg-success-soft', ink: 'text-success-ink', icon: CheckCircle2 },
} as const;

function BlockView({ block, visible, streaming, compact }: { block: Block; visible: number; streaming: boolean; compact: boolean }) {
  const size = compact ? 'text-[14px]' : 'text-[15px]';
  switch (block.type) {
    case 'p':
      return (
        <p className={cx(size, 'leading-relaxed text-ink-2')}>
          <Inline text={block.text} limit={streaming ? visible : undefined} />
          {streaming && <Caret />}
        </p>
      );
    case 'callout': {
      const tone = CALLOUT_TONES[block.tone];
      const Icon = tone.icon;
      return (
        <div className={cx('flex animate-fade-in gap-2.5 rounded-xl border px-3.5 py-3', tone.box)}>
          <Icon className={cx('mt-0.5 size-4.5 shrink-0', tone.ink)} aria-hidden />
          <p className={cx(compact ? 'text-[13.5px]' : 'text-[14px]', 'leading-relaxed text-ink')}>
            <Inline text={block.text} limit={streaming ? visible : undefined} />
            {streaming && <Caret />}
          </p>
        </div>
      );
    }
    case 'bullets': {
      let offset = 0;
      return (
        <ul className="space-y-2">
          {block.items.map((item, i) => {
            const len = plainLen(item);
            const start = offset;
            offset += len;
            const v = Math.min(len, visible - start);
            if (v <= 0) return null;
            const partial = streaming && v < len;
            return (
              <li key={i} className={cx('flex gap-2.5 leading-relaxed text-ink-2', size)}>
                <span className="mt-[0.62em] size-1.5 shrink-0 rounded-full bg-secondary" aria-hidden />
                <span className="min-w-0">
                  <Inline text={item} limit={partial ? v : undefined} />
                  {partial && <Caret />}
                </span>
              </li>
            );
          })}
        </ul>
      );
    }
    case 'table': {
      const shown = streaming ? Math.min(block.rows.length, Math.ceil(visible / ROW_COST)) : block.rows.length;
      const numeric = block.columns.map((_, ci) => block.rows.every((r) => !r[ci] || /^\**[£\d]/.test(r[ci])));
      return (
        <div className="overflow-x-auto rounded-xl border border-line bg-surface">
          <table className={cx('w-full border-collapse text-left text-[13px]', block.columns.length >= 4 && 'min-w-[30rem]')}>
            <thead className="bg-canvas">
              <tr>
                {block.columns.map((c, ci) => (
                  <th key={ci} scope="col" className={cx('whitespace-nowrap px-3 py-2 text-[11px] font-bold uppercase tracking-wide text-muted', numeric[ci] && 'text-right')}>
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {block.rows.slice(0, shown).map((r, ri) => (
                <tr key={ri} className={cx('animate-fade-in', /^\*\*/.test(r[0] ?? '') && 'bg-canvas/70')}>
                  {r.map((cell, ci) => (
                    <td key={ci} className={cx('px-3 py-2 align-top', ci === 0 ? 'font-medium text-ink' : 'text-ink-2', numeric[ci] && 'tabular whitespace-nowrap text-right')}>
                      <Inline text={cell} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }
  }
}

// ---------------------------------------------------------------- messages
function UserBubble({ text, compact }: { text: string; compact: boolean }) {
  return (
    <div className="flex animate-rise justify-end">
      <p className={cx('max-w-[85%] whitespace-pre-wrap break-words rounded-2xl rounded-br-md bg-secondary-solid px-4 py-2.5 leading-relaxed text-secondary-on shadow-sm', compact ? 'text-[14px]' : 'text-[15px]')}>
        <span className="sr-only">You asked: </span>
        {text}
      </p>
    </div>
  );
}

interface AssistantProps {
  msg: AssistantMsg;
  stream: StreamState | null; // set only while this message is streaming
  compact: boolean;
  routeApplied: boolean;
  onChip: (msgId: string, chip: Chip, index: number) => void;
}

const AssistantMessage = memo(function AssistantMessage({ msg, stream, compact, routeApplied, onChip }: AssistantProps) {
  const { answer } = msg;
  const inSteps = !!stream && stream.steps < answer.steps.length;
  const revealed = stream ? (inSteps ? 0 : stream.revealed) : Number.POSITIVE_INFINITY;
  let offset = 0;
  const blocks = answer.blocks.map((b, i) => {
    const cost = blockCost(b);
    const start = offset;
    offset += cost;
    const visible = Math.min(cost, revealed - start);
    if (visible <= 0) return null;
    return <BlockView key={i} block={b} visible={visible} streaming={!!stream && visible < cost} compact={compact} />;
  });

  return (
    <div className="flex animate-rise gap-3">
      {!compact && <CopilotMark size="sm" className="mt-0.5" />}
      <div className="min-w-0 flex-1 space-y-3">
        <p className="flex items-center gap-2 text-[13px] font-bold text-ink">
          {compact && <CopilotMark size="xs" />}
          <span className="sr-only">Copilot answered:</span>
          <span aria-hidden>Copilot</span>
          {stream && <span className="font-medium text-muted">· {inSteps ? 'checking your data…' : 'writing…'}</span>}
        </p>

        {answer.steps.length > 0 && (
          <ol className="space-y-1.5 rounded-xl border border-line bg-canvas/70 px-3.5 py-2.5" aria-label="What Copilot checked">
            {answer.steps.map((s, i) => {
              if (stream && i > stream.steps) return null;
              const running = !!stream && i === stream.steps;
              return (
                <li key={i} className="flex animate-fade-in items-center gap-2.5 text-[13px]">
                  {running ? (
                    <Loader2 className="size-4 shrink-0 animate-spin text-secondary-ink" aria-hidden />
                  ) : (
                    <span className="grid size-4 shrink-0 place-items-center rounded-full bg-success-soft text-success-ink">
                      <Check className="size-3" strokeWidth={3} aria-hidden />
                    </span>
                  )}
                  <span className={running ? 'font-medium text-ink' : 'text-ink-2'}>
                    {s}
                    {running ? '…' : ''}
                  </span>
                </li>
              );
            })}
          </ol>
        )}

        {blocks}

        {!stream && answer.chips.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-0.5">
            {answer.chips.map((chip, i) => {
              const isDone = msg.done.includes(i) || (chip.action === 'apply-route' && routeApplied);
              const Icon = isDone ? Check : chip.action ? ACTION_ICONS[chip.action] : ArrowUpRight;
              const label = isDone ? (chip.action === 'apply-route' ? 'Suggestion applied' : chip.action === 'send-reminders' ? 'Reminders sent' : `${chip.label} · done`) : chip.label;
              const nav = !chip.action && !isDone;
              return (
                <button
                  key={i}
                  type="button"
                  disabled={isDone}
                  onClick={() => onChip(msg.id, chip, i)}
                  style={{ animationDelay: `${i * 70}ms` }}
                  className={cx(
                    'inline-flex h-9 animate-rise items-center gap-1.5 rounded-full px-3.5 text-[13px] font-semibold transition active:scale-[0.98]',
                    isDone
                      ? 'cursor-default bg-success-soft text-success-ink ring-1 ring-inset ring-success/25'
                      : chip.action
                        ? 'bg-secondary-solid text-secondary-on shadow-sm hover:brightness-110'
                        : 'border border-line-2 bg-surface text-ink hover:border-secondary hover:bg-secondary-soft hover:text-secondary-ink',
                  )}
                >
                  {!nav && <Icon className="size-4" aria-hidden />}
                  {label}
                  {nav && <Icon className="size-3.5 opacity-70" aria-hidden />}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
});

function PromptIcon({ prompt, className }: { prompt: PresetPrompt; className?: string }) {
  const Icon = PROMPT_ICONS[prompt.key] ?? Sparkles;
  return <Icon className={className} aria-hidden />;
}

// ---------------------------------------------------------------- chat
export function CopilotChat({ variant = 'full', initialAsk, handleRef, onCountChange, className }: CopilotChatProps) {
  const compact = variant === 'compact';
  const { state, actions } = useDemo();
  const navigate = useNavigate();
  const toast = useToast();
  const { pathname } = useLocation();
  const audience: CopilotAudience = pathname.startsWith('/worker') ? 'worker' : 'owner';
  const prompts = audience === 'worker' ? WORKER_PROMPTS : PRESET_PROMPTS;

  const [messages, setMessages] = useState<Msg[]>(() => memory[variant]);
  const [stream, setStream] = useState<StreamState | null>(null);
  const [text, setText] = useState('');

  const stateRef = useRef(state);
  stateRef.current = state;
  const messagesRef = useRef(messages);
  messagesRef.current = messages;
  const rootRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const stickRef = useRef(true);
  const askedRef = useRef<string | undefined>(undefined);
  const inputId = useId();
  const routeApplied = routeSuggestion(state.data).applied;

  // ---- sending
  const send = useCallback(
    (raw: string) => {
      const prompt = raw.trim();
      if (!prompt) return;
      const answer = respond(prompt, stateRef.current, { audience });
      const id = nextId('a');
      setMessages((ms) => [...ms, { id: nextId('u'), role: 'user', text: prompt }, { id, role: 'assistant', prompt, answer, done: [] }]);
      setText('');
      stickRef.current = true;
      setStream(prefersReducedMotion() ? null : { id, steps: 0, revealed: 0, total: answerCost(answer) });
      if (hasFinePointer()) inputRef.current?.focus({ preventScroll: true });
    },
    [audience],
  );

  const clear = useCallback(() => {
    setStream(null);
    setMessages([]);
    setText('');
  }, []);

  const stop = () => setStream(null);

  useImperativeHandle(handleRef, () => ({ ask: send, clear }), [send, clear]);

  // ---- ?ask= deep link (runs once per distinct value)
  useEffect(() => {
    if (!initialAsk) {
      askedRef.current = undefined;
      return;
    }
    if (askedRef.current === initialAsk) return;
    askedRef.current = initialAsk;
    send(ASK_KEYS[initialAsk] ?? initialAsk);
  }, [initialAsk, send]);

  // ---- remember the conversation across navigation
  useEffect(() => {
    memory[variant] = messages;
    onCountChange?.(messages.length);
  }, [messages, variant, onCountChange]);

  // ---- simulated streaming: steps one by one, then text, then chips
  useEffect(() => {
    if (!stream) return;
    const msg = messagesRef.current.find((m) => m.id === stream.id);
    const stepCount = msg?.role === 'assistant' ? msg.answer.steps.length : 0;
    let t: number;
    if (stream.steps < stepCount) {
      t = window.setTimeout(() => setStream((s) => (s && s.id === stream.id ? { ...s, steps: s.steps + 1 } : s)), STEP_MS);
    } else if (stream.revealed < stream.total) {
      t = window.setTimeout(() => setStream((s) => (s && s.id === stream.id ? { ...s, revealed: Math.min(s.total, s.revealed + 2 + Math.floor(Math.random() * 3)) } : s)), TICK_MS);
    } else {
      t = window.setTimeout(() => setStream((s) => (s && s.id === stream.id ? null : s)), 120);
    }
    return () => window.clearTimeout(t);
  }, [stream]);

  // ---- keep the newest content in view unless the reader has scrolled up
  const scroller = useCallback((): HTMLElement | null => {
    if (!compact) return scrollRef.current;
    let p = rootRef.current?.parentElement ?? null;
    while (p && p !== document.body) {
      const oy = getComputedStyle(p).overflowY;
      if (oy === 'auto' || oy === 'scroll') return p;
      p = p.parentElement;
    }
    return (document.scrollingElement as HTMLElement | null) ?? null;
  }, [compact]);

  useLayoutEffect(() => {
    if (!messages.length) return;
    const el = scroller();
    if (!el) return;
    const gap = el.scrollHeight - el.scrollTop - el.clientHeight;
    if (stickRef.current || gap < 160) el.scrollTop = el.scrollHeight;
    stickRef.current = false;
  }, [messages, stream, scroller]);

  // ---- textarea autosize
  useLayoutEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 128)}px`;
  }, [text]);

  // ---- chips
  const runChip = useCallback(
    (msgId: string, chip: Chip, index: number) => {
      const markDone = () => setMessages((ms) => ms.map((m) => (m.id === msgId && m.role === 'assistant' ? { ...m, done: [...m.done, index] } : m)));
      if (chip.to) {
        navigate(chip.to);
        return;
      }
      const d = stateRef.current.data;
      switch (chip.action) {
        case 'apply-route': {
          if (routeSuggestion(d).applicable) {
            actions.scheduleJob(MORRISON_JOB_ID, MORRISON_NEW.start, MORRISON_NEW.end, ['w-maya'], 'Moved to 12:15 after the Shah gutter job (Copilot suggestion)');
            toast({ title: 'Schedule updated', description: 'Morrison window clean moved to 12:15–13:15 with Maya — about 25 minutes less travel.', action: { label: 'View schedule', to: '/app/schedule' } });
          }
          markDone();
          break;
        }
        case 'create-quote-sarah': {
          const existed = !!getLead(d, SARAH_LEAD_ID)?.quoteId;
          const id = actions.createQuoteForLead(SARAH_LEAD_ID);
          if (id) {
            if (!existed) toast({ title: 'Quote created', description: 'Draft quote for Sarah Williams is ready to review and send.' });
            navigate(`/app/quotes/${id}`);
          }
          break;
        }
        case 'convert-priya': {
          const was = getLead(d, PRIYA_LEAD_ID)?.status === 'converted';
          const id = actions.convertLeadToJob(PRIYA_LEAD_ID);
          if (id) {
            if (!was) toast({ title: 'Lead converted', description: 'Priya Shah is now a customer — job, tasks and quote created.' });
            navigate(`/app/jobs/${id}`);
          }
          break;
        }
        case 'send-reminders': {
          const n = pendingReminders(d);
          toast({ title: `${n} reminder${n === 1 ? '' : 's'} sent (demo)`, description: 'Each customer gets a text with a link to book their next visit.' });
          markDone();
          break;
        }
        default:
          break;
      }
    },
    [actions, navigate, toast],
  );

  // ---- input
  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    send(text);
  };
  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      send(text);
    } else if (e.key === 'Escape' && stream) {
      stop();
    }
  };

  const lastAsked = [...messages].reverse().find((m): m is UserMsg => m.role === 'user')?.text;
  const suggestions = prompts.filter((p) => p.prompt !== lastAsked).slice(0, compact ? 3 : prompts.length);

  // ---- pieces
  const log = (
    <div role="log" aria-live="polite" aria-busy={!!stream} aria-label="Conversation with Copilot" className={cx(compact ? 'space-y-5' : 'mx-auto max-w-3xl space-y-6')}>
      {messages.map((m) =>
        m.role === 'user' ? (
          <UserBubble key={m.id} text={m.text} compact={compact} />
        ) : (
          <AssistantMessage key={m.id} msg={m} stream={stream && stream.id === m.id ? stream : null} compact={compact} routeApplied={routeApplied} onChip={runChip} />
        ),
      )}
    </div>
  );

  const empty = compact ? (
    <div className="flex flex-col items-center pb-2 pt-6 text-center">
      <CopilotMark size="md" />
      <h2 className="mt-3 font-display text-lg font-extrabold leading-snug tracking-tight text-ink">Ask about your jobs, team, customers and money</h2>
      <p className="mt-1 text-[13.5px] text-muted">Quick answers from today’s work — tap a question to start.</p>
      <div className="mt-5 grid w-full gap-2 text-left">
        {prompts.slice(0, 3).map((p, i) => (
          <button
            key={p.key}
            type="button"
            onClick={() => send(p.prompt)}
            style={{ animationDelay: `${i * 60}ms` }}
            className="flex animate-rise items-center gap-3 rounded-xl border border-line bg-surface px-3.5 py-3 text-left shadow-card transition active:scale-[0.99] hover:border-secondary/40"
          >
            <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-secondary-soft text-secondary-ink">
              <PromptIcon prompt={p} className="size-4.5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold text-ink">{p.prompt}</span>
              <span className="block truncate text-xs text-muted">{p.hint}</span>
            </span>
            <ArrowUpRight className="size-4 shrink-0 text-muted" aria-hidden />
          </button>
        ))}
      </div>
    </div>
  ) : (
    <div className="mx-auto flex max-w-2xl flex-col items-center py-4 text-center sm:py-8">
      <div className="relative">
        <span className="absolute -inset-3 rounded-[28px] bg-gradient-to-br from-secondary to-accent opacity-25 blur-xl" aria-hidden />
        <CopilotMark size="lg" />
      </div>
      <h2 className="mt-5 font-display text-xl font-extrabold tracking-tight text-ink sm:text-2xl">Ask about your jobs, team, customers and money</h2>
      <p className="mt-2 max-w-md text-[15px] leading-relaxed text-muted">Copilot reads today’s schedule, leads, quotes and invoices — then helps you act on them in one click.</p>
      <div className="mt-7 grid w-full gap-2.5 text-left sm:grid-cols-2">
        {prompts.map((p, i) => (
          <button
            key={p.key}
            type="button"
            onClick={() => send(p.prompt)}
            style={{ animationDelay: `${i * 45}ms` }}
            className={cx(
              'group flex animate-rise items-start gap-3 rounded-xl border border-line bg-surface p-3.5 text-left transition hover:-translate-y-0.5 hover:border-secondary/40 hover:shadow-raised',
              i === prompts.length - 1 && prompts.length % 2 === 1 && 'sm:col-span-2',
            )}
          >
            <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-secondary-soft text-secondary-ink transition group-hover:bg-secondary-solid group-hover:text-secondary-on">
              <PromptIcon prompt={p} className="size-4.5" />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-ink">{p.prompt}</span>
              <span className="block text-[13px] text-muted">{p.hint}</span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );

  const composer = (
    <>
      {messages.length > 0 && suggestions.length > 0 && (
        <div className="no-scrollbar -mx-1 mb-2.5 flex gap-2 overflow-x-auto px-1 pb-0.5" role="group" aria-label="Suggested questions">
          {suggestions.map((p) => (
            <button
              key={p.key}
              type="button"
              onClick={() => send(p.prompt)}
              className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border border-line bg-surface px-3 text-[12.5px] font-medium text-ink-2 transition hover:border-secondary hover:bg-secondary-soft hover:text-secondary-ink"
            >
              <PromptIcon prompt={p} className="size-3.5" />
              {p.prompt}
            </button>
          ))}
        </div>
      )}
      <form onSubmit={onSubmit} className="flex items-end gap-2 rounded-2xl border border-line-2 bg-surface p-1.5 pl-3.5 shadow-sm transition focus-within:border-secondary focus-within:ring-4 focus-within:ring-secondary/15">
        <label htmlFor={inputId} className="sr-only">
          Ask Copilot a question
        </label>
        <textarea
          ref={inputRef}
          id={inputId}
          rows={1}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={audience === 'worker' ? 'Ask about your day…' : 'Ask about jobs, customers, quotes or money…'}
          className="max-h-32 min-h-10 flex-1 resize-none bg-transparent py-2 text-[15px] leading-6 text-ink outline-none placeholder:text-muted"
        />
        {stream ? (
          <button type="button" onClick={stop} className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-xl bg-ink px-3.5 text-[13px] font-semibold text-white transition hover:bg-ink-2">
            <Square className="size-3 fill-current" aria-hidden /> Stop
          </button>
        ) : (
          <button type="submit" disabled={!text.trim()} aria-label="Send question" className="grid size-10 shrink-0 place-items-center rounded-xl bg-secondary-solid text-secondary-on shadow-sm transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40">
            <ArrowUp className="size-5" aria-hidden />
          </button>
        )}
      </form>
      <p className={cx('mt-2 flex items-start justify-center gap-1.5 text-center text-muted', compact ? 'text-[11px]' : 'text-[11.5px]')}>
        <Info className="mt-px size-3.5 shrink-0" aria-hidden />
        <span>Simulated AI for this demo — answers are generated from the demo data. No AI service is called.</span>
      </p>
    </>
  );

  if (compact) {
    return (
      <div ref={rootRef} className={cx('flex min-h-full flex-1 flex-col', className)}>
        <div className="flex-1 pb-2">
          {!messages.length && empty}
          {log}
        </div>
        <div className="sticky bottom-0 z-10 -mx-4 mt-2 bg-gradient-to-t from-canvas from-75% to-transparent px-4 pb-3 pt-4">{composer}</div>
      </div>
    );
  }

  return (
    <section ref={rootRef} aria-label="Copilot chat" className={cx('card flex h-[calc(100dvh-8.5rem)] min-h-[520px] flex-col overflow-hidden lg:h-[calc(100dvh-14.5rem)]', className)}>
      <div className="flex items-center gap-3 border-b border-line px-4 py-3 sm:px-5">
        <CopilotMark size="sm" />
        <div className="min-w-0 flex-1">
          <p className="font-display text-[15px] font-bold leading-tight text-ink">Copilot</p>
          <p className="flex items-center gap-1.5 truncate text-xs text-muted">
            <span className="relative flex size-2 shrink-0" aria-hidden>
              {stream && <span className="absolute inline-flex size-full animate-ping rounded-full bg-success opacity-60" />}
              <span className="relative inline-flex size-2 rounded-full bg-success" />
            </span>
            <span className="truncate">{stream ? 'Working on your answer…' : `Reading live data from ${state.config.company.companyName}`}</span>
          </p>
        </div>
        <span className="hidden items-center gap-1 rounded-full border border-line bg-canvas px-2.5 py-1 text-[11px] font-semibold text-muted sm:inline-flex">
          <Sparkles className="size-3" aria-hidden /> Simulated
        </span>
      </div>
      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-5 sm:px-6">
        {!messages.length && empty}
        {log}
      </div>
      <div className="border-t border-line bg-surface px-3 pb-3 pt-3 sm:px-5">{composer}</div>
    </section>
  );
}
