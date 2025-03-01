/**
 * Global type definitions to ensure HTML element types are available
 * across the project. This helps resolve type errors with DOM elements.
 */

// DOM Element interfaces
interface HTMLElement {}
interface HTMLDivElement extends HTMLElement {}
interface HTMLSpanElement extends HTMLElement {}
interface HTMLButtonElement extends HTMLElement {}
interface HTMLInputElement extends HTMLElement {}
interface HTMLTextAreaElement extends HTMLElement {}
interface HTMLAnchorElement extends HTMLElement {}
interface HTMLImageElement extends HTMLElement {}
interface HTMLSelectElement extends HTMLElement {}
interface HTMLFormElement extends HTMLElement {}
interface HTMLLabelElement extends HTMLElement {}

// DOM Event interfaces
interface Event {}
interface MouseEvent extends Event {}
interface KeyboardEvent extends Event {}
interface TouchEvent extends Event {}
interface FocusEvent extends Event {}
interface MediaQueryListEvent extends Event {}

// Additional browser APIs that might be used
interface IntersectionObserver {}
interface IntersectionObserverEntry {}
interface ResizeObserver {}
interface MediaQueryList {} 