M Sign Workflow is an internal job tracker for M Sign, built to replace SmartBiz. Next.js (App Router) + Prisma 7 + SQLite.

## Getting Started

```bash
npm install
cp .env.example .env          # generate your own SESSION_SECRET, see comments in the file
npx prisma migrate dev        # creates dev.db and applies the schema
npm run seed                  # optional: loads sample data (not real client/job records)
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Note: `npm run dev` runs with `--webpack` — this project does not use Turbopack.

See `AGENTS.md` before making Next.js API assumptions (this project pins a version with breaking changes from what most training data reflects), and `HANDOFF.md` / `DECISIONS.md` for project history and open items.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
