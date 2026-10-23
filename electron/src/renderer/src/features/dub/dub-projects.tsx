import { useMemo, useState } from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { FilmIcon, FolderIcon, SearchIcon } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { apiJson, describeError } from '@/lib/api/client';
import { cn } from '@/lib/utils';
import { formatRelative } from '../clone/format';
import { useLongformSession } from '../longform/longform-session';
import type { DubProject } from '../projects/project-format';
import { openDubProject, useDubSession } from './dub-session';

const SEARCH_ABOVE = 8;

interface Row {
  id: string;
  name: string;
  updatedAt: number | string | undefined;
}

/**
 * Saved dub projects, in the Dub pane: the same projects the Projects page lists,
 * newest first. One tap opens a project in place; the footer link is the whole library.
 */
export function DubProjects() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const dub = useDubSession();
  const longform = useLongformSession();
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);
  const query = useQuery({
    queryKey: ['projects'],
    queryFn: ({ signal }) => apiJson<DubProject[]>('/projects', { signal }),
  });
  const rows = useMemo<Row[]>(
    () =>
      (query.data ?? [])
        .map((p) => ({ id: p.id, name: p.name, updatedAt: p.updated_at }))
        .sort((a, b) => stamp(b.updatedAt) - stamp(a.updatedAt)),
    [query.data],
  );
  const shown = useMemo(() => {
    const needle = search.trim().toLocaleLowerCase();
    return needle ? rows.filter((row) => row.name.toLocaleLowerCase().includes(needle)) : rows;
  }, [rows, search]);
  const activeId = dub.project?.id;
  // Opening replaces the working project, so it waits while a dub or render is running.
  const locked =
    !!longform.active || !!dub.recovery || !['idle', 'editing', 'done'].includes(dub.phase);

  const open = async (id: string) => {
    if (locked) return;
    setError(null);
    try {
      const project = await apiJson<DubProject>('/projects/' + encodeURIComponent(id));
      if (!openDubProject(project)) throw new Error('Dubbing work is active');
      await navigate({ to: '/dub' });
    } catch (failure) {
      setError(describeError(failure));
    }
  };

  return (
    <div data-slot="dub-projects" className="flex min-h-0 flex-1 flex-col">
      {rows.length > SEARCH_ABOVE && (
        <div className="relative shrink-0 px-2.5 pt-2.5">
          <SearchIcon
            aria-hidden="true"
            className="pointer-events-none absolute start-5 top-1/2 mt-1 size-3.5 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            aria-label={t('preferences.search')}
            placeholder={t('preferences.search')}
            className="h-8 ps-8 text-xs"
          />
        </div>
      )}
      <ul className="studio-scrollbar min-h-0 flex-1 space-y-0.5 overflow-y-auto p-2">
        {shown.map((row) => {
          const active = row.id === activeId;
          const when = formatRelative(row.updatedAt, i18n.language);
          return (
            <li key={row.id}>
              <button
                type="button"
                disabled={locked && !active}
                aria-current={active ? 'true' : undefined}
                onClick={() => void open(row.id)}
                className={cn(
                  'flex w-full min-w-0 items-center gap-2.5 rounded-lg px-2 py-1.5 text-start outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50',
                  active
                    ? 'bg-accent/80 text-foreground'
                    : 'text-foreground/85 hover:bg-accent/50 hover:text-foreground',
                )}
              >
                <FilmIcon
                  aria-hidden="true"
                  className={cn(
                    'size-4 shrink-0',
                    active ? 'text-primary' : 'text-muted-foreground',
                  )}
                />
                <span className="flex min-w-0 flex-1 flex-col leading-tight">
                  <span className="truncate text-[13px] font-medium">{row.name}</span>
                  {when && (
                    <span className="truncate text-[11px] text-muted-foreground">{when}</span>
                  )}
                </span>
              </button>
            </li>
          );
        })}
        {!query.isPending && !query.isError && !shown.length && (
          <li className="px-2 py-6 text-center text-xs text-muted-foreground">
            {rows.length ? t('projects.no_matches', { query: search.trim() }) : t('projects.empty')}
          </li>
        )}
        {query.isError && (
          <li role="alert" className="px-2 py-3 text-xs text-destructive">
            {t('common.error')}
          </li>
        )}
      </ul>
      {error && (
        <p role="alert" className="shrink-0 px-3 pb-1 text-xs text-destructive">
          {error}
        </p>
      )}
      <Link
        to="/projects"
        className="flex h-9 shrink-0 items-center gap-2 border-t border-border/45 px-3 text-xs text-muted-foreground outline-none transition-colors hover:bg-accent/40 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
      >
        <FolderIcon aria-hidden="true" className="size-3.5" />
        {t('projects.title')}
      </Link>
    </div>
  );
}

function stamp(value: number | string | undefined): number {
  if (!value) return 0;
  if (typeof value === 'number') return value < 1e12 ? value * 1000 : value;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}
