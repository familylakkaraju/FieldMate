import { useRef, useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { CopilotChat, CopilotMark, type CopilotChatHandle } from '../../components/copilot/CopilotChat';

export default function WorkerCopilot() {
  const chat = useRef<CopilotChatHandle>(null);
  const [count, setCount] = useState(0);

  return (
    <div className="flex min-h-full flex-col">
      <header className="flex items-center gap-3 px-4 pb-2 pt-4">
        <CopilotMark size="sm" />
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-lg font-extrabold leading-tight tracking-tight text-ink">Copilot</h1>
          <p className="truncate text-xs text-muted">Simulated AI · answers from today’s jobs</p>
        </div>
        {count > 0 && (
          <button
            type="button"
            onClick={() => chat.current?.clear()}
            aria-label="Clear conversation"
            className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border border-line bg-surface px-3 text-[13px] font-semibold text-ink-2 transition hover:bg-subtle"
          >
            <RotateCcw className="size-3.5" aria-hidden /> Clear
          </button>
        )}
      </header>
      <div className="flex flex-1 flex-col px-4">
        <CopilotChat variant="compact" handleRef={chat} onCountChange={setCount} />
      </div>
    </div>
  );
}
