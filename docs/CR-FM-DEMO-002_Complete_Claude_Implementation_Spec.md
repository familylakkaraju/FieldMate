# FieldMate Demo Prototype — Complete Claude Implementation Specification

**Document ID:** CR-FM-DEMO-002  
**Status:** Ready for implementation  
**Purpose:** Build a polished, fully clickable, white-labelled, static FieldMate demonstration website for prospective home-services clients.  
**Initial case-study business:** ClearFlow Home Services  
**Target hosting:** GitHub Pages  
**Prototype type:** Front-end only, dummy data, no backend dependencies  
**Primary business domains:** Plumbing, Gutter Cleaning, Residential Window Cleaning  
**Primary goal:** Demonstrate a believable end-to-end operating workflow, not just a marketing homepage.

---

# 1. Executive Objective

Build a professional interactive prototype that a prospective client can open in a browser and understand immediately.

The prototype must demonstrate four connected experiences:

1. **Public white-labelled customer website**
2. **Business owner / office portal**
3. **Field worker experience**
4. **Customer portal**

The prototype must also demonstrate **white-labelling and brand customisation**.

It must feel like a real SaaS-enabled trades business, while remaining completely static and deployable to GitHub Pages.

The most important presentation outcome is:

> A client should be able to imagine their own plumbing / gutter / window-cleaning company running on FieldMate.

The prototype must be visually strong enough for a customer demo and coherent enough that a presenter can click through realistic workflows without dead ends.

---

# 2. Core Product Story for the Demo

The prototype should tell this story:

```text
Customer lands on branded company website
        ↓
Immediately sees Plumbing / Gutters / Windows
        ↓
Starts a service journey without searching through menus
        ↓
Gets a simple estimate / quote request
        ↓
Chooses a preferred date/time
        ↓
Enquiry becomes a lead
        ↓
Office user opens the lead
        ↓
Converts it into Customer + Job
        ↓
Schedules / assigns work
        ↓
Field worker sees the job
        ↓
Starts work
        ↓
Records voice update + evidence + time / issue
        ↓
Job moves to completed
        ↓
Invoice / payment state shown
        ↓
Customer sees the completed job
        ↓
Owner sees reports and AI insights
        ↓
Presenter changes branding and shows same system as another company
```

---

# 3. Critical UX Principle — Home Page Is a Journey Start Screen

The public homepage must **not** behave like a brochure.

The homepage must expose the core customer actions directly above the fold.

The customer should immediately be able to choose:

```text
Plumbing
Gutter Cleaning
Window Cleaning
Get a Quote
Book a Service
Call
```

Do not force users through:

```text
Home → Services → submenu → service page → button
```

before they can start.

The home page must visibly present service cards / action controls that launch the relevant quote flow directly.

Recommended first-screen hierarchy:

```text
[Logo] ClearFlow Home Services

Plumbing | Gutters | Windows | Our Work | Reviews | About

                           [Call] [Get a Quote]

-----------------------------------------------------------

PLUMBING. GUTTERS. WINDOWS.
ONE TRUSTED LOCAL TEAM.

Professional home services across Essex.

[ GET AN INSTANT QUOTE ]   [ BOOK A SERVICE ]

★ 4.9 rating    ✓ Fully insured    ✓ Local team

-----------------------------------------------------------

WHAT DO YOU NEED HELP WITH?

[ Plumbing ]     [ Gutter Cleaning ]     [ Window Cleaning ]

[ Tell us what you need ]

Postcode [___________] [Continue]
```

On mobile, include a fixed bottom CTA bar:

```text
[ Call ] [ Get Quote ] [ Book ]
```

This must remain visible while scrolling.

---

# 4. Prototype Boundaries

## 4.1 Must be included

- fully clickable routes;
- coherent demo state;
- dummy data;
- localStorage persistence;
- responsive layouts;
- service selection;
- quote wizard;
- booking flow;
- lead conversion;
- customer creation;
- job creation;
- job state changes;
- task state changes;
- worker job view;
- simulated voice update;
- evidence simulation;
- quote/invoice state changes;
- customer portal;
- reports/charts;
- simulated AI Copilot;
- white-labelling controls;
- presenter/demo controls;
- GitHub Pages deployment.

## 4.2 Must NOT be included

Do not build or connect:

- AWS;
- Cognito;
- real database;
- real backend;
- real authentication;
- real payment gateway;
- real Stripe;
- real Google Play;
- real email;
- real SMS;
- real maps;
- real calendar integration;
- real speech-to-text;
- real text-to-speech;
- real microphone recording;
- real LLM;
- real OpenAI / Anthropic / Bedrock API;
- real MCP;
- real file upload backend;
- real SEO API integrations;
- production authorization;
- production encryption/secrets infrastructure.

Everything should be simulated locally.

---

# 5. Case Study Brand

## 5.1 Default company

**ClearFlow Home Services**

Tagline:

> Plumbing. Gutters. Windows. One trusted local team.

Primary service area:

- Chelmsford
- Maldon
- Colchester
- Brentwood
- Braintree
- East London
- surrounding Essex areas

The business is fictional.

Do not imply it exists in the real world.

## 5.2 Default company values

- reliable;
- local;
- clean;
- straightforward;
- professional;
- transparent;
- family-home friendly.

## 5.3 Team

### Daniel Reed
Role: Owner / Senior Plumber  
Skills: Plumbing, quoting, customer management

### Maya Khan
Role: Exterior Cleaning Lead  
Skills: Gutters, windows, exterior cleaning

### Owen Price
Role: Field Technician  
Skills: Windows, gutters, assistant plumbing

### Sophie Clarke
Role: Office Coordinator  
Skills: Leads, booking, customers, quotes, invoices

---

# 6. Default Brand Design System

## 6.1 Colours

```text
Primary Navy      #123B5D
Primary Blue      #1677FF
Teal              #0F9D8A
Cyan              #24A7C5
Success Green     #2E9B63
Warning Amber     #F5A524
Danger Red        #D64545

Background        #F6F8FB
Surface           #FFFFFF
Text Primary      #17212B
Text Secondary    #667085
Border            #E4E7EC
Muted             #EEF2F6
```

Service accents:

```text
Plumbing          #1677FF
Gutter Cleaning   #0F9D8A
Window Cleaning   #24A7C5
```

## 6.2 Typography

Use:

- Inter or Manrope;
- system sans-serif fallback.

Avoid decorative trade fonts.

## 6.3 Visual language

Use:

- clean white surfaces;
- strong navy headings;
- large service imagery;
- restrained shadows;
- 12–16 px card radius;
- rounded buttons;
- crisp icons;
- generous whitespace;
- clear status badges;
- polished charts;
- subtle motion only.

