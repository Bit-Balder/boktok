// DOM APIs used by Radix; jsdom does not provide layout or pointer capture.
if (!window.PointerEvent)
  window.PointerEvent = MouseEvent as typeof PointerEvent;
HTMLElement.prototype.hasPointerCapture = () => false;
HTMLElement.prototype.setPointerCapture = () => {};
HTMLElement.prototype.releasePointerCapture = () => {};
HTMLElement.prototype.scrollIntoView = () => {};
