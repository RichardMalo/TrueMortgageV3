# Changelog

All notable changes to the Debt Elimination Engine project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
