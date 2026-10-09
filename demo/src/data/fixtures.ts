import type { BusinessConfig, DemoData, PersonaState } from '../types/domain';
import { DEFAULT_BRANDING, DEFAULT_COMPANY } from './brand';
import { CUSTOMERS } from './customers';
import { INVOICES, QUOTES } from './commercial';
import { EVIDENCE, NOTIFICATIONS } from './evidence';
import { JOBS, PAST_JOBS, TASKS } from './jobs';
import { LEADS } from './leads';
import { DEFAULT_SERVICES } from './services';
import { TEAM } from './team';

export const DATA_VERSION = 3;

const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v)) as T;

/** Fresh, deterministic copy of the demo dataset. */
export function createInitialData(): DemoData {
  return clone({
    version: DATA_VERSION,
    customers: CUSTOMERS,
    leads: LEADS,
    jobs: [...JOBS, ...PAST_JOBS],
    tasks: TASKS,
    quotes: QUOTES,
    invoices: INVOICES,
    evidence: EVIDENCE,
    notifications: NOTIFICATIONS,
    team: TEAM,
    session: {},
  });
}

export function createInitialConfig(): BusinessConfig {
  return clone({ company: DEFAULT_COMPANY, branding: DEFAULT_BRANDING, services: DEFAULT_SERVICES });
}

export const PRIYA_EMAIL = 'priya.shah@example.com';

export function createInitialPersona(): PersonaState {
  return { persona: 'public', workerId: 'w-maya', portalCustomerKey: PRIYA_EMAIL, scenario: null };
}
