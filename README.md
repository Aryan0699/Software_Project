# Unified Room Allocation System

URAS is a room allocation and approval system for academic timetables, event requests, room operations, and conflict resolution.

## Local development

### Prerequisites

- Node.js 20.19 or newer
- npm
- PostgreSQL with an empty development database

### First run

1. Clone the repository and enter `Software_Project`.
2. Copy `.env.sample` to `.env` and set `DATABASE_URL` for your PostgreSQL database. Keep an explicit `schema=public` query parameter unless you intentionally use another schema.
3. Set `BOOTSTRAP_ADMIN_NAME`, `BOOTSTRAP_ADMIN_EMAIL`, and `BOOTSTRAP_ADMIN_PASSWORD` in `.env` if the database does not already contain an administrator.
4. Copy `frontend/.env.example` to `frontend/.env`. Change `VITE_API_URL` only when the API is not at `http://localhost:3000/api/v1`.
5. Run:

   ```bash
   npm run setup:dev
   ```

The command performs these steps in order:

1. Installs backend and frontend dependencies with `npm ci`.
2. Applies committed Prisma migrations with `prisma migrate deploy`.
3. Generates the Prisma client.
4. Seeds default slot systems, room types, and the optional bootstrap administrator.
5. Applies the migration to a disposable PostgreSQL schema to verify it, then removes that schema.
6. Starts the backend and frontend development servers.
7. Calls the backend readiness endpoint to confirm the database connection, then checks the frontend.

Open `http://localhost:5173`. Press `Ctrl+C` in the setup terminal to stop both servers.

The setup command creates missing `.env` files from their examples. If PostgreSQL uses different credentials, edit `.env` and rerun the command.

## Run steps separately

Use this sequence when you want control over each step:

```bash
npm ci
npm --prefix frontend ci
npm run prisma:deploy
npm run prisma:generate
npm run seed
npm run verify:migration
```

Then start the backend and frontend in separate terminals:

```bash
npm run dev
```

```bash
npm --prefix frontend run dev
```

Verify the API and database at `http://localhost:3000/api/v1/health/ready`.

The room-availability timeline defaults to 08:00–22:00. Adjust
`BOOKING_TIMELINE_START_MINUTE`, `BOOKING_TIMELINE_END_MINUTE`,
`BOOKING_MIN_DURATION_MINUTES`, `BOOKING_SELECTION_STEP_MINUTES`, and
`BOOKING_DEFAULT_DURATION_MINUTES` in `.env` when institutional booking
hours or selection rules differ.

Use `npm run prisma:migrate -- --name <migration_name>` only when creating a new migration during schema development. A fresh clone should use `npm run prisma:deploy` so it applies the migration history without creating a new migration.

## Useful checks

```bash
npm run prisma:validate
npm --prefix frontend run lint
npm --prefix frontend run build
```

The current product and implementation sources of truth are:

- [Product feature specification](URAS_PRODUCT_FEATURE_SPEC.md)
- [Technical design](URAS_TECHNICAL_DESIGN.md)
- [Database schema](prisma/schema.prisma)
