# AFFiNE Fumadocs Publisher

Publish selected AFFiNE documents as a collaborative, self-hosted Fumadocs site.
AFFiNE is the private authoring source of truth; readers receive a generated MDX
and media snapshot, never your AFFiNE credentials.

```text
AFFiNE workspace → read-only local bridge → publisher → Fumadocs content/docs → readers
```

The ready-to-run reference app is in
[`templates/wiki`](./templates/wiki). It preserves the default Fumadocs visual
language while adding the reusable behavior expected from a serious wiki.

## Included wiki baseline

The implemented baseline includes Fumadocs search and machine-readable routes,
native publication controls, custom AFFiNE properties, hierarchical tags,
AFFiNE-native document link rewriting, backlinks, orphan detection, and hover
link previews. Obsidian `[[wikilink]]` syntax is not part of the contract.

The target contract additionally covers multilingual routing, homepage controls,
knowledge graphs, reader mode, lightboxes, slides, rich Markdown, AFFiNE
canvases and database views, publishing diagnostics, and feeds. Body-level note
transclusion remains deferred until the bridge can export embed bodies.
Progress and acceptance criteria live in
[`docs/wiki-template-spec.md`](./docs/wiki-template-spec.md).

Reusable behavior lives behind `@affine-fumadocs/wiki`; identity, content,
navigation, and brand remain consumer-owned.

## Prerequisites

- A running self-hosted AFFiNE instance.
- Node.js 22+ and [pnpm](https://pnpm.io/installation).
- The bridge CLI:

  ```bash
  npm install --global affine-mcp-server
  ```

- A signed-in browser session that can access the target workspace.

Never commit, paste into an issue, or give an AI agent a real Cookie header,
AFFiNE token, or private workspace export.

## Quick start

```bash
git clone https://github.com/zubayrali/affine-fumadocs-publisher.git
cd affine-fumadocs-publisher
pnpm install
cp templates/wiki/.env.publisher.example templates/wiki/.env.publisher
# Edit templates/wiki/.env.publisher as described below.

pnpm --dir templates/wiki publisher:watch
# In a second terminal:
pnpm --dir templates/wiki dev
```

Open `http://localhost:3000/docs`. The watcher performs an initial publish and
then checks for changes every 45 seconds by default.

## Configure `.env.publisher`

Edit `templates/wiki/.env.publisher`:

```dotenv
AFFINE_WORKSPACE_ID=your-workspace-id
AFFINE_BRIDGE_MCP_URL=http://127.0.0.1:3333/mcp
AFFINE_BLOB_BASE_URL=http://localhost:3010
AFFINE_BLOB_COOKIE=the-entire-browser-Cookie-request-header
PUBLISHER_POLL_SECONDS=45
```

The workspace ID is the UUID in the AFFiNE workspace URL. Set
`AFFINE_BLOB_BASE_URL` to your AFFiNE origin when it is not local.

To obtain the Cookie header, sign in to AFFiNE, inspect an authenticated browser
request to your AFFiNE server in developer tools, and copy the entire `Cookie`
request-header value. Put it only in this ignored local env file. Do not use an
official workspace MCP token as the cookie value.

`publisher:watch` creates a random local token at
`templates/wiki/.affine-publisher/bridge.token`, binds the bridge to
loopback, and runs it read-only. Do not expose port `3333` to the network.

## Configure AFFiNE authoring

Create these AFFiNE workspace custom properties:

| Property | Type | Required | Purpose |
| --- | --- | --- | --- |
| `Title` | text | no | Public page/navigation title; falls back to the AFFiNE document name |
| `Slug` | text | yes | Public path without `/`, e.g. `guides/getting-started` |
| `Locale` | text | yes | Usually `en` |
| `Publish` | checkbox | yes | Must be checked |
| `Description` | text | no | Page description |
| `Draft` | checkbox | no | Always blocks publication |
| `Unlisted` / `Featured` | checkbox | no | Consumer-defined listing controls |
| `Order` | number | no | Navigation ordering hint |
| `Aliases` | text | no | Comma-separated legacy URLs |
| `Created` / `Modified` | date | no | Display metadata |
| `Tags` | text or list | no | Comma-separated or native list values; `/` creates hierarchy |

Other JSON-safe AFFiNE properties are preserved and rendered in a collapsible
page metadata panel. A document publishes only if it has a title,
`Slug`, `Locale`, and checked `Publish`; checked `Draft` always prevents it.
Missing, duplicate, or unsafe slugs fail the refresh without replacing the prior
generated snapshot.

## Daily workflow

1. Edit collaboratively in AFFiNE.
2. Set `Slug`, `Locale`, and `Publish` on the document.
3. Wait up to `PUBLISHER_POLL_SECONDS` seconds.
4. Refresh the site. Generated files appear in `templates/wiki/content/docs`;
   do not hand-edit them.
5. Run `pnpm --dir templates/wiki build` before deploying.

Use `pnpm --dir templates/wiki publish:affine` only for a one-off export
when a compatible local bridge and its token are already available.

## Verify and troubleshoot

```bash
pnpm --dir templates/wiki types:check
pnpm --dir templates/wiki build
pnpm test
```

- **`AFFINE_BLOB_COOKIE is required`** — add a current complete Cookie header.
- **`401 Unauthorized`** — run through `publisher:watch`; it owns the local
  bridge token.
- **No page appears** — verify `Publish`, `Slug`, `Locale`, and unchecked `Draft`.
- **Image missing or watcher stopped after logout** — refresh the Cookie header
  and restart `publisher:watch`.

## Deploying

The template is a normal Next.js/Fumadocs application. Deploy
`templates/wiki` to a Node-capable host and run the publisher as a separate,
private process with access to AFFiNE and persistent `.affine-publisher` state.
Never deploy `.env.publisher` or the bridge token to the public web runtime.

For a VPS that co-hosts AFFiNE and the publisher, see
[`docs/vps-publisher.md`](./docs/vps-publisher.md). Releases can push to
**GitHub Pages** or **Cloudflare Pages** through `PUBLISHER_DEPLOY_TARGET`
without changing the release loop.

Install the publisher unit from a consumer app root:

```bash
bash node_modules/@affine-fumadocs/publisher/deploy/install-systemd.sh
```

Docker Compose and systemd unit templates live under [`deploy/`](./deploy/).

## Instructions for AI coding agents

An AI agent may install dependencies, edit application code, add templates, and
run verification. Give it this safety boundary:

> Set up this AFFiNE Fumadocs template. Never ask for, print, commit, transmit,
> or log a browser Cookie, AFFiNE token, private workspace export, or generated
> private media. Keep `.env.publisher`, `.affine-publisher/`, and generated
> snapshot assets ignored. Native AFFiNE properties—not YAML body frontmatter—are
> the authoritative publication metadata.

## Updates and contribution

The lockfile provides reproducible builds. Dependabot opens weekly update PRs
for both the publisher and Fumadocs template; review their tests before merging.
Read the detailed compatibility contract in [`docs/v0.1-contract.md`](./docs/v0.1-contract.md).