Do not overuse gradients.

Do not make the site look like a generic SaaS admin template.

The public website must look like a premium local services brand.

The internal portal may look more SaaS-like, but must still inherit the brand.

## 6.4 Icons

Use **Lucide React** consistently.

Recommended mappings:

```text
Plumbing              Wrench / Droplets
Gutter Cleaning       CloudRain / ArrowDown / House
Window Cleaning       Sparkles / PanelsTopLeft
Customer              Users
Jobs                  BriefcaseBusiness
Tasks                 ClipboardCheck
Schedule              CalendarDays
Quotes                 FileText
Invoices               ReceiptText
Evidence               Camera
Voice                  Mic
AI Copilot             Bot / Sparkles
Revenue                PoundSterling
Issues                 TriangleAlert
Settings               Settings
Branding               Palette
```

Do not mix icon libraries.

---

# 7. Image Direction

Use realistic professional residential-home-service imagery.

Preferred visual categories:

- plumber working in a clean domestic kitchen/bathroom;
- gutter-vac operator on a UK residential property;
- water-fed pole window cleaner;
- before/after gutters;
- before/after windows;
- clean branded van/team;
- homeowner greeting field worker.

Images must be:

- stored locally under `public/assets/...`;
- legally reusable or generated;
- compressed;
- WebP/AVIF where practical.

Do not hotlink external stock imagery.

---

# 8. Application Experiences

The single React app must contain these experiences:

```text
PUBLIC WEBSITE
OWNER / OFFICE PORTAL
FIELD WORKER EXPERIENCE
CUSTOMER PORTAL
WHITE-LABEL SETTINGS
DEMO / PRESENTER CONTROLS
```

All experiences must share one coherent dummy dataset.

---

# 9. Global Route Map

Use `HashRouter` for GitHub Pages.

Public:

```text
#/
#/services
#/services/plumbing
#/services/gutter-cleaning
#/services/window-cleaning
#/how-it-works
#/quote
#/booking
#/confirmation
#/our-work
#/reviews
#/about
#/contact
```

Owner / office:

```text
#/app
#/app/dashboard
#/app/leads
#/app/leads/:id
#/app/customers
#/app/customers/:id
#/app/jobs
#/app/jobs/:id
#/app/tasks
#/app/tasks/:id
#/app/schedule
#/app/quotes
#/app/quotes/:id
#/app/invoices
#/app/files
#/app/reports
#/app/copilot
#/app/search
#/app/notifications
#/app/settings/company
#/app/settings/branding
#/app/settings/services
#/app/settings/team
#/app/settings/integrations
#/app/settings/plan
```

Worker:

```text
#/worker/today
#/worker/jobs/:id
```

Customer portal:

```text
#/portal
#/portal/jobs
#/portal/jobs/:id
#/portal/quotes/:id
#/portal/invoices
```

---

# 10. Public Navigation

Desktop header:

```text
[Logo] ClearFlow Home Services

Home
Services
How It Works
Our Work
Reviews
About
Contact

[Call] [Get a Quote]
```

The `Services` menu may expand, but all service starter controls must also be visible on Home.

Optional utility bar:

```text
✓ Fully insured    ✓ Local team    ★ 4.9 rating    ☎ 01245 000 000
```

Mobile header:

- logo;
- call icon;
- quote button;
- hamburger.

Sticky mobile bottom CTA:

```text
[ Call ] [ Quote ] [ Book ]
```

---

# 11. PUBLIC WEBSITE SCREENS

## P01 — Home

Route:

```text
#/
```

This is the single most important public screen.

### Section 1 — Hero

Elements:

- strong residential service image;
- logo;
- headline;
- subheadline;
- primary CTA;
- secondary CTA;
- trust badges.

Copy example:

**Headline**

> Plumbing. Gutters. Windows. One trusted local team.

**Subheadline**

> Fast, professional home services across Essex with simple quotes, easy booking and clear updates from start to finish.

Buttons:

```text
[ Get an Instant Quote ]
[ Book a Service ]
```

Secondary:

```text
Call 01245 000 000
```

### Section 2 — Immediate Journey Starter

Heading:

> What do you need help with?

Large visual service cards:

```text
PLUMBING
Leaks, taps, toilets, pipework, radiators
[ Start Plumbing Request ]

GUTTER CLEANING
Gutter vacuum, downpipes, before/after evidence
[ Start Gutter Quote ]

WINDOW CLEANING
One-off or recurring residential cleaning
[ Start Window Quote ]
```

Also:

```text
Not sure?
[ Tell us what you need ]
```

Postcode field:

```text
Postcode [ CM2 ... ] [ Check availability ]
```

Clicking a service card should go directly to `#/quote?service=<service>`.

Do not force the user through the service content page first.

### Section 3 — Availability

Show fictional availability:

```text
Next Plumbing Slot        Today 14:30
Next Gutter Slot          Friday 10:00
Next Window Round         Monday
```

Buttons:

```text
[ Check times ]
```

### Section 4 — Trust

Cards:

- Fully insured
- Local technicians
- Transparent quotes
- Before/after evidence
- Customer portal
- 4.9 / 5 rating

### Section 5 — Before / After

At least:

- gutter before/after;
- window before/after.

Optional comparison slider if simple.

### Section 6 — How It Works

Five steps:

```text
1. Tell us what you need
2. Get a clear quote
3. Choose a time
4. We complete the work
5. Track everything online
```

### Section 7 — Popular Services

Cards with fictional pricing:

```text
Gutter Clean — Semi Detached — from £90
Minor Plumbing Visit — from £85
Regular Window Clean — from £22
```

Clearly label:

> Demo pricing only

### Section 8 — Reviews

Show:

- 4.9 / 5;
- 200+ fictional reviews label should NOT imply real reviews.

Use wording:

> Demo customer feedback

Three fictional reviews.

### Section 9 — Recurring Care

Promote:

- 4-week windows;
- 6-week windows;
- 8-week windows;
- autumn gutter care.

### Section 10 — Areas

Show a stylised static service-area graphic.

No Google Maps API.

### Section 11 — Final CTA

Large branded CTA:

> Need help at home?

Buttons:

```text
[ Get a Quote ]
[ Book a Service ]
[ Call Us ]
```

### Section 12 — Footer

Columns:

```text
Services
Company
Help
Customer Portal
Contact
```

Optional:

```text
Powered by FieldMate
```

controlled by white-label settings.

---

## P02 — Services Overview

Route:

```text
#/services
```

Include:

- Plumbing;
- Gutter Cleaning;
- Window Cleaning;
- one-off / recurring tags;
- indicative demo prices;
- strong imagery;
- primary CTA on every card.

