/**
 * --------------------------------------------------------------------------
 * Bootstrap toast.js
 * Licensed under MIT (https://github.com/twbs/bootstrap/blob/main/LICENSE)
 * --------------------------------------------------------------------------
 */

import BaseComponent from './base-component.js'
import EventHandler from './dom/event-handler.js'
import { enableDismissTrigger } from './util/component-functions.js'
import { defineJQueryPlugin, reflow } from './util/index.js'

/**
 * Constants
 */

const NAME = 'toast'
const DATA_KEY = 'bs.toast'
const EVENT_KEY = `.${DATA_KEY}`

const EVENT_MOUSEOVER = `mouseover${EVENT_KEY}`
const EVENT_MOUSEOUT = `mouseout${EVENT_KEY}`
const EVENT_FOCUSIN = `focusin${EVENT_KEY}`
const EVENT_FOCUSOUT = `focusout${EVENT_KEY}`
const EVENT_HIDE = `hide${EVENT_KEY}`
const EVENT_HIDDEN = `hidden${EVENT_KEY}`
const EVENT_SHOW = `show${EVENT_KEY}`
const EVENT_SHOWN = `shown${EVENT_KEY}`

const CLASS_NAME_FADE = 'fade'
const CLASS_NAME_HIDE = 'hide' // @deprecated - kept here only for backwards compatibility
const CLASS_NAME_SHOW = 'show'
const CLASS_NAME_SHOWING = 'showing'

const DefaultType = {
  animation: 'boolean',
  autohide: 'boolean',
  delay: 'number'
}

const Default = {
  animation: true,
  autohide: true,
  delay: 5000
}

/**
 * Class definition
 */

class Toast extends BaseComponent {
  constructor(element, config) {
    super(element, config)

    this._timeout = null
    this._hasMouseInteraction = false
    this._hasKeyboardInteraction = false
    this._setListeners()
  }

  // Getters
  static get Default() {
    return Default
  }

  static get DefaultType() {
    return DefaultType
  }

  static get NAME() {
    return NAME
  }

  static getConfigConstants(overrides = {}) {
    const defaults = {
      EVENT_MOUSEOVER,
      EVENT_MOUSEOUT,
      EVENT_FOCUSIN,
      EVENT_FOCUSOUT,
      EVENT_HIDE,
      EVENT_HIDDEN,
      EVENT_SHOW,
      EVENT_SHOWN,
      CLASS_NAME_FADE,
      CLASS_NAME_HIDE,
      CLASS_NAME_SHOW,
      CLASS_NAME_SHOWING
    }

    return { ...defaults, ...overrides }
  }

  static get ConfigConstants() {
    return this.getConfigConstants()
  }

  // Public
  show() {
    const {
      EVENT_SHOW,
      CLASS_NAME_FADE,
      CLASS_NAME_SHOWING,
      EVENT_SHOWN,
      CLASS_NAME_HIDE,
      CLASS_NAME_SHOW
    } = this.constructor.ConfigConstants

    const showEvent = EventHandler.trigger(this._element, EVENT_SHOW)

    if (showEvent.defaultPrevented) {
      return
    }

    this._clearTimeout()

    if (this._config.animation) {
      this._element.classList.add(CLASS_NAME_FADE)
    }

    const complete = () => {
      this._element.classList.remove(CLASS_NAME_SHOWING)
      EventHandler.trigger(this._element, EVENT_SHOWN)

      this._maybeScheduleHide()
    }

    this._element.classList.remove(CLASS_NAME_HIDE) // @deprecated
    reflow(this._element)
    this._element.classList.add(CLASS_NAME_SHOW, CLASS_NAME_SHOWING)

    this._queueCallback(complete, this._element, this._config.animation)
  }

  hide() {
    const {
      EVENT_HIDE,
      CLASS_NAME_HIDE,
      CLASS_NAME_SHOWING,
      CLASS_NAME_SHOW,
      EVENT_HIDDEN
    } = this.constructor.ConfigConstants

    if (!this.isShown()) {
      return
    }

    const hideEvent = EventHandler.trigger(this._element, EVENT_HIDE)

    if (hideEvent.defaultPrevented) {
      return
    }

    const complete = () => {
      this._element.classList.add(CLASS_NAME_HIDE) // @deprecated
      this._element.classList.remove(CLASS_NAME_SHOWING, CLASS_NAME_SHOW)
      EventHandler.trigger(this._element, EVENT_HIDDEN)
    }

    this._element.classList.add(CLASS_NAME_SHOWING)
    this._queueCallback(complete, this._element, this._config.animation)
  }

  dispose() {
    const { CLASS_NAME_SHOW } = this.constructor.ConfigConstants

    this._clearTimeout()

    if (this.isShown()) {
      this._element.classList.remove(CLASS_NAME_SHOW)
    }

    super.dispose()
  }

  isShown() {
    const { CLASS_NAME_SHOW } = this.constructor.ConfigConstants
    return this._element.classList.contains(CLASS_NAME_SHOW)
  }

  // Private
  _maybeScheduleHide() {
    if (!this._config.autohide) {
      return
    }

    if (this._hasMouseInteraction || this._hasKeyboardInteraction) {
      return
    }

    this._timeout = setTimeout(() => {
      this.hide()
    }, this._config.delay)
  }

  _onInteraction(event, isInteracting) {
    const {
      EVENT_MOUSEOVER,
      EVENT_MOUSEOUT,
      EVENT_FOCUSIN,
      EVENT_FOCUSOUT
    } = this.constructor.ConfigConstants
    const typeMouseOver = EVENT_MOUSEOVER.split('.')[0]
    const typeMouseOut = EVENT_MOUSEOUT.split('.')[0]
    const typeFocusIn = EVENT_FOCUSIN.split('.')[0]
    const typeFocusOut = EVENT_FOCUSOUT.split('.')[0]

    switch (event.type) {
      case typeMouseOver:
      case typeMouseOut: {
        this._hasMouseInteraction = isInteracting
        break
      }

      case typeFocusIn:
      case typeFocusOut: {
        this._hasKeyboardInteraction = isInteracting
        break
      }

      default: {
        break
      }
    }

    if (isInteracting) {
      this._clearTimeout()
      return
    }

    const nextElement = event.relatedTarget
    if (this._element === nextElement || this._element.contains(nextElement)) {
      return
    }

    this._maybeScheduleHide()
  }

  _setListeners() {
    const { EVENT_MOUSEOVER, EVENT_MOUSEOUT, EVENT_FOCUSIN, EVENT_FOCUSOUT } = this.constructor.ConfigConstants

    EventHandler.on(this._element, EVENT_MOUSEOVER, event => this._onInteraction(event, true))
    EventHandler.on(this._element, EVENT_MOUSEOUT, event => this._onInteraction(event, false))
    EventHandler.on(this._element, EVENT_FOCUSIN, event => this._onInteraction(event, true))
    EventHandler.on(this._element, EVENT_FOCUSOUT, event => this._onInteraction(event, false))
  }

  _clearTimeout() {
    clearTimeout(this._timeout)
    this._timeout = null
  }

  // Static
  static jQueryInterface(config) {
    return this.each(function () {
      const data = Toast.getOrCreateInstance(this, config)

      if (typeof config === 'string') {
        if (typeof data[config] === 'undefined') {
          throw new TypeError(`No method named "${config}"`)
        }

        data[config](this)
      }
    })
  }
}

/**
 * Data API implementation
 */

enableDismissTrigger(Toast)

/**
 * jQuery
 */

defineJQueryPlugin(Toast)

export default Toast
