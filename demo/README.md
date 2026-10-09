# FieldMate Interactive Demo

A fully clickable, white-labelled sales prototype of FieldMate (change request **CR-FM-DEMO-002**,
see [`Docs/CR-FM-DEMO-002_Complete_Claude_Implementation_Spec.md`](../Docs/CR-FM-DEMO-002_Complete_Claude_Implementation_Spec.md)).

It shows one fictional home-services business, **ClearFlow Home Services** (plumbing, gutter
cleaning and residential window cleaning across Essex), running end to end on FieldMate:

```text
Public website → instant quote → booking → lead → customer + job → schedule
→ field worker app (voice update, photos) → completion → quote / invoice / payment
→ customer portal → reports & AI Copilot → white-label branding
```

Everything is static and runs in the browser. There is no backend, no sign-in and no real
integrations — all state lives in `localStorage`, so the demo can be hosted on GitHub Pages.

## Run locally

```bash
cd demo
npm install
npm run dev
```

Open the URL Vite prints (e.g. `http://localhost:5173/#/`).

## Build

```bash
npm run build     # type-check + production build into demo/dist
npm run preview   # serve the production build locally
npm test          # unit tests for the shared demo state (vitest)
```

## Demo personas

| Persona | Start at | What it shows |
|---|---|---|
| Public website | `#/` | Branded home page, service pages, instant quote wizard, booking, confirmation |
| Owner / Office | `#/app/dashboard` | Dashboard, leads, customers, jobs, tasks, schedule, quotes, invoices, files, reports, AI Copilot, settings |
| Field Worker | `#/worker/today` | Mobile app for Maya Khan (switchable): today's jobs, job execution, voice update, photo evidence |
| Customer | `#/portal` | Priya Shah's portal: job status timeline, quote approval, photos, invoices and mock payment |

`#/app` is a persona picker. The **Demo** button (top right of every view, or **Shift + D**)
opens the presenter drawer: switch persona, follow a scenario step by step, fast-forward, or
**Reset Demo Data**. Open two tabs (e.g. office + worker) and changes sync between them.

## Key demo scenarios

- **Gutter Cleaning — Priya Shah (main showcase):** website quote → convert lead to JOB-1042
  (Maya & Owen, today 10:30–11:50, 7 tasks, quote £80 + £25 + £20 = £125) → worker voice update
  (+25 min, blocked rear downpipe, 2 photos) → complete → invoice → paid → customer portal.
- **Urgent Plumbing — Sarah Williams:** urgent phone lead holding Daniel's 14:30 slot → Copilot
  drafts the quote → convert and schedule.
- **Recurring Window Cleaning:** Owen's live 9-home Great Baddow round, Mark Hughes' 4-weekly
  sign-up, and "which recurring customers are due?" in Copilot.

The demo runs on a fixed business day — **Friday 9 October 2026** — set by `DEMO_DATE` in
`src/data/demoClock.ts`. The narrative clock starts at 10:06 that morning and then runs in real
time, so schedules, timelines and greetings always tell the same story.

## White labelling

Settings → Branding changes the company name, logo (preset marks or an uploaded image), primary /
secondary / accent colours (contrast is adjusted automatically for accessibility), font preset,
corner radius, hero style and the "Powered by FieldMate" badge — live, across the public site,
office portal, worker app and customer portal. Settings → Services & Pricing enables/disables
services (disabled services disappear from the public site, quote wizard and booking) and edits
names, icons, colours, descriptions, demo prices, recurring options and order. One click applies
the example rebrand **ABC Plumbing & Exterior Cleaning**; Reset Demo Data restores ClearFlow.

## GitHub Pages

The workflow `.github/workflows/deploy-demo-pages.yml` builds `demo/` on every push to `main`
that touches `demo/**` (or manually via *Run workflow*) and deploys `demo/dist` to GitHub Pages.

1. In the repository go to **Settings → Pages** and set **Source** to **GitHub Actions** (one-off).
2. Push to `main` (or run the workflow manually).
3. The site is served at `https://<account>.github.io/<repo>/#/` — e.g. `#/app/dashboard`,
   `#/worker/today`, `#/portal`.

The workflow sets `VITE_BASE=/<repo>/`; locally the base is relative (`./`). Routing uses
`HashRouter`, so refreshes and deep links work without any server-side fallback.

## Project structure

```text
demo/
├── public/assets/        # optimised local images (see public/assets/CREDITS.md) + demo SVGs
└── src/
    ├── app/              # App + routes, DemoProvider, store (localStorage), reducer, actions, selectors
    ├── data/             # deterministic fixtures: company, services, team, customers, leads, jobs, …
    ├── components/       # common UI kit, public site, owner, worker, customer, copilot, charts
    ├── layouts/          # Public, Owner, Worker (phone frame) and Customer layouts
    ├── pages/            # public/, owner/, settings/, worker/, customer/
    ├── theme/            # Tailwind v4 tokens, runtime brand variables, chart palette
    └── utils/            # formatting, estimates, booking slots, insights, Copilot responses
```

## Important

All businesses, customers and transactions are fictional demonstration data.
No production backend or real integrations are connected — no payments, email, SMS, maps,
calendar, speech or AI services are called. The voice update and AI Copilot are simulations
driven by the demo data. Photos are free-licence Unsplash images stored locally.