---

## P03 — Plumbing

Route:

```text
#/services/plumbing
```

Features:

- hero;
- emergency callout;
- service list;
- common problems;
- example pricing;
- recent jobs;
- FAQ;
- review;
- `Start Plumbing Request`.

Example services:

- leaks;
- taps;
- toilets;
- waste/sinks;
- pipework;
- radiators;
- minor installations.

---

## P04 — Gutter Cleaning

Route:

```text
#/services/gutter-cleaning
```

Features:

- hero;
- gutter vacuum explanation;
- property-size pricing cards;
- downpipe option;
- before/after evidence;
- seasonal care;
- FAQ;
- `Get Gutter Quote`.

Example pricing:

```text
Terrace      from £70
Semi         from £90
Detached     from £120
```

Demo pricing only.

---

## P05 — Window Cleaning

Route:

```text
#/services/window-cleaning
```

Features:

- hero;
- one-off / recurring toggle;
- 4 / 6 / 8 week options;
- house-size pricing;
- frames/sills inclusion;
- conservatory add-on;
- FAQ;
- `Join the Round`.

---

## P06 — How It Works

Route:

```text
#/how-it-works
```

Visual lifecycle:

```text
Request
→ Quote
→ Booking
→ Technician
→ Work
→ Evidence
→ Invoice
→ Customer Portal
```

Show mock customer portal screenshots/cards.

---

## P07 — Instant Quote Wizard

Route:

```text
#/quote
```

Must feel polished.

### Step 1 — Service

Cards:

- Plumbing
- Gutter Cleaning
- Window Cleaning

If user comes from Home service card, preselect service.

### Step 2 — Service Questions

#### Plumbing

Ask:

- What do you need help with?
- Is it urgent?
- Property type
- Optional notes
- Optional simulated photo

Common options:

```text
Leak
Tap
Toilet
Radiator
Pipework
Sink / Waste
Something else
```

#### Gutter

Ask:

- property type;
- floor count;
- front / rear / both;
- downpipe issue;
- optional photo.

#### Windows

Ask:

- property type;
- one-off / recurring;
- estimated windows;
- preferred frequency;
- optional conservatory.

### Step 3 — Customer Details

Fields:

```text
Name
Email
Mobile
Postcode
Address
Preferred contact
```

### Step 4 — Estimate Preview

Example:

```text
Estimated range: £90–£120

Service:
Gutter cleaning

Property:
3-bed semi

Includes:
Front + rear gutters
Downpipe inspection
Before / after evidence
```

Label:

> Demo estimate only

### Step 5 — Submit

Create lead in local app state.

Then offer:

```text
[ Choose a time ]
```

---

## P08 — Booking

Route:

```text
#/booking
```

Features:

- week view;
- morning / afternoon filters;
- visible available slots;
- selected service;
- selected slot;
- booking summary;
- confirm.

No real calendar.

---

## P09 — Confirmation

Route:

```text
#/confirmation
```

Show:

- success icon;
- reference number;
- customer;
- selected service;
- selected slot;
- next steps;
- customer portal CTA;
- back Home.

---

## P10 — Our Work

Route:

```text
#/our-work
```

Features:

- gallery;
- filters;
- service badge;
- before/after;
- location;
- outcome;
- lightbox.

---

## P11 — Reviews

Route:

```text
#/reviews
```

Use fictional/demo reviews only.

Features:

- rating summary;
- service filters;
- cards;
- customer first name + area;
- CTA.

---

## P12 — About

Route:

```text
#/about
```

Features:

- story;
- team;
- values;
- service area;
- professionalism;
- customer promise.

---

## P13 — Contact

Route:

```text
#/contact
```

Features:

- form;
- phone;
- email;
- opening hours;
- emergency CTA;
- service areas.

Submitting creates a local lead and toast.

---

# 12. OWNER / OFFICE PORTAL

## Layout

Desktop:

```text
Sidebar
+
Top Header
+
Content
```

Sidebar:

```text
Dashboard
Inbox / Leads
Customers
Jobs
Tasks
Schedule
Quotes
Invoices
Files & Evidence
Reports
AI Copilot
----------------
Notifications
Search
----------------
Settings
```

Header:

```text
[Global Search]
              [+ New]
              [Bell]
              [Demo Persona]
              [Avatar]
```

---

## B01 — Demo Entry / Persona Selector

Route:

```text
#/app
```

Show:

```text
Owner / Office
Field Worker
Customer
Public Website
```

No real authentication.

---

## B02 — Dashboard

Route:

```text
#/app/dashboard
```

This must be one of the most polished screens.

KPI cards:

```text
Jobs Today             7
New Leads              5
Revenue This Month     £18,460
Outstanding            £1,285
On-Time Completion     92%
Customer Rating        4.9
```

Sections:

### Today's schedule

Timeline / cards.

### Leads needing attention

Show three.

### Jobs at risk

Example:

- blocked plumbing job;
- late-running gutter job.

### Team status

```text
Daniel — On plumbing call
Maya — Gutter job
Owen — Window round
Sophie — Office
```

### Recurring services due

Show:

- customers due for window round;
- autumn gutter reminders.

### Recent payments

Show 3.

### AI insight

Example:

> Maya and Owen have three exterior-cleaning jobs within the CM2 area today. Moving the Morrison window clean after the Shah gutter job would reduce travel.

Buttons:

```text
[ Open Schedule ]
[ Ask Copilot ]
```

Quick actions:

```text
New Customer
New Job
New Quote
Record Payment
Ask Copilot
```

---

## B03 — Leads

Route:

```text
#/app/leads
```

Features:

- list/table;
- search;
- filter;
- service;
- urgency;
- source;
- status;
- created;
- estimated value.

Lead statuses:

```text
New
Contacted
Quoted
Converted
Lost
```

Lead examples:

1. Sarah Williams — leaking kitchen tap — urgent
2. Priya Shah — gutter clean — web quote
3. Mark Hughes — recurring windows
4. Helen Foster — blocked downpipe
5. John Carter — toilet cistern

---

## B04 — Lead Detail

Route:

```text
#/app/leads/:id
```

Features:

- customer details;
- service;
- enquiry details;
- quote wizard answers;
- uploaded image placeholder;
- contact buttons;
- lead history;
- AI summary;
- estimated value;
- actions.

Buttons:

```text
Create Quote
Schedule Visit
Convert to Customer + Job
Mark Lost
```

Convert action must update shared state.

---

## B05 — Customers

Route:

```text
#/app/customers
```

Features:

- list/cards;
- search;
- recurring badge;
- last service;
- next service;
- outstanding;
- lifetime value.

