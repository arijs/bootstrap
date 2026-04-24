/*!
  * Bootstrap alert.js v5.3.8 (https://getbootstrap.com/)
  * Copyright 2011-2026 The Bootstrap Authors (https://github.com/twbs/bootstrap/graphs/contributors)
  * Licensed under MIT (https://github.com/twbs/bootstrap/blob/main/LICENSE)
  */
(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory(require('./base-component.js'), require('./dom/event-handler.js'), require('./util/component-functions.js'), require('./util/index.js')) :
  typeof define === 'function' && define.amd ? define(['./base-component', './dom/event-handler', './util/component-functions', './util/index'], factory) :
  (global = typeof globalThis !== 'undefined' ? globalThis : global || self, global.Alert = factory(global.BaseComponent, global.EventHandler, global.ComponentFunctions, global.Index));
})(this, (function (BaseComponent, EventHandler, componentFunctions_js, index_js) { 'use strict';

  /**
   * --------------------------------------------------------------------------
   * Bootstrap alert.js
   * Licensed under MIT (https://github.com/twbs/bootstrap/blob/main/LICENSE)
   * --------------------------------------------------------------------------
   */


  /**
   * Constants
   */

  const NAME = 'alert';
  const DATA_KEY = 'bs.alert';
  const EVENT_KEY = `.${DATA_KEY}`;
  const EVENT_CLOSE = `close${EVENT_KEY}`;
  const EVENT_CLOSED = `closed${EVENT_KEY}`;
  const CLASS_NAME_FADE = 'fade';
  const CLASS_NAME_SHOW = 'show';

  /**
   * Class definition
   */

  class Alert extends BaseComponent {
    // Getters
    static get NAME() {
      return NAME;
    }
    static getConfigConstants(overrides = {}) {
      const defaults = {
        EVENT_CLOSE,
        EVENT_CLOSED,
        CLASS_NAME_FADE,
        CLASS_NAME_SHOW
      };
      return {
        ...defaults,
        ...overrides
      };
    }
    static get ConfigConstants() {
      return this.getConfigConstants();
    }

    // Static

    static init() {
      if (this._isInitialized) {
        return;
      }

      /**
       * Data API implementation
       */
      this._disposeDismissTrigger = componentFunctions_js.enableDismissTrigger(this, 'close');
      this._isInitialized = true;
    }
    static destroy() {
      if (!this._isInitialized) {
        return;
      }
      this._disposeDismissTrigger();
      this._disposeDismissTrigger = null;
      this._isInitialized = false;
    }

    // Public
    close() {
      const {
        EVENT_CLOSE,
        CLASS_NAME_SHOW,
        CLASS_NAME_FADE,
        EVENT_CLOSED
      } = this.constructor.ConfigConstants;
      const closeEvent = EventHandler.trigger(this._element, EVENT_CLOSE);
      if (closeEvent.defaultPrevented) {
        return;
      }
      this._element.classList.remove(CLASS_NAME_SHOW);
      const isAnimated = this._element.classList.contains(CLASS_NAME_FADE);
      this._queueCallback(() => this._destroyElement(EVENT_CLOSED), this._element, isAnimated);
    }

    // Private
    _destroyElement(eventClosed) {
      this._element.remove();
      EventHandler.trigger(this._element, eventClosed);
      this.dispose();
    }

    // Static
    static jQueryInterface(config) {
      return this.each(function () {
        const data = Alert.getOrCreateInstance(this);
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
  Alert._isInitialized = false;
  if (typeof document !== 'undefined') {
    Alert.init();
  }

  /**
   * jQuery
   */
  index_js.defineJQueryPlugin(Alert);

  return Alert;

}));
//# sourceMappingURL=alert.js.map
