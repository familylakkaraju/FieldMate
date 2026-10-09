import { lazy, Suspense, type ComponentType, type LazyExoticComponent } from 'react';
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { DemoProvider } from './DemoProvider';
import { ToastProvider } from '../components/common/Toast';
import { DemoControlsProvider } from '../components/demo/DemoControls';
import { PageSkeleton } from '../components/common/Card';
import { PublicLayout } from '../layouts/PublicLayout';
import { OwnerLayout } from '../layouts/OwnerLayout';

type Page = LazyExoticComponent<ComponentType>;
const page = (loader: () => Promise<{ default: ComponentType }>): Page => lazy(loader);

// Route groups are lazy-loaded so the public website paints fast on GitHub Pages.
const WorkerLayout = page(() => import('../layouts/WorkerLayout').then((m) => ({ default: m.WorkerLayout })));
const CustomerLayout = page(() => import('../layouts/CustomerLayout').then((m) => ({ default: m.CustomerLayout })));

// Public website
const Home = page(() => import('../pages/public/Home'));
const Services = page(() => import('../pages/public/Services'));
const ServiceDetail = page(() => import('../pages/public/ServiceDetail'));
const HowItWorks = page(() => import('../pages/public/HowItWorks'));
const Quote = page(() => import('../pages/public/Quote'));
const Booking = page(() => import('../pages/public/Booking'));
const Confirmation = page(() => import('../pages/public/Confirmation'));
const OurWork = page(() => import('../pages/public/OurWork'));
const Reviews = page(() => import('../pages/public/Reviews'));
const About = page(() => import('../pages/public/About'));
const Contact = page(() => import('../pages/public/Contact'));
const NotFound = page(() => import('../pages/NotFound'));

// Owner / office
const PersonaSelect = page(() => import('../pages/owner/PersonaSelect'));
const Dashboard = page(() => import('../pages/owner/Dashboard'));
const Leads = page(() => import('../pages/owner/Leads'));
const LeadDetail = page(() => import('../pages/owner/LeadDetail'));
const Customers = page(() => import('../pages/owner/Customers'));
const CustomerDetail = page(() => import('../pages/owner/CustomerDetail'));
const Jobs = page(() => import('../pages/owner/Jobs'));
const JobDetail = page(() => import('../pages/owner/JobDetail'));
const Tasks = page(() => import('../pages/owner/Tasks'));
const TaskDetail = page(() => import('../pages/owner/TaskDetail'));
const Schedule = page(() => import('../pages/owner/Schedule'));
const Quotes = page(() => import('../pages/owner/Quotes'));
const QuoteDetail = page(() => import('../pages/owner/QuoteDetail'));
const Invoices = page(() => import('../pages/owner/Invoices'));
const Files = page(() => import('../pages/owner/Files'));
const Reports = page(() => import('../pages/owner/Reports'));
const Copilot = page(() => import('../pages/owner/Copilot'));
const Search = page(() => import('../pages/owner/Search'));
const Notifications = page(() => import('../pages/owner/Notifications'));

// White-label settings
const SettingsCompany = page(() => import('../pages/settings/Company'));
const SettingsBranding = page(() => import('../pages/settings/Branding'));
const SettingsServices = page(() => import('../pages/settings/Services'));
const SettingsTeam = page(() => import('../pages/settings/Team'));
const SettingsIntegrations = page(() => import('../pages/settings/Integrations'));
const SettingsPlan = page(() => import('../pages/settings/Plan'));

// Field worker app
const WorkerToday = page(() => import('../pages/worker/Today'));
const WorkerJobs = page(() => import('../pages/worker/WorkerJobs'));
const WorkerJob = page(() => import('../pages/worker/WorkerJob'));
const WorkerCopilot = page(() => import('../pages/worker/WorkerCopilot'));

