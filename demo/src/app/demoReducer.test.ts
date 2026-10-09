import { describe, expect, it } from 'vitest';
import { DemoStore, createInitialState } from './store';
import { createActions } from './actions';
import { PRIYA_LEAD_ID } from '../data/leads';
import { invoiceTotal, quoteTotal, tasksForJob } from './selectors';

const setup = () => {
  const store = new DemoStore(createInitialState());
  return { store, actions: createActions(store), get: store.getState };
};

describe('demo state', () => {
  it('creates a website lead with a notification for the office', () => {
    const { actions, get } = setup();
    const before = get().data.leads.length;
    const id = actions.createLead({ customerName: 'Alex Morgan', email: 'alex@example.com', service: 'gutter', summary: 'Front and rear gutters', details: [], source: 'website', urgency: 'normal', estimateRange: [90, 120] });
    const lead = get().data.leads.find((l) => l.id === id)!;
    expect(get().data.leads).toHaveLength(before + 1);
    expect(lead.status).toBe('new');
    expect(lead.ref).toBe('LD-1025');
    expect(get().data.notifications[0].link).toBe(`/app/leads/${id}`);
  });

  it('converts Priya’s lead into customer + JOB-1042 exactly as the CR describes', () => {
    const { actions, get } = setup();
    const jobId = actions.convertLeadToJob(PRIYA_LEAD_ID)!;
    const s = get();
    const job = s.data.jobs.find((j) => j.id === jobId)!;
    expect(job.ref).toBe('JOB-1042');
    expect(job.title).toBe('Shah Gutter Clean');
    expect(job.assignedWorkerIds).toEqual(['w-maya', 'w-owen']);
    expect(job.scheduledStart).toBe('2026-10-09T10:30');
    expect(job.scheduledEnd).toBe('2026-10-09T11:50');
    expect(tasksForJob(s.data, job.id).map((t) => t.title)).toEqual([
      'Inspect property',
      'Before photographs',
      'Vacuum front gutter',
      'Vacuum rear gutter',
      'Clear rear downpipe',
      'After photographs',
      'Customer handover',
    ]);
    const quote = s.data.quotes.find((q) => q.id === job.quoteId)!;
    expect(quote.lineItems.map((l) => l.unitPrice)).toEqual([80, 25, 20]);
    expect(quoteTotal(quote)).toBe(125);
    expect(s.data.customers.find((c) => c.id === job.customerId)?.name).toBe('Priya Shah');
    expect(s.data.leads.find((l) => l.id === PRIYA_LEAD_ID)?.status).toBe('converted');
  });

  it('applies the voice update: tasks complete, +25 minutes, issue and evidence linked', () => {
    const { actions, get } = setup();
    const jobId = actions.convertLeadToJob(PRIYA_LEAD_ID)!;
    actions.updateJobStatus(jobId, 'in-progress', undefined, 'w-maya');
    const tasks = tasksForJob(get().data, jobId);
    const ids = tasks.filter((t) => ['Vacuum front gutter', 'Vacuum rear gutter', 'Clear rear downpipe'].includes(t.title)).map((t) => t.id);
    const downpipe = tasks.find((t) => t.title === 'Clear rear downpipe')!;
    actions.applyVoiceUpdate(jobId, { transcript: 'Finished…', completeTaskIds: ids, timeTaskId: downpipe.id, extraMinutes: 25, issue: { title: 'Blocked rear downpipe', detail: 'Cleared' }, evidence: [{ type: 'before', url: 'a', caption: 'b' }, { type: 'after', url: 'c', caption: 'd' }] }, 'w-maya');
    const s = get();
    const after = tasksForJob(s.data, jobId);
    expect(after.filter((t) => ids.includes(t.id)).every((t) => t.status === 'completed')).toBe(true);
    expect(after.find((t) => t.id === downpipe.id)?.actualMinutes).toBe(35);
    const job = s.data.jobs.find((j) => j.id === jobId)!;
    expect(job.issues.some((i) => i.title === 'Blocked rear downpipe')).toBe(true);
    expect(s.data.evidence.filter((e) => e.jobId === jobId)).toHaveLength(2);
    // starting the job also records the customer's acceptance of the quote on site
    expect(s.data.quotes.find((q) => q.id === job.quoteId)?.status).toBe('accepted');
  });

  it('runs the money flow: complete → invoice → send → paid closes the job', () => {
    const { actions, get } = setup();
    const jobId = actions.convertLeadToJob(PRIYA_LEAD_ID)!;
    actions.updateJobStatus(jobId, 'completed', undefined, 'w-maya');
    const invId = actions.createInvoice(jobId)!;
    expect(invoiceTotal(get().data.invoices.find((i) => i.id === invId)!)).toBe(125);
    actions.sendInvoice(invId);
    expect(get().data.jobs.find((j) => j.id === jobId)?.status).toBe('invoiced');
    actions.markInvoicePaid(invId, 'Card (online)', 'customer');
    expect(get().data.invoices.find((i) => i.id === invId)?.status).toBe('paid');
    expect(get().data.jobs.find((j) => j.id === jobId)?.status).toBe('closed');
  });

  it('white-labels the business and keeps at least one service live', () => {
    const { actions, get } = setup();
    actions.applyExampleRebrand();
    expect(get().config.company.companyName).toBe('ABC Plumbing & Exterior Cleaning');
    expect(get().config.branding.presetId).toBe('trade-navy');
    actions.toggleService('plumbing');
    actions.toggleService('gutter');
    actions.toggleService('window'); // last one — must stay enabled
    expect(get().config.services.filter((s) => s.enabled).map((s) => s.id)).toEqual(['window']);
  });

  it('reset restores the fixtures and ClearFlow branding', () => {
    const { store, actions, get } = setup();
    actions.applyExampleRebrand();
    actions.convertLeadToJob(PRIYA_LEAD_ID);
    store.reset();
    expect(get().config.company.companyName).toBe('ClearFlow Home Services');
    expect(get().data.jobs.some((j) => j.id === 'job-1042')).toBe(false);
  });
});
