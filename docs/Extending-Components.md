# Extending Bootstrap Components

## Rationale

Bootstrap's JavaScript components ship with hardcoded CSS class names, DOM selectors, keyboard keys, and placement strings (e.g. `CLASS_NAME_SHOW = 'show'`, `SELECTOR_DATA_TOGGLE = '[data-bs-toggle="dropdown"]'`). These are module-level constants that cannot be overridden after import without forking the entire codebase.

This is a problem for integrators who need to:

- Use a different CSS framework or naming convention alongside Bootstrap (e.g. replacing `show` with `is-open`)
- Scope components to a custom attribute prefix (e.g. `data-my-toggle` instead of `data-bs-toggle`)
- Create multiple independent instances of the same component type, each with its own Data API binding and selector set
- Bundle a customized Bootstrap variant without touching upstream source files

The standard Bootstrap `Default` config object **cannot** be used for structural constants because `Config._mergeConfigObj()` spreads `this.constructor.Default` into every component instance, meaning selectors and class names would become per-instance instance options that could be overridden by `data-bs-*` attributes on arbitrary DOM elements. This is unsafe and semantically wrong.

### Design Goals

1. **Single flat public API** — consumers pass one plain object; the library classifies each key internally.
2. **No mutation** — calling the factory returns a new subclass; the original class is untouched.
3. **Composable** — the returned subclass is itself a full Bootstrap component and can be extended further.
4. **Lifecycle control** — every component exposes `static init()` / `static destroy()` to allow consumers to wire/unwire the Data API on demand.
5. **Node.js-safe** — all `document`/`window` access is guarded so components can be imported in server-side or test environments.

---

## Architecture

### Three-bucket split

Each component maintains three separate buckets of "constants":

| Bucket | Static getter | Purpose |
|--------|---------------|---------|
| `Default` | `static get Default()` | Per-instance option defaults — merged into `_config` by `Config._mergeConfigObj()`. May be overridden per element via `data-bs-*` attributes. |
| `DefaultType` | `static get DefaultType()` | Type rules for instance options — consumed by `_typeCheckConfig()`. |
| `ConfigConstants` | `static get ConfigConstants()` | Structural constants — CSS class names, DOM selectors, key names, event strings, placements. Never merged into `_config`. |

`extendDefaultConfig(overrides)` accepts a flat object and classifies each key by checking whether it already exists in the parent's `Default` / `DefaultType`. Keys found there go into the `Default` bucket; all other keys go into `ConfigConstants`.

### Static factory method

```js
// base-component.js
static extendDefaultConfig(overrides = {}) {
  const parentClass = this
  // ... classify overrides into newDefault, newDefaultType, newConfigConstants ...
  return class extends parentClass {
    static get Default()        { return newDefault }
    static get DefaultType()    { return newDefaultType }
    static get ConfigConstants() { return newConfigConstants }
    static getConfigConstants(furtherOverrides = {}) {
      return { ...newConfigConstants, ...furtherOverrides }
    }
  }
}
```

### Lifecycle methods

Every component that registers Data API listeners now exposes:

```js
static init()    // wire document/window listeners — called automatically in browser environments
static destroy() // remove those listeners — useful before replacing with a custom subclass
```

Guarded browser-safe auto-init at module load:

```js
if (typeof document !== 'undefined') {
  Dropdown.init()
}
```

---

## Changes Made

### `js/src/base-component.js`

- Added `static getConfigConstants(overrides = {})` — base no-op; returns `overrides` unchanged.
- Added `static get ConfigConstants()` — calls `this.getConfigConstants()` (polymorphic dispatch).
- Added `static extendDefaultConfig(overrides = {})` — the main public factory. Classifies overrides, creates and returns a subclass.

### `js/src/util/index.js`

- `isRTL()` — wrapped with `typeof document !== 'undefined'` guard (was crashing in Node.js).
- `onDOMContentLoaded()` — added early-return guard when `document` is undefined.

### `js/src/util/component-functions.js`

- `enableDismissTrigger()` — added early-return guard when `document` is undefined.

### Components (all 9)

Each component was updated with the same mechanical pattern:

