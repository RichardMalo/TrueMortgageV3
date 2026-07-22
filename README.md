# 🌌 Debt Elimination Engine (v3.0.0)

> **Algorithmic Mortgage & Credit Card Payoff Optimization Platform**  
> Engineered to eliminate interest friction and accelerate your path to zero debt.

👉 **[Live Application](https://richardmalo.github.io/TrueMortgageV3/)** | **[GitHub Repository](https://github.com/RichardMalo/TrueMortgageV3)**

---

Welcome to the **Debt Elimination Engine**, a principal-grade, 100% client-side financial strategy platform. It compiles mortgage and credit card amortization schedules under aggressive pay-down regimes (accelerated payment frequencies, discretionary surplus, rate shocks, scheduled lump sums) and evaluates them against market investment yield returns (opportunity costs).

The entire application executes **locally in your browser**—all financial calculations, custom profiles, encrypted state payloads, and strategy blueprints remain 100% private and never touch a remote backend server.

---

## 🚀 Key Features

### 1. Dual Optimization Engines
- **Mortgage Engine:**
  - **Regional Compounding Standards:** Canadian fixed mortgages (**semi-annual compounding by law**) vs. US/UK/AU/NZ (**monthly compounding**).
  - **Private Mortgage Insurance (PMI):** Automatic LTV threshold tracking (cancellation at <= 80% LTV) for US mortgages, with automatic PMI omission for Canadian loans where mortgage insurance is added up-front to principal.
  - **Accelerated Payment Frequencies:** Monthly, semi-monthly, bi-weekly, accelerated bi-weekly (saving thousands in interest), and weekly schedules.
- **Credit Card Engine:**
  - **Legislation-Compliant Minimum Payments:** Ontario standard (3%) vs. Quebec legal mandate (5%), plus custom percentage/interest+principal rules and flat minimum floors.
  - **Negative Amortization Safeguards:** Handles minimum payments lower than monthly interest without cumulative principal underflow.

### 2. Advanced Strategy Modeling
- **Scheduled Future Lump Sums:** Dynamic scheduled lump-sum payments (annual bonuses, tax refunds) at specific payment numbers with automated date badges.
- **Refinancing Rate Shocks:** Dynamic interest rate adjustments at renewal milestones (e.g. modeling 5-year term rate hikes or drops) with integer period boundary math.
- **Payoff Goal Solver:** High-precision binary search algorithm that solves for the exact monthly surplus or one-time lump sum required to achieve a target payoff date, with automatic feasibility guards for unattainable targets.
- **Opportunity Cost Analytics:** Directly compares paying off low-interest debt early versus investing surplus cash flow in market index funds. Features an $O(N)$ linear cursor sweep incorporating PMI cancellation cash-flow savings.
- **Strategy Impact Heatmap:** Interactive 2D matrix visualizing payoff acceleration and interest savings across varying interest rates and loan terms.

### 3. Bento Dashboard & Accessibility (a11y)
- **Customizable Bento Grid:** Drag-and-drop or keyboard-accessible card reordering, widget visibility toggling, and full-width card expansions.
- **WAI-ARIA Standards:** Accessible modal dialogs with focus trapping and focus restoration (`modals.ts`), WAI-ARIA listboxes for custom selects, accessible scenario renaming, screen reader live regions, and WCAG AA compliant color contrast ratios.
- **Progressive Table Rendering:** Renders large amortization schedules (up to 1,200 payment periods) in progressive 50-row chunks using `requestAnimationFrame` for 60fps main-thread responsiveness.
- **Zero-Flash Dark Mode:** Inline theme initialization script preventing dark mode FOUC (Flash of Unstyled Content).

### 4. Zero-Trust Security & Portability
- **Web Cryptography Storage:** Profile data encrypted locally via Web Cryptography (`window.crypto.subtle`) using PBKDF2 with **600,000 iterations**, SHA-256 key derivation, and 256-bit AES-GCM encryption with 16-byte random salt and 12-byte IVs.
- **Prototype Pollution Defense:** Recursive `removePrototypeKeys()` sanitizer filtering untrusted JSON file uploads and state hydrations.
- **Content Security Policy (CSP):** Strict CSP meta headers restricting resource origins and blocking inline script injections.
- **Blueprint Import/Export:** Encrypted payload sync or plain-text JSON blueprint file exports.
- **Shareable Reports & PDF Export:** Client-side dynamic PDF report generation using `html2pdf.js`, clean markdown copy summaries, and direct WhatsApp sharing.
- **Multilingual (i18n):** Real-time localized translation engine supporting English and Quebecois French across all UI labels, dynamic chart legends, tooltips, scenario sandboxes, and PDF exports.

---

## 🛠️ Technology Stack

- **Build Tool:** [Vite 8.0](https://vitejs.dev/) (Rollup manual vendor chunking for `plotly`, `html2pdf`, and `gsap`)
- **Language:** [TypeScript 5.4](https://www.typescriptlang.org/) (Strict compiler mode `"strict": true`)
- **Styling:** Vanilla CSS3 Custom Properties (Harmonious HSL token system, Bento grid, glassmorphic visual hierarchy)
- **Animations:** [GSAP 3.12](https://greensock.com/gsap/) (Micro-animations with `@media (prefers-reduced-motion)` support)
- **Charting:** [Plotly.js Basic Dist](https://plotly.com/javascript/) (Asynchronous vendor chunk)
- **PDF Generation:** [html2pdf.js](https://github.com/eKoopmans/html2pdf.js) (Client-side HTML5 canvas PDF exporter)
- **Unit Testing:** [Vitest 4.1](https://vitest.dev/) (134 logic, math, and cryptography tests)
- **E2E Testing:** [Playwright 1.61](https://playwright.dev/) (27 multi-browser E2E tests across Chromium, Firefox, and WebKit)
- **Linting & Formatting:** ESLint 9/10 (Flat Config) + Prettier 3.3

---

## ⚙️ Development & Operations Setup

### Prerequisites

Node.js `v20.0.0` or higher (v22 recommended).

### Installation

```bash
# Clone repository
git clone https://github.com/RichardMalo/TrueMortgageV3.git
cd TrueMortgageV3

# Install dependencies
npm ci
```

### NPM Scripts

| Script | Command | Description |
| :--- | :--- | :--- |
| `npm run dev` | `vite` | Start local Vite development server with HMR. |
| `npm run build` | `tsc && vite build` | Compile TypeScript and bundle production assets to `/dist`. |
| `npm run preview` | `vite preview` | Preview production build locally. |
| `npm run type-check` | `tsc --noEmit` | Execute strict TypeScript compiler type check. |
| `npm run lint` | `eslint .` | Run ESLint checks across codebase. |
| `npm run format` | `prettier --write .` | Format all files using Prettier. |
| `npm run test` | `vitest run` | Run Vitest unit & integration test suite (134 tests). |
| `npm run test:coverage`| `vitest run --coverage` | Run Vitest test suite with V8 coverage reports. |
| `npm run test:e2e` | `playwright test` | Run Playwright E2E tests across Chromium, Firefox, WebKit. |
| `npm run test:e2e:ui` | `playwright test --ui` | Run Playwright E2E tests in interactive UI mode. |

---

## 📂 Codebase Architecture

```
TrueMortgageV3/
├── .github/
│   ├── dependabot.yml              # Automated dependency update configuration
│   └── workflows/ci-cd.yml         # GitHub Actions pipeline (Lint, Typecheck, Vitest, Playwright, Pages Deploy)
├── .husky/                         # Git pre-commit hook triggers (lint-staged)
├── public/
│   ├── favicon.ico                 # Multi-resolution favicon assets
│   ├── robots.txt                  # Search engine crawler directives
│   └── sitemap.xml                 # Search engine XML index
├── src/
│   ├── css/
│   │   └── main.css                # CSS design system, Bento grid, glassmorphism & dark mode tokens
│   └── js/
│       ├── blueprint.ts            # Strategy import/export & JSON/encrypted blueprint processing
│       ├── card-order.ts           # Keyboard & drag-accessible Bento card reordering engine
│       ├── charts.ts               # Plotly.js chart initialization, opportunity cost & amortization plots
│       ├── constants.ts            # System constants (PMI threshold, minimum payments, storage keys)
│       ├── form.ts                 # Form input binding, validation, and reactive state sync
│       ├── goal-solver.ts          # Binary search solver for target payoff dates (with feasibility guards)
│       ├── heatmap.ts              # Interactive rate/term sensitivity heatmap generator
│       ├── i18n.ts                 # Localized translation dictionary (EN/FR)
│       ├── index.ts                # Application lifecycle entry point & event wiring
│       ├── math.ts                 # Amortization, compounding, PMI, and credit card calculation engine
│       ├── milestones-ui.ts        # Payoff milestone badge renderer
│       ├── modals.ts               # Accessible modal manager with focus trapping & ARIA controls
│       ├── pdf.ts                  # PDF strategy report generation engine
│       ├── rate-shock.ts           # Dynamic refinancing timeline UI binder
│       ├── sandbox.ts              # Custom scenario sandbox & side-by-side comparison engine
│       ├── settings.ts             # Profile management & settings modal logic
│       ├── share.ts                # URL state encoding & share modal handler
│       ├── storage.ts              # Schema migrations, localStorage & Web Crypto AES-256-GCM encryption
│       ├── table.ts                # Paginated amortization schedule DOM table renderer
│       ├── theme-loader.ts         # Flash-free dark mode theme initialization
│       ├── types.ts                # TypeScript interface definitions (Inputs, ScheduleRow, AppState)
│       ├── ui.ts                   # DOM element mapping, string escaping, and UI helpers
│       └── wages-viz.ts            # Visual interest-to-rent/wages circle converter
├── tests/
│   ├── calculations.spec.ts       # Vitest suite for mortgage math, compounding & opportunity cost
│   ├── edge-cases.spec.ts         # Vitest suite for date boundary clamping & invalid input safety
│   ├── e2e/
│   │   └── dashboard.spec.ts       # Playwright E2E cross-browser test suite (27 tests)
│   ├── form.spec.ts               # Form state validation & sync unit tests
│   ├── goal-solver.spec.ts        # Binary search solver accuracy tests
│   ├── i18n.spec.ts               # Translation engine unit tests
│   ├── milestones.spec.ts         # Payoff milestone logic tests
│   ├── rate-shock.spec.ts         # Refinancing rate shock UI binder tests
│   ├── storage.spec.ts            # Schema migration & Web Crypto encryption tests
│   ├── ui.spec.ts                 # DOM helper & formatting unit tests
│   └── wages.spec.ts              # Bank wages visualization tests
├── eslint.config.js                # ESLint flat configuration
├── index.html                      # HTML5 entry point, CSP header, SEO metadata & JSON-LD schema
├── package.json                    # Dependencies, engine bounds, and npm scripts
├── playwright.config.ts            # Playwright multi-browser test harness configuration
├── tsconfig.json                   # TypeScript compiler options (Strict mode)
└── vite.config.js                  # Vite bundler options, Rollup chunk splitting, Vitest thresholds
```

---

## 📜 License & Compliance

- Distributed under the **MIT License**. See `LICENSE` for details.
- **GSAP Licensing Note:** Uses GreenSock (GSAP) standard license for non-commercial web applications. If commercialized, a GreenSock Business License is required.
