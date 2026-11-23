# <div align="center">🏋️ Iron Forge</div>

<div align="center">

**A lightweight, private workout tracker built for strength training.**

[![Live Demo](https://img.shields.io/badge/Live_Demo-Visit_App-22c55e?style=for-the-badge&logo=vercel&logoColor=white)](https://iron-forge-phi.vercel.app/)
[![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=000)](https://developer.mozilla.org/docs/Web/JavaScript)
[![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com/)
[![Supabase](https://img.shields.io/badge/Supabase-3FCF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com/)

</div>

Iron Forge helps you record exercises, weights, repetitions, and sets in a focused dark interface. Each account has a private workout history protected by Supabase authentication and PostgreSQL row-level security.

<div align="center">

### [Try Iron Forge](https://iron-forge-phi.vercel.app/) · [Report an Issue](https://github.com/techieNiladri/Iron-Forge/issues)

</div>

---

## ✨ Features

- 🔐 **Private accounts** — email/password authentication with account confirmation and password recovery
- 🏋️ **Workout logging** — save exercise names, weight, reps, and sets
- 📜 **Workout history** — view saved sets with paginated older-workout loading
- 🗑️ **Easy deletion** — remove individual workouts with a confirmation prompt
- 🔁 **Retry-safe saves** — idempotent request IDs protect against interrupted submissions
- 🛡️ **Data protection** — server-side token verification and PostgreSQL row-level security
- 📱 **Responsive interface** — a minimal, accessible interface for desktop and mobile
- ⚡ **No extra backend host** — Express is served alongside the static frontend on Vercel

## 🖥️ Live Application

Open the deployed app here:

**[https://iron-forge-phi.vercel.app/](https://iron-forge-phi.vercel.app/)**

Create an account, confirm your email, and start logging workouts. Password recovery and account sign-out are also supported.

## 🧱 Tech Stack

| Area | Technology |
|---|---|
| Frontend | HTML, CSS, JavaScript |
| Backend | Node.js, Express |
| Authentication | Supabase Auth |
| Database | Supabase PostgreSQL |
| Data access | Supabase Data API |
| Hosting | Vercel |
| Testing | Node.js test runner |

**Language composition:** JavaScript 75.4% · CSS 11% · HTML 8.5% · PLpgSQL 5.1%

## 🔄 How It Works

1. The browser signs in through Supabase Auth.
2. Supabase issues an access token for the account.
3. The frontend sends the token with API requests to `/api/workouts`.
4. Express verifies the token and validates workout input.
5. Supabase PostgreSQL stores the data using the signed-in user's token.
6. Row-level security ensures users can only read or modify their own workouts.

The deployed app requires no service-role key, database password, or database connection string.

## 📁 Project Structure

```text
Iron-Forge/
├── ironforge-backend/       # Express application and legacy server entry point
├── ironforge-frontend/      # Static HTML, CSS, and JavaScript
├── scripts/                 # Production frontend build scripts
├── supabase/migrations/     # PostgreSQL schema and row-level security migration
├── tests/                   # API tests
├── .env.example             # Browser-safe environment variable template
├── server.js                # Root Express entry point
├── vercel.json              # Vercel routes and deployment configuration
└── package.json             # Scripts and dependencies
```

## 🚀 Local Development

### Requirements

- Node.js 24
- A separate Supabase project for development

### 1. Clone the repository

```bash
git clone https://github.com/techieNiladri/Iron-Forge.git
cd Iron-Forge
```

### 2. Install dependencies

```bash
npm ci
```

### 3. Configure environment variables

```bash
cp .env.example .env
```

Set the public Supabase values in `.env`:

```dotenv
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_PUBLISHABLE_KEY=your_publishable_key
PORT=3000
```

Never use a secret or service-role key as the publishable key. The `.env` file is excluded from Git.

### 4. Apply the database migration

Apply [`supabase/migrations/20261120173153_private_workouts.sql`](supabase/migrations/20261120173153_private_workouts.sql) to the development Supabase project once.

### 5. Run the application

```bash
npm run build
npm start
```

Visit `http://127.0.0.1:3000`.

## 🧪 Testing

Run the test suite:

```bash
npm test
```

Run the complete local release check:

```bash
npm ci
npm test
npm run build
npm start
```

CI installs dependencies from the lockfile, runs API tests, and builds the frontend without connecting to a hosted database or using secrets.

## ☁️ Deployment

### Vercel

1. Import the repository into Vercel from the repository root.
2. Use Node.js 24 and the Express framework.
3. Install with `npm ci` and build with `npm run build`.
4. Set these production environment variables:

   ```text
   SUPABASE_URL
   SUPABASE_PUBLISHABLE_KEY
   ```

5. Configure the exact HTTPS deployment origin in the Supabase project's Auth settings.
6. Set a custom SMTP provider before opening public registration if email delivery is needed.

### Supabase

- Use a separate project for development, previews, and production.
- Apply the migration once to each project that needs it.
- Keep email confirmation enabled.
- Use only public browser-safe keys in the frontend and `SUPABASE_PUBLISHABLE_KEY`.

After deployment, verify:

- The public page loads
- `/api/health` responds successfully
- Unauthenticated `/api/workouts` requests return `401`
- Registration confirmation, sign-in, workout add/reload/delete, and password reset work

> `/api/health` verifies that the application process is running; it does not check database availability.

## 🔒 Security

- Supabase access tokens are verified by the API
- API input is validated server-side
- Exercise names are rendered as text, never HTML
- PostgreSQL row-level security restricts workout access per account
- Anonymous reads, writes, and updates are denied
- Account deletion cascades to the associated workouts
- Uninterrupted requests use unique client request IDs for retry safety
- Workflow history loads in pages of 50 workouts

## 🤝 Contributing

Contributions are welcome.

1. Fork the repository
2. Create a feature branch
3. Make and test your changes
4. Open a pull request

Please do not commit `.env` files, database passwords, service-role keys, or personal workout data.

## 📄 License

No license has been specified for this repository yet.

---

<div align="center">

Built with Node.js, Express, Supabase, and PostgreSQL.

[Live App](https://iron-forge-phi.vercel.app/) · [GitHub Repository](https://github.com/techieNiladri/Iron-Forge)

</div>
