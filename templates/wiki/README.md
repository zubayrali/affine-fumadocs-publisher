# AFFiNE Knowledge Base template

This is the neutral reference application for `@affine-fumadocs/publisher` and
`@affine-fumadocs/wiki`. It retains default Fumadocs styling while providing a
feature-complete collaborative wiki baseline. AFFiNE is the private source of
truth; readers receive only generated snapshots.

## Quick start

From the repository root:

```bash
pnpm install
cp templates/wiki/.env.publisher.example templates/wiki/.env.publisher
# Set AFFINE_WORKSPACE_ID and AFFINE_BLOB_COOKIE.
pnpm --dir templates/wiki publisher:watch
pnpm --dir templates/wiki dev
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

`Draft` prevents publication. Add a `Tags` property as a comma-separated value
or list. Tags become browsable routes under `/docs/tags`; hierarchical values
such as `guides/setup` also appear under their `guides` parent.

Every other JSON-safe AFFiNE property is preserved in the generated frontmatter
under `affineProperties` and rendered in the page's collapsible Properties panel.
Publication controls stay separate and are never repeated in that panel.

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
