# Feature-complete wiki template

## Objective

Ship one neutral `templates/wiki` application that retains the default
Fumadocs visual language while supporting the reusable publishing and wiki
capabilities proven in the reference AFFiNE site. The public repository must
contain no customer-specific identity, content, media, vocabulary, or styling.

## Product boundary

```text
packages/publisher  AFFiNE access, publication metadata, atomic snapshots
packages/wiki       reusable wiki domain modules and React UI
templates/wiki      complete Fumadocs application and generic fixtures
consumer site       content, identity, navigation, homepage composition, brand
```

The template is an executable reference consumer, not the reusable interface.
Reusable behavior graduates into `packages/wiki` and is consumed by both the
template and downstream sites.

## Required baseline

- Native AFFiNE publication properties, tags, aliases, dates, and ordering
- Multilingual locale registry and translation-key routing
- AFFiNE-managed homepage control documents
- AFFiNE-native document links (LinkedPage / embed-linked-doc Markdown exports),
  link previews, backlinks, and orphan links. Obsidian `[[wikilink]]` syntax is
  out of scope after the Obsidian → AFFiNE migration.
- Full-text search, tags, page properties, reading time, and reader mode
- Global and local knowledge graphs
- Lightbox and gallery behavior
- Native AFFiNE canvas snapshot/view mode
- Native AFFiNE database table, gallery, and kanban views
- Slides, Mermaid, math, citations, sidenotes, and annotations
- RSS, sitemap, Open Graph, Markdown, and LLM endpoints
- Publishing Studio, health diagnostics, releases, and rollback
- Light/dark compatibility through Fumadocs semantic tokens

## Implementation status

- Complete: neutral monorepo/package boundary, executable Fumadocs template,
  atomic AFFiNE snapshot publishing, media materialization, publication controls,
  native custom properties, hierarchical tags, AFFiNE-native document link
  rewriting (including absolute workspace URLs), unpublished-link diagnostics,
  generated backlinks, orphan-page detection, hover link previews, article
  lightbox galleries (`@affine-fumadocs/wiki/lightbox`), AFFiNE database
  table / gallery / kanban views (`@affine-fumadocs/wiki/databases`), global and
  local knowledge graphs (`@affine-fumadocs/wiki/graph`), thin reader mode
  (`@affine-fumadocs/wiki/reader`), Mermaid / KaTeX / slides via
  `createWikiMdxOptions`, citations / sidenotes / rough annotations / orbit
  review (`@affine-fumadocs/wiki/{citations,sidenotes,annotations,review}`),
  multilingual helpers + props-driven `LocaleSwitcher`
  (`@affine-fumadocs/wiki/site`), a neutral Publishing Studio shell
  (`@affine-fumadocs/wiki/studio`) with a fixture-backed `/publishing` admin
  route (dev-only; excluded from production reader builds), optional
  `statusUrl` one-shot fetch plus `/api/publishing/status` fixture endpoint,
  RSS (`app/rss.xml`, gated by `features.rss`) and sitemap (`app/sitemap.ts`)
  using `wikiConfig.site`, Open Graph + Markdown/LLM endpoints, and AFFiNE
  edgeless canvas pan/zoom maps (`@affine-fumadocs/wiki/canvas` — labeled boxes
  plus optional in-node HTML and embedded database snapshots; full MDX compile
  of markdown nodes remains deferred).
- Complete in this slice: site-control helpers (`isSiteControlPage`), optional
  `buildHomeModel` stub, studio config validators (plain `.mjs`, no Zod), and
  feature-gated template wiring for `features.multilingual` /
  `features.publishingStudio` / `features.rss` / rich-content flags. Publisher
  headless DB marker helpers live in `@affine-fumadocs/publisher` (`databases`
  export + main package re-exports) and are applied during
  `publish-from-affine.mjs` after blob materialization.
- Hard-deferred: body-level note transclusion. AFFiNE's Markdown export
  flattens embed-linked documents into ordinary workspace links, so embedded
  bodies are not recoverable from the current bridge export. Live continuous
  publisher status polling, AFFiNE homepage table compilation, and full MDX
  compile of canvas markdown nodes remain later.

Optional modules may be disabled in `affine-wiki.config.ts`, but the starter
must include and exercise their implementations.

## Neutrality invariant

CI scans tracked template, package, documentation, and fixture sources for
customer-specific identifiers. Generated output, dependencies, and git history
are outside the scan. A failure blocks release.

The starter uses generic identity (`AFFiNE Knowledge Base`), generic documents,
and default Fumadocs colors. Consumer branding is configuration supplied by the
consumer repository.

## Migration sequence

1. Rename the existing starter to `templates/wiki`; remove copied content.
2. Add configuration and feature registry interfaces with generic fixtures.
3. Port reusable rendering modules in vertical slices, each with tests.
4. Move stable shared implementations into `packages/wiki`.
5. Make the downstream reference site consume released package interfaces.
6. Remove compatibility shims after both consumers pass parity checks.

## Acceptance

- A clean clone can configure AFFiNE and start the template from its README.
- Template build and type checks pass without access to a private workspace.
- Feature fixtures demonstrate every enabled renderer.
- No customer-specific identifier occurs in scanned public sources.
- The publisher remains usable headlessly without the wiki package.
- Document links use AFFiNE's native `/workspace/<id>/<docId>` export form, not
  Obsidian `[[wikilink]]` syntax.
