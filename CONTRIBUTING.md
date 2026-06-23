# Contributing to Debt Elimination Engine

Thank you for choosing to contribute to the Debt Elimination Engine! We appreciate your support in refining our mortgage and revolving credit calculations and keeping our Bento dashboard performant and accessible.

## Development Setup

The project is built using:

- **Runtime Target**: Node.js >= 20.0.0 (enforced via `.nvmrc` and `engines` property)
- **Bundler**: Vite
- **Language**: Vanilla TypeScript (strict mode enabled)
- **Styling**: Pure CSS with Custom Design Tokens
- **Key Libraries**: Plotly.js (lazy-loaded), GSAP, html2pdf.js
- **Testing**: Vitest + jsdom

### Initial Setup

1. Ensure you have Node.js >= 20 installed.
2. Install dependencies:
   ```bash
   npm ci
   ```
3. Initialize git hooks (managed via Husky):
   ```bash
   npm run prepare
   ```

### Command Scripts

- `npm run dev`: Starts the local Vite development server.
- `npm run build`: Compiles TypeScript and bundles the assets into `dist/`.
- `npm run test`: Runs the Vitest unit tests suite once.
- `npm run test:watch`: Runs tests in watch mode.
- `npm run test:coverage`: Collects and checks code coverage.
- `npm run lint`: Runs ESLint check across all files.
- `npm run type-check`: Verifies TS type correctness.
- `npm run format`: Standardizes codebase layout using Prettier.
- `npm run clean`: Clears temporary compile directories (`dist/` and `coverage/`).

## Git Guidelines

- **Linting & Formatting**: A pre-commit hook runs ESLint and Prettier automatically on staged files. Ensure your changes have no errors or formatting disputes.
- **Testing**: All contributions must pass the existing test suite. If you add new calculation pathways or utilities, you should add accompanying unit tests in the `tests/` folder.
- **No Production Exposure**: Production source maps are disabled, and the compiled `dist/` folder is excluded from tracking.
