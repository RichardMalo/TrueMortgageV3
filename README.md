# 🌌 Debt Elimination Engine

> **Algorithmic Mortgage & Credit Card Optimizer**  
> Engineered to eliminate interest friction and accelerate your path to zero debt.

👉 **[Live Demo](https://richardmalo.github.io/TrueMortgageV3/)**

Welcome to the **Debt Elimination Engine**, a high-fidelity, client-side financial strategy dashboard. It compiles mortgage and credit card amortization schedules under aggressive pay-down regimes (accelerated frequencies, discretionary surplus, rate shocks) and evaluates them against market investment yield returns (opportunity costs).

The entire application runs **locally in your browser**—meaning all calculations, data scenarios, and blueprints remain 100% private in local storage.

---

## 🚀 Key Features

- **Dual Engine Modes:**
  - **Mortgage:** Supports standard monthly amortization alongside regional compounding options, including **Canadian fixed (semi-annual compounding by law)** and **US/UK/AU/NZ (monthly compounding)**.
  - **Credit Card:** Accounts for revolving debt calculation rules and **minimum payment laws (Ontario 3% vs. Quebec legal 5%)**.
- **Aggressive Pay-down Strategies:** Simulates accelerated payments (accelerated bi-weekly, bi-weekly, semi-monthly) and optional extra surplus cash-flow injections.
- **Refinancing Rate Shocks:** Simulates dynamic interest rate changes at renewal milestones (e.g., modeling rate hikes/drops at 5-year intervals) to assess impact on amortization.
- **Opportunity Cost Analytics:** Directly compares the net worth trajectory of paying off low-interest debt early versus investing discretionary cash-flow surplus in index funds.
- **Customizable Bento Dashboard:** Drag-and-drop dashboard grid allows you to customize the order of Plotly.js charts and analysis cards.
- **Secure Sync & Portability:** Export scenario profiles as plain text JSON blueprints, or encrypt them locally using AES-GCM 256-bit cryptography with PBKDF2 passcode stretching.
- **Shareable Strategy Reports:** Generate clean, formatted PDF reports locally using a styled dynamic canvas exporter, copy quick text summaries, or share directly via WhatsApp.

---

## 🛠️ Tech Stack

- **Build Tool:** [Vite 5.2+](https://vitejs.dev/)
- **Language:** [TypeScript 5.4+](https://www.typescriptlang.org/) (Strictly typed compiler configurations)
- **Styling:** CSS3 Custom Properties (Harmonious HSL colors, responsive grids, sleek dark-mode, and focus-visible outlines)
- **Animations:** [GSAP 3.12](https://greensock.com/gsap/) (High-performance micro-animations and entrance states)
- **Charting:** [Plotly.js Basic Dist](https://plotly.com/javascript/) (Highly optimized 1.1MB charting chunk)
- **Document Generation:** [html2pdf.js](https://github.com/eKoopmans/html2pdf.js) (Dynamic client-side PDF rendering canvas)
- **Unit Testing:** [Vitest 1.6+](https://vitest.dev/) (Logic & cryptography assertions)

---

## ⚙️ Development & Setup

### Prerequisites

Make sure you have [Node.js](https://nodejs.org/) (v20+ recommended) installed.

### Installation

Clone the repository and install the dependencies:

```bash
npm install
```

### Development Server

Start the Vite local development server with hot-module reloading:

```bash
npm run dev
```

### Production Build

Compile and optimize TypeScript, bundle assets, and compress modules:

```bash
npm run build
```

The production assets will be built inside the `/dist` directory.

### Running Unit Tests

Run the comprehensive test suite (Vitest):

```bash
npm run test
```

### Code Formatting & Linting

Enforce code formatting (Prettier) and code style checks (ESLint):

```bash
npm run lint
```

---

## 📂 Code Architecture

```
├── .github/workflows/    # CI pipelines (Linting, type-checks, Vitest, pages deployment)
├── .husky/               # Pre-commit git hooks triggers
├── public/               # Static assets (Robots, Sitemaps, Country Flag SVGs)
├── src/
│   ├── css/              # Core stylesheets & design tokens
│   │   └── main.css
│   └── js/               # Application source scripts
│       ├── blueprint.ts  # JSON/Encrypted blueprint import & export logic
│       ├── card-order.ts # Bento layout card dragging reorder persistence
│       ├── charts.ts     # Plotly configuration and RAF batch render queue
│       ├── constants.ts  # Shared system limits, defaults, and thresholds
│       ├── declarations.d.ts
│       ├── form.ts       # Input validation logic and schema mapping
│       ├── index.ts      # Main app entry point and state orchestration
│       ├── math.ts       # Decoupled mortgage/CC compound math algorithms
│       ├── milestones-ui.ts # Milestone nodes layout updates
│       ├── rate-shock.ts # Term renewal rate timeline updates
│       ├── sandbox.ts    # Scenario sidebar management (accessible dialog)
│       ├── settings.ts   # Portability and system limits modal bindings
│       ├── storage.ts    # Session state handling & AES-GCM cryptography
│       ├── table.ts      # Progressive amortization schedule table renderer
│       ├── types.ts      # Shared type definitions
│       ├── ui.ts         # DOM counters (GSAP), custom dropdowns, and PDF exports
│       └── wages-viz.ts  # Circle visualization for interest wages / rent
└── tests/                # Comprehensive test specifications
    ├── calculations.spec.ts
    ├── form.spec.ts
    ├── milestones.spec.ts
    ├── rate-shock.spec.ts
    ├── storage.spec.ts
    ├── ui.spec.ts
    └── wages.spec.ts
```

---

## 📜 License & Compliance

- The core application logic and assets are licensed under the MIT License.
- **GSAP licensing note:** This application uses GreenSock (GSAP). For basic free web tools, the standard GreenSock license is free. If this application is commercialized or charges users, a paid GreenSock Business License must be obtained.
