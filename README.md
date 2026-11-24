# Freelance Financial

Bookkeeping for Dutch freelancers: clients, invoices, expenses (including receipts via WhatsApp), the Tax Vault and reports.

| Folder | What | Tech |
|---|---|---|
| [`web/`](web) | The app people use | Next.js 16 (JavaScript), pnpm |
| [`api/`](api) | The backend: all data, tax rules, PDF/XLSX reports, WhatsApp webhook | Go (standard library), Postgres |
| [`docs/`](docs) | Shared docs: status report, backend specs, SQL notes | |

## How the two fit together

```
browser ──► Next.js (web/, :3000) ──/api/*──► Go API (api/, :8085) ──► Postgres
```

The browser only ever talks to Next.js. Requests to `/api/*` (and `/healthz`) are forwarded to the Go API by the `rewrites()` in [`web/next.config.mjs`](web/next.config.mjs). Because of that, everything runs on one origin: no CORS, and the login cookie just works.

- `API_PROXY_TARGET` (in `web/.env.local`) is where Next.js finds the API. Default: `http://localhost:8085`.
- `NEXT_PUBLIC_API_BASE_URL` stays empty. Set it only if you want the browser to call the API directly.
You can run both on one server: two processes (Next.js and the Go binary) plus Postgres. Only Next.js has to be reachable from the internet. The WhatsApp webhook also works through it (`/api/v1/webhooks/whatsapp`).

### Visitor IPs and rate limiting (production)

Behind the proxy, every request reaches the API from Next.js's address. That means the per-IP rate limits (login: 5 attempts/min) would count all users together. Next.js passes the browser's `X-Forwarded-For` header on unchanged, so the API can't just trust that header either: anyone could fake it.

For production:

1. Put Caddy or nginx in front of Next.js for HTTPS. Have it **set** `X-Forwarded-For` to the visitor's IP:
   - Caddy does this by default.
   - In nginx, use `proxy_set_header X-Forwarded-For $remote_addr;`.
2. Set `TRUSTED_PROXIES` in `api/.env` to the address Next.js connects from, for example `127.0.0.1,::1`.

In development, leave `TRUSTED_PROXIES` empty.

## Getting started

```bash
cp api/.env.example api/.env
cp web/.env.local.example web/.env.local
make db-up
make dev
```

Then open http://localhost:3000.

Database migrations are in [`api/migrations`](api/migrations) and are applied by hand.

## Common commands

| Command | What it does |
|---|---|
| `make dev` | Web + API together |
| `make dev-web` / `make dev-api` | One of them |
| `make test` | Go tests, frontend lint and translation check |
| `make build` | API binary + web production build |

## History

Until November 2026 the backend lived in its own repo (`lmv7296/GO_Freelancer`). Its history was merged into `api/`.