| Component | ConfigConstants keys | Data API listeners moved |
|-----------|---------------------|--------------------------|
| `button.js` | 3 | 1 (`click`) |
| `dropdown.js` | 25 | 5 (`click`, `keydown`, `keyup`, `click`, `click`) |
| `alert.js` | 4 | 0 (uses `enableDismissTrigger`) |
| `collapse.js` | 16 | 1 (`click`) |
| `carousel.js` | 31 | 2 (`click`, `load`) |
| `modal.js` | 20 | 1 (`click`) |
| `offcanvas.js` | 17 | 3 (`click`, `load`, `resize`) |
| `tab.js` | 26 | 2 (`click`, `load`) |
| `scrollspy.js` | 14 | 1 (`load`) |

For each component, the changes were:

1. Moved module-level `EventHandler.on(document/window, ...)` calls into a `static init()` method, storing handler references as `static _clickHandler`, `static _loadHandler`, etc.
2. Stored the handler reference on the class so `static destroy()` can call `EventHandler.off()` with the exact same function reference.
3. Added `static getConfigConstants(overrides = {})` returning an object with all structural constants, spread-merged with `overrides`.
4. Added `static get ConfigConstants()` delegating to `this.getConfigConstants()`.
5. Added `static _isInitialized = false` flag to prevent double-registration.
6. Replaced module-level `EventHandler.on(...)` blocks with `if (typeof document !== 'undefined') { ComponentClass.init() }`.

For components that use delegated handlers (e.g. `Dropdown.dataApiKeydownHandler`), the handler was wrapped inside `init()` using a wrapper function to ensure DOM-delegated `this` is preserved correctly.

---

## Consumer Examples

### Basic class name override

```js
import Dropdown from './bootstrap-fork/js/src/dropdown.js'

// Destroy the default Data API bindings first
Dropdown.destroy()

// Create a custom subclass where CLASS_NAME_SHOW is 'is-open'
const CustomDropdown = Dropdown.extendDefaultConfig({
  CLASS_NAME_SHOW: 'is-open',
  SELECTOR_DATA_TOGGLE: '[data-my-toggle="dropdown"]'
})

// Wire the Data API for the custom subclass
CustomDropdown.init()
```

### Overriding instance options

```js
import Dropdown from './bootstrap-fork/js/src/dropdown.js'

// autoClose is an instance option (exists in Dropdown.Default)
// it is automatically classified into the Default bucket
const AutoStayDropdown = Dropdown.extendDefaultConfig({
  autoClose: false,
  display: 'static'
})

// Instance options can still be overridden per-element via data-bs-* attributes
// (the subclass participates fully in _mergeConfigObj)
```

### Mixed overrides (instance options + structural constants together)

```js
import Modal from './bootstrap-fork/js/src/modal.js'

Modal.destroy()

const CustomModal = Modal.extendDefaultConfig({
  // Instance option (goes into Default)
  backdrop: 'static',
  // Structural constant (goes into ConfigConstants)
  CLASS_NAME_SHOW: 'modal-visible',
  SELECTOR_DATA_TOGGLE: '[data-app-modal]'
})

CustomModal.init()
```

### Chained extension

```js
import Carousel from './bootstrap-fork/js/src/carousel.js'

const ScopedCarousel = Carousel.extendDefaultConfig({
  SELECTOR_DATA_SLIDE: '[data-app-slide]',
  SELECTOR_DATA_RIDE: '[data-app-ride="carousel"]'
})

// Extend again for a specific use-case
const AutoplayCarousel = ScopedCarousel.extendDefaultConfig({
  interval: 3000,
  ride: 'carousel'
})
```

### Fully replacing Bootstrap Data API

```js
import * as bootstrap from './bootstrap-fork/js/src/index.js'

// Stop all default Data API wiring
for (const name of ['Button', 'Dropdown', 'Collapse', 'Carousel', 'Modal', 'Offcanvas', 'Tab', 'ScrollSpy']) {
  bootstrap[name].destroy()
}

// Create custom versions with your own selectors
const MyDropdown = bootstrap.Dropdown.extendDefaultConfig({
  SELECTOR_DATA_TOGGLE: '[data-my-toggle="dropdown"]',
  CLASS_NAME_SHOW: 'open'
})
MyDropdown.init()

// … etc
```

### Using with a custom CSS framework

