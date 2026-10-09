// Simple demo domain model shared by every experience (public, owner, worker, customer).
// Deliberately generic: services are configuration, not hard-coded job types.

export type ServiceType = 'plumbing' | 'gutter' | 'window';

export type Persona = 'public' | 'owner' | 'worker' | 'customer';

export type LeadStatus = 'new' | 'contacted' | 'quoted' | 'converted' | 'lost';

export type JobStatus =
  | 'new'
  | 'quoted'
  | 'scheduled'
  | 'in-progress'
  | 'blocked'
  | 'completed'
  | 'invoiced'
  | 'closed';

export type TaskStatus = 'ready' | 'scheduled' | 'in-progress' | 'blocked' | 'completed';

export type QuoteStatus = 'draft' | 'sent' | 'viewed' | 'accepted' | 'declined' | 'expired';

export type InvoiceStatus = 'draft' | 'sent' | 'due' | 'overdue' | 'paid';

export type TimelineKind =
  | 'created'
  | 'status'
  | 'task'
  | 'time'
  | 'material'
  | 'issue'
  | 'evidence'
  | 'note'
  | 'voice'
  | 'quote'
  | 'invoice'
  | 'payment'
  | 'message'
  | 'schedule'
  | 'contact';

export interface TimelineEntry {
  id: string;
  at: string; // local ISO datetime (demo clock)
  kind: TimelineKind;
  text: string;
  by?: string; // team member id, 'customer' or 'system'
}

export interface TeamMember {
  id: string;
  name: string;
  firstName: string;
  role: string;
  skills: string[];
  services: ServiceType[];
  color: string;
  phone: string;
  email: string;
  active: boolean;
  isOffice?: boolean;
  hourlyCost: number;
  invited?: boolean;
}

export interface RecurringPlan {
  service: ServiceType;
  frequencyWeeks: number;
  pricePerVisit: number;
  nextDue: string; // date
  label: string;
}

export interface HistoryItem {
  date: string;
  service: ServiceType;
  title: string;
  value: number;
}

export interface Note {
  id: string;
  at: string;
  by: string;
  text: string;
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  town: string;
  postcode: string;
  propertyType: string;
  tags: string[];
  customerSince: string;
  source: 'website' | 'phone' | 'referral' | 'repeat';
  recurring?: RecurringPlan[];
  history: HistoryItem[];
  notes: Note[];
  preferredContact?: 'phone' | 'email' | 'sms';
}

export interface PreferredSlot {
  date: string; // YYYY-MM-DD
  start: string; // HH:mm
  end: string; // HH:mm
  label: string;
  workerIds?: string[];
}

export interface Lead {
  id: string;
  ref: string;
  customerName: string;
  email?: string;
  phone?: string;
  address?: string;
  town?: string;
  postcode?: string;
  service: ServiceType;
  summary: string;
  details: { label: string; value: string }[];
  source: 'website' | 'phone' | 'referral';
  urgency: 'normal' | 'urgent';
  status: LeadStatus;
  createdAt: string;
  estimatedValue?: number;
  estimateRange?: [number, number];
  propertyType?: string;
  preferredSlot?: PreferredSlot;
  preferredContact?: 'phone' | 'email' | 'sms';
  photo?: string;
  history: TimelineEntry[];
  customerId?: string;
  jobId?: string;
  quoteId?: string;
  lostReason?: string;
  templateKey?: string; // which task/quote template to use when converting
  jobNumberHint?: number; // keeps the showcase job as JOB-1042
  estimateLines?: Omit<QuoteLine, 'id'>[];
}

export interface Material {
  id: string;
  description: string;
  cost: number;
  at: string;
  taskId?: string;
  by?: string;
}

export interface Issue {
  id: string;
  title: string;
  detail?: string;
  severity: 'low' | 'medium' | 'high';
  at: string;
  taskId?: string;
  resolved: boolean;
  by?: string;
}

export interface Message {
  id: string;
  at: string;
  from: 'customer' | 'business';
  author: string;
  text: string;
}

export interface Job {
  id: string;
  ref: string;
  customerId?: string; // window rounds cover several homes
  leadId?: string;
  title: string;
  service: ServiceType;
  status: JobStatus;
  kind?: 'standard' | 'round';
  area?: string;
  address?: string;
  scheduledStart?: string;
  scheduledEnd?: string;
  assignedWorkerIds: string[];
  quotedAmount?: number;
  quoteId?: string;
  invoiceId?: string;
  taskIds: string[];
  instructions?: string;
  materials: Material[];
  issues: Issue[];
  timeline: TimelineEntry[];
  messages: Message[];
  createdAt: string;
  onTheWayAt?: string;
  startedAt?: string;
  completedAt?: string;
  atRisk?: string;
  travelMinutes?: number;
  estimatedMinutes?: number;
  actualMinutesOverride?: number; // historic jobs without task detail
  blockedReason?: string;
}

