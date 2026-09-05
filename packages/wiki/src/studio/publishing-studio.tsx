'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  CircleX,
  Clock3,
  ExternalLink,
  FilePenLine,
  Search,
} from 'lucide-react';
import type {
  StudioDiagnostic,
  StudioDocumentStatus,
  StudioSnapshot,
} from './types.js';
import './studio.css';

function timeAgo(value: string | undefined): string {
  if (!value) return 'not yet';
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(value).valueOf()) / 60_000));
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  return hours < 24 ? `${hours}h ago` : `${Math.floor(hours / 24)}d ago`;
}

function groupDiagnostics(diagnostics: StudioDiagnostic[]) {
  return [...diagnostics.reduce((groups, diagnostic) => {
    const group = groups.get(diagnostic.code) ?? {
      code: diagnostic.code,
      level: diagnostic.level,
      items: [] as StudioDiagnostic[],
    };
    group.items.push(diagnostic);
    groups.set(diagnostic.code, group);
    return groups;
  }, new Map<string, { code: string; level: StudioDiagnostic['level']; items: StudioDiagnostic[] }>()).values()];
}

const statusLabels: Record<StudioDocumentStatus, string> = {
  published: 'Published',
  draft: 'Draft',
  private: 'Private',
  warning: 'Warning',
  blocked: 'Blocked',
};

export interface PublishingStudioProps {
  snapshot?: StudioSnapshot;
  /** Optional label shown in the empty state. */
  emptyHref?: string;
}

/**
 * Neutral Publishing Studio shell. The template (or consumer) supplies the
 * snapshot — this component does not fetch live publisher status.
 */