If you're using Bootstrap's JS but want to control the class names to match a different CSS framework:

```js
import Collapse from './bootstrap-fork/js/src/collapse.js'

Collapse.destroy()

const AccordionComponent = Collapse.extendDefaultConfig({
  CLASS_NAME_SHOW: 'active',
  CLASS_NAME_COLLAPSE: 'collapsible',
  CLASS_NAME_COLLAPSING: 'collapsing',
  CLASS_NAME_COLLAPSED: 'collapsed'
})

AccordionComponent.init()
```

---

## Lessons Learned

### 1. `Default` is not just a bag of defaults — it is the instance-config seed

Bootstrap's `Config._mergeConfigObj()` spreads `this.constructor.Default` into every component instance before processing element `data-bs-*` attributes and caller-supplied config. This means any key placed in `Default` becomes an overridable per-instance option. Structural constants like `CLASS_NAME_SHOW` must never go into `Default` because they would then be exposed to arbitrary element-level overrides via data attributes.

**Lesson:** Keep the three buckets strictly separated. The classifier in `extendDefaultConfig` uses the parent's `Default` and `DefaultType` as the ground truth for what constitutes an instance option.

### 2. Delegated event handlers must preserve DOM `this`

When `EventHandler.on(document, event, selector, handler)` is called with a selector, the handler is invoked with `this` bound to the matched element (`event.delegateTarget`). If you store the handler as a bound arrow function or class method, you lose this DOM binding.

**Pattern used:** Wrap the handler as a `function` expression inside `init()`:

```js
static init() {
  this._clickHandler = function (event) {
    // `this` here is the matched element (the toggler button)
    const target = SelectorEngine.getElementFromSelector(this)
    // ...
  }
  EventHandler.on(document, EVENT_CLICK_DATA_API, SELECTOR_DATA_TOGGLE, this._clickHandler)
}
```

### 3. Store handler references for later `off()` calls

`EventHandler.off()` must receive the exact same function reference that was passed to `EventHandler.on()`. The pattern of storing handler references as class-level properties (`this._clickHandler`, `this._loadHandler`, etc.) ensures `destroy()` can cleanly unregister them.

### 4. Node.js safety requires guarding all `document`/`window` access

Three separate places caused crashes when importing components in Node.js:

1. **`onDOMContentLoaded()`** in `util/index.js` — accesses `document.readyState` unconditionally.
2. **`isRTL()`** in `util/index.js` — accesses `document.documentElement.dir`.
3. **`enableDismissTrigger()`** in `util/component-functions.js` — calls `EventHandler.on(document, ...)`.

Each was fixed with an early-return `typeof document === 'undefined'` guard. The module-level `ComponentClass.init()` calls were also wrapped.

**Lesson:** Any function that touches `document` or `window` at call time (not just at definition time) must be guarded for non-browser environments.

### 5. `_isInitialized` flag prevents double-registration

If `init()` is called more than once (e.g. by a consumer who calls it explicitly after the module's auto-call), the same handler would be registered twice, causing double-firing. A simple static `_isInitialized = false` flag prevents this.

### 6. Auto-init should be browser-environment-gated at the module level

The original pattern called `EventHandler.on(document, ...)` unconditionally at module evaluation time. The fix moves the call into `init()` and guards the module-level auto-call:

```js
if (typeof document !== 'undefined') {
  ComponentClass.init()
}
```

This preserves backward compatibility in browser environments (auto-wiring still happens on import) while making the module safe to import in Node.js.

### 7. `extendDefaultConfig` returns an anonymous class — `NAME` is inherited

The subclass returned by `extendDefaultConfig` does not define its own `static get NAME()`, so it inherits the parent's. This is intentional: the component is still registered in Bootstrap's Data store under the same key, meaning `getOrCreateInstance` and dispose still work correctly on existing DOM elements.

### 8. `enableDismissTrigger` is external to the component lifecycle

Components that use `enableDismissTrigger` (Alert, Modal, Offcanvas) wire their dismiss listener outside the class, after the class definition. This listener is currently not managed by `init()` / `destroy()`. If a consumer needs to rewire dismiss behavior for a custom subclass, they should call `enableDismissTrigger(CustomComponent)` explicitly.
