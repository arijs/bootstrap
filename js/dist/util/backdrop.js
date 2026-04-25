/*!
  * Bootstrap backdrop.js v5.3.8 (https://getbootstrap.com/)
  * Copyright 2011-2026 The Bootstrap Authors (https://github.com/twbs/bootstrap/graphs/contributors)
  * Licensed under MIT (https://github.com/twbs/bootstrap/blob/main/LICENSE)
  */
(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory(require('../dom/event-handler.js'), require('../base-component.js'), require('./config.js'), require('./index.js')) :
  typeof define === 'function' && define.amd ? define(['../dom/event-handler', '../base-component', './config', './index'], factory) :
  (global = typeof globalThis !== 'undefined' ? globalThis : global || self, global.Backdrop = factory(global.EventHandler, global.BaseComponent, global.Config, global.Index));
})(this, (function (EventHandler, BaseComponent, Config, index_js) { 'use strict';

  /**
   * --------------------------------------------------------------------------
   * Bootstrap util/backdrop.js
   * Licensed under MIT (https://github.com/twbs/bootstrap/blob/main/LICENSE)
   * --------------------------------------------------------------------------
   */


  /**
   * Constants
   */

  const NAME = 'backdrop';
  const Default = {
    className: 'modal-backdrop',
    clickCallback: null,
    isAnimated: false,
    isVisible: true,
    // if false, we use the backdrop helper without adding any element to the dom
    rootElement: 'body' // give the choice to place backdrop under different elements
  };
  const DefaultType = {
    className: 'string',
    clickCallback: '(function|null)',
    isAnimated: 'boolean',
    isVisible: 'boolean',
    rootElement: '(element|string)'
  };

  /**
   * Class definition
   */

  class Backdrop extends Config {
    constructor(config) {
      super();
      this._config = this._getConfig(config);
      this._isAppended = false;
      this._element = null;
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
      var _values$EVENT_MOUSEDO;
      const values = {
        CLASS_NAME_FADE: 'fade',
        CLASS_NAME_SHOW: 'show',
        EVENT_MOUSEDOWN: undefined,
        ...overrides
      };
      (_values$EVENT_MOUSEDO = values.EVENT_MOUSEDOWN) != null ? _values$EVENT_MOUSEDO : values.EVENT_MOUSEDOWN = `mousedown.bs.${NAME}`;
      return values;
    }
    static get ConfigConstants() {
      return this.getConfigConstants();
    }
    static extendDefaultConfig(overrides = {}) {
      return BaseComponent.extendDefaultConfig.call(this, overrides);
    }

    // Public
    show(callback) {
      const {
        CLASS_NAME_SHOW
      } = this.constructor.ConfigConstants;
      if (!this._config.isVisible) {
        index_js.execute(callback);
        return;
      }
      this._append();
      const element = this._getElement();
      if (this._config.isAnimated) {
        index_js.reflow(element);
      }
      element.classList.add(CLASS_NAME_SHOW);
      this._emulateAnimation(() => {
        index_js.execute(callback);
      });
    }
    hide(callback) {
      const {
        CLASS_NAME_SHOW
      } = this.constructor.ConfigConstants;
      if (!this._config.isVisible) {
        index_js.execute(callback);
        return;
      }
      this._getElement().classList.remove(CLASS_NAME_SHOW);
      this._emulateAnimation(() => {
        this.dispose();
        index_js.execute(callback);
      });
    }
    dispose() {
      const {
        EVENT_MOUSEDOWN
      } = this.constructor.ConfigConstants;
      if (!this._isAppended) {
        return;
      }
      EventHandler.off(this._element, EVENT_MOUSEDOWN);
      this._element.remove();
      this._isAppended = false;
    }

    // Private
    _getElement() {
      const {
        CLASS_NAME_FADE
      } = this.constructor.ConfigConstants;
      if (!this._element) {
        const backdrop = document.createElement('div');
        backdrop.className = this._config.className;
        if (this._config.isAnimated) {
          backdrop.classList.add(CLASS_NAME_FADE);
        }
        this._element = backdrop;
      }
      return this._element;
    }
    _configAfterMerge(config) {
      // use getElement() with the default "body" to get a fresh Element on each instantiation
      config.rootElement = index_js.getElement(config.rootElement);
      return config;
    }
    _append() {
      const {
        EVENT_MOUSEDOWN
      } = this.constructor.ConfigConstants;
      if (this._isAppended) {
        return;
      }
      const element = this._getElement();
      this._config.rootElement.append(element);
      EventHandler.on(element, EVENT_MOUSEDOWN, () => {
        index_js.execute(this._config.clickCallback);
      });
      this._isAppended = true;
    }
    _emulateAnimation(callback) {
      index_js.executeAfterTransition(callback, this._getElement(), this._config.isAnimated);
    }
  }

  return Backdrop;

}));
//# sourceMappingURL=backdrop.js.map