---

## B06 — Customer 360

Route:

```text
#/app/customers/:id
```

Header:

- customer name;
- phone;
- email;
- address;
- customer since;
- recurring status.

Tabs:

```text
Overview
Jobs
Quotes
Invoices
Files
Notes
```

Overview:

- upcoming service;
- recent job;
- outstanding;
- lifetime value;
- timeline.

Quick action:

```text
[ New Job ]
```

---

## B07 — Jobs

Route:

```text
#/app/jobs
```

Views:

```text
List
Kanban
Route View
```

Filters:

```text
Today
This Week
Plumbing
Gutters
Windows
Unassigned
At Risk
Completed
```

Statuses:

```text
New
Quoted
Scheduled
In Progress
Blocked
Completed
Invoiced
Closed
```

---

## B08 — Job Detail

Route:

```text
#/app/jobs/:id
```

Must be visually strong.

Header:

- job title;
- customer;
- address;
- service;
- status;
- schedule;
- assigned workers;
- quote amount.

Tabs:

```text
Overview
Tasks
Timeline
Time & Costs
Evidence
Messages
Quote / Invoice
```

Overview cards:

- progress;
- schedule;
- assigned team;
- quote;
- actual time;
- actual cost.

Job summary.

Tasks list.

Issue callout.

Evidence preview.

AI summary.

Buttons vary by state:

```text
Start Job
Mark Blocked
Resume
Complete
Create Invoice
```

---

## B09 — Task Board

Route:

```text
#/app/tasks
```

Kanban:

```text
Ready
Scheduled
In Progress
Blocked
Completed
```

Task cards:

- title;
- job;
- customer;
- worker avatar;
- service badge;
- priority;
- due time.

Optional simulated drag/drop.

---

## B10 — Task Detail

Route:

```text
#/app/tasks/:id
```

Features:

- task title;
- outcome;
- checklist;
- status;
- worker;
- dependency;
- estimated time;
- actual time;
- evidence;
- issue;
- materials;
- timeline.

Actions:

```text
Start
Pause
Block
Complete
Add Time
Add Material
Add Issue
Add Evidence
```

---

## B11 — Schedule

Route:

```text
#/app/schedule
```

Views:

```text
Day
Week
Team
```

Features:

- worker lanes;
- service colours;
- appointments;
- unscheduled tray;
- conflict warning;
- static travel indicator;
- click to open job.

Optional simulated drag/drop.

---

## B12 — Quotes

Route:

```text
#/app/quotes
```

Statuses:

```text
Draft
Sent
Viewed
Accepted
Declined
Expired
```

Show:

- customer;
- service;
- value;
- created;
- validity;
- status.

---

## B13 — Quote Builder / Detail

Route:

```text
#/app/quotes/:id
```

Features:

- customer;
- address;
- service;
- line items;
- quantity;
- price;
- labour;
- material;
- discount;
- VAT toggle;
- notes;
- terms;
- total;
- preview.

Buttons:

```text
Save Draft
Send Quote
Duplicate
```

Sending updates local status.

Example:

```text
Gutter vacuum            £80
Downpipe clearance       £25
Rear extension gutter    £20
-----------------------------
Total                    £125
```

---

## B14 — Invoices

Route:

```text
#/app/invoices
```

Statuses:

```text
Draft
Sent
Due
Overdue
Paid
```

Features:

- total due;
- overdue value;
- invoice list;
- customer;
- amount;
- due date;
- status.

Actions:

```text
Send Reminder
Mark Paid
View Invoice
```

---

## B15 — Files & Evidence

Route:

```text
#/app/files
```

Features:

- gallery/list;
- service filter;
- job association;
- task association;
- category;
- before/after;
- receipt;
- invoice;
- photo lightbox;
- mock upload.

---

## B16 — Reports

Route:

```text
#/app/reports
```

Use Recharts.

Charts/cards:

- revenue by service;
- job count by service;
- lead conversion;
- actual vs quoted;
- average job value;
- recurring revenue;
- customer mix;
- worker utilisation;
- monthly revenue;
- outstanding invoices.

Text insights beneath charts.

---

## B17 — AI Copilot

Route:

```text
#/app/copilot
```

No real LLM.

Design must look like a high-quality AI workspace.

Preset prompts:

```text
Plan my day
Which jobs are at risk?
Draft a quote for Sarah
Summarise the Shah gutter job
Which recurring customers are due?
Where did we lose time this week?
Which service is most profitable?
```

Responses should be calculated/prewritten from fixture data.

Simulate streaming text.

Action chips:

```text
[ Open Job ]
[ Open Schedule ]
[ Create Quote ]
[ View Customers ]
```

Example response:

> You have seven jobs today. Maya and Owen have three exterior-cleaning jobs in the CM2 area. Moving the Morrison window clean after the Shah gutter job would reduce travel. Daniel has an urgent plumbing call at 14:30.

---

## B18 — Search

Route:

```text
#/app/search
```

Search:

- customers;
- jobs;
- tasks;
- quotes;
- invoices;
- files.

Instant local filtering.

---

## B19 — Notifications

Route:

```text
#/app/notifications
```

Examples:

- New gutter quote request
- Quote accepted
- Task completed
- Invoice overdue
- Recurring window clean due
- Autumn gutter reminder

---

# 13. FIELD WORKER EXPERIENCE

The worker experience must be mobile-first.

Bottom navigation:

```text
Today
Jobs
+ Update
Copilot
More
```

---

## W01 — Today

Route:

```text
#/worker/today
```

Header:

> Good morning, Maya

Summary:

```text
3 jobs
5 tasks
£355 scheduled work
```

Cards in time order.

Each job card:

- customer;
- service;
- address;
- time;
- status;
- duration;
- start button.

Buttons:

```text
Call Customer
Start Job
Open Job
```

---

## W02 — Worker Job

Route:

```text
#/worker/jobs/:id
```

Features:

- customer;
- address;
- service;
- job instruction;
- start time;
- job timer;
- tasks;
- photos;
- materials;
- notes.

Actions:

```text
Start Job
Complete Task
Add Photo
Record Time
Add Material
Record Issue
Voice Update
Complete Job
```

---

## W03 — Quick Update

Open as modal / drawer.

Options:

```text
Voice Update
Add Photo
Record Time
Add Material
Record Issue
Complete Task
```

---

## W04 — Simulated Voice Update

This is a showcase feature.

Show microphone animation.

Button:

```text
[ Start Demo Voice Update ]
```

After short animation, show transcript:

> Finished clearing the front and rear gutters. The rear downpipe was blocked so it took another 25 minutes. I cleared it and added the before and after photos.

