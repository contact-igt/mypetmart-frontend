# CLAUDE.md — MyPetMart Build Rules

Source of truth order: proposal > UI references > this file > project brief.

## Project
- Monorepo: `apps/web` (Next.js 16 App Router, TypeScript, Tailwind CSS)
- Monorepo: `apps/api` (Express 5.2, TypeScript, REST)
- Shared: `packages/shared` (types, validation schemas)
- Database: MySQL 8.4 + Prisma ORM
- Auth: JWT access tokens + HTTP-only cookie refresh tokens + bcrypt
- Storage: Cloudflare R2 for all images
- Package manager: npm (Node 24 LTS)

Full stack spec → `docs/PROJECT_BRIEF.md`

## Prompt discipline
- One task per prompt. One bug, one feature, one page — no bundles.
- Reference file paths; do not re-paste file contents.
- Format: `FILE: path[:line] / PROBLEM: … / FIX: … / TEST: …`
- Never re-explain the stack in every message.
- Run the audit loop after every module before moving on.

## Minimal-code rules
- Prefer native platform and browser APIs before reaching for a library.
- No dependency for trivial functionality.
- No premature abstractions — three similar lines beat one over-engineered helper.
- No half-finished implementations — only build what the task requires.
- Reuse one established pattern per concern.
- Security, input validation, accessibility, error handling and necessary tests
  are never subject to the minimal-code rule — always implement these fully.

## UI lock
- The Home, Shop and Contact PDF references (and their rendered images in
  `project-reference/rendered/`) are the locked visual source of truth.
- No redesign or reinterpretation — match section order and composition
  exactly as extracted in `docs/DESIGN_SYSTEM.md`, not a fresh take on "warm
  pet-commerce site."
- Use the design tokens (colour, spacing, radii) from `docs/DESIGN_SYSTEM.md`
  §3–6 — do not invent new hex values or spacing scales ad hoc.
- Preserve: layout composition, section order, colour relationships, typography
  hierarchy, spacing rhythm, card shapes, image treatment, header/footer structure,
  warm premium pet-commerce personality.
- Allowed deviations: proposal-scope compliance, accessibility, responsiveness,
  performance, technical feasibility only. Any other visual deviation requires
  a documented reason (add it to `docs/DECISIONS.md`).
- When a feature is excluded, preserve the surrounding layout and spacing —
  see `docs/DESIGN_SYSTEM.md` §18 for the per-feature preservation rule; never
  collapse the section around a removed element.
- Mobile must feel like the same design at a smaller viewport, not a generic
  stacked SaaS redesign — same section order, same colour-blocking, same card
  language (`docs/DESIGN_SYSTEM.md` §15).
- No placeholder gradient text, glassmorphism, or generic SaaS styling —
  these were never in the reference and must not creep in.
- No invented claims or fake reviews/ratings — see the unconfirmed-claims list
  below and `docs/DESIGN_SYSTEM.md` §18 before rendering any trust badge,
  review, rating or stock label.

Taste-skill dials (Home, Shop, Contact and editorial storefront pages only):
DESIGN_VARIANCE=5 · MOTION_INTENSITY=3 · VISUAL_DENSITY=6

These dials are descriptive benchmarks — not a licence to reinvent. The locked
UI reference PDFs always take precedence over the dials. Admin, checkout and
account pages prioritise clarity and function; do not apply editorial taste
variance to those surfaces.

Do not install or copy the Ponytail, Emil Kowalski or taste-skill repositories
into this project.

Design tokens, component specs, breakpoints → `docs/DESIGN_SYSTEM.md`

## Scope exclusions (do not build without separate approval)
Advanced filters · wishlist · product comparison · subscriptions · inventory
automation · automated refunds · return-pickup automation · advanced approval
workflows · replacement-logistics automation · advanced analytics · profit
reports · inventory forecasting · automated report exports · blogs/backlinks/
ongoing SEO · WhatsApp/SMS/email automation · paid plugins or unapproved
paid services.

**Override (2026-08-12): Wishlist V1 approved.** The blanket "wishlist"
exclusion above is the original signed-proposal scope and is kept here for
history — it no longer applies. Wishlist V1 (authenticated customer,
product-level saves only) was separately approved on 2026-08-12 and has been
implemented: backend `/api/v1/storefront/wishlist` routes, storefront
ProductCard/header/mobile-nav heart controls, and the `/wishlist` page. Still
excluded under the original scope and NOT built: guest Wishlist,
variant-level Wishlist, admin Wishlist CRUD/analytics, and back-in-stock
notifications — any of those still require separate approval.

