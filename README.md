# MyPetMart

Pet-commerce website with product browsing, cart, checkout, customer account
and admin management. Built by Invictus Global Tech.

## Stack

| Layer       | Technology                                    |
|-------------|-----------------------------------------------|
| Frontend    | Next.js 16 App Router · TypeScript · Tailwind CSS |
| Backend     | Express.js 5.2 · TypeScript · REST API        |
| Database    | MySQL 8.4 LTS · Prisma ORM                    |
| Auth        | JWT · bcrypt · HTTP-only refresh tokens       |
| Storage     | Cloudflare R2                                 |
| Package mgr | npm · Node.js 24 LTS                         |

## Repository structure

```
/                        ← monorepo root
├── apps/
│   ├── web/             ← Next.js 16 frontend (not yet scaffolded)
│   └── api/             ← Express 5.2 backend (not yet scaffolded)
├── packages/
│   └── shared/          ← shared types & validation (not yet scaffolded)
├── docs/                ← project documentation
├── project-reference/   ← locked source-of-truth files (do not modify)
├── CLAUDE.md            ← implementation rules for Claude Code
├── package.json         ← monorepo root (npm workspace)
└── .nvmrc / .node-version ← Node 24 pin
```

## Reference files

All visual and scope references live in `project-reference/` and must not
be modified, renamed or deleted.

| File | Purpose |
|------|---------|
| `MyPetMart-Website-and-E-Commerce-Development- Final Proposal (1) (1).pdf` | Functional scope, deliverables, exclusions |
| `UI_HOME.pdf` | Locked visual reference — Home page |
| `UI_SHOP.pdf` | Locked visual reference — Shop page |
| `UI_CONTACT.pdf.pdf` | Locked visual reference — Contact page |
| `master-prompt-timeless.md.txt` | AI build methodology guide |

## Repository status

**Foundation in progress.** No application code exists yet.

- [x] Git repository initialised
- [x] fnm + Node 24.18.1 pinned
- [x] npm 11.16.0
- [x] Root `.gitignore`, `.nvmrc`, `.node-version`, `package.json`
- [x] CLAUDE.md and core documentation
- [ ] Monorepo workspace config (`package.json` workspaces)
- [ ] `apps/web` — Next.js scaffold
- [ ] `apps/api` — Express scaffold
- [ ] `packages/shared`
- [ ] Prisma schema + MySQL connection
- [ ] Auth module
- [ ] Product API + R2 upload
- [ ] Customer-facing pages
- [ ] Cart & Checkout
- [ ] Admin dashboard

## Setup

Requires Node 24 LTS (managed by fnm) and npm 11.16.0.

```bash
npm install
```

Use npm workspace commands from the repository root, for example
`npm run dev --workspace=@mypetmart/web`.

## Documentation
| File | Contents |
|------|---------|
| `docs/PROJECT_BRIEF.md` | Full scope, architecture, module plan |
| `docs/DECISIONS.md` | Locked technical decisions with dates |
| `docs/OPEN_ITEMS.md` | Unresolved dependencies and client confirmations |
| `docs/STATUS.md` | Current module, blockers, next steps |
| `docs/DESIGN_SYSTEM.md` | Visual design direction and rules |
