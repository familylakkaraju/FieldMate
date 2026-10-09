import type { BusinessConfig, DemoData, DemoState, PersonaState } from '../types/domain';
import { createInitialConfig, createInitialData, createInitialPersona, DATA_VERSION } from '../data/fixtures';
import { clearDemoStorage, readJson, STORAGE_KEYS, writeJson } from '../utils/storage';
import { DEMO_DATE, seedClock } from '../data/demoClock';
import { reducer, type DemoAction } from './demoReducer';

/** Latest event timestamp on the demo day — the narrative clock resumes after it. */
function latestActivity(data: DemoData): string | undefined {
  let latest = '';
  const see = (at?: string) => {
    if (at && at.startsWith(DEMO_DATE) && at > latest) latest = at;
  };
  data.jobs.forEach((j) => j.timeline.forEach((e) => see(e.at)));
  data.leads.forEach((l) => {
    see(l.createdAt);
    l.history.forEach((e) => see(e.at));
  });
  data.notifications.forEach((n) => see(n.at));
  data.evidence.forEach((e) => see(e.at));
  data.invoices.forEach((i) => see(i.paidAt));
  return latest || undefined;
}

export function createInitialState(): DemoState {
  return { data: createInitialData(), config: createInitialConfig(), persona: createInitialPersona() };
}

function loadState(): DemoState {
  const fresh = createInitialState();
  const data = readJson<DemoData>(STORAGE_KEYS.data);
  const config = readJson<BusinessConfig>(STORAGE_KEYS.brand);
  const persona = readJson<PersonaState>(STORAGE_KEYS.persona);
  return {
    data: data && data.version === DATA_VERSION ? data : fresh.data,
    config: config?.company && config.branding && Array.isArray(config.services) ? config : fresh.config,
    persona: persona?.persona ? { ...fresh.persona, ...persona } : fresh.persona,
  };
}

type Listener = () => void;

/**
 * Tiny external store: one central demo state, synchronous dispatch (so action
 * creators can read results straight away) and localStorage persistence per slice.
 */
export class DemoStore {
  private state: DemoState;
  private listeners = new Set<Listener>();

  constructor(initial?: DemoState) {
    this.state = initial ?? loadState();
    seedClock(latestActivity(this.state.data));
    if (typeof window !== 'undefined') {
      // Keep several open tabs (e.g. owner + worker side by side) in sync.
      window.addEventListener('storage', (e) => {
        if (e.key && (Object.values(STORAGE_KEYS) as string[]).includes(e.key)) {
          this.state = loadState();
          this.emit();
        }
      });
    }
  }

  getState = (): DemoState => this.state;

  subscribe = (l: Listener): (() => void) => {
    this.listeners.add(l);
    return () => this.listeners.delete(l);
  };

  dispatch = (action: DemoAction): DemoState => {
    const prev = this.state;
    const next = reducer(prev, action);
    if (next === prev) return prev;
    this.state = next;
    if (next.data !== prev.data) writeJson(STORAGE_KEYS.data, next.data);
    if (next.config !== prev.config) writeJson(STORAGE_KEYS.brand, next.config);
    if (next.persona !== prev.persona) writeJson(STORAGE_KEYS.persona, next.persona);
    this.emit();
    return next;
  };

  reset = (): void => {
    clearDemoStorage();
    const fresh = createInitialState();
    this.state = fresh;
    seedClock(latestActivity(fresh.data));
    writeJson(STORAGE_KEYS.data, fresh.data);
    writeJson(STORAGE_KEYS.brand, fresh.config);
    writeJson(STORAGE_KEYS.persona, fresh.persona);
    this.emit();
  };

  private emit() {
    this.listeners.forEach((l) => l());
  }
}
