# Changelog

All notable changes to the Debt Elimination Engine project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [3.2.0] - 2026-08-19

### Added

- **Unit Test Suite Expansion**: Added 6 comprehensive Vitest test suites covering `heatmap.ts`, `table.ts`, `card-order.ts`, `blueprint.ts`, `sandbox.ts`, and `settings.ts`, expanding total test coverage to 223 unit/integration tests across 21 test files.

### Changed

- **Heading Hierarchy Standardization**: Standardized Opportunity Cost section heading to `<h2>` in `index.html` to eliminate heading skips and improve screen reader navigation.
- **Safe DOM Rendering in Wages Viz**: Refactored `wages-viz.ts` to replace template string `innerHTML` assignments with clean DOM node construction (`createElement`, `textContent`, `append`).
- **PWA & Cache Resilience**: Hardened `sw.js` and production build with verified bundle integrity.

---

## [3.1.0] - 2026-08-17

### Added

- **Canadian Statutory Minimum Down Payment Engine**: Added `calculateCanadianMinDownPayment()` helper to calculate and enforce tiered down payments (5% on first $500k, 10% on remainder up to $1.5M, 20% minimum / CMHC ineligibility for properties $\ge \$1.5\text{M}$).
- **Shared ResizeObserver for Charts**: Added `observeChartResize()` to automatically resize Plotly charts smoothly upon container dimension and layout modifications.

### Changed

- **CMHC Goal Solver Accuracy**: Updated `getStartingBalanceForMode()` in `goal-solver.ts` to include capitalized CMHC insurance premiums in the starting principal for high-LTV insured mortgages.
- **Heatmap Event Delegation**: Migrated individual per-cell event listeners in `heatmap.ts` to a single table-level delegated event handler, eliminating garbage collection overhead during interactive slider drags.
- **WCAG AA Sub-Text Contrast**: Replaced low-opacity inline styles with `.roadmap-node-period` token classes in `milestones-ui.ts` for guaranteed $\ge 4.5:1$ contrast ratio.
- **Goal Solver CSS Modernization**: Extracted all inline styles in the Goal Solver component (`index.html`) into modular CSS utility classes in `main.css`.
- **Quality Gates & Coverage**: Raised Vitest coverage thresholds and expanded test suite to 184 unit tests across 15 test files.

---

## [3.0.0] - 2026-06-23

### Added

- **Auto Dark Mode (a11y)**: Respects system OS `prefers-color-scheme: dark` preferences by default while preserving custom toggles and local backups. Added a pre-initialization inline script to eliminate theme flashing during initial loads.
- **Semantic HTML Forms**: Grouped dashboard input sidebar forms inside `<fieldset>` container blocks and added descriptive `<legend>` fields for improved screen reader navigation.
- **CSS Token Scale**: Created a centralized z-index design token system (`--z-modal`, `--z-sidebar`, etc.) to clean up magic numbers.
- **Developer Documentation**: Created `CONTRIBUTING.md` and `CHANGELOG.md` at the root of the project repository.
- **NoScript Fallback**: Inserted warning banner in HTML to notify users when JavaScript is disabled.
- **Open Graph & Favicons**: Structured social preview metadata (`og:image`) and configured standard favicon touch-icon links.

### Changed

- **Inline Style Migration**: Refactored 90+ inline styles into pure CSS utility classes defined in `main.css`.
- **Self-Documenting Math**: Renamed cryptic variable names inside the core mathematical calculations engine (`totI` -> `totalInterest`, `bal` -> `balance`, etc.) with 100% test coverage safety.
- **Code Quality**: Added high-quality JSDoc headers to all core calculation, rendering, storage, and event-binding modules.

### Removed

- Unused local testing styles and orphaned inline style properties.

---

## [2.0.0] - 2026-06-20

### Added

- **Modularity Decomposition**: Extracted code from massive monolithic source file `index.ts` into specialized components (`settings.ts`, `blueprint.ts`, `rate-shock.ts`, `wages-viz.ts`, `milestones-ui.ts`, `card-order.ts`).
- **Custom Modals**: Replaced system block dialog alerts (`confirm()`, `alert()`) with elegant custom asynchronous modal screens.
- **Vite Splitting**: Integrated bundle separation configuration via dynamic vendor chunking.

---

## [1.0.0] - 2026-06-15

### Added

- Initial baseline calculation engines for US/Canadian mortgages and credit card compounding schedules.
- Bento-grid custom dashboard layouts and drag-and-drop widget arrangements.
- Local AES-GCM 256-bit data encryption sandboxes.
