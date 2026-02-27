import { Millennium } from '@steambrew/client';
import { createRoot } from 'react-dom/client';
import Steam from './steam';

/**
 * Render a React component to a DOM element
 * @param component The component to render
 * @returns The DOM element that was rendered
 */
export function renderComponent(component: React.ReactNode, tagName = 'div') {
  const container = document.createElement(tagName);
  const root = createRoot(container);
  root.render(component);
  return container;
}

/**
 * Wait for a condition to be true
 * @param condition A method that returns a value that will be checked for truthiness
 * @param interval The initial interval to wait before checking the condition again
 * @returns The value returned by the condition if any
 */
export async function waitFor<T>(condition: () => T, interval = 10): Promise<T> {
  const result = await condition();
  if (result) return result;
  await new Promise((r) => setTimeout(r, interval * 1.1));
  return waitFor(condition, interval);
}

/**
 * Force a fake location change
 */
export function forceFakeLocationChange(
  window: Window = Steam.MainPopup?.window ?? globalThis.window,
) {
  if (Steam.UIStore.MainInstanceUIMode === Steam.UIMode.Desktop)
    Steam.MainWindowBrowserManager.m_lastLocation.hash = `#${Math.random()}`;
  else if (Steam.UIStore.MainInstanceUIMode === Steam.UIMode.Gamepad)
    if (window.opener instanceof Window) window.opener.location.hash = `#${Math.random()}`;
}

/**
 * Find all elements matching a selector, waiting for up to 5 seconds
 * @param document The document to search in
 * @param selectors The selector to search for
 * @returns Node list of all matching elements
 */
export function querySelectorAll(document: Document, selectors: string) {
  return Millennium.findElement(document, String(selectors), 5000);
}

// ===== Types ===== //

export type Tuple<Holds, Length extends number> = Length extends Length
  ? number extends Length
    ? Holds[]
    : _TupleOf<Holds, Length, []>
  : never;
type _TupleOf<Holds, Length extends number, Rest extends unknown[]> = Rest['length'] extends Length
  ? Rest
  : _TupleOf<Holds, Length, [Holds, ...Rest]>;

export type Awaitable<T> = T | Promise<T>;

// biome-ignore lint/suspicious/noConfusingVoidType: on purpose
export type Voidable<T> = T | void;
