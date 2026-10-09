import { createContext, useContext, useEffect, useMemo, useSyncExternalStore, type ReactNode } from 'react';
import type { DemoState } from '../types/domain';
import { applyBrandVariables } from '../theme/branding';
import { createActions, type DemoActions } from './actions';
import { DemoStore } from './store';

interface Ctx {
  store: DemoStore;
  actions: DemoActions;
}

const DemoContext = createContext<Ctx | null>(null);

export function DemoProvider({ children, store: injected }: { children: ReactNode; store?: DemoStore }) {
  const value = useMemo(() => {
    const store = injected ?? new DemoStore();
    return { store, actions: createActions(store) };
  }, [injected]);
  return (
    <DemoContext.Provider value={value}>
      <BrandApplier store={value.store} />
      {children}
    </DemoContext.Provider>
  );
}

function useCtx(): Ctx {
  const ctx = useContext(DemoContext);
  if (!ctx) throw new Error('useDemo must be used inside <DemoProvider>');
  return ctx;
}

/** The whole demo state + actions. Components re-render on any change (the dataset is small). */
export function useDemo(): { state: DemoState; actions: DemoActions } {
  const { store, actions } = useCtx();
  const state = useSyncExternalStore(store.subscribe, store.getState, store.getState);
  return { state, actions };
}

export const useDemoData = () => useDemo().state.data;
export const useConfig = () => useDemo().state.config;
export const useActions = () => useCtx().actions;

/** Writes brand CSS variables, document title and a matching favicon whenever branding changes. */
function BrandApplier({ store }: { store: DemoStore }) {
  const state = useSyncExternalStore(store.subscribe, store.getState, store.getState);
  const { branding, company } = state.config;
  useEffect(() => {
    applyBrandVariables(branding);
    const color = branding.primaryColor;
    const accent = branding.secondaryColor;
    const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><rect width='32' height='32' rx='8' fill='${color}'/><path d='M16 6c-4 5.2-6.5 8.8-6.5 12a6.5 6.5 0 0 0 13 0C22.5 14.8 20 11.2 16 6z' fill='${accent}'/></svg>`;
    let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }
    link.href = branding.logoMark === 'custom' && branding.logoDataUrl ? branding.logoDataUrl : `data:image/svg+xml,${encodeURIComponent(svg)}`;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', color);
  }, [branding]);
  useEffect(() => {
    document.title = company.companyName;
  }, [company.companyName]);
  return null;
}
