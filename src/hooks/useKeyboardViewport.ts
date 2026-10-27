import { useEffect } from 'react';
/** Keep fixed controls within the visible area when a mobile keyboard overlays the page. */
export function useKeyboardViewport() {
  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;
    const root = document.documentElement;
    let frame = 0;
    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const target = document.activeElement;
        const typing =
          target instanceof HTMLElement &&
          (target.matches('input,textarea') || target.isContentEditable);
        const covered = Math.max(
          0,
          window.innerHeight - viewport.height - viewport.offsetTop,
        );
        root.style.setProperty(
          '--keyboard-inset',
          typing && covered > 120 ? `${covered}px` : '0px',
        );
        root.style.setProperty('--visible-height', `${viewport.height}px`);
        root.style.setProperty('--visible-top', `${viewport.offsetTop}px`);
      });
    };
    viewport.addEventListener('resize', update);
    viewport.addEventListener('scroll', update);
    document.addEventListener('focusin', update);
    document.addEventListener('focusout', update);
    update();
    return () => {
      cancelAnimationFrame(frame);
      viewport.removeEventListener('resize', update);
      viewport.removeEventListener('scroll', update);
      document.removeEventListener('focusin', update);
      document.removeEventListener('focusout', update);
      root.style.removeProperty('--keyboard-inset');
      root.style.removeProperty('--visible-height');
      root.style.removeProperty('--visible-top');
    };
  }, []);
}
