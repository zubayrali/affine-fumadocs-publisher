# VPS publisher + static deploy targets

Run AFFiNE and the publisher on the same VPS. After each successful release the
publisher can push the immutable static tree to a free static host.

```text
AFFiNE + publisher (VPS)
  → .affine-publisher/releases/current
  → PUBLISHER_DEPLOY_TARGET
       ├─ github-pages      (default for consumer sites now)
       └─ cloudflare-pages  (swap later with env only)
```

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
| `PUBLISHER_DEPLOY_GITHUB_TOKEN` or `GITHUB_TOKEN` | fine-grained token with Pages/contents write |
| `PUBLISHER_DEPLOY_GITHUB_BRANCH` | default `gh-pages` |

Repo setting: **Settings → Pages → Build and deployment → Deploy from a branch**
→ `gh-pages` / `/ (root)`. Disable any Actions workflow that also publishes Pages
so the VPS remains the single publisher.

### Cloudflare Pages (`PUBLISHER_DEPLOY_TARGET=cloudflare-pages`)

| Variable | Purpose |
| --- | --- |
| `PUBLISHER_DEPLOY_CF_PROJECT` | Cloudflare Pages project name |
| `CLOUDFLARE_API_TOKEN` | Pages deploy permission |
| `CLOUDFLARE_ACCOUNT_ID` | Account id |
| `PUBLISHER_DEPLOY_CF_BRANCH` | default `production` |

Switch later by changing the target and secrets only — no release-loop rewrite.

## systemd sketch

See `deploy/systemd/` for unit templates. Typical layout:

1. Docker Compose runs AFFiNE.
2. `affine-publisher.service` runs `pnpm publisher:watch` with `EnvironmentFile=.env.publisher`.
3. Releases land under `.affine-publisher/releases/current`, then the deploy hook fires.
