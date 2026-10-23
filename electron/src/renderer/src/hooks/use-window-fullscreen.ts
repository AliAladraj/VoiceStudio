import { useEffect, useState } from 'react';

/** Native (green-button) fullscreen hides the macOS traffic lights; the window then fills the screen. */
function fillsScreen(): boolean {
  return window.innerWidth >= screen.width && window.innerHeight >= screen.height;
}

export function useWindowFullscreen(): boolean {
  const [fullscreen, setFullscreen] = useState(() => typeof window !== 'undefined' && fillsScreen());
  useEffect(() => {
    const update = () => setFullscreen(fillsScreen());
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);
  return fullscreen;
}
