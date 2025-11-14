# Repository Guidelines

## Project Structure & Module Organization
Time Is Money pairs a Laravel 12 API with a Vite/React UI. Backend logic lives in `app/` and routes in `routes/web.php` plus `routes/api.php`. React modules sit in `resources/js`, styles in `resources/css`, fallback views in `resources/views`, persistence assets in `database/**`, public files in `public/`, documentation in `docs/`, and PHPUnit suites in `tests/Feature` or `tests/Unit`.

## Build, Test & Development Commands
- `composer setup` – install Composer/NPM deps, copy `.env`, run migrations + seeders, build assets.
- `composer dev-full` – launch the app server, queue listener, log tail, and Vite dev server concurrently.
- `npm run dev` / `npm run build` – start HMR for local work or produce optimized bundles.
- `composer fresh` – drop and reseed the database before validating schema changes.
- `composer test` / `composer test-coverage` – clear caches, run PHPUnit, and enable coverage via `XDEBUG_MODE=coverage`.
- `composer format` / `composer analyse` – run Laravel Pint and PHPStan before opening a review.

## Coding Style & Naming Conventions
PHP strictly follows PSR-12 with 4-space indentation; let Pint fix spacing, imports, and trailing commas, and keep controllers thin by delegating to actions, jobs, or services. React/TypeScript files use 2-space indentation, PascalCase component files, camelCase hooks/utilities, and dotted translation keys (`billing.invoice_sent`). Organize UI by feature folders under `resources/js/features/<domain>` and keep Blade templates presentation-only.

## Testing Guidelines
Exercise every change with PHPUnit via `composer test`. Place HTTP/API flows in `tests/Feature`, pure services or value objects in `tests/Unit`, and rely on factories/seeders for deterministic fixtures. Reset schemas with `composer fresh` when migrations shift, name tests after user-visible behavior (`records_time_entries_in_seconds`), and target ≥80% coverage on modules touching billing, VAT, or payments using `composer test-coverage`.

## Commit & Pull Request Guidelines
Commits follow Conventional Commits (`feat:`, `fix:`, `refactor:`) and should reference issue IDs. PRs must confirm `composer test` output, summarize risk, and document any migrations, seeds, env vars, or queue changes. Attach screenshots or Loom links for UI or localization tweaks and update `README.md`/`docs/` whenever workflows or compliance data shift.

## Security & Configuration Tips
Never commit `.env`, generated PDFs, or keys. After cloning run `php artisan key:generate`, `php artisan vapid:generate`, `php artisan vat:initialize-thresholds`, and `php artisan facturx:download-schemas`; store resulting secrets in the shared vault, not Git. Use `php artisan optimize:clear` when caches misbehave and only cache config/routes once env vars stabilize.
