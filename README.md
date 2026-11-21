# Iron Forge

A workout tracker with separate accounts and private workout history. The original dark interface was retained. Exercise, weight (including zero and two decimal places), reps and sets are stored in PostgreSQL.

## Architecture

- Vercel serves the bundled frontend from `public/` and runs the Express backend from `server.js` as a function. Both use one origin; a second backend hosting service is unnecessary.
- The browser signs in through Supabase Auth and sends its access token to `/api/workouts`.
- Express verifies that token with Supabase Auth, validates input and accesses PostgreSQL through Supabase's Data API using the same user's token.
- PostgreSQL row security restricts every workout to its owner. Anonymous access and updates are denied. Create, list and delete are supported. Account deletion cascades to that account's workouts.
- New-workout request IDs make retries safe after an interrupted response. History loads 50 records at a time. Exercise names are rendered as text, not HTML.

No service-role key, database password or database connection string is needed by the deployed app. The Supabase URL and publishable key are intentionally public; access protection comes from verified sessions, database grants and row security.

## Development

Use Node.js 24. Run commands from the repository root:

```sh
npm ci
npm test
npm run build
npm start
```

Before `npm start`, copy `.env.example` to `.env` and configure a **separate development** Supabase project with its public URL and publishable key. Apply the migration to that development project and configure its Auth URLs. Open `http://localhost:3000`. Do not run local tests against the production project. Rebuild after frontend edits.

`.env` is excluded from Git; it is not encryption. Keep private credentials out of source and frontend bundles. Never substitute a secret/service-role key for the publishable key.

## Deployment

1. Create a separate Supabase project for Iron Forge. The hosted database starts empty; no old local workout data was requested for import.
2. Apply `supabase/migrations/20261120173153_private_workouts.sql` once through the normal migration workflow. It was already applied to the initial Iron Forge project; do not replay it or recreate the table manually. Match remote migration history before any future push. Back up and restore-test existing data before later schema changes.
3. Import this repository at its root into Vercel. Use the Express framework, Node.js 24, install `npm ci` and build `npm run build`. `vercel.json` configures the Mumbai region and security/cache headers. Leave the output-directory override unset.
4. Set `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` in Vercel's Production environment. Do not use production configuration for automated preview tests; use a separate Supabase project for previews and adjust the CSP origin accordingly.
5. In the **Iron Forge** Supabase project's Auth settings, set Site URL and the allowed redirect URL to the exact deployed HTTPS origin. Keep email confirmation enabled.
6. Configure custom SMTP in Supabase before opening registration to the public. The default email service is restricted to project-team addresses. Store the SMTP password only in the provider/Supabase settings; it does not belong in Vercel, Git or chat. Sender verification and provider approval may be required.
7. Check the public page, `/api/health`, static assets and an unauthenticated `/api/workouts` request (expected 401). Then use personal test accounts to verify confirmation, login, add/reload/delete, account separation, recovery and logout. No automated test should alter production accounts or workouts.

## Checks and maintenance

CI installs from the lockfile, audits dependencies, runs API tests and builds the frontend. It does not connect to the hosted database or contain secrets. Locally reviewed release checks also covered real isolated PostgreSQL grants/row security, constraints, concurrent duplicate inserts, transactional rollback and browser interactions through synthetic local Auth/Data API adapters. Those adapters do not verify hosted email delivery.

`/api/health` checks the application process, not database availability. Monitor Vercel deployment/runtime failures, Supabase Auth/database errors, email delivery and both providers' usage limits. Supabase enforces Auth rate limits; this release does not include a distributed workout API rate limiter. Keep backups encrypted and restore-test them before relying on them. Review dependency updates before applying them; do not use `npm audit fix --force` blindly.

Vercel can roll the application back to a previous deployment. Database changes require a separately reviewed migration; app rollback does not reverse the database. Keep future migrations compatible with the prior app version where possible. Review `/api/config` as public information and never add private settings to it.