**Override (2026-08-20): Newsletter subscribe V1 approved.** The blanket
"subscriptions" / "WhatsApp/SMS/email automation" exclusions above no longer
block newsletter list-building. Scope approved: capture + double opt-in only
— footer subscribe form (`/api/v1/storefront/newsletter/subscribe`), a
verification email, `/newsletter/verify` (confirm) and `/newsletter/unsubscribe`
(explicit-click, never auto-fires) pages, and a read-only admin subscriber
list. Reference implementation: `invictus-projects/pixeleye-blog-admin`
(backend + admin) and `invictus-projects/pixeleye-web-frontend` (storefront),
scoped down to this project's approved depth. Still excluded and NOT built:
admin campaign composer, a background delivery worker, and any automated
outbound send beyond the single transactional verification email — those
still require separate approval.

Full exclusion list → `docs/PROJECT_BRIEF.md`

## Unconfirmed public claims (do not publish as fact until approved)
Cash on Delivery · pan-India shipping · fixed delivery times · verified-review
claims · customer ratings · low-stock labels · ranking timelines.

All open items → `docs/OPEN_ITEMS.md`

## Security rules
- Never expose secrets, tokens or API keys in frontend code or git.
- All secrets live in `.env` files (never committed).
- Store refresh tokens in HTTP-only cookies only — never localStorage.
- Use `bcrypt` for all password hashing.
- Validate and sanitise all external input at the API boundary.
- Use database transactions for every order and payment write.
- Verify payment webhooks server-side before updating order state.
- Guard all admin routes with role middleware.
- Use parameterised queries via Prisma — never raw string interpolation.

## API conventions
- REST only; no GraphQL.
- JSON request/response bodies.
- Return 4xx with a `{ error: string }` body on client errors.
- Never return raw database errors to the client.
- Paginate all list endpoints.

## Database conventions
- All schema changes via Prisma migrations — no manual ALTER TABLE.
- Never run `prisma db push` in production.
- Transactions required for: order creation, payment status update, stock change.

## Auth conventions
- Access token: short-lived JWT in `Authorization: Bearer` header.
- Refresh token: long-lived, stored in HTTP-only `Secure` cookie.
- Refresh tokens must be stored server-side (DB) for revocation.
- Admin routes require a separate `role: admin` claim.

## Frontend conventions
- All data fetching via the REST API — never direct DB calls from `apps/web`.
- Never use mock data to mask API failures in production.
- Inline form errors — no modal or toast for validation (all pages).
- Visible keyboard focus on all interactive elements (all pages).
- Respect `prefers-reduced-motion` (all pages).
- 4px spacing rhythm.
- Hover transitions ≤ 150ms.
- Animate only when motion aids task completion. On customer-facing storefront
  pages (Home, Shop, Product Detail, Contact) this means restrained, purposeful
  motion consistent with MOTION_INTENSITY=3. On admin, checkout and account
  pages avoid decorative motion entirely — clarity and task completion first.
- No gradient text, glassmorphism, emoji UI icons or decorative animation.

## Build commands (once apps are scaffolded)
- `npm run dev` — run both apps in watch mode
- `npm run build` — production build
- `npm run lint` — lint all workspaces
- `npm run typecheck` — TypeScript check all workspaces
- `npm test` — run all tests

## Audit loop (run after every module)
1. Run lint + typecheck.
2. Smoke-test the changed page/endpoint.
3. Check no secrets in staged files.
4. Report: ITEM / STATUS (OK / BROKEN / RISK) / one-line detail.
5. Fix blockers before moving to the next module.

## Module plan
M0 Security & repo setup (current) →
M1 Database schema + Prisma migrations →
M2 Auth API (register, login, refresh, logout) →
M3 Product API + R2 image upload →
M4 Customer-facing pages (Home, Shop, Product Detail) →
M5 Cart & Checkout + payment gateway →
M6 Customer account page (order history, return/replace) →
M7 Admin dashboard + product management →
M8 SEO, analytics tags, sitemap →
M9 Deployment, handover

Status → `docs/STATUS.md`
