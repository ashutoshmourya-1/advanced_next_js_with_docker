import '@testing-library/jest-dom'

if (typeof window !== "undefined" && !window.PointerEvent) {
  class PointerEventPolyfill extends MouseEvent {
    public pointer_id: number;
    public width: number;
    public height: number;
    public pressure: number;
    public tangential_pressure: number;
    public tilt_x: number;
    public tilt_y: number;
    public twist: number;
    public pointer_type: string;
    public is_primary: boolean;
 
    constructor(type: string, params: PointerEventInit = {}) {
      super(type, params);
      this.pointer_id = params.pointerId ?? 0;
      this.width = params.width ?? 1;
      this.height = params.height ?? 1;
      this.pressure = params.pressure ?? 0;
      this.tangential_pressure = params.tangentialPressure ?? 0;
      this.tilt_x = params.tiltX ?? 0;
      this.tilt_y = params.tiltY ?? 0;
      this.twist = params.twist ?? 0;
      this.pointer_type = params.pointerType ?? "mouse";
      this.is_primary = params.isPrimary ?? false;
    }
  }
 
  // @ts-expect-error -- jsdom's lib.dom typings don't know about this polyfill
  window.PointerEvent = PointerEventPolyfill;
}
 
// jsdom also lacks these pointer-capture methods used internally by
// pointer-events-aware component libraries (Radix, base-ui, etc).
if (typeof window !== "undefined") {
  if (!Element.prototype.hasPointerCapture) {
    Element.prototype.hasPointerCapture = (): boolean => false;
  }
  if (!Element.prototype.setPointerCapture) {
    Element.prototype.setPointerCapture = (): void => {};
  }
  if (!Element.prototype.releasePointerCapture) {
    Element.prototype.releasePointerCapture = (): void => {};
  }
}