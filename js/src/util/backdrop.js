/**
 * --------------------------------------------------------------------------
 * Bootstrap util/backdrop.js
 * Licensed under MIT (https://github.com/twbs/bootstrap/blob/main/LICENSE)
 * --------------------------------------------------------------------------
 */

import EventHandler from '../dom/event-handler.js'
import BaseComponent from '../base-component.js'
import Config from './config.js'
import {
  execute, executeAfterTransition, getElement, reflow
} from './index.js'

/**
 * Constants
 */

const NAME = 'backdrop'

const Default = {
  className: 'modal-backdrop',
  clickCallback: null,
  isAnimated: false,
  isVisible: true, // if false, we use the backdrop helper without adding any element to the dom
  rootElement: 'body' // give the choice to place backdrop under different elements
}

const DefaultType = {
  className: 'string',
  clickCallback: '(function|null)',
  isAnimated: 'boolean',
  isVisible: 'boolean',
  rootElement: '(element|string)'
}

/**
 * Class definition
 */

class Backdrop extends Config {
  constructor(config) {
    super()
    this._config = this._getConfig(config)
    this._isAppended = false
    this._element = null
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
    const values = {
      CLASS_NAME_FADE: 'fade',
      CLASS_NAME_SHOW: 'show',
      EVENT_MOUSEDOWN: undefined,
      ...overrides
    }

    values.EVENT_MOUSEDOWN ??= `mousedown.bs.${NAME}`

    return values
  }

  static get ConfigConstants() {
    return this.getConfigConstants()
  }

  static extendDefaultConfig(overrides = {}) {
    return BaseComponent.extendDefaultConfig.call(this, overrides)
  }

  // Public
  show(callback) {
    const { CLASS_NAME_SHOW } = this.constructor.ConfigConstants

    if (!this._config.isVisible) {
      execute(callback)
      return
    }

    this._append()

    const element = this._getElement()
    if (this._config.isAnimated) {
      reflow(element)
    }

    element.classList.add(CLASS_NAME_SHOW)

    this._emulateAnimation(() => {
      execute(callback)
    })
  }

  hide(callback) {
    const { CLASS_NAME_SHOW } = this.constructor.ConfigConstants

    if (!this._config.isVisible) {
      execute(callback)
      return
    }

    this._getElement().classList.remove(CLASS_NAME_SHOW)

    this._emulateAnimation(() => {
      this.dispose()
      execute(callback)
    })
  }

  dispose() {
    const { EVENT_MOUSEDOWN } = this.constructor.ConfigConstants

    if (!this._isAppended) {
      return
    }

    EventHandler.off(this._element, EVENT_MOUSEDOWN)

    this._element.remove()
    this._isAppended = false
  }

  // Private
  _getElement() {
    const { CLASS_NAME_FADE } = this.constructor.ConfigConstants

    if (!this._element) {
      const backdrop = document.createElement('div')
      backdrop.className = this._config.className
      if (this._config.isAnimated) {
        backdrop.classList.add(CLASS_NAME_FADE)
      }

      this._element = backdrop
    }

    return this._element
  }

  _configAfterMerge(config) {
    // use getElement() with the default "body" to get a fresh Element on each instantiation
    config.rootElement = getElement(config.rootElement)
    return config
  }

  _append() {
    const { EVENT_MOUSEDOWN } = this.constructor.ConfigConstants

    if (this._isAppended) {
      return
    }

    const element = this._getElement()
    this._config.rootElement.append(element)

    EventHandler.on(element, EVENT_MOUSEDOWN, () => {
      execute(this._config.clickCallback)
    })

    this._isAppended = true
  }

  _emulateAnimation(callback) {
    executeAfterTransition(callback, this._getElement(), this._config.isAnimated)
  }
}

export default Backdrop
