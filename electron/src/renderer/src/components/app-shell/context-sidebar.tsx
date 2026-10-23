import { useRouterState } from '@tanstack/react-router';
import { LibraryIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { SecondarySidebar } from '@/components/workspace-sidebar';
import { VoicesSidebar } from '@/features/clone/voices-sidebar';
import { useWorkspace } from '@/lib/store/workspace';
import { LIBRARY_ROUTES } from './use-workspace-sidebar';


/** The user's saved voices and recent takes, beside the slim navigation column. */
export function ContextSidebar() {
  const { t } = useTranslation();
  const { libraryTab } = useWorkspace();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  if (!LIBRARY_ROUTES.has(pathname.replace(/\/+$/, '') || '/')) return null;
  return (
    <SecondarySidebar
      title={t('nav.voice')}
      icon={LibraryIcon}
      variant="library"
      className="flex flex-col overflow-hidden p-0"
    >
      <VoicesSidebar key={libraryTab} initialTab={libraryTab} />
    </SecondarySidebar>
  );
}
