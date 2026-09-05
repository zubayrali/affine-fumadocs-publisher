# VPS publisher + static deploy targets

Run AFFiNE and the publisher on the **same VPS**. After each successful release
the publisher can push the immutable static tree to a free static host.

```text
AFFiNE (Docker) + publisher (systemd)
  → .affine-publisher/releases/current
  → PUBLISHER_DEPLOY_TARGET
       ├─ github-pages       (PAT / GITHUB_TOKEN)
       ├─ github-pages-ssh   (deploy key; preferred on a shared VPS)
       └─ cloudflare-pages
```

## One-time VPS setup

### 1. Machine packages

```bash
# Ubuntu/Debian sketch
sudo apt update
sudo apt install -y git curl ca-certificates
# Node 22 via nodesource or fnm/nvm, then:
corepack enable
corepack prepare pnpm@latest --activate
npm install -g affine-mcp-server
```

Confirm:

```bash
node -v    # v22+
pnpm -v
affine-mcp --help
docker -v  # for AFFiNE
```

### 2. App checkout

Clone the **consumer site** (the Fumadocs app that owns `scripts/affine-publisher-service.ts`), not only this package:

```bash
sudo mkdir -p /opt
sudo chown "$USER":"$USER" /opt
cd /opt
git clone <your-site-repo> wiki
cd wiki
pnpm install
cp .env.publisher.example .env.publisher
chmod 600 .env.publisher
```

Fill at least:

- `AFFINE_BASE_URL` (usually `http://127.0.0.1:3010` on the same VPS)
- `AFFINE_WORKSPACE_ID`
- `AFFINE_BLOB_COOKIE` (full Cookie header from a signed-in browser session)
- deploy vars (`PUBLISHER_DEPLOY_TARGET=github-pages`, repo, token)

### 3. AFFiNE on Docker

Example compose file: [`deploy/docker-compose.affine.example.yml`](../deploy/docker-compose.affine.example.yml).
Pin images and add Postgres/Redis as required by your AFFiNE version. Keep AFFiNE
bound to localhost or behind auth; the publisher talks to it privately.

### 4. Install systemd unit

From the consumer app root:

```bash
# User service (recommended on a dedicated publisher account):
bash node_modules/@affine-fumadocs/publisher/deploy/install-systemd.sh

# Or system-wide:
sudo bash node_modules/@affine-fumadocs/publisher/deploy/install-systemd.sh --system
```

If you develop against a local checkout of this monorepo:

```bash
bash /path/to/affine-fumadocs-publisher/deploy/install-systemd.sh --root /opt/wiki
```

### 5. Verify

```bash
systemctl --user status affine-publisher.service
journalctl --user -u affine-publisher.service -f
# or file logs:
tail -f .affine-publisher/logs/publisher.log

pnpm publisher:doctor
```

Then publish a test doc in AFFiNE (`Publish` checked) and wait one poll cycle, or run:

```bash
pnpm publisher:release
```

### 6. GitHub Pages branch mode

Repo **Settings → Pages → Deploy from a branch → `gh-pages` / root**.
The publisher force-pushes that branch after each green release.

## Environment

| Variable | Purpose |
| --- | --- |
| `PUBLISHER_DEPLOY_TARGET` | `none` \| `github-pages` \| `cloudflare-pages` \| `custom` |
| `PUBLISHER_DEPLOY_COMMAND` | Optional shell command; forces `custom` |
| `PUBLISHER_DEPLOY_DIR` | Defaults to `.affine-publisher/releases/current` |

### GitHub Pages (`PUBLISHER_DEPLOY_TARGET=github-pages`)

| Variable | Purpose |
| --- | --- |
| `PUBLISHER_DEPLOY_GITHUB_REPO` | `owner/name` |
| `PUBLISHER_DEPLOY_GITHUB_TOKEN` or `GITHUB_TOKEN` | fine-grained token with contents write |
| `PUBLISHER_DEPLOY_GITHUB_BRANCH` | default `gh-pages` |

### Cloudflare Pages (`PUBLISHER_DEPLOY_TARGET=cloudflare-pages`)

| Variable | Purpose |
| --- | --- |
| `PUBLISHER_DEPLOY_CF_PROJECT` | Cloudflare Pages project name |
| `CLOUDFLARE_API_TOKEN` | Pages deploy permission |
| `CLOUDFLARE_ACCOUNT_ID` | Account id |
| `PUBLISHER_DEPLOY_CF_BRANCH` | default `production` |

Switch later by changing the target and secrets only — no release-loop rewrite.

## Day-2 ops

| Task | Command |
| --- | --- |
| Restart publisher | `systemctl --user restart affine-publisher.service` |
| Follow logs | `journalctl --user -u affine-publisher.service -f` |
| Health | `pnpm publisher:doctor` |
| Force release + deploy | `pnpm publisher:release` |
| Rollback + redeploy | `pnpm publisher:rollback` |
| Refresh expired AFFiNE cookie | edit `.env.publisher`, then restart the unit |

Never expose port `3333` (MCP bridge). It must remain on `127.0.0.1`.