Then show FieldMate interpretation:

```text
✓ Task: Gutter clean → Completed
✓ Time: +25 minutes
✓ Issue: Blocked rear downpipe
✓ Evidence: 2 photos linked
```

Buttons:

```text
[ Confirm Actions ]
[ Edit ]
```

Confirm must update local job/task/timeline state.

---

## W05 — Evidence Capture

Modal/screen.

Features:

- select demo photo;
- before/after;
- caption;
- job/task association;
- upload simulation;
- success toast.

---

# 14. CUSTOMER PORTAL

Navigation:

```text
Home
My Jobs
Quotes
Invoices
Messages
Profile
```

---

## C01 — Portal Home

Route:

```text
#/portal
```

Show:

- upcoming appointment;
- current job;
- quote awaiting approval;
- invoice;
- recent evidence;
- contact business.

---

## C02 — My Jobs

Route:

```text
#/portal/jobs
```

Sections:

```text
Active
Upcoming
Completed
Recurring
```

---

## C03 — Job Status

Route:

```text
#/portal/jobs/:id
```

Timeline:

```text
Request received
Quote accepted
Scheduled
Technician on the way
Work started
Work completed
Invoice issued
```

Features:

- technician;
- appointment;
- job summary;
- status;
- before/after;
- evidence;
- message.

---

## C04 — Quote Approval

Route:

```text
#/portal/quotes/:id
```

Features:

- quote detail;
- line items;
- total;
- terms;
- Accept;
- Decline;
- Ask Question.

Accept updates owner portal quote.

---

## C05 — Invoices

Route:

```text
#/portal/invoices
```

Features:

- amount;
- status;
- due date;
- mock payment;
- invoice preview.

No real payment.

---

# 15. WHITE-LABEL SETTINGS

White labelling is a core demo differentiator.

The prototype must support live brand updates.

Use CSS variables and localStorage.

---

## S01 — Company Settings

Route:

```text
#/app/settings/company
```

Fields:

- company name;
- tagline;
- phone;
- email;
- business address;
- service areas;
- opening hours.

Save updates global app state.

---

## S02 — Branding

Route:

```text
#/app/settings/branding
```

Controls:

```text
Logo
Company Name
Primary Colour
Secondary Colour
Accent Colour
Font Preset
Border Radius Preset
Hero Style
Show / Hide "Powered by FieldMate"
```

Presets:

```text
ClearFlow Blue
Trade Navy
Fresh Green
Premium Charcoal
```

Show a live preview next to controls:

- header;
- service card;
- button;
- status badge.

Changes must immediately affect:

- public website;
- owner portal;
- worker portal;
- customer portal.

---

## S03 — Services & Pricing

Route:

```text
#/app/settings/services
```

Each service has:

- enabled/disabled;
- icon;
- accent colour;
- title;
- short description;
- demo starting price;
- recurring option;
- sort order.

If Plumbing is disabled, it should disappear from public service cards and menus.

---

## S04 — Team

Route:

```text
#/app/settings/team
```

Features:

- team cards;
- role;
- skills;
- active/inactive;
- service capability;
- invite simulation.

---

## S05 — Integrations

Route:

```text
#/app/settings/integrations
```

Cards:

- Google Calendar
- Google Business Profile
- Stripe
- Google Play
- Accounting
- Email
- SMS
- Maps
- AI Provider

Display:

```text
Demo / Not Connected
```

No real integration.

---

## S06 — Plan

Route:

```text
#/app/settings/plan
```

Show fictional plan:

**FieldMate Pro**

Features:

- 3 field workers
- AI Copilot
- Voice updates
- Customer portal
- White labelling
- Reports

Show feature usage bars.

No real billing.

---

# 16. PRESENTER / DEMO MODE

Add a small `Demo` button in top-right menu.

Demo drawer:

```text
Persona
[ Owner ]
[ Worker ]
[ Customer ]

Scenario
[ Gutter Job ]
[ Plumbing Emergency ]
[ Window Round ]

Navigation
[ Public Website ]
[ Dashboard ]
[ Worker Today ]
[ Customer Portal ]

Actions
[ Reset Demo Data ]
```

Reset should:

- clear prototype localStorage keys;
- restore default fixtures;
- restore default ClearFlow branding.

---

# 17. Core Demo Dataset

All screens must derive data from the same fixture objects.

Do not duplicate copies in separate pages.

## 17.1 Priya Shah scenario — main showcase

Customer:

```text
Priya Shah
18 Willow Close
Chelmsford
CM2 6XX
```

Lead:

```text
Source: Website
Service: Gutter Cleaning
Request:
Front and rear gutters on 3-bed semi.
Rear downpipe may be blocked.
```

Quote:

```text
Gutter vacuum            £80
Downpipe clearance       £25
Rear extension gutter    £20
-----------------------------
Total                    £125
```

Job:

```text
JOB-1042
Shah Gutter Clean
```

Assigned:

```text
Maya Khan
Owen Price
```

Schedule:

```text
9 Oct
10:30–11:50
```

Tasks:

```text
1. Inspect property
2. Before photographs
3. Vacuum front gutter
4. Vacuum rear gutter
5. Clear rear downpipe
6. After photographs
7. Customer handover
```

Execution:

- blocked downpipe discovered;
- +25 minutes;
- issue recorded;
- before and after photos;
- work completed.

Invoice:

```text
£125
```

This same scenario must appear consistently in:

- lead;
- customer;
- quote;
- job;
- tasks;
- schedule;
- evidence;
- invoice;
- customer portal;
- reports;
- Copilot.

---

# 18. Additional Dummy Data

Include at least:

## Sarah Williams

Service:

```text
Urgent plumbing — leaking kitchen tap
```

## Mark Hughes

Service:

```text
Recurring 4-week window clean
```

## Helen Foster

Service:

```text
Gutter clean + blocked downpipe
```

## John Carter

Service:

```text
Toilet cistern repair
```

Add enough completed historical jobs to populate:

- dashboard;
- charts;
- customer history;
- AI Copilot.

---

# 19. Domain Type Suggestions

Keep simple, coherent TypeScript types.