export function PublishingStudio({
  snapshot,
  emptyHref = '/',
}: PublishingStudioProps) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'all' | StudioDocumentStatus>('all');
  const [collectionFilter, setCollectionFilter] = useState('all');

  const documents = useMemo(() => (snapshot?.documents ?? []).filter((document) => {
    const matchesFilter = filter === 'all' || document.status === filter;
    const matchesCollection = collectionFilter === 'all'
      || (collectionFilter === 'uncollected'
        ? !document.collections?.length
        : document.collections?.some((collection) => collection.id === collectionFilter) === true);
    const search = query.trim().toLocaleLowerCase();
    const collectionNames = document.collections?.map((collection) => collection.name).join(' ') ?? '';
    return matchesFilter && matchesCollection
      && (!search || `${document.title} ${document.slug ?? ''} ${document.id} ${collectionNames}`.toLocaleLowerCase().includes(search));
  }), [collectionFilter, filter, query, snapshot]);

  if (!snapshot) {
    return (
      <main className="wiki-studio-shell wiki-studio-empty">
        <p className="wiki-studio-context">Publishing Studio</p>
        <h1>No publisher snapshot yet</h1>
        <p>Provide a studio snapshot from your publisher pipeline to inspect publication health here.</p>
        <Link href={emptyHref}>Return to the site</Link>
      </main>
    );
  }

  const healthy = snapshot.summary.errors === 0;
  const diagnosticGroups = groupDiagnostics(snapshot.diagnostics);

  return (
    <main className="wiki-studio-shell" data-release-state={healthy ? 'ready' : 'blocked'}>
      <header className="wiki-studio-header">
        <div>
          <p className="wiki-studio-context">
            Publishing Studio <span>/</span> {snapshot.locale.toUpperCase()} workspace
          </p>
          <h1>{healthy ? 'Ready to publish' : 'Publishing is blocked'}</h1>
          <p>
            The public site stays on its last immutable snapshot while drafts and failed refreshes remain private.
          </p>
        </div>
        <div className={`wiki-studio-state ${healthy ? 'is-ready' : 'is-blocked'}`}>
          {healthy ? <CheckCircle2 /> : <CircleX />}
          <span>
            <strong>
              {healthy
                ? 'No blocking errors'
                : `${snapshot.summary.errors} blocking error${snapshot.summary.errors === 1 ? '' : 's'}`}
            </strong>
            <small suppressHydrationWarning>
              <Clock3 /> Snapshot generated {timeAgo(snapshot.generatedAt)}
            </small>
          </span>
        </div>
      </header>

      <dl className="wiki-studio-metrics" aria-label="Publishing summary">
        <div><dt>Published</dt><dd>{snapshot.summary.publishedPages}</dd></div>
        <div><dt>Draft or private</dt><dd>{snapshot.summary.drafts}</dd></div>
        <div><dt>Collections</dt><dd>{snapshot.collections.length}</dd></div>
        <div><dt>Warnings</dt><dd>{snapshot.summary.warnings}</dd></div>
      </dl>

      <section className="wiki-studio-panel wiki-studio-documents-panel">
        <div className="wiki-studio-panel-title">
          <div>
            <h2>Documents</h2>
            <p>Search publication state, metadata completeness, and document-level diagnostics.</p>
          </div>
          <span>{documents.length} of {snapshot.documents.length}</span>
        </div>
        <div className="wiki-studio-document-tools">
          <label>
            <Search />
            <span className="sr-only">Search documents</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search title, route, or ID…"
            />
          </label>
          <label>
            <span className="sr-only">Filter status</span>
            <select
              value={filter}
              onChange={(event) => setFilter(event.target.value as typeof filter)}
            >
              <option value="all">All states</option>
              {Object.entries(statusLabels).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </label>
          <label>
            <span className="sr-only">Filter collection</span>
            <select
              value={collectionFilter}
              onChange={(event) => setCollectionFilter(event.target.value)}
            >
              <option value="all">All collections</option>
              {snapshot.collections.map((collection) => (
                <option key={collection.id} value={collection.id}>
                  {collection.name} ({collection.documentCount})
                </option>
              ))}
              {snapshot.documents.some((document) => !document.collections?.length) && (
                <option value="uncollected">No collection</option>
              )}
            </select>
          </label>
        </div>
        <div className="wiki-studio-table-wrap">
          <table className="wiki-studio-documents">
            <thead>
              <tr>
                <th>Document</th>
                <th>State</th>
                <th>Metadata</th>
                <th><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {documents.map((document) => (
                <tr key={document.id}>
                  <td>
                    <strong>{document.title}</strong>
                    <small>{document.slug ? `/${document.slug}` : document.id}</small>
                  </td>
                  <td>
                    <span className={`wiki-studio-document-status is-${document.status}`}>
                      {statusLabels[document.status]}
                    </span>
                    {document.diagnostics.length > 0 && (
                      <small>
                        {document.diagnostics.length} issue{document.diagnostics.length === 1 ? '' : 's'}
                      </small>
                    )}
                  </td>
                  <td>
                    <strong>{document.metadata.complete}/{document.metadata.total}</strong>
                    {document.metadata.missing.length > 0 && (
                      <small>Missing {document.metadata.missing.join(', ')}</small>
                    )}
                  </td>
                  <td>
                    <span className="wiki-studio-document-actions">
                      {document.publishedHref && (
                        <Link href={document.publishedHref} title="Open published page">
                          <ExternalLink />
                          <span className="sr-only">Open published page</span>
                        </Link>
                      )}
                      {document.affineHref && (
                        <a href={document.affineHref} target="_blank" rel="noreferrer" title="Edit in AFFiNE">
                          <FilePenLine />
                          <span className="sr-only">Edit in AFFiNE</span>
                        </a>
                      )}
                    </span>
                  </td>
                </tr>
              ))}
              {documents.length === 0 && (
                <tr>
                  <td colSpan={4} className="wiki-studio-no-results">No documents match this view.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="wiki-studio-panel wiki-studio-diagnostics-panel">
        <div className="wiki-studio-panel-title">
          <div>
            <h2>Editorial checks</h2>
            <p>
              {snapshot.summary.warnings === 0
                ? 'Nothing needs attention.'
                : 'Warnings do not block this release; errors do.'}
            </p>
          </div>
          <span>{diagnosticGroups.length} check{diagnosticGroups.length === 1 ? '' : 's'}</span>
        </div>
        <ol className="wiki-studio-diagnostics">
          {diagnosticGroups.length === 0 && (
            <li className="is-ok">
              <CheckCircle2 />
              <div>
                <strong>All checks passed</strong>
                <p>The current snapshot has no publisher diagnostics.</p>
              </div>
            </li>
          )}
          {diagnosticGroups.map((group) => (
            <li key={group.code} className={group.level === 'error' ? 'is-error' : 'is-warning'}>
              {group.level === 'error' ? <CircleX /> : <AlertTriangle />}
              <div>
                <div className="wiki-studio-diagnostic-heading">
                  <strong>{group.code.replace(/^AFFINE_/, '').replaceAll('_', ' ')}</strong>
                  <span>{group.items.length}</span>
                </div>
                <p>
                  {group.items.length === 1
                    ? group.items[0]!.message
                    : `${group.items.length} documents need the same editorial fix.`}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <div className="wiki-studio-grid">
        <section className="wiki-studio-panel">
          <div className="wiki-studio-panel-title">
            <div>
              <h2>Public portals</h2>
              <p>Collection-backed surfaces included in the reader site.</p>
            </div>
            <span>{snapshot.portals.length}</span>
          </div>
          <div className="wiki-studio-portals">
            {snapshot.portals.map((portal) => (
              <article key={portal.id}>
                <div>
                  <h3>{portal.label}</h3>
                  <p>{portal.collection}</p>
                </div>
                <div className="wiki-studio-portal-count">
                  <strong>{portal.publishedCount}</strong>
                  <span>of {portal.workspaceCount}</span>
                </div>
                <Link href={`/${portal.route}`}>
                  Open <ArrowUpRight />
                </Link>
              </article>
            ))}
          </div>
        </section>
        <section className="wiki-studio-panel wiki-studio-collections">
          <div className="wiki-studio-panel-title">
            <div>
              <h2>Workspace collections</h2>
              <p>The editorial views currently visible to the publisher.</p>
            </div>
            <span>{snapshot.collections.length}</span>
          </div>
          <div>
            {snapshot.collections.map((collection) => (
              <article key={collection.id}>
                <span>{collection.name}</span>
                <strong>{collection.documentCount}</strong>
              </article>
            ))}
          </div>
        </section>
      </div>

      <footer className="wiki-studio-footer">
        <Link href="/">← Reader site</Link>
        <span>Development only · never emitted as a production page</span>
      </footer>
    </main>
  );
}
