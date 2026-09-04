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
- Wikilinks, transclusion, link previews, backlinks, and orphan links
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
  native custom properties, hierarchical tags, internal AFFiNE link rewriting,
  and generated backlinks.
- Next slices: wikilinks and transclusion, global/local graph, reader tools and
  lightbox, canvas, databases, multilingual/homepage controls, then Publishing
  Studio and the remaining rich-content/output modules.

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
