# Changelog

All notable changes to this Bootstrap fork are documented here.

---

## [Unreleased] — April 2026

### Added

#### `js/src/base-component.js`

- `static getConfigConstants(overrides = {})` — Base implementation; returns `overrides` unchanged. Intended to be overridden by subclasses to expose structural constants.
- `static get ConfigConstants` — Getter that calls `this.getConfigConstants()` via polymorphic dispatch so subclasses automatically see their own constants.
- `static extendDefaultConfig(overrides = {})` — Factory method that accepts a flat override object, classifies each key into `Default` / `DefaultType` (instance options) or `ConfigConstants` (structural), and returns a new subclass with those buckets merged with the parent's values.

#### `js/src/button.js`

- `static getConfigConstants(overrides = {})` — Exposes `CLASS_NAME_ACTIVE`, `SELECTOR_DATA_TOGGLE`, `DATA_API_KEY`.
- `static get ConfigConstants` — Getter delegating to `getConfigConstants()`.
- `static init()` / `static destroy()` — Wire and unwire the document-level `click` Data API listener.
- `static _isInitialized` — Guard flag preventing double-registration.
- Instance method `toggle()` now reads `CLASS_NAME_ACTIVE` from `this.constructor.ConfigConstants` instead of the module-level constant.

#### `js/src/dropdown.js`

- `static getConfigConstants(overrides = {})` — Exposes 25 structural constants: key names, class names, selectors, placement strings, and `DATA_API_KEY`.
- `static get ConfigConstants` — Getter delegating to `getConfigConstants()`.
- `static init()` / `static destroy()` — Wire and unwire all 5 Data API listeners (click toggle, click outside to clear, keydown, keyup, `DOMContentLoaded`).
- `static _isInitialized` — Guard flag.
- `const Default` and `const DefaultType` module-level objects restored for the existing `static get Default()` / `static get DefaultType()` getters (these were removed during an intermediate refactoring step and then correctly restored).
- All instance and static methods updated to read structural constants from `this.constructor.ConfigConstants` rather than the module-level constants.

#### `js/src/alert.js`

- `static getConfigConstants(overrides = {})` — Exposes `EVENT_CLOSE`, `EVENT_CLOSED`, `CLASS_NAME_FADE`, `CLASS_NAME_SHOW`.
- `static get ConfigConstants` — Getter.
- `static init()` / `static destroy()` — No-ops (Alert has no module-level Data API listeners; dismiss wiring is handled by `enableDismissTrigger`).
- `close()` reads event and class name constants from `this.constructor.ConfigConstants`.

#### `js/src/collapse.js`

- `static getConfigConstants(overrides = {})` — Exposes 16 constants: event names, class names, selectors, dimension strings, `DATA_API_KEY`.
- `static get ConfigConstants` — Getter.
- `static init()` / `static destroy()` — Wire and unwire the document-level `click` listener.
- `static _isInitialized` — Guard flag.

#### `js/src/carousel.js`

- `static getConfigConstants(overrides = {})` — Exposes 31 constants: key names, order/direction strings, event names, class names, selectors, `KEY_TO_DIRECTION` map, `DATA_API_KEY`.
- `static get ConfigConstants` — Getter.
- `static init()` / `static destroy()` — Wire and unwire the document `click` listener (slide controls) and window `load` listener (auto-init).
- `static _isInitialized` — Guard flag.

#### `js/src/modal.js`

- `static getConfigConstants(overrides = {})` — Exposes 20 constants: key names, event names, class names, selectors, `DATA_API_KEY`.
- `static get ConfigConstants` — Getter.
- `static init()` / `static destroy()` — Wire and unwire the document-level `click` Data API listener.
- `static _isInitialized` — Guard flag.

#### `js/src/offcanvas.js`

- `static getConfigConstants(overrides = {})` — Exposes 17 constants: key names, event names, class names, selectors, `DATA_API_KEY`.
- `static get ConfigConstants` — Getter.
- `static init()` / `static destroy()` — Wire and unwire 3 listeners: document `click`, window `load`, window `resize`.
- `static _isInitialized` — Guard flag.

#### `js/src/tab.js`

- `static getConfigConstants(overrides = {})` — Exposes 26 constants: key names, event names, class names, selectors.
- `static get ConfigConstants` — Getter.
- `static init()` / `static destroy()` — Wire and unwire the document `click` listener and window `load` listener.
- `static _isInitialized` — Guard flag.

#### `js/src/scrollspy.js`

- `static getConfigConstants(overrides = {})` — Exposes 14 constants: class names, selectors, event names.
- `static get ConfigConstants` — Getter.
- `static init()` / `static destroy()` — Wire and unwire the window `load` listener.
- `static _isInitialized` — Guard flag.

---

### Changed

#### `js/src/util/index.js`

- `isRTL()` — Now returns `false` (instead of crashing) when `document` is undefined. Before: `() => document.documentElement.dir === 'rtl'`. After: `() => typeof document !== 'undefined' && document.documentElement.dir === 'rtl'`.
- `onDOMContentLoaded(callback)` — Now returns early when `document` is undefined, making all `defineJQueryPlugin()` calls safe in Node.js environments.

#### `js/src/util/component-functions.js`

- `enableDismissTrigger(component, method)` — Now returns early when `document` is undefined. Prevents crashes when Alert, Modal, and Offcanvas are imported in Node.js.

#### All 9 component files

- Module-level `EventHandler.on(document/window, ...)` Data API registrations replaced with `if (typeof document !== 'undefined') { ComponentClass.init() }`, which is equivalent in browser environments but safe in Node.js.

---

### Fixed

- Importing any Bootstrap component in Node.js (e.g. for testing or SSR) no longer throws `ReferenceError: document is not defined`.
- `Dropdown.extendDefaultConfig()` no longer throws `ReferenceError: Default is not defined` — the module-level `const Default` and `const DefaultType` objects were restored after an intermediate refactoring step accidentally removed them.

---

### Backward Compatibility

All changes are **backward compatible** in browser environments:

- Components auto-wire their Data API on import exactly as before (the `if (typeof document !== 'undefined') { ComponentClass.init() }` guard is a no-op in browsers).
- The `Default`, `DefaultType`, and `NAME` static getters are unchanged.
- Existing HTML with `data-bs-*` attributes continues to work without modification.
- jQuery plugin integration (`defineJQueryPlugin`) is unaffected.
- `getOrCreateInstance`, `getInstance`, and `dispose` behave identically.

The only behavioral difference: components can now be imported in non-browser environments without crashing.

---

### Migration Guide

No migration is required for existing users. The new methods are purely additive.

To use the new extension API:

```js
// Before: impossible without forking the source
// After:
import Dropdown from './js/src/dropdown.js'

Dropdown.destroy() // stop default Data API

const MyDropdown = Dropdown.extendDefaultConfig({
  CLASS_NAME_SHOW: 'is-open',
  SELECTOR_DATA_TOGGLE: '[data-my-toggle="dropdown"]',
  autoClose: false  // instance option — goes into Default automatically
})

MyDropdown.init() // wire Data API for the custom subclass
```

See [Extending-Components.md](./Extending-Components.md) for full documentation.
