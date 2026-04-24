/**
 * --------------------------------------------------------------------------
 * Bootstrap alert.js
 * Licensed under MIT (https://github.com/twbs/bootstrap/blob/main/LICENSE)
 * --------------------------------------------------------------------------
 */

import BaseComponent from './base-component.js'
import EventHandler from './dom/event-handler.js'
import { enableDismissTrigger } from './util/component-functions.js'
import { defineJQueryPlugin } from './util/index.js'

/**
 * Constants
 */

const NAME = 'alert'
const DATA_KEY = 'bs.alert'
const EVENT_KEY = `.${DATA_KEY}`

const EVENT_CLOSE = `close${EVENT_KEY}`
const EVENT_CLOSED = `closed${EVENT_KEY}`
const CLASS_NAME_FADE = 'fade'
const CLASS_NAME_SHOW = 'show'

/**
 * Class definition
 */

class Alert extends BaseComponent {
  // Getters
  static get NAME() {
    return NAME
  }

  static getConfigConstants(overrides = {}) {
    const defaults = {
      EVENT_CLOSE,
      EVENT_CLOSED,
      CLASS_NAME_FADE,
      CLASS_NAME_SHOW
    }
    return { ...defaults, ...overrides }
  }

  static get ConfigConstants() {
    return this.getConfigConstants()
  }

  // Static
  static _isInitialized = false

  static init() {
    if (this._isInitialized) {
      return
    }

    /**
     * Data API implementation
     */
    this._disposeDismissTrigger = enableDismissTrigger(this, 'close')

    this._isInitialized = true
  }

  static destroy() {
    if (!this._isInitialized) {
      return
    }

    this._disposeDismissTrigger()
    this._disposeDismissTrigger = null

    this._isInitialized = false
  }

  // Public
  close() {
    const { EVENT_CLOSE, CLASS_NAME_SHOW, CLASS_NAME_FADE, EVENT_CLOSED } = this.constructor.ConfigConstants
    const closeEvent = EventHandler.trigger(this._element, EVENT_CLOSE)

    if (closeEvent.defaultPrevented) {
      return
    }

    this._element.classList.remove(CLASS_NAME_SHOW)

    const isAnimated = this._element.classList.contains(CLASS_NAME_FADE)
    this._queueCallback(() => this._destroyElement(EVENT_CLOSED), this._element, isAnimated)
  }

  // Private
  _destroyElement(eventClosed) {
    this._element.remove()
    EventHandler.trigger(this._element, eventClosed)
    this.dispose()
  }

  // Static
  static jQueryInterface(config) {
    return this.each(function () {
      const data = Alert.getOrCreateInstance(this)

      if (typeof config !== 'string') {
        return
      }

      if (data[config] === undefined || config.startsWith('_') || config === 'constructor') {
        throw new TypeError(`No method named "${config}"`)
      }

      data[config](this)
    })
  }
}

if (typeof document !== 'undefined') {
  Alert.init()
}

/**
 * jQuery
 */
defineJQueryPlugin(Alert)

export default Alert