```ts
type ServiceType = 'plumbing' | 'gutter' | 'window';

type LeadStatus =
  | 'new'
  | 'contacted'
  | 'quoted'
  | 'converted'
  | 'lost';

type JobStatus =
  | 'new'
  | 'quoted'
  | 'scheduled'
  | 'in-progress'
  | 'blocked'
  | 'completed'
  | 'invoiced'
  | 'closed';

interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  postcode: string;
  tags: string[];
}

interface Lead {
  id: string;
  customerName: string;
  email?: string;
  phone?: string;
  postcode?: string;
  service: ServiceType;
  summary: string;
  source: 'website' | 'phone' | 'referral';
  urgency: 'normal' | 'urgent';
  status: LeadStatus;
  createdAt: string;
  estimatedValue?: number;
}

interface Job {
  id: string;
  customerId: string;
  title: string;
  service: ServiceType;
  status: JobStatus;
  scheduledStart?: string;
  scheduledEnd?: string;
  assignedWorkerIds: string[];
  quotedAmount?: number;
  actualCost?: number;
  taskIds: string[];
}

interface Task {
  id: string;
  jobId: string;
  title: string;
  status: 'ready' | 'scheduled' | 'in-progress' | 'blocked' | 'completed';
  estimatedMinutes: number;
  actualMinutes?: number;
  assignedWorkerId?: string;
}

interface QuoteLine {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
}

interface Quote {
  id: string;
  customerId: string;
  jobId?: string;
  status: 'draft' | 'sent' | 'viewed' | 'accepted' | 'declined';
  lineItems: QuoteLine[];
  total: number;
}

interface Invoice {
  id: string;
  customerId: string;
  jobId: string;
  status: 'draft' | 'sent' | 'due' | 'overdue' | 'paid';
  total: number;
  dueDate?: string;
}

interface EvidenceItem {
  id: string;
  jobId: string;
  taskId?: string;
  type: 'before' | 'after' | 'receipt' | 'document';
  url: string;
  caption?: string;
}

interface BrandingSettings {
  companyName: string;
  tagline: string;
  logoUrl: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  fontPreset: string;
  borderRadiusPreset: string;
  showPoweredByFieldMate: boolean;
}
```

---

# 20. Local Demo State

Use a top-level `DemoProvider`.

Suggested responsibilities:

```text
Customers
Leads
Jobs
Tasks
Quotes
Invoices
Evidence
Team
Services
Branding
Current Persona
Demo Scenario
Notifications
```

Persist selected state to localStorage.

Recommended keys:

```text
fieldmate-demo-data-v1
fieldmate-demo-brand-v1
fieldmate-demo-persona-v1
```

Provide helper actions:

```ts
createLead()
convertLeadToJob()
updateJobStatus()
updateTaskStatus()
addEvidence()
addIssue()
sendQuote()
acceptQuote()
sendInvoice()
markInvoicePaid()
updateBranding()
toggleService()
resetDemo()
```

Do not scatter direct localStorage access throughout page components.

---

# 21. Simulated Actions

Every meaningful CTA should do something.

| Action | Expected prototype behaviour |
|---|---|
| Submit quote request | Add lead to shared state |
| Book slot | Update lead/booking state |
| Convert lead | Create customer + job |
| Create quote | Add quote |
| Send quote | Set status to Sent |
| Accept quote | Set status to Accepted |
| Start job | Set In Progress |
| Block job | Set Blocked |
| Resume job | Set In Progress |
| Complete task | Set Completed |
| Add time | Increase actual minutes |
| Add material | Add cost/timeline entry |
| Record issue | Add issue/timeline item |
| Add evidence | Add demo evidence item |
| Voice update | Show transcript + actions |
| Confirm voice actions | Apply status/time/issue/evidence changes |
| Complete job | Set Completed |
| Create invoice | Add invoice |
| Send invoice | Set Sent |
| Mark paid | Set Paid |
| Change branding | Update CSS variables + localStorage |
| Toggle service | Hide/show service in public site |
| Ask Copilot | Simulate streaming response |
| Reset demo | Restore fixtures |

No visible primary button should be dead.

---

# 22. AI Copilot Simulation

Implement a simple rule-based response map.

Pseudo-pattern:

```ts
if prompt includes "plan my day"
  return planMyDayResponse

if prompt includes "at risk"
  return atRiskResponse

if prompt includes "Shah"
  return shahJobSummary

if prompt includes "recurring"
  return recurringCustomersResponse
```

Simulate streaming by revealing text progressively.

No API request.

---

# 23. Voice Simulation

Do not access microphone.

Implementation:

1. User clicks `Start Demo Voice Update`.
2. Animate listening for ~1.5 seconds.
3. Show transcript.
4. Animate "FieldMate is interpreting..."
5. Show structured actions.
6. User clicks Confirm.
7. Apply demo state updates.
8. Show toast.

This creates the product experience without speech infrastructure.

---

# 24. Technical Stack

Use:

```text
React
TypeScript
Vite
React Router
Tailwind CSS
Lucide React
Recharts
localStorage
```

Optional:

```text
Framer Motion
```

Only use Framer Motion if it materially improves polish.

Do not add Redux unless existing repository already uses it.

React Context + reducer/hooks is sufficient.

---

# 25. Suggested Source Structure

```text
src/
├── app/
│   ├── App.tsx
│   ├── router.tsx
│   ├── DemoProvider.tsx
│   └── demoReducer.ts
│
├── components/
│   ├── common/
│   │   ├── Button.tsx
│   │   ├── Badge.tsx
│   │   ├── Card.tsx
│   │   ├── Modal.tsx
│   │   ├── Drawer.tsx
│   │   ├── EmptyState.tsx
│   │   ├── StatCard.tsx
│   │   └── Toast.tsx
│   │
│   ├── public/
│   ├── portal/
│   ├── worker/
│   ├── customer/
│   ├── charts/
│   ├── evidence/
│   └── demo/
│
├── layouts/
│   ├── PublicLayout.tsx
│   ├── OwnerLayout.tsx
│   ├── WorkerLayout.tsx
│   └── CustomerLayout.tsx
│
├── pages/
│   ├── public/
│   ├── owner/
│   ├── worker/
│   ├── customer/
│   └── settings/
│
├── data/
│   ├── fixtures.ts
│   ├── services.ts
│   ├── customers.ts
│   ├── leads.ts
│   ├── jobs.ts
│   ├── tasks.ts
│   ├── quotes.ts
│   ├── invoices.ts
│   ├── team.ts
│   ├── reviews.ts
│   └── evidence.ts
│
├── hooks/
│   ├── useDemo.ts
│   ├── useBranding.ts
│   ├── useMediaQuery.ts
│   └── useToast.ts
│
├── theme/
│   ├── tokens.ts
│   ├── branding.ts
│   └── global.css
│
├── types/
│   └── domain.ts
│
└── utils/
    ├── format.ts
    ├── demoResponses.ts
    └── storage.ts

public/
└── assets/
    ├── brand/
    ├── services/
    ├── gallery/
    ├── team/
    └── demo/
```

---

# 26. Reusable Components to Build First

Build once and reuse:

