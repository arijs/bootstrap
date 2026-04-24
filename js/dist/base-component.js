/*!
  * Bootstrap base-component.js v5.3.8 (https://getbootstrap.com/)
  * Copyright 2011-2026 The Bootstrap Authors (https://github.com/twbs/bootstrap/graphs/contributors)
  * Licensed under MIT (https://github.com/twbs/bootstrap/blob/main/LICENSE)
  */
(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory(require('./dom/data.js'), require('./dom/event-handler.js'), require('./util/config.js'), require('./util/index.js')) :
  typeof define === 'function' && define.amd ? define(['./dom/data', './dom/event-handler', './util/config', './util/index'], factory) :
  (global = typeof globalThis !== 'undefined' ? globalThis : global || self, global.BaseComponent = factory(global.Data, global.EventHandler, global.Config, global.Index));
})(this, (function (Data, EventHandler, Config, index_js) { 'use strict';

  /**
   * --------------------------------------------------------------------------
   * Bootstrap base-component.js
   * Licensed under MIT (https://github.com/twbs/bootstrap/blob/main/LICENSE)
   * --------------------------------------------------------------------------
   */


  /**
   * Constants
   */

  const VERSION = '5.3.8';

  /**
   * Class definition
   */

  class BaseComponent extends Config {
    constructor(element, config) {
      super();
      element = index_js.getElement(element);
      if (!element) {
        return;
      }
      this._element = element;
      this._config = this._getConfig(config);
      Data.set(this._element, this.constructor.DATA_KEY, this);
    }

    // Public
    dispose() {
      Data.remove(this._element, this.constructor.DATA_KEY);
      EventHandler.off(this._element, this.constructor.EVENT_KEY);
      for (const propertyName of Object.getOwnPropertyNames(this)) {
        this[propertyName] = null;
      }
    }

    // Private
    _queueCallback(callback, element, isAnimated = true) {
      index_js.executeAfterTransition(callback, element, isAnimated);
    }
    _getConfig(config) {
      config = this._mergeConfigObj(config, this._element);
      config = this._configAfterMerge(config);
      this._typeCheckConfig(config);
      return config;
    }

    // Static
    static getInstance(element) {
      return Data.get(index_js.getElement(element), this.DATA_KEY);
    }
    static getOrCreateInstance(element, config = {}) {
      return this.getInstance(element) || new this(element, typeof config === 'object' ? config : null);
    }
    static get VERSION() {
      return VERSION;
    }
    static get DATA_KEY() {
      return `bs.${this.NAME}`;
    }
    static get EVENT_KEY() {
      return `.${this.DATA_KEY}`;
    }
    static eventName(name) {
      return `${name}${this.EVENT_KEY}`;
    }

    // Config constants override support
    static getConfigConstants(overrides = {}) {
      return overrides;
    }
    static get ConfigConstants() {
      return this.getConfigConstants();
    }
    static extendDefaultConfig(overrides = {}) {
      const parentClass = this;

      // Helper to split flat overrides into Default, DefaultType, and ConfigConstants
      const splitOverrides = flat => {
        const parentDefault = parentClass.Default || {};
        const parentDefaultType = parentClass.DefaultType || {};
        const configConstantOverrides = {};
        const newDefault = {};
        const newDefaultType = {};

        // Merge all parent values first
        Object.assign(newDefault, parentDefault);
        Object.assign(newDefaultType, parentDefaultType);

        // Classify incoming overrides
        for (const [key, value] of Object.entries(flat)) {
          // If key exists in parent Default or DefaultType, it's an instance option
          if (key in parentDefault || key in parentDefaultType) {
            newDefault[key] = value;
            // Infer type if not already in DefaultType
            if (!(key in parentDefaultType)) {
              const valueType = Array.isArray(value) ? 'array' : typeof value;
              if (valueType === 'object') {
                newDefaultType[key] = '(null|object|function)';
              } else if (valueType === 'boolean') {
                newDefaultType[key] = '(boolean|string)';
              } else if (valueType === 'string') {
                newDefaultType[key] = 'string';
              } else {
                newDefaultType[key] = valueType;
              }
            }
          } else {
            // Otherwise treat as structural constant
            configConstantOverrides[key] = value;
          }
        }

        // Recompute structural constants from parent class logic so derived values
        // (e.g. selectors composed from class-name constants) stay in sync.
        const newConfigConstants = typeof parentClass.getConfigConstants === 'function' ? parentClass.getConfigConstants(configConstantOverrides) : {
          ...(parentClass.ConfigConstants || {}),
          ...configConstantOverrides
        };
        return {
          newDefault,
          newDefaultType,
          newConfigConstants
        };
      };
      const {
        newDefault,
        newDefaultType,
        newConfigConstants
      } = splitOverrides(overrides);

      // Create a new subclass
      return class extends parentClass {
        static get Default() {
          return newDefault;
        }
        static get DefaultType() {
          return newDefaultType;
        }
        static get ConfigConstants() {
          return newConfigConstants;
        }
        static getConfigConstants(furtherOverrides = {}) {
          // Support chaining: if someone calls getConfigConstants on the returned subclass
          const merged = {
            ...newConfigConstants,
            ...furtherOverrides
          };
          return merged;
        }
      };
    }
  }

  return BaseComponent;

}));
//# sourceMappingURL=base-component.js.map
