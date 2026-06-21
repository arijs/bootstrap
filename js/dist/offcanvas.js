/*!
  * Bootstrap offcanvas.js v5.3.8 (https://getbootstrap.com/)
  * Copyright 2011-2026 The Bootstrap Authors (https://github.com/twbs/bootstrap/graphs/contributors)
  * Licensed under MIT (https://github.com/twbs/bootstrap/blob/main/LICENSE)
  */
(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory(require('./base-component.js'), require('./dom/event-handler.js'), require('./dom/selector-engine.js'), require('./util/backdrop.js'), require('./util/component-functions.js'), require('./util/focustrap.js'), require('./util/index.js'), require('./util/scrollbar.js')) :
  typeof define === 'function' && define.amd ? define(['./base-component', './dom/event-handler', './dom/selector-engine', './util/backdrop', './util/component-functions', './util/focustrap', './util/index', './util/scrollbar'], factory) :
  (global = typeof globalThis !== 'undefined' ? globalThis : global || self, global.Offcanvas = factory(global.BaseComponent, global.EventHandler, global.SelectorEngine, global.Backdrop, global.ComponentFunctions, global.Focustrap, global.Index, global.Scrollbar));
})(this, (function (BaseComponent, EventHandler, SelectorEngine, Backdrop, componentFunctions_js, FocusTrap, index_js, ScrollBarHelper) { 'use strict';

  /**
   * --------------------------------------------------------------------------
   * Bootstrap offcanvas.js
   * Licensed under MIT (https://github.com/twbs/bootstrap/blob/main/LICENSE)
   * --------------------------------------------------------------------------
   */


  /**
   * Constants
   */

  const NAME = 'offcanvas';
  const DATA_KEY = 'bs.offcanvas';
  const EVENT_KEY = `.${DATA_KEY}`;
  const Default = {
    backdrop: true,
    keyboard: true,
    scroll: false
  };
  const DefaultType = {
    backdrop: '(boolean|string)',
    keyboard: 'boolean',
    scroll: 'boolean'
  };

  /**
   * Class definition
   */

  class Offcanvas extends BaseComponent {
    constructor(element, config) {
      super(element, config);
      this._isShown = false;
      this._backdrop = this._initializeBackDrop();
      this._focustrap = this._initializeFocusTrap();
      this._addEventListeners();
    }

    // Getters
    static get Default() {
      return Default;
    }
    static get DefaultType() {
      return DefaultType;
    }
    static get NAME() {
      return NAME;
    }
    static getConfigConstants(overrides = {}) {
      var _values$DATA_API_KEY, _values$EVENT_LOAD_DA, _values$EVENT_CLICK_D;
      const values = {
        ESCAPE_KEY: 'Escape',
        EVENT_SHOW: `show${EVENT_KEY}`,
        EVENT_SHOWN: `shown${EVENT_KEY}`,
        EVENT_HIDE: `hide${EVENT_KEY}`,
        EVENT_HIDE_PREVENTED: `hidePrevented${EVENT_KEY}`,
        EVENT_HIDDEN: `hidden${EVENT_KEY}`,
        EVENT_RESIZE: `resize${EVENT_KEY}`,
        EVENT_KEYDOWN_DISMISS: `keydown.dismiss${EVENT_KEY}`,
        EVENT_LOAD_DATA_API: undefined,
        EVENT_CLICK_DATA_API: undefined,
        CLASS_NAME_SHOW: 'show',
        CLASS_NAME_SHOWING: 'showing',
        CLASS_NAME_HIDING: 'hiding',
        CLASS_NAME_BACKDROP: 'offcanvas-backdrop',
        OPEN_SELECTOR: '.offcanvas.show',
        SELECTOR_DATA_TOGGLE: `[data-bs-toggle="${NAME}"]`,
        // Responsive offcanvases (e.g. `.offcanvas-lg`) auto-hide when they stop
        // being position:fixed. Exposed so the VE adapter can match hashed classes.
        SELECTOR_RESPONSIVE_SHOWN: '[aria-modal][class*=show][class*=offcanvas-]',
        DATA_API_KEY: undefined,
        BackdropClass: Backdrop,
        ...overrides
      };
      (_values$DATA_API_KEY = values.DATA_API_KEY) != null ? _values$DATA_API_KEY : values.DATA_API_KEY = '.data-api';
      (_values$EVENT_LOAD_DA = values.EVENT_LOAD_DATA_API) != null ? _values$EVENT_LOAD_DA : values.EVENT_LOAD_DATA_API = `load${EVENT_KEY}${values.DATA_API_KEY}`;
      (_values$EVENT_CLICK_D = values.EVENT_CLICK_DATA_API) != null ? _values$EVENT_CLICK_D : values.EVENT_CLICK_DATA_API = `click${EVENT_KEY}${values.DATA_API_KEY}`;
      return values;
    }

    // Public
    toggle(relatedTarget) {
      return this._isShown ? this.hide() : this.show(relatedTarget);
    }
    show(relatedTarget) {
      if (this._isShown) {
        return;
      }
      const {
        EVENT_SHOW,
        EVENT_SHOWN,
        CLASS_NAME_SHOW,
        CLASS_NAME_SHOWING
      } = this.constructor.ConfigConstants;
      const showEvent = EventHandler.trigger(this._element, EVENT_SHOW, {
        relatedTarget
      });
      if (showEvent.defaultPrevented) {
        return;
      }
      this._isShown = true;
      this._backdrop.show();
      if (!this._config.scroll) {
        new ScrollBarHelper().hide();
      }
      this._element.setAttribute('aria-modal', true);
      this._element.setAttribute('role', 'dialog');
      this._element.classList.add(CLASS_NAME_SHOWING);
      const completeCallBack = () => {
        if (!this._config.scroll || this._config.backdrop) {
          this._focustrap.activate();
        }
        this._element.classList.add(CLASS_NAME_SHOW);
        this._element.classList.remove(CLASS_NAME_SHOWING);
        EventHandler.trigger(this._element, EVENT_SHOWN, {
          relatedTarget
        });
      };
      this._queueCallback(completeCallBack, this._element, true);
    }
    hide() {
      if (!this._isShown) {
        return;
      }
      const {
        EVENT_HIDE,
        EVENT_HIDDEN,
        CLASS_NAME_SHOW,
        CLASS_NAME_HIDING
      } = this.constructor.ConfigConstants;
      const hideEvent = EventHandler.trigger(this._element, EVENT_HIDE);
      if (hideEvent.defaultPrevented) {
        return;
      }
      this._focustrap.deactivate();
      this._element.blur();
      this._isShown = false;
      this._element.classList.add(CLASS_NAME_HIDING);
      this._backdrop.hide();
      const completeCallback = () => {
        this._element.classList.remove(CLASS_NAME_SHOW, CLASS_NAME_HIDING);
        this._element.removeAttribute('aria-modal');
        this._element.removeAttribute('role');
        if (!this._config.scroll) {
          new ScrollBarHelper().reset();
        }
        EventHandler.trigger(this._element, EVENT_HIDDEN);
      };
      this._queueCallback(completeCallback, this._element, true);
    }
    dispose() {
      this._backdrop.dispose();
      this._focustrap.deactivate();
      super.dispose();
    }

    // Private
    _initializeBackDrop() {
      const {
        EVENT_HIDE_PREVENTED,
        CLASS_NAME_BACKDROP,
        BackdropClass
      } = this.constructor.ConfigConstants;
      const clickCallback = () => {
        if (this._config.backdrop === 'static') {
          EventHandler.trigger(this._element, EVENT_HIDE_PREVENTED);
          return;
        }
        this.hide();
      };

      // 'static' option will be translated to true, and booleans will keep their value
      const isVisible = Boolean(this._config.backdrop);
      return new BackdropClass({
        className: CLASS_NAME_BACKDROP,
        isVisible,
        isAnimated: true,
        rootElement: this._element.parentNode,
        clickCallback: isVisible ? clickCallback : null
      });
    }
    _initializeFocusTrap() {
      return new FocusTrap({
        trapElement: this._element
      });
    }
    _addEventListeners() {
      const {
        EVENT_KEYDOWN_DISMISS,
        ESCAPE_KEY,
        EVENT_HIDE_PREVENTED
      } = this.constructor.ConfigConstants;
      EventHandler.on(this._element, EVENT_KEYDOWN_DISMISS, event => {
        if (event.key !== ESCAPE_KEY) {
          return;
        }
        if (this._config.keyboard) {
          this.hide();
          return;
        }
        EventHandler.trigger(this._element, EVENT_HIDE_PREVENTED);
      });
    }

    // Static

    static init() {
      if (this._isInitialized) {
        return;
      }
      if (typeof document === 'undefined') {
        return;
      }
      const Class = this;
      const {
        EVENT_CLICK_DATA_API,
        EVENT_LOAD_DATA_API,
        EVENT_RESIZE,
        SELECTOR_DATA_TOGGLE,
        OPEN_SELECTOR,
        EVENT_HIDDEN,
        SELECTOR_RESPONSIVE_SHOWN
      } = Class.ConfigConstants;
      this._clickHandler = function (event) {
        const target = SelectorEngine.getElementFromSelector(this);
        if (['A', 'AREA'].includes(this.tagName)) {
          event.preventDefault();
        }
        if (index_js.isDisabled(this)) {
          return;
        }
        EventHandler.one(target, EVENT_HIDDEN, () => {
          // focus on trigger when it is closed
          if (index_js.isVisible(this)) {
            this.focus();
          }
        });

        // avoid conflict when clicking a toggler of an offcanvas, while another is open
        const alreadyOpen = SelectorEngine.findOne(OPEN_SELECTOR);
        if (alreadyOpen && alreadyOpen !== target) {
          Class.getInstance(alreadyOpen).hide();
        }
        const data = Class.getOrCreateInstance(target);
        data.toggle(this);
      };
      this._loadHandler = () => {
        for (const selector of SelectorEngine.find(OPEN_SELECTOR)) {
          Class.getOrCreateInstance(selector).show();
        }
      };
      this._resizeHandler = () => {
        for (const element of SelectorEngine.find(SELECTOR_RESPONSIVE_SHOWN)) {
          if (getComputedStyle(element).position !== 'fixed') {
            Class.getOrCreateInstance(element).hide();
          }
        }
      };
      EventHandler.on(document, EVENT_CLICK_DATA_API, SELECTOR_DATA_TOGGLE, this._clickHandler);
      EventHandler.on(window, EVENT_LOAD_DATA_API, this._loadHandler);
      EventHandler.on(window, EVENT_RESIZE, this._resizeHandler);
      this._disposeDismissTrigger = componentFunctions_js.enableDismissTrigger(Class);
      this._isInitialized = true;
    }
    static destroy() {
      if (!this._isInitialized) {
        return;
      }
      const {
        EVENT_CLICK_DATA_API,
        EVENT_LOAD_DATA_API,
        EVENT_RESIZE,
        SELECTOR_DATA_TOGGLE
      } = this.ConfigConstants;
      EventHandler.off(document, EVENT_CLICK_DATA_API, SELECTOR_DATA_TOGGLE, this._clickHandler);
      EventHandler.off(window, EVENT_LOAD_DATA_API, this._loadHandler);
      EventHandler.off(window, EVENT_RESIZE, this._resizeHandler);
      this._disposeDismissTrigger();
      this._disposeDismissTrigger = null;
      this._isInitialized = false;
    }
    static jQueryInterface(config) {
      return this.each(function () {
        const data = Offcanvas.getOrCreateInstance(this, config);
        if (typeof config !== 'string') {
          return;
        }
        if (data[config] === undefined || config.startsWith('_') || config === 'constructor') {
          throw new TypeError(`No method named "${config}"`);
        }
        data[config](this);
      });
    }
  }

  /**
   * Data API implementation
   */
  Offcanvas._isInitialized = false;
  Offcanvas._clickHandler = null;
  Offcanvas._loadHandler = null;
  Offcanvas._resizeHandler = null;
  Offcanvas._disposeDismissTrigger = null;
  if (typeof document !== 'undefined') {
    Offcanvas.init();
  }

  /**
   * jQuery
   */

  index_js.defineJQueryPlugin(Offcanvas);

  return Offcanvas;

}));
//# sourceMappingURL=offcanvas.js.map