// Customer portal
const PortalHome = page(() => import('../pages/customer/PortalHome'));
const PortalJobs = page(() => import('../pages/customer/PortalJobs'));
const PortalJob = page(() => import('../pages/customer/PortalJob'));
const PortalQuotes = page(() => import('../pages/customer/PortalQuotes'));
const PortalQuote = page(() => import('../pages/customer/PortalQuote'));
const PortalInvoices = page(() => import('../pages/customer/PortalInvoices'));
const PortalMessages = page(() => import('../pages/customer/PortalMessages'));
const PortalProfile = page(() => import('../pages/customer/PortalProfile'));

const s = (C: Page) => (
  <Suspense fallback={<PageSkeleton />}>
    <C />
  </Suspense>
);

export function App() {
  return (
    <HashRouter>
      <DemoProvider>
        <ToastProvider>
          <DemoControlsProvider>
            <Routes>
              <Route element={<PublicLayout />}>
                <Route index element={s(Home)} />
                <Route path="services" element={s(Services)} />
                <Route path="services/:slug" element={s(ServiceDetail)} />
                <Route path="how-it-works" element={s(HowItWorks)} />
                <Route path="quote" element={s(Quote)} />
                <Route path="booking" element={s(Booking)} />
                <Route path="confirmation" element={s(Confirmation)} />
                <Route path="our-work" element={s(OurWork)} />
                <Route path="reviews" element={s(Reviews)} />
                <Route path="about" element={s(About)} />
                <Route path="contact" element={s(Contact)} />
              </Route>

              <Route path="app">
                <Route index element={s(PersonaSelect)} />
                <Route element={<OwnerLayout />}>
                  <Route path="dashboard" element={s(Dashboard)} />
                  <Route path="leads" element={s(Leads)} />
                  <Route path="leads/:id" element={s(LeadDetail)} />
                  <Route path="customers" element={s(Customers)} />
                  <Route path="customers/:id" element={s(CustomerDetail)} />
                  <Route path="jobs" element={s(Jobs)} />
                  <Route path="jobs/:id" element={s(JobDetail)} />
                  <Route path="tasks" element={s(Tasks)} />
                  <Route path="tasks/:id" element={s(TaskDetail)} />
                  <Route path="schedule" element={s(Schedule)} />
                  <Route path="quotes" element={s(Quotes)} />
                  <Route path="quotes/:id" element={s(QuoteDetail)} />
                  <Route path="invoices" element={s(Invoices)} />
                  <Route path="files" element={s(Files)} />
                  <Route path="reports" element={s(Reports)} />
                  <Route path="copilot" element={s(Copilot)} />
                  <Route path="search" element={s(Search)} />
                  <Route path="notifications" element={s(Notifications)} />
                  <Route path="settings" element={<Navigate to="/app/settings/company" replace />} />
                  <Route path="settings/company" element={s(SettingsCompany)} />
                  <Route path="settings/branding" element={s(SettingsBranding)} />
                  <Route path="settings/services" element={s(SettingsServices)} />
                  <Route path="settings/team" element={s(SettingsTeam)} />
                  <Route path="settings/integrations" element={s(SettingsIntegrations)} />
                  <Route path="settings/plan" element={s(SettingsPlan)} />
                </Route>
              </Route>

              <Route path="worker" element={s(WorkerLayout)}>
                <Route index element={<Navigate to="/worker/today" replace />} />
                <Route path="today" element={s(WorkerToday)} />
                <Route path="jobs" element={s(WorkerJobs)} />
                <Route path="jobs/:id" element={s(WorkerJob)} />
                <Route path="copilot" element={s(WorkerCopilot)} />
              </Route>

              <Route path="portal" element={s(CustomerLayout)}>
                <Route index element={s(PortalHome)} />
                <Route path="jobs" element={s(PortalJobs)} />
                <Route path="jobs/:id" element={s(PortalJob)} />
                <Route path="quotes" element={s(PortalQuotes)} />
                <Route path="quotes/:id" element={s(PortalQuote)} />
                <Route path="invoices" element={s(PortalInvoices)} />
                <Route path="messages" element={s(PortalMessages)} />
                <Route path="profile" element={s(PortalProfile)} />
              </Route>

              <Route path="*" element={s(NotFound)} />
            </Routes>
          </DemoControlsProvider>
        </ToastProvider>
      </DemoProvider>
    </HashRouter>
  );
}
