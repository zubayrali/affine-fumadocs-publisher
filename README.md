# AFFiNE Fumadocs Publisher

Turn a publishable subset of an AFFiNE workspace into a deterministic MDX and
media snapshot that any Fumadocs site can consume.

## Plug-and-play Fumadocs template

The ready-to-run, freshly generated Fumadocs application lives in
[`templates/fumadocs`](./templates/fumadocs). It tracks the official Fumadocs
starter structure and adds one publishing integration. Users do not need to
write an AFFiNE adapter:

```bash
git clone https://github.com/zubayrali/affine-fumadocs-publisher.git
cd affine-fumadocs-publisher
pnpm install
cp templates/fumadocs/.env.publisher.example templates/fumadocs/.env.publisher
# fill in the AFFiNE values, then
pnpm --dir templates/fumadocs publisher:watch
pnpm --dir templates/fumadocs dev
```

`publisher:watch` starts a loopback, read-only bridge and continuously writes
published AFFiNE documents into the template's `content/docs` folder.

This repository is the reusable publisher. It contains no website theme,
workspace ID, browser credential, or generated content. See
[`docs/v0.1-contract.md`](./docs/v0.1-contract.md) for scope and compatibility.

## Status

The repository contains the public configuration/native metadata contract, the
token-protected streamable-MCP bridge client, and safe content-addressed blob /
atomic snapshot primitives, change-fingerprint poller, and read-only bridge
supervisor. The next implementation phase adds Fumadocs-neutral snapshot
serialization and Docker/systemd release scaffolding. It is not published to
npm yet and should not be treated as a production dependency.

## Native AFFiNE properties

`Slug`, `Locale`, and `Publish` are required. `Draft` overrides `Publish`.
Optional properties: `Description`, `Unlisted`, `Featured`, `Order`, `Aliases`,
`Created`, and `Modified`. Tags use native AFFiNE workspace tags.
