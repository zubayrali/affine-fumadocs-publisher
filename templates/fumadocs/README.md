# AFFiNE Fumadocs template

This is a fresh [Create Fumadocs](https://github.com/fuma-nama/fumadocs) Next.js
template with the AFFiNE publisher wired in. AFFiNE is the collaborative source
of truth; this app serves a generated local Fumadocs snapshot.

## Quick start

From the repository root:

```bash
pnpm install
cp templates/fumadocs/.env.publisher.example templates/fumadocs/.env.publisher
# Set AFFINE_WORKSPACE_ID and AFFINE_BLOB_COOKIE.
pnpm --dir templates/fumadocs publisher:watch
pnpm --dir templates/fumadocs dev
```

Install [`affine-mcp-server`](https://github.com/DAWNCR0W/affine-mcp-server)
globally first. The watch command starts it locally on loopback with a generated
bridge token, polls AFFiNE, and writes publishable documents into
`content/docs`. The site then behaves like an ordinary Fumadocs app.

Use `pnpm publish:affine` for a one-off snapshot when a compatible local bridge
is already running and `AFFINE_BRIDGE_MCP_TOKEN` is available.

## AFFiNE publication fields

Set these native AFFiNE custom properties:

- Required: `Slug`, `Locale`, `Publish`
- Optional: `Description`, `Draft`, `Unlisted`, `Featured`, `Order`, `Aliases`,
  `Created`, `Modified`

`Draft` prevents publication. Tags remain native AFFiNE tags.

## Fumadocs application

In the project, you can see:

- `lib/source.ts`: Code for content source adapter, [`loader()`](https://fumadocs.dev/docs/headless/source-api) provides the interface to access your content.
- `lib/layout.shared.tsx`: Shared options for layouts, optional but preferred to keep.

| Route                     | Description                                            |
| ------------------------- | ------------------------------------------------------ |
| `app/(home)`              | The route group for your landing page and other pages. |
| `app/docs`                | The documentation layout and pages.                    |
| `app/api/search/route.ts` | The Route Handler for search.                          |

### Fumadocs MDX

Collections are defined with the [Macro API](https://fumadocs.dev/docs/mdx/macro) in `lib/source.ts`.

Read the [Introduction](https://fumadocs.dev/docs/mdx) for further details.

## Learn More

To learn more about Next.js and Fumadocs, take a look at the following
resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js
  features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.
- [Fumadocs](https://fumadocs.dev) - learn about Fumadocs
