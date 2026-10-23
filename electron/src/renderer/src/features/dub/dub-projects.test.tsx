import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
  navigate: vi.fn(),
  dubs: [] as unknown[],
  longform: {
    active: null as string | null,
    drafts: { stories: { projectId: null }, audiobook: { projectId: 'b2' } },
  },
  dub: { project: null as { id: string } | null, phase: 'idle', recovery: null },
  openDub: vi.fn(() => true),
}));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'en' } }),
}));
vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => state.navigate,
  Link: ({ children, to }: { children: unknown; to: string }) => (
    <a href={to}>{children as never}</a>
  ),
}));
vi.mock('@/lib/api/client', () => ({
  apiJson: async (path: string) =>
    path === '/projects'
      ? state.dubs
      : state.dubs.find((p) => path.endsWith((p as { id: string }).id)),
  describeError: (error: unknown) => String(error),
}));
vi.mock('../longform/longform-session', () => ({
  useLongformSession: () => state.longform,
}));
vi.mock('./dub-session', () => ({
  useDubSession: () => state.dub,
  openDubProject: state.openDub,
}));
import { DubProjects } from './dub-projects';

const renderList = () =>
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <DubProjects />
    </QueryClientProvider>,
  );

beforeEach(() => {
  state.navigate.mockReset();
  state.longform.active = null;
  state.dub = { project: { id: 'd2' }, phase: 'idle', recovery: null };
  state.dubs = [
    { id: 'd1', name: 'Launch video', updated_at: 1_700_000_000 },
    { id: 'd2', name: 'Podcast intro', updated_at: 1_700_000_100 },
  ];
});
afterEach(cleanup);

it('lists dub projects newest first and marks the one that is open', async () => {
  renderList();
  const open = await screen.findByRole('button', { name: /Podcast intro/ });
  expect(open).toHaveAttribute('aria-current', 'true');
  const names = screen.getAllByRole('button').map((b) => b.textContent ?? '');
  expect(names[0]).toContain('Podcast intro');
  expect(screen.getByRole('link')).toHaveAttribute('href', '/projects');
});

it('opens a dub project into the Dub workspace', async () => {
  renderList();
  fireEvent.click(await screen.findByRole('button', { name: /Launch video/ }));
  await waitFor(() => expect(state.navigate).toHaveBeenCalledWith({ to: '/dub' }));
  expect(state.openDub).toHaveBeenCalled();
});

it('waits while dubbing work is running', async () => {
  state.dub = { project: null, phase: 'dubbing', recovery: null };
  renderList();
  expect(await screen.findByRole('button', { name: /Launch video/ })).toBeDisabled();
});

it('shows the empty state when there are no dub projects yet', async () => {
  state.dubs = [];
  renderList();
  expect(await screen.findByText('projects.empty')).toBeVisible();
});
