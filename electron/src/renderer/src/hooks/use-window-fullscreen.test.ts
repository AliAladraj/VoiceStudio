import { act, renderHook } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { useWindowFullscreen } from './use-window-fullscreen';

const size = (width: number, height: number) => {
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: width });
  Object.defineProperty(window, 'innerHeight', { configurable: true, value: height });
};

afterEach(() => size(1024, 768));

it('reports fullscreen only while the window fills the screen', () => {
  size(screen.width - 100, screen.height - 100);
  const { result } = renderHook(() => useWindowFullscreen());
  expect(result.current).toBe(false);
  act(() => {
    size(screen.width, screen.height);
    window.dispatchEvent(new Event('resize'));
  });
  expect(result.current).toBe(true);
});