export interface Task {
  id: string;
  jobId: string;
  title: string;
  outcome?: string;
  status: TaskStatus;
  order: number;
  estimatedMinutes: number;
  actualMinutes?: number;
  assignedWorkerId?: string;
  priority: 'low' | 'normal' | 'high';
  dueTime?: string;
  checklist?: { label: string; done: boolean }[];
  dependsOn?: string;
  timeline: TimelineEntry[];
}

export interface QuoteLine {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  kind: 'labour' | 'material' | 'service';
}

export interface Quote {
  id: string;
  ref: string;
  customerId?: string;
  leadId?: string;
  jobId?: string;
  service: ServiceType;
  title: string;
  status: QuoteStatus;
  lineItems: QuoteLine[];
  discount: number; // absolute £
  vat: boolean;
  notes: string;
  terms: string;
  createdAt: string;
  validUntil: string;
  sentAt?: string;
  viewedAt?: string;
  acceptedAt?: string;
  declinedAt?: string;
  declineReason?: string;
}

export interface Invoice {
  id: string;
  ref: string;
  customerId: string;
  jobId: string;
  status: InvoiceStatus;
  lineItems: QuoteLine[];
  vat: boolean;
  issuedAt: string;
  dueDate?: string;
  paidAt?: string;
  remindersSent: number;
  method?: string;
}

export interface EvidenceItem {
  id: string;
  jobId: string;
  taskId?: string;
  customerId?: string;
  type: 'before' | 'after' | 'photo' | 'receipt' | 'document';
  url: string;
  caption?: string;
  at: string;
  by?: string;
  service: ServiceType;
}

export interface NotificationItem {
  id: string;
  kind: 'lead' | 'quote' | 'task' | 'invoice' | 'recurring' | 'job' | 'payment' | 'message' | 'system';
  title: string;
  body: string;
  at: string;
  read: boolean;
  link?: string;
}

export interface ServiceConfig {
  id: ServiceType;
  slug: string;
  name: string;
  heroWord: string;
  icon: string;
  color: string;
  description: string;
  startingPrice: number;
  priceUnit: string;
  recurring: boolean;
  enabled: boolean;
  sortOrder: number;
  image: string;
  cta: string;
}

export interface CompanySettings {
  companyName: string;
  tagline: string;
  phone: string;
  email: string;
  address: string;
  serviceAreas: string[];
  openingHours: string;
  region: string;
}

export type FontPreset = 'modern' | 'clean' | 'friendly' | 'system';
export type RadiusPreset = 'sharp' | 'rounded' | 'soft';
export type HeroStyle = 'image' | 'split' | 'solid';
export type LogoMark = 'clearflow' | 'shield' | 'leaf' | 'spark' | 'custom';

export interface BrandingSettings {
  presetId?: string;
  logoMark: LogoMark;
  logoDataUrl?: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  fontPreset: FontPreset;
  borderRadiusPreset: RadiusPreset;
  heroStyle: HeroStyle;
  showPoweredByFieldMate: boolean;
}

export interface BusinessConfig {
  company: CompanySettings;
  branding: BrandingSettings;
  services: ServiceConfig[];
}

export interface QuoteDraft {
  service?: ServiceType;
  answers: Record<string, string | boolean>;
  name: string;
  email: string;
  phone: string;
  postcode: string;
  address: string;
  preferredContact: 'phone' | 'email' | 'sms';
  photoAttached?: boolean;
}

export interface PublicSession {
  lastLeadId?: string;
  bookingConfirmed?: boolean;
}

export interface DemoData {
  version: number;
  customers: Customer[];
  leads: Lead[];
  jobs: Job[];
  tasks: Task[];
  quotes: Quote[];
  invoices: Invoice[];
  evidence: EvidenceItem[];
  notifications: NotificationItem[];
  team: TeamMember[];
  session: PublicSession;
}

export type ScenarioId = 'gutter' | 'plumbing' | 'window';

export interface PersonaState {
  persona: Persona;
  workerId: string;
  portalCustomerKey: string; // customer email used for the customer portal persona
  scenario: ScenarioId | null;
}

export interface DemoState {
  data: DemoData;
  config: BusinessConfig;
  persona: PersonaState;
}