```text
AppButton
ServiceCard
StatCard
StatusBadge
PageHeader
SectionHeader
DataTable
SearchInput
FilterBar
Tabs
Modal
Drawer
Toast
Avatar
Timeline
JobCard
TaskCard
QuoteCard
InvoiceCard
EvidenceCard
BeforeAfterCard
TeamCard
EmptyState
LoadingSkeleton
ConfirmDialog
DemoBadge
BrandPreview
```

Keep visual consistency.

---

# 27. Responsive Requirements

Test at:

```text
375px
768px
1024px
1440px
```

Public:

- large desktop nav;
- mobile hamburger;
- sticky mobile CTA;
- stacked service cards.

Owner:

Desktop:
- fixed sidebar.

Tablet:
- collapsible sidebar.

Mobile:
- drawer navigation;
- stacked cards;
- tables become cards;
- horizontal overflow only where unavoidable.

Worker:

- mobile-first;
- bottom nav;
- thumb-friendly buttons.

Customer:

- responsive portal cards/timeline.

---

# 28. Accessibility

Required:

- semantic HTML;
- proper labels;
- focus states;
- keyboard navigation;
- visible selected state;
- WCAG-friendly colour contrast;
- no colour-only status meaning;
- minimum useful tap sizes;
- alt text;
- aria-labels for icon-only buttons;
- reduced-motion respect;
- readable charts with visible numbers.

---

# 29. Performance

Because GitHub Pages is static:

- lazy-load route groups;
- optimise images;
- use local assets;
- avoid oversized component libraries;
- avoid unnecessary animations;
- no external runtime APIs;
- no web fonts if they slow the demo substantially; system fallback okay.

Goal:

> First meaningful paint should feel immediate.

---

# 30. GitHub Pages Deployment

Use `HashRouter`.

Example deployed URLs:

```text
https://<account>.github.io/<repo>/#/
https://<account>.github.io/<repo>/#/app/dashboard
https://<account>.github.io/<repo>/#/worker/today
```

Vite configuration must use correct repository `base`.

Add GitHub Actions workflow if needed.

Suggested:

```yaml
name: Deploy Pages

on:
  push:
    branches: [main]

permissions:
  contents: read
  pages: write
  id-token: write

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
      - run: npm ci
      - run: npm run build
      - uses: actions/upload-pages-artifact@v3
        with:
          path: ./dist

  deploy:
    needs: build
    environment:
      name: github-pages
    runs-on: ubuntu-latest
    steps:
      - uses: actions/deploy-pages@v4
```

Adjust to repository conventions if already configured.

---

# 31. Implementation Sequence

Claude must follow this order.

Do not implement all pages randomly.

## Phase 0 — Repository inspection

Before coding:

1. inspect repo;
2. identify existing React/Vite/Tailwind setup;
3. inspect README;
4. inspect existing components;
5. identify current branch;
6. preserve existing architecture docs;
7. do not overwrite unrelated work.

Then write a short implementation checklist into the working notes.

---

## Phase 1 — Foundation

Implement:

- Vite/React/TS if missing;
- Tailwind;
- HashRouter;
- theme tokens;
- layouts;
- common components;
- DemoProvider;
- fixtures;
- localStorage persistence;
- toast;
- demo reset;
- persona selector.

Validation:

- build;
- run;
- confirm navigation shell;
- confirm branding variables;
- confirm localStorage.

---

## Phase 2 — Public Homepage First

Before any other large area, build an excellent `P01 Home`.

The homepage must:

- look presentation-ready;
- expose service starters immediately;
- contain call / quote / book CTAs;
- work on mobile;
- have professional images/icons;
- have trust signals;
- show before/after;
- show availability;
- show reviews;
- show recurring care;
- show final CTA.

Do not proceed until Home feels strong.

---

## Phase 3 — Public Journey

Implement:

- Services;
- Plumbing;
- Gutter;
- Windows;
- How It Works;
- Quote Wizard;
- Booking;
- Confirmation;
- Gallery;
- Reviews;
- About;
- Contact.

Validation:

Run:

```text
Home
→ Gutter
→ Quote
→ Booking
→ Confirmation
```

Ensure new lead exists in demo state.

---

## Phase 4 — Owner Portal Core

Implement:

- Dashboard;
- Leads;
- Lead Detail;
- Customers;
- Customer Detail;
- Jobs;
- Job Detail;
- Tasks;
- Task Detail;
- Schedule.

Ensure Priya scenario is coherent.

Validation:

```text
Owner Dashboard
→ Leads
→ Priya
→ Convert
→ Job
→ Schedule
→ Dashboard
```

---

## Phase 5 — Commercial / Files / Reports

Implement:

- Quotes;
- Quote Builder;
- Invoices;
- Files;
- Reports;
- Search;
- Notifications.

Validation:

```text
Job
→ Quote
→ Send
→ Accept
→ Invoice
→ Paid
```

---

## Phase 6 — Worker Experience

Implement:

- Today;
- Job;
- Quick Update;
- Voice simulation;
- Evidence simulation.

Validation:

```text
Today
→ Shah Job
→ Start
→ Voice Update
→ Confirm
→ Complete
```

Verify owner Job Detail reflects updates.

---

## Phase 7 — Customer Portal

Implement:

- Portal Home;
- Jobs;
- Job Status;
- Quote Approval;
- Invoice.

Verify state consistency with owner/worker.

---

## Phase 8 — White Labelling

Implement:

- Company;
- Branding;
- Services;
- Team;
- Integrations;
- Plan.

Validation:

1. change company to `ABC Plumbing & Exterior Cleaning`;
2. change colours;
3. hide `Powered by FieldMate`;
4. disable Plumbing;
5. return to public Home;
6. verify entire experience reflects configuration;
7. reset demo.

---

## Phase 9 — AI Copilot

Implement simulated Copilot.

Responses must be based on fixture data.

Add useful action chips.

---

## Phase 10 — Presentation Polish

Perform:

- responsive review;
- spacing consistency;
- visual hierarchy;
- images;
- empty/loading states;
- keyboard/focus;
- transitions;
- toast quality;
- no dead buttons;
- no broken links.

---

## Phase 11 — GitHub Pages

Implement / validate:

```text
npm ci
npm run build
```

Deploy workflow.

Check base path.

Check HashRouter.

Update README.

---

# 32. Critical Demo Journeys

## Journey A — Public Customer to Lead

```text
Home
→ Gutter Cleaning
→ Start Gutter Quote
→ Fill wizard
→ Choose time
→ Confirmation
→ Owner persona
→ Leads
→ New lead visible
```

---

## Journey B — Lead to Job

```text
Leads
→ Priya
→ Convert
→ Customer
→ Job
→ Schedule
```

