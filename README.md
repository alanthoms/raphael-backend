Neon Serverless + Drizzle setup

Quickstart

- Copy `.env.example` to `.env` and set `DATABASE_URL` to your Neon connection string.
- Install dependencies:

```bash
npm install
```

- Run in dev mode:

```bash
npm run dev
```

Notes

- The Drizzle client is initialized in `src/db.ts` and expects `DATABASE_URL`.
- Get the Neon connection string from the Neon Console for project `autumn-cell-99874976` (org `org-young-block-72342367`).
