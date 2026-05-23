# FlareCMS

Publish and host your website for free with Cloudflare Pages.

## Stack

- **Next.js** (App Router, Edge Runtime) — deployed via `@cloudflare/next-on-pages`
- **Cloudflare Pages** — global CDN hosting
- **Cloudflare KV** — page storage (`CMS_KV` binding)
- **Cloudflare Access** — protects `/admin` automatically via the `cf-access-authenticated-user-email` header
- **Tailwind CSS v4**
- **Markdown** rendered via `marked`

## Project structure

```
src/
  app/
    (website)/        ← Public-facing, centered layout
      page.tsx        ← Homepage — lists all pages
      [slug]/page.tsx ← Individual page view
    (admin)/          ← Full-width admin layout
      admin/
        page.tsx      ← Page list + actions
        new/page.tsx  ← Create a new page
        edit/[slug]/  ← Edit existing page
    api/
      pages/route.ts           ← GET all pages (admin)
      pages/[slug]/route.ts    ← GET (public) / POST / DELETE
      me/route.ts              ← Current CF Access user
  lib/
    kv.ts             ← KV helpers (listPages, getPage, savePage, deletePage)
    auth.ts           ← CF Access header auth (requireAuth, getAuth)
  types/
    cloudflare.d.ts   ← KVNamespace ambient types
```

## Getting started

### Local development

```bash
npm run dev          # standard Next.js dev server (KV calls are skipped gracefully)
```

### Cloudflare Pages deployment

1. Create a KV namespace in your Cloudflare dashboard → **Workers & Pages → KV**.
2. In Cloudflare Pages → **Settings → Functions → KV namespace bindings**, bind `CMS_KV` to that namespace.
3. Set build command: `npx @cloudflare/next-on-pages`
4. Set output directory: `.vercel/output/static`
5. Add compatibility flag: `nodejs_compat`

### Cloudflare Access setup

In **Cloudflare Access → Applications**, create an application that protects `your-domain.pages.dev/admin*`.
Cloudflare automatically injects the `cf-access-authenticated-user-email` header — no code changes needed.

Important notes for automatic setup

- Bind your KV namespace as `CMS_KV` in Cloudflare Pages (Functions → KV namespace bindings). If this binding is missing the app will return a clear error indicating the KV binding is required.

- To enable FlareCMS to automatically provision a Cloudflare Access Application and Policy for `/admin`, add these environment variables to your Pages project (Settings → Environment variables):

  - `CF_ACC_ID` = <your Cloudflare account id>
  - `CF_TOKEN` = <API token with Access: Apps & Policies write permissions>

When those variables are present, FlareCMS will call the Cloudflare API during initial setup to create/update a self-hosted Access application for `your-origin/pages.dev/admin` and a policy that allows only the configured admin email.

### Build locally for CF

```bash
npm run build:cf     # produces .vercel/output/static
```