---

## Journey C — Worker Execution

```text
Worker Today
→ Shah Job
→ Start
→ Add Before Evidence
→ Voice Update
→ Confirm
→ Add After Evidence
→ Complete Job
```

---

## Journey D — Customer View

```text
Customer Portal
→ My Jobs
→ Shah Job
→ Completed
→ Before/After
→ Invoice
```

---

## Journey E — White Label

```text
Owner
→ Settings
→ Branding
→ Change Name / Colours
→ Public Website
→ Verify Brand
```

---

## Journey F — AI Copilot

```text
Dashboard
→ Copilot
→ Plan my day
→ Stream simulated answer
→ Open Schedule
→ Return Dashboard
```

---

# 33. Acceptance Criteria

Prototype is complete only when all of the following pass.

## Build

- `npm install` / `npm ci` works.
- `npm run build` succeeds.
- no TypeScript build errors.
- no fatal console errors.

## Navigation

- every primary route opens;
- every sidebar item opens;
- every public navigation item opens;
- no dead major CTA;
- Home is always reachable;
- owner Dashboard is always reachable;
- mobile nav works.

## Public journey

- service selection works;
- quote wizard works;
- booking works;
- confirmation works;
- submission creates lead.

## Owner

- lead appears;
- conversion creates customer/job;
- job detail works;
- task changes work;
- schedule works;
- quotes work;
- invoices work.

## Worker

- Today works;
- Start Job works;
- Voice simulation works;
- Confirm changes state;
- Evidence simulation works;
- Complete Job works.

## Customer

- Job status visible;
- accepted quote state visible;
- invoice visible;
- evidence visible.

## White label

- company name changes;
- colours change;
- logo changes;
- service toggles update public site;
- `Powered by FieldMate` toggle works;
- settings persist after refresh;
- reset restores default.

## Presentation quality

- Home looks premium;
- Dashboard looks professional;
- Job detail is coherent;
- Schedule is visually strong;
- worker view looks mobile-ready;
- branding screen is impressive;
- no obviously fake broken UI;
- all fictional data is consistent.

## GitHub Pages

- deployed build works;
- refresh works;
- direct hash URLs work;
- assets work under repo base path.

---

# 34. Required README Update

Add:

```text
# FieldMate Interactive Demo

## Run locally
npm install
npm run dev

## Build
npm run build

## Demo personas
Owner / Office
Field Worker
Customer

## Key demo scenarios
Gutter Cleaning
Urgent Plumbing
Recurring Window Cleaning

## GitHub Pages
Deployment instructions

## Important
All businesses, customers and transactions are fictional demonstration data.
No production backend or real integrations are connected.
```

---

# 35. Claude Working Rules

Claude must follow these rules.

1. Read the full document before coding.
2. Inspect repository first.
3. Do not ask for design clarification unless absolutely blocked.
4. Make reasonable implementation decisions consistent with this document.
5. Keep code modular but avoid unnecessary abstractions.
6. Do not create microservices.
7. Do not add backend infrastructure.
8. Do not add paid APIs.
9. Do not add real provider credentials.
10. Do not expose secrets.
11. Do not use random data per render; fixture data must be deterministic.
12. Reuse shared components.
13. Reuse one shared data model.
14. Do not duplicate the Priya scenario across isolated screen constants.
15. Do not leave dead buttons.
16. Validate after each implementation phase.
17. Prioritise polish on the 10 most important screens.
18. Preserve existing architecture README/docs.
19. Do not redesign FieldMate platform architecture as part of this CR.
20. This CR is a **prototype / sales validation artefact**, not production architecture.

---

# 36. Most Important Screens — Design Priority

Spend disproportionate visual effort on:

1. Public Home
2. Instant Quote Wizard
3. Owner Dashboard
4. Lead Detail
5. Job Detail
6. Schedule
7. Worker Today
8. Voice Update
9. Customer Job Status
10. Branding / White Label
11. AI Copilot

These are the screens most likely to shape customer perception.

---

# 37. UX Quality Bar

The prototype should make the viewer think:

> "This feels like a real product I could use for my business."

Avoid:

- empty generic dashboards;
- random lorem ipsum;
- inconsistent fixture data;
- Bootstrap-looking defaults;
- excessive gradients;
- tiny controls;
- crowded cards;
- fake links;
- hidden customer CTAs;
- unexplained acronyms;
- excessive modal use;
- technical architecture language in the customer UI.

---

# 38. Product Language

Use simple operational terminology.

Prefer:

```text
Customer
Job
Task
Quote
Invoice
Schedule
Worker
Photo
Issue
Time
Material
Payment
```

Avoid exposing internal platform terms:

```text
Entitlement
Access Core
MCP
LLM Gateway
Policy Decision
Provider Adapter
```

These belong to platform architecture, not the demo business UX.

---

# 39. Suggested Demo Presentation Script

This is not implementation code, but the UI should support this flow.

### 1. Start at Home

Explain:

> This is the business's own branded website powered by FieldMate.

Click `Gutter Cleaning`.

### 2. Start quote

Choose property details.

Show instant estimate.

Choose slot.

Submit.

### 3. Switch to Owner

Open new lead.

Show all enquiry details already captured.

Convert to job.

### 4. Schedule

Assign Maya and Owen.

### 5. Switch to Worker

Show Today.

Open Shah job.

Start.

Show voice update.

Confirm structured actions.

Show photos.

Complete.

### 6. Switch to Customer

Show job status, evidence and invoice.

### 7. Return Owner

Show reports.

Open Copilot.

Ask `Plan my day`.

### 8. Branding

Change company name and colours.

Return Home.

Explain:

> The same platform can be white-labelled for your business.

This should be a smooth 10–15 minute client presentation.

---

# 40. Final Delivery Expected From Claude

Claude should finish the CR with:

1. working source code;
2. successful local build;
3. GitHub Pages compatible routing;
4. deployment workflow;
5. completed README;
6. all demo routes;
7. all shared fixture data;
8. white-label controls;
9. coherent demo journeys;
10. no backend dependencies;
11. no secrets;
12. no dead primary actions.

Claude should provide a final summary containing:

```text
Implemented
Routes added
Key components
Demo scenarios
How to run
How to build
How to deploy
Known prototype-only limitations
```

---

# 41. Definition of Done

The implementation is done when a prospective plumbing / gutter / window-cleaning client can receive a GitHub Pages URL, open it with no setup, click through the whole service lifecycle, see professional branding and realistic dummy business data, switch between customer/office/worker perspectives, change the branding, and understand what FieldMate could do for their business.

No backend should be required to achieve that demonstration.
