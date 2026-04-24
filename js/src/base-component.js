/**
 * --------------------------------------------------------------------------
 * Bootstrap base-component.js
 * Licensed under MIT (https://github.com/twbs/bootstrap/blob/main/LICENSE)
 * --------------------------------------------------------------------------
 */

import Data from './dom/data.js'
import EventHandler from './dom/event-handler.js'
import Config from './util/config.js'
import { executeAfterTransition, getElement } from './util/index.js'

/**
 * Constants
 */

const VERSION = '5.3.8'

/**
 * Class definition
 */

class BaseComponent extends Config {
  constructor(element, config) {
    super()

    element = getElement(element)
    if (!element) {
      return
    }

    this._element = element
    this._config = this._getConfig(config)

    Data.set(this._element, this.constructor.DATA_KEY, this)
  }

  // Public
  dispose() {
    Data.remove(this._element, this.constructor.DATA_KEY)
    EventHandler.off(this._element, this.constructor.EVENT_KEY)

    for (const propertyName of Object.getOwnPropertyNames(this)) {
      this[propertyName] = null
    }
  }

  // Private
  _queueCallback(callback, element, isAnimated = true) {
    executeAfterTransition(callback, element, isAnimated)
  }

  _getConfig(config) {
    config = this._mergeConfigObj(config, this._element)
    config = this._configAfterMerge(config)
    this._typeCheckConfig(config)
    return config
  }

  // Static
  static getInstance(element) {
    return Data.get(getElement(element), this.DATA_KEY)
  }

  static getOrCreateInstance(element, config = {}) {
    return this.getInstance(element) || new this(element, typeof config === 'object' ? config : null)
  }

  static get VERSION() {
    return VERSION
  }

  static get DATA_KEY() {
    return `bs.${this.NAME}`
  }

  static get EVENT_KEY() {
    return `.${this.DATA_KEY}`
  }

  static eventName(name) {
    return `${name}${this.EVENT_KEY}`
  }

  // Config constants override support
  static getConfigConstants(overrides = {}) {
    return overrides
  }

  static get ConfigConstants() {
    return this.getConfigConstants()
  }

  static extendDefaultConfig(overrides = {}) {
    const parentClass = this

    // Helper to split flat overrides into Default, DefaultType, and ConfigConstants
    const splitOverrides = (flat = {}) => {
      const parentDefault = parentClass.Default || {}
      const parentDefaultType = parentClass.DefaultType || {}
      const parentConfigConstants = parentClass.ConfigConstants || {}

      const newDefault = {}
      const newDefaultType = {}
      const newConfigConstants = {}

      // Merge all parent values first
      Object.assign(newDefault, parentDefault)
      Object.assign(newDefaultType, parentDefaultType)
      Object.assign(newConfigConstants, parentConfigConstants)

      // Classify incoming overrides
      for (const [key, value] of Object.entries(flat)) {
        // If key exists in parent Default or DefaultType, it's an instance option
        if (key in parentDefault || key in parentDefaultType) {
          newDefault[key] = value
          // Infer type if not already in DefaultType
          if (!(key in parentDefaultType)) {
            const valueType = Array.isArray(value) ? 'array' : typeof value
            if (valueType === 'object') {
              newDefaultType[key] = '(null|object|function)'
            } else if (valueType === 'boolean') {
              newDefaultType[key] = '(boolean|string)'
            } else if (valueType === 'string') {
              newDefaultType[key] = 'string'
            } else {
              newDefaultType[key] = valueType
            }
          }
        } else {
          // Otherwise treat as structural constant
          newConfigConstants[key] = value
        }
      }

      return { newDefault, newDefaultType, newConfigConstants }
    }

    const { newDefault, newDefaultType, newConfigConstants } = splitOverrides(overrides)

    // Create a new subclass
    return class extends parentClass {
      static get Default() {
        return newDefault
      }

      static get DefaultType() {
        return newDefaultType
      }

      static get ConfigConstants() {
        return newConfigConstants
      }

      static getConfigConstants(furtherOverrides = {}) {
        // Support chaining: if someone calls getConfigConstants on the returned subclass
        const merged = { ...newConfigConstants, ...furtherOverrides }
        return merged
      }
    }
  }
}

export default BaseComponent
