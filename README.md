# 🌌 Debt Elimination Engine (v3.1.0)

> **Algorithmic Mortgage, Credit Card, Loan & Multi-Debt Payoff Optimization Platform**  
> Engineered to eliminate interest friction, defeat compounding drag, and accelerate your path to zero debt.

👉 **[Live Application](https://richardmalo.github.io/TrueMortgageV3/)** | **[GitHub Repository](https://github.com/RichardMalo/TrueMortgageV3)**

---

## 📖 Table of Contents

1. [Executive Overview](#-executive-overview)
2. [Core Financial & Optimization Engines](#-core-financial--optimization-engines)
   - [Mortgage Optimization Engine](#1-mortgage-optimization-engine)
   - [Credit Card Optimization Engine](#2-credit-card-optimization-engine)
   - [Personal & Auto Loan Engine](#3-personal--auto-loan-engine)
   - [Multi-Debt Cascade Engine (Avalanche & Snowball)](#4-multi-debt-cascade-engine-avalanche--snowball)
   - [International Closing Tax Matrix (LTT, SDLT, Transfer Duty)](#5-international-closing-tax-matrix)
3. [Advanced Strategy & Simulation Modeling](#-advanced-strategy--simulation-modeling)
   - [Payoff Goal Solver (Binary Search)](#payoff-goal-solver-binary-search)
   - [Refinancing Rate Shock Timeline](#refinancing-rate-shock-timeline)
   - [Scheduled Future Lump Sums with Kinetic Savings](#scheduled-future-lump-sums-with-kinetic-savings)
   - [Opportunity Cost vs. Market Index Analytics](#opportunity-cost-vs-market-index-analytics)
   - [Strategy Impact 2D Sensitivity Heatmap (Web Worker)](#strategy-impact-2d-sensitivity-heatmap-web-worker)
   - [Bank Wages & Career Labor Converter (Vampire Drain)](#bank-wages--career-labor-converter-vampire-drain)
4. [Dashboard Visualizations & Chart Catalog](#-dashboard-visualizations--chart-catalog)
5. [Bento Dashboard & Accessibility Architecture](#-bento-dashboard--accessibility-architecture)
6. [Zero-Trust Security, Web Cryptography & Privacy](#-zero-trust-security-web-cryptography--privacy)
7. [Internationalization & Localization (i18n)](#-internationalization--localization-i18n)
8. [Codebase Architecture & File Catalog](#-codebase-architecture--file-catalog)
9. [Technology Stack & Build Tools](#-technology-stack--build-tools)
10. [Development & Testing Guide](#-development--testing-guide)
11. [License & Compliance](#-license--compliance)

---

## 🌐 Executive Overview

The **Debt Elimination Engine** is an algorithmic, 100% client-side financial engineering platform. It models mortgage, consumer credit, and revolving debt amortization schedules under aggressive pay-down regimens (accelerated payment frequencies, discretionary surplus, renewal rate shocks, scheduled future lump sums) and rigorously benchmarks them against investment capital compounding (opportunity cost analysis).

The entire application runs **exclusively in the browser**. All financial calculations, scenario profiles, encrypted state payloads, and custom blueprints remain private on your device and are never transmitted to any external server.

---

## ⚡ Core Financial & Optimization Engines

### 1. Mortgage Optimization Engine

- **Statutory Compounding Standards:**
  - **Canada (Semi-Annual Compounding by Law):** Enforces statutory Canadian Bank Act compounding:
    $$r_{monthly} = \left(1 + \frac{\text{APR}}{2}\right)^{2/12} - 1$$
    For arbitrary payment frequencies with $f$ periods per year:
    $$r_{periodic} = \left(1 + \frac{\text{APR}}{2}\right)^{2/f} - 1$$
  - **US / UK / Australia / New Zealand (Monthly Nominal Compounding):**
    $$r_{periodic} = \frac{\text{APR}}{f}$$
- **Canadian Statutory Regulations (Updated to Dec 15, 2024 Rules):**
  - **Tiered Minimum Down Payment:**
    - Up to \$500,000: **5%**
    - \$500,000 to \$1,500,000: **5% on first \$500,000 (\$25,000) + 10% on remainder**
    - Over \$1,500,000: **20% statutory floor**
  - **CMHC Default Mortgage Insurance:** Properties up to and including \$1,500,000 with down payments between 5% and 19.99% are eligible for tiered insurance premiums (2.80% to 4.00%). Properties over \$1.5M or with down payments under 5% are legally prohibited from default insurance.
  - **30-Year Amortization Surcharge:** Automatically applies the statutory **+0.20%** premium surcharge for amortizations exceeding 25 years on insured mortgages.
  - **Provincial Sales Tax on CMHC Premiums:** Accounts for provincial sales tax paid on insurance premiums at closing (Ontario: **8% PST**, Quebec: **9.975% QST**, Saskatchewan: **6% PST**).
  - **OSFI B-20 Stress Test Qualifying Rate:** Computes the statutory Canadian qualification rate:
    $$\text{Rate}_{\text{qualifying}} = \max(\text{Contract Rate} + 2.00\%,\, 5.25\%)$$
- **Private Mortgage Insurance (PMI) for US Mortgages:**
  - Automatically calculates periodic PMI premiums based on purchase loan-to-value (LTV).
  - Tracks real-time equity growth and automatically terminates PMI payments the instant the balance reaches the statutory **80% LTV threshold**.
- **Accelerated Payment Frequencies:**
  - **Monthly (12/yr):** Standard installment payment.
  - **Semi-Monthly (24/yr):** Payment split on 1st and 15th.
  - **Bi-Weekly (26/yr):** Half-monthly payment paid every 14 days.
  - **Accelerated Bi-Weekly (26/yr):** Monthly payment divided by 2. Results in 26 payments per year (the equivalent of **13 full monthly payments**), shaving 3 to 4 years off a typical 25-year mortgage.
  - **Weekly (52/yr):** Monthly payment multiplied by 12 and divided by 52.
  - **Accelerated Weekly (52/yr):** Monthly payment divided by 4, producing 52 payments per year.

---

### 2. Credit Card Optimization Engine

- **Jurisdiction-Compliant Minimum Payment Rules:**
  - **Ontario / International Standard (3% Rule):** Maximum of $\max(3\% \times \text{Balance},\, \text{Interest} + 1\% \times \text{Balance},\, \$10)$.
  - **Quebec Consumer Protection Act Mandate (5% Rule):** Enforces statutory 5% minimum payment floor.
  - **Custom Rules:** Configurable percentage rules, interest-plus-percentage rules, and flat dollar minimum floors.
- **Compounding Methods:** Simple interest per billing cycle vs. standard daily periodic rate compounding:
  $$r_{monthly} = \left(1 + \frac{\text{APR}}{365}\right)^{365/12} - 1$$
- **Cent-Accurate Rounding & Negative Amortization Safeguards:**
  - Eliminates floating-point accumulation drift over 600 billing cycles using cent-level rounding (`Math.round(x * 100) / 100`).
  - Automatically detects runaway negative amortization (where minimum payment is insufficient to cover monthly interest) and safely stops runaway iteration.

---

### 3. Personal & Auto Loan Engine

- **Closed-End Installment Amortization:** Models personal loans, auto financing, and consumer installments across custom amortizations (1 to 10 years).
- **Capitalized Origination Fees:** Models upfront administration/origination fees added to the financed principal balance ($L_{\text{total}} = L_{\text{base}} + \text{Fee}$) with accurate effective APR calculation.
- **Flexible Acceleration Trajectories:** Seamless integration with surplus periodic extra payments and milestone lump sums.

---

### 4. Multi-Debt Cascade Engine (Avalanche & Snowball)

The Multi-Debt Engine enables borrowers with multiple liabilities (credit cards, auto loans, student loans, personal debts) to manage them as a unified financial portfolio:

- **Mathematical Optimization Strategies:**
  - **Debt Avalanche (Mathematical Optimum):** Targets debts strictly by descending APR ($\text{Rate} \downarrow$). Delivers the lowest possible total lifetime interest paid.
  - **Debt Snowball (Psychological Momentum):** Targets debts strictly by ascending starting balance ($\text{Balance} \uparrow$). Delivers early psychological victories by extinguishing entire loan lines as quickly as possible.
- **Dynamic Surplus Cascade (Rollover):**
  - All debts receive their mandatory minimum payments each month.
  - Any remaining surplus budget is applied directly to the principal of the priority debt.
  - The instant a debt reaches \$0 balance, its minimum payment and surplus cascade into the next target liability in the priority queue.
- **Payoff Order Table with ID Tracking:** Displays a chronological payoff roadmap with starting balance, APR, payoff position, and strategy priority descriptions without name collision bugs.
- **Comparative Metrics:** Quantifies total interest, months to freedom, interest saved vs. minimums, and time shaved vs. minimums across baseline, avalanche, and snowball models.

---

### 5. International Closing Tax Matrix

#### Canadian Land Transfer Tax (LTT)

- **Ontario (PLTT):** Tiered rates from 0.5% (\$0 to \$55k), 1.0% (\$55k to \$250k), 1.5% (\$250k to \$400k), 2.0% (\$400k to \$2M), and 2.5% (\$2M+).
- **City of Toronto (MLTT):** Full municipal mirror tax with First-Time Homebuyer rebates (\$4,000 PLTT rebate + \$4,475 MLTT rebate).
- **British Columbia (PTT):** Tiered rates (1% on first \$200k, 2% up to \$2M, 3% remainder). Includes 2024 First-Time Home Buyers' Program limits (\$835k full exemption with phase-out to \$860k).
- **Alberta (Land Titles Transfer Fees):** Statutory property registration fees (\$50 base + \$2 per \$5,000 value).
- **Quebec (_Taxe de bienvenue_):** Statutory municipal transfer duties (0.5% up to \$58.9k, 1.0% to \$294.6k, 1.5% remainder).

#### UK Stamp Duty Land Tax (SDLT)

- **Standard Residential Rates:**
  - £0 to £250,000: **0%**
  - £250,001 to £925,000: **5%**
  - £925,001 to £1,500,000: **10%**
  - Over £1,500,000: **12%**
- **First-Time Buyer Relief:** 0% up to £425,000, 5% on portion from £425,001 to £625,000 (purchases over £625,000 ineligible).
- **Additional Property Surcharge:** Automatically applies the **+3.0%** surcharge across all tiers for buy-to-let or second homes.

#### Australian Stamp Duty (Transfer Duty)

- **New South Wales (NSW):** Standard progressive residential rates from 1.25% up to 5.5% (over \$1M). Includes First Home Buyers Assistance Scheme (FHBAS) concessions and optional Foreign Purchaser Duty Surcharge (**+8%**).
- **Victoria (VIC):** Standard progressive duty brackets from 1.4% up to 5.5% (over \$960k). Includes principal place of residence concessions and foreign purchaser surcharge (**+8%**).

---

## 🔬 Advanced Strategy & Simulation Modeling

### Payoff Goal Solver (Binary Search)

- Solves the inverse amortization problem: _"What exact periodic extra payment or one-time lump sum is required to be debt-free by Year X or Date Y?"_
- Uses an $O(\log N)$ binary search algorithm operating over 24 iterations to achieve sub-dollar precision ($\le \$0.03$ resolution) rounded to the ceiling dollar.
- Implements feasibility validation guards to detect infeasible targets (e.g. target date in the past or shorter than 1 payment cycle) and target-already-achieved conditions.

### Refinancing Rate Shock Timeline

- Directly models variable or fixed renewal cycles (e.g. 3-year, 5-year, or 10-year term lengths).
- Allows users to simulate interest rate changes at renewal milestones (e.g. +1.50% or +2.50% rate hikes).
- Amortization adjusts dynamically while keeping payments constant, recalculating the extended or shortened payoff timeline with integer period boundary math.

### Scheduled Future Lump Sums with Kinetic Savings

- Allows adding scheduled future principal injections (e.g. \$5,000 annual bonuses, \$10,000 tax refunds) at specific payment numbers.
- Dynamic date badges compute the exact calendar date of each milestone payment across all payment frequencies.
- Real-time interest savings counters calculate the isolated lifetime compound interest saved by that individual lump sum, backed by a FIFO memoization cache.

### Opportunity Cost vs. Market Index Analytics

- Compares early debt repayment (guaranteed return equal to the loan APR) against investing surplus funds into broad-market index funds (e.g. S&P 500 at 7–10% annual return).
- Evaluates cash-flow liberation: once debt is extinguished, former debt installment payments are redirected into investment compounding.
- Incorporates PMI drop-off: cash freed up from cancelled PMI premiums is dynamically added to the investment accumulation stream.
- Implements a linear cursor sweep (`ScheduleCursor`) initialized from `schedule[0]` to maintain exact parity when loan insurance or fees are capitalized.

### Strategy Impact 2D Sensitivity Heatmap (Web Worker)

- Computes a full 2D matrix evaluating dozens of combinations of periodic extra payments (rows) versus lump-sum injections (columns).
- Fully offloaded to a dedicated background **Web Worker** (`heatmap.worker.ts`) using transferrable payloads and cancellation tokens, guaranteeing 60fps main-thread responsiveness.
- Color-coded cells indicate payoff timeline reduction in years; clicking any cell immediately applies that strategy to the active plan.

### Bank Wages & Career Labor Converter (Vampire Drain)

- Translates abstract interest figures into tangible career metrics:
  - **Working Hours Lost:** Translates interest paid into hours of labor based on hourly wage.
  - **Equivalent Months of Rent:** Quantifies interest in terms of monthly shelter costs.
  - **Days of Life Worked for the Bank:** Calculates full working days dedicated solely to bank profit.

---

## 📊 Dashboard Visualizations & Chart Catalog

TrueMortgageV3 provides 12 interactive visualization widgets powered by Plotly.js and optimized for high-DPI displays and dark/light themes:

| #   | Visualization                          | Location / ID               | Description                                                                                                                          |
| --- | -------------------------------------- | --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | **Debt Balance Trajectory**            | `#chart`                    | Dual-curve comparison showing baseline amortization vs. accelerated payoff with a vertical red dashed term-end renewal line.         |
| 2   | **Payment Composition Stack**          | `#chart6`                   | True stacked area visualization (`stackgroup: 'one'`) displaying principal (including extra payments) and interest shares over time. |
| 3   | **Payment Breakdown Donut**            | `#monthlyPaymentCircle`     | Centered donut chart breaking down P&I, Taxes, Insurance, HOA, PMI, and Extra payments with color alignment.                         |
| 4   | **Cumulative Interest & Savings**      | `#chart2`                   | Area curve illustrating cumulative interest paid vs. total interest avoided via strategy enhancements.                               |
| 5   | **Concentric Capital Markup Rings**    | `#chart4`                   | Circular bubble comparison contrasting initial borrowed capital against lifetime interest overhead.                                  |
| 6   | **Bank Wages & Rent Equivalents**      | `#wagesVizCard`             | Career labor circles translating total interest into working days and equivalent months of rent.                                     |
| 7   | **Annual Cash Flow Breakdown**         | `#chart11`                  | Stacked bar chart showing total annual principal, interest, extra payments, and escrow partitioned by calendar year.                 |
| 8   | **Opportunity Cost Wealth Trajectory** | `#chart3`                   | Linear comparative projection tracking debt paydown equity against market compound investment returns.                               |
| 9   | **Strategy Sensitivity Heatmap**       | `#chart10`                  | 2D color-gradient matrix showing years saved across various combinations of extra payments and lump sums.                            |
| 10  | **Multi-Debt Comparison Chart**        | `#multiDebtComparisonChart` | Multi-bar comparison illustrating balance decay and interest across Baseline, Avalanche, and Snowball.                               |
| 11  | **Payoff Milestones Roadmap**          | `#milestonesContainer`      | Chronological roadmap marking critical milestones (20% equity, PMI drop, 50% paid, debt freedom).                                    |
| 12  | **Amortization Schedule Table**        | `#amortization-table`       | High-performance, virtualized schedule table rendered in 50-row chunks with a red term-end milestone divider banner.                 |

---

## 🎨 Bento Dashboard & Accessibility Architecture

- **Customizable Bento Grid:** Drag-and-drop and keyboard-accessible card reordering (`card-order.ts`), full-width toggling, and visibility controls.
- **Red Term-End Milestone Indicators:** High-contrast crimson red line and banner inside the Amortization Schedule Table identifying contract term boundaries, paired with a vertical dashed marker on the trajectory chart.
- **Focus Sealing & Modal Trapping:** Fully accessible modal manager (`modals.ts`) featuring focus trapping, focus restoration, `aria-modal="true"`, and sealed off-screen elements (`visibility: hidden !important; pointer-events: none !important;`).
- **Static Screen Reader Live Regions:** Dedicated `#a11y-live-announcer` with debounced polite/assertive updates for screen reader users.
- **Zero-FOUC Theme Initialization:** Synchronous inline `theme-loader.ts` module preventing dark-mode flash under strict Content Security Policies.
- **Reduced-Motion Integration:** Complete `@media (prefers-reduced-motion)` CSS and GSAP integration across all transitions and counter animations.

---

## 🔒 Zero-Trust Security, Web Cryptography & Privacy

- **Web Cryptography API Encryption:** Strategy blueprints and profile exports can be encrypted locally via `window.crypto.subtle` using **PBKDF2** with **600,000 iterations**, SHA-256 key derivation, 256-bit AES-GCM cipher, 16-byte random salt, 12-byte initialization vectors (IV), and 128-bit authentication tags.
- **Prototype Pollution Defense:** Recursive `removePrototypeKeys()` utility sanitizes all imported JSON files and deserialized states to strip `__proto__`, `constructor`, and `prototype` keys.
- **Content Security Policy (CSP):** Strict CSP meta tags disallowing unsafe inline scripts and disallowing `blob:` script execution.
- **Privacy-Preserving Share Links:** Encodes state into URL hash fragments without ever transmitting personal debt balances or interest figures to a remote server.
- **Client-Side PDF Generation:** Vector PDF reports generated entirely inside the browser canvas using `html2pdf.js`.

---

## 🌍 Internationalization & Localization (i18n)

- **Bilingual Engine:** Complete real-time localization for **English** and **Quebecois French (`fr-CA`)**.
- **Dynamic DOM Tree Walker:** Recursively traverses text nodes and DOM attributes (`placeholder`, `title`, `aria-label`) to apply translations without tearing down active charts or input listeners.
- **Frequency Formatter:** Formats payment frequency keys in both title case and kebab-case for consistent reporting across UI badges and PDF exports.
- **Currency & Locale Formatting:** Formats figures using `Intl.NumberFormat` with dynamic currency symbols (`$`, `£`, `CAD`, `USD`, `GBP`, `AUD`, `NZD`).

---

## 📂 Codebase Architecture & File Catalog

```
TrueMortgageV3/
├── .github/
│   ├── dependabot.yml              # Automated dependency update configuration
│   └── workflows/ci-cd.yml         # GitHub Actions pipeline (Lint, Typecheck, Vitest, Playwright, Pages Deploy)
├── .husky/                         # Git pre-commit hook triggers (lint-staged)
├── public/
│   ├── favicon.ico                 # Multi-resolution favicon assets
│   ├── manifest.json               # Progressive Web App (PWA) manifest
│   ├── robots.txt                  # Search engine crawler directives
│   ├── sitemap.xml                 # Search engine XML index
│   └── sw.js                       # Service worker for offline caching
├── src/
│   ├── css/
│   │   └── main.css                # CSS design system, Bento grid, glassmorphism & dark mode tokens
│   └── js/
│       ├── blueprint.ts            # Strategy import/export & encrypted blueprint processing
│       ├── card-order.ts           # Drag-and-drop & keyboard accessible Bento card reordering engine
│       ├── charts.ts               # Plotly.js chart initialization, stacked area & trajectory plots
│       ├── constants.ts            # Statutory tax rates, CMHC tiers, default inputs & storage keys
│       ├── declarations.d.ts       # TypeScript module declarations (html2pdf, Plotly, GSAP)
│       ├── form.ts                 # Form input binding, validation, and reactive state sync
│       ├── formatters.ts           # Pure currency and number formatting isolated for Web Workers
│       ├── goal-solver.ts          # Binary search solver for target payoff dates
│       ├── heatmap-math.ts         # Headless 2D rate/term savings matrix calculation engine
│       ├── heatmap.ts              # Interactive heatmap UI binder and Web Worker coordinator
│       ├── i18n.ts                 # Localized translation dictionary (EN/FR) & tree walker
│       ├── index.ts                # Application lifecycle entry point & DOM event wiring
│       ├── math.ts                 # Amortization, compounding, CMHC, LTT, SDLT, and multi-debt engine
│       ├── milestones-ui.ts        # Payoff milestone badge renderer
│       ├── modals.ts               # Accessible modal manager with focus trapping & ARIA controls
│       ├── multi-debt-ui.ts        # Multi-debt liability manager, comparison chart & payoff table
│       ├── pdf.ts                  # PDF strategy report generation engine
│       ├── rate-shock.ts           # Dynamic refinancing timeline UI binder
│       ├── sandbox.ts              # Custom scenario profile management & comparison engine
│       ├── settings.ts             # Profile management & settings modal logic
│       ├── share.ts                # URL state encoding & share modal handler
│       ├── storage.ts              # Schema migrations, localStorage & Web Crypto AES-256-GCM
│       ├── table.ts                # Paginated amortization schedule DOM table renderer
│       ├── theme-loader.ts         # Flash-free dark mode theme initialization
│       ├── types.ts                # TypeScript interface definitions (Inputs, ScheduleRow, AppState)
│       ├── ui.ts                   # DOM element mapping, string escaping, and UI helpers
│       ├── wages-viz.ts            # Visual interest-to-rent/wages circle converter
│       └── workers/
│           └── heatmap.worker.ts   # Dedicated background Web Worker for 2D matrix calculation
├── tests/
│   ├── blueprint.spec.ts          # Vitest suite for blueprint export/import & encrypted syncing
│   ├── calculations.spec.ts       # Vitest suite for mortgage math, CMHC, LTT, SDLT, and multi-debt
│   ├── card-order.spec.ts         # Vitest suite for accessible card ordering
│   ├── charts.spec.ts             # Vitest suite for chart data transformations
│   ├── edge-cases.spec.ts         # Vitest suite for boundary clamping & invalid input safety
│   ├── e2e/
│   │   └── dashboard.spec.ts       # Playwright E2E cross-browser test suite (27 tests)
│   ├── form.spec.ts               # Form state validation & sync unit tests
│   ├── goal-solver.spec.ts        # Binary search solver accuracy tests
│   ├── heatmap.spec.ts            # Heatmap matrix calculation tests
│   ├── i18n.spec.ts               # Translation engine & frequency formatting unit tests
│   ├── milestones.spec.ts         # Payoff milestone logic tests
│   ├── modals.spec.ts             # Focus trap and confirmation/alert modal dialog unit tests
│   ├── multi-debt-ui.spec.ts      # Multi-debt UI and payoff table rendering tests
│   ├── pdf.spec.ts                # PDF report HTML generation tests
│   ├── rate-shock.spec.ts         # Refinancing rate shock UI binder tests
│   ├── reality-precision.spec.ts  # Precision rounding and float verification tests
│   ├── sandbox.spec.ts            # Scenario sandbox management tests
│   ├── settings.spec.ts           # Settings menu and configuration tests
│   ├── share.spec.ts              # URL state sharing and native share tests
│   ├── simulation-memoization.spec.ts # Baseline and comparison schedule memoization tests
│   ├── storage.spec.ts            # Schema migration & Web Crypto encryption tests
│   ├── table.spec.ts              # Schedule table progressive rendering tests
│   ├── theme-loader.spec.ts       # Dark-mode initialization & FOUC prevention tests
│   ├── ui.spec.ts                 # DOM helper & scheduled lump sum frequency tests
│   └── wages.spec.ts              # Bank wages visualization tests
├── eslint.config.js                # ESLint 9/10 flat configuration
├── index.html                      # HTML5 entry point, CSP header, SEO metadata & JSON-LD schema
├── package.json                    # Dependencies, engine bounds, and npm scripts
├── playwright.config.ts            # Playwright multi-browser test harness configuration
├── tsconfig.json                   # TypeScript compiler options (Strict mode)
└── vite.config.js                  # Vite bundler options, Rollup chunk splitting, Vitest thresholds
```

---

## 🛠️ Technology Stack & Build Tools

- **Build Engine:** [Vite 8.0](https://vitejs.dev/) with Rollup vendor chunking (`plotly`, `html2pdf`, `gsap`).
- **Language:** [TypeScript 5.4](https://www.typescriptlang.org/) configured with `"strict": true`.
- **Styling Architecture:** Vanilla CSS3 Custom Properties with HSL color tokens and Bento grid layout.
- **Animation Framework:** [GSAP 3.12](https://greensock.com/gsap/) with reduced-motion integration.
- **Charting Library:** [Plotly.js Basic Dist](https://plotly.com/javascript/) loaded as an isolated vendor chunk.
- **Document Exporter:** [html2pdf.js](https://github.com/eKoopmans/html2pdf.js) vector HTML5 canvas exporter.
- **Unit & Integration Testing:** [Vitest 4.1](https://vitest.dev/) (366 unit/integration tests passing across 24 test suites).
- **End-to-End Testing:** [Playwright 1.61](https://playwright.dev/) (27 multi-browser tests across Chromium, Firefox, WebKit).
- **Code Quality:** ESLint 9/10 (Flat Config) + Prettier 3.3.

---

## ⚙️ Development & Testing Guide

### Prerequisites

- Node.js `v20.0.0` or higher (v22 recommended).
- npm `v10.0.0` or higher.

### Installation

```bash
git clone https://github.com/RichardMalo/TrueMortgageV3.git
cd TrueMortgageV3
npm ci
```

### NPM Command Reference

| Command                 | Action                                                                          |
| ----------------------- | ------------------------------------------------------------------------------- |
| `npm run dev`           | Starts local development server with Hot Module Replacement (HMR).              |
| `npm run build`         | Compiles TypeScript (`tsc`) and bundles optimized production assets to `/dist`. |
| `npm run preview`       | Spins up a local static server to preview the `/dist` production build.         |
| `npm run type-check`    | Executes strict TypeScript compiler type check (`tsc --noEmit`).                |
| `npm run lint`          | Runs ESLint across all TypeScript and JavaScript files.                         |
| `npm run format`        | Formats all source files, styles, and markup using Prettier.                    |
| `npm test`              | Runs the Vitest test suite (366 tests across 24 suites).                        |
| `npm run test:coverage` | Generates V8 code coverage reports against defined thresholds.                  |
| `npm run test:e2e`      | Runs Playwright cross-browser tests across Chromium, Firefox, and WebKit.       |
| `npm run test:e2e:ui`   | Opens the interactive Playwright test runner UI.                                |

---

## 📜 License & Compliance

- Distributed under the **MIT License**. See `LICENSE` for details.
- **GSAP Licensing Note:** GreenSock (GSAP) standard license for non-commercial web applications. If commercialized, a GreenSock Business License is required.
