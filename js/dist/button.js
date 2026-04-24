/*!
  * Bootstrap button.js v5.3.8 (https://getbootstrap.com/)
  * Copyright 2011-2026 The Bootstrap Authors (https://github.com/twbs/bootstrap/graphs/contributors)
  * Licensed under MIT (https://github.com/twbs/bootstrap/blob/main/LICENSE)
  */
(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory(require('./base-component.js'), require('./dom/event-handler.js'), require('./util/index.js')) :
  typeof define === 'function' && define.amd ? define(['./base-component', './dom/event-handler', './util/index'], factory) :
  (global = typeof globalThis !== 'undefined' ? globalThis : global || self, global.Button = factory(global.BaseComponent, global.EventHandler, global.Index));
})(this, (function (BaseComponent, EventHandler, index_js) { 'use strict';

  /**
   * --------------------------------------------------------------------------
   * Bootstrap button.js
   * Licensed under MIT (https://github.com/twbs/bootstrap/blob/main/LICENSE)
   * --------------------------------------------------------------------------
   */


  /**
   * Constants
   */

  const NAME = 'button';

  /**
   * Class definition
   */

  class Button extends BaseComponent {
    // Getters
    static get NAME() {
      return NAME;
    }
    static getConfigConstants(overrides = {}) {
      const defaults = {
        CLASS_NAME_ACTIVE: 'active',
        SELECTOR_DATA_TOGGLE: '[data-bs-toggle="button"]',
        DATA_API_KEY: '.data-api'
      };
      return {
        ...defaults,
        ...overrides
      };
    }
    static get ConfigConstants() {
      return this.getConfigConstants();
    }

    // Public
    toggle() {
      const {
        CLASS_NAME_ACTIVE
      } = this.constructor.ConfigConstants;
      this._element.setAttribute('aria-pressed', this._element.classList.toggle(CLASS_NAME_ACTIVE));
    }

    // Static
    static jQueryInterface(config) {
      return this.each(function () {
        const data = Button.getOrCreateInstance(this);
        if (config === 'toggle') {
          data[config]();
        }
      });
    }
    static init() {
      if (this._isInitialized) {
        return;
      }
      const {
        SELECTOR_DATA_TOGGLE,
        DATA_API_KEY
      } = this.ConfigConstants;
      const EVENT_CLICK_DATA_API = `click${this.EVENT_KEY}${DATA_API_KEY}`;
      this._clickHandler = event => {
        event.preventDefault();
        const button = event.target.closest(SELECTOR_DATA_TOGGLE);
        const data = this.getOrCreateInstance(button);
        data.toggle();
      };
      EventHandler.on(document, EVENT_CLICK_DATA_API, SELECTOR_DATA_TOGGLE, this._clickHandler);
      index_js.defineJQueryPlugin(this);
      this._isInitialized = true;
    }
    static destroy() {
      if (!this._isInitialized) {
        return;
      }
      const {
        SELECTOR_DATA_TOGGLE,
        DATA_API_KEY
      } = this.ConfigConstants;
      const EVENT_CLICK_DATA_API = `click${this.EVENT_KEY}${DATA_API_KEY}`;
      EventHandler.off(document, EVENT_CLICK_DATA_API, SELECTOR_DATA_TOGGLE, this._clickHandler);
      this._clickHandler = null;
      this._isInitialized = false;
    }
  }

  /**
   * Init on import (browser only)
   */
  Button._isInitialized = false;
  Button._clickHandler = null;
  if (typeof document !== 'undefined') {
    Button.init();
  }

  return Button;

}));
//# sourceMappingURL=button.js.map
