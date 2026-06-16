# Biawak KOL

Mobile-first leaderboard app for recording Biawak KOL games.

## Local Development

```bash
npm install
npm run dev
```

The plain Vite dev server uses `localStorage` as a cache and cannot run Cloudflare Pages Functions.

To test the shared Cloudflare KV API locally:

```bash
cp .dev.vars.example .dev.vars
# edit .dev.vars and set ADMIN_PASSWORD
npm run cf:dev
```

## Cloudflare Persistence

Shared state is stored in Workers KV as one JSON value:

- KV namespace: `biawak-kol-state`
- KV namespace id: `77f4eb08740c4f66aab125f96f5b4ffc`
- Binding name: `BIAWAK_KOL_STATE`
- Key: `biawak-kol.shared-state`

The frontend reads from `GET /api/state`. Create, update, delete, undo, and player-add actions write through `POST /api/state` with the saved password. The password is checked only in the Cloudflare Function via the `ADMIN_PASSWORD` secret.

Before the first deploy, set the production secret:

```bash
npx wrangler pages secret put ADMIN_PASSWORD
```

Deploy:

```bash
npm run cf:deploy
```

Regenerate Cloudflare runtime types after changing `wrangler.jsonc`:

```bash
npx wrangler types
```
