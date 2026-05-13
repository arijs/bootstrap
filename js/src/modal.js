/**
 * --------------------------------------------------------------------------
 * Bootstrap modal.js
 * Licensed under MIT (https://github.com/twbs/bootstrap/blob/main/LICENSE)
 * --------------------------------------------------------------------------
 */

import BaseComponent from './base-component.js'
import EventHandler from './dom/event-handler.js'
import SelectorEngine from './dom/selector-engine.js'
import Backdrop from './util/backdrop.js'
import { enableDismissTrigger } from './util/component-functions.js'
import FocusTrap from './util/focustrap.js'
import {
  defineJQueryPlugin, isRTL, isVisible, reflow
} from './util/index.js'
import ScrollBarHelper from './util/scrollbar.js'

/**
 * Constants
 */

const NAME = 'modal'
const DATA_KEY = 'bs.modal'
const EVENT_KEY = `.${DATA_KEY}`

const Default = {
  backdrop: true,
  focus: true,
  keyboard: true
}

const DefaultType = {
  backdrop: '(boolean|string)',
  focus: 'boolean',
  keyboard: 'boolean'
}

/**
 * Class definition
 */

class Modal extends BaseComponent {
  constructor(element, config) {
    super(element, config)

    const { SELECTOR_DIALOG } = this.constructor.ConfigConstants
    this._dialog = SelectorEngine.findOne(SELECTOR_DIALOG, this._element)
    this._backdrop = this._initializeBackDrop()
    this._focustrap = this._initializeFocusTrap()
    this._isShown = false
    this._isTransitioning = false
    this._scrollBar = new ScrollBarHelper()

    this._addEventListeners()
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
      ESCAPE_KEY: 'Escape',
      EVENT_HIDE: `hide${EVENT_KEY}`,
      EVENT_HIDE_PREVENTED: `hidePrevented${EVENT_KEY}`,
      EVENT_HIDDEN: `hidden${EVENT_KEY}`,
      EVENT_SHOW: `show${EVENT_KEY}`,
      EVENT_SHOWN: `shown${EVENT_KEY}`,
      EVENT_RESIZE: `resize${EVENT_KEY}`,
      EVENT_CLICK_DISMISS: `click.dismiss${EVENT_KEY}`,
      EVENT_MOUSEDOWN_DISMISS: `mousedown.dismiss${EVENT_KEY}`,
      EVENT_KEYDOWN_DISMISS: `keydown.dismiss${EVENT_KEY}`,
      EVENT_CLICK_DATA_API: undefined,
      CLASS_NAME_OPEN: 'modal-open',
      CLASS_NAME_FADE: 'fade',
      CLASS_NAME_SHOW: 'show',
      CLASS_NAME_STATIC: 'modal-static',
      OPEN_SELECTOR: '.modal.show',
      SELECTOR_DIALOG: '.modal-dialog',
      SELECTOR_MODAL_BODY: '.modal-body',
      SELECTOR_DATA_TOGGLE: `[data-bs-toggle="${NAME}"]`,
      DATA_API_KEY: undefined,
      BackdropClass: Backdrop,
      ...overrides
    }

    values.DATA_API_KEY ??= '.data-api'
    values.EVENT_CLICK_DATA_API ??= `click${EVENT_KEY}${values.DATA_API_KEY}`

    console.log(`Modal.getConfigConstants:`, {values, overrides})

    return values
  }

  // Public
  toggle(relatedTarget) {
    return this._isShown ? this.hide() : this.show(relatedTarget)
  }

  show(relatedTarget) {
    if (this._isShown || this._isTransitioning) {
      return
    }

    const { EVENT_SHOW, CLASS_NAME_OPEN } = this.constructor.ConfigConstants

    const showEvent = EventHandler.trigger(this._element, EVENT_SHOW, {
      relatedTarget
    })

    if (showEvent.defaultPrevented) {
      return
    }

    this._isShown = true
    this._isTransitioning = true

    this._scrollBar.hide()

    document.body.classList.add(CLASS_NAME_OPEN)

    this._adjustDialog()

    this._backdrop.show(() => this._showElement(relatedTarget))
  }

  hide() {
    if (!this._isShown || this._isTransitioning) {
      return
    }

    const { EVENT_HIDE, CLASS_NAME_SHOW } = this.constructor.ConfigConstants

    const hideEvent = EventHandler.trigger(this._element, EVENT_HIDE)

    if (hideEvent.defaultPrevented) {
      return
    }

    this._isShown = false
    this._isTransitioning = true
    this._focustrap.deactivate()

    this._element.classList.remove(CLASS_NAME_SHOW)

    this._queueCallback(() => this._hideModal(), this._element, this._isAnimated())
  }

  dispose() {
    EventHandler.off(window, EVENT_KEY)
    EventHandler.off(this._dialog, EVENT_KEY)

    this._backdrop.dispose()
    this._focustrap.deactivate()

    super.dispose()
  }

  handleUpdate() {
    this._adjustDialog()
  }

  // Private
  _initializeBackDrop() {
    const { BackdropClass } = this.constructor.ConfigConstants
    return new BackdropClass({
      isVisible: Boolean(this._config.backdrop), // 'static' option will be translated to true, and booleans will keep their value,
      isAnimated: this._isAnimated()
    })
  }

  _initializeFocusTrap() {
    return new FocusTrap({
      trapElement: this._element
    })
  }

  _showElement(relatedTarget) {
    const { SELECTOR_MODAL_BODY, CLASS_NAME_SHOW, EVENT_SHOWN } = this.constructor.ConfigConstants

    // try to append dynamic modal
    if (!document.body.contains(this._element)) {
      document.body.append(this._element)
    }

    this._element.style.display = 'block'
    this._element.removeAttribute('aria-hidden')
    this._element.setAttribute('aria-modal', true)
    this._element.setAttribute('role', 'dialog')
    this._element.scrollTop = 0

    const modalBody = SelectorEngine.findOne(SELECTOR_MODAL_BODY, this._dialog)
    if (modalBody) {
      modalBody.scrollTop = 0
    }

    reflow(this._element)

    this._element.classList.add(CLASS_NAME_SHOW)

    const transitionComplete = () => {
      if (this._config.focus) {
        this._focustrap.activate()
      }

      this._isTransitioning = false
      EventHandler.trigger(this._element, EVENT_SHOWN, {
        relatedTarget
      })
    }

    this._queueCallback(transitionComplete, this._dialog, this._isAnimated())
  }

  _addEventListeners() {
    const {
      EVENT_KEYDOWN_DISMISS,
      ESCAPE_KEY,
      EVENT_RESIZE,
      EVENT_MOUSEDOWN_DISMISS,
      EVENT_CLICK_DISMISS
    } = this.constructor.ConfigConstants

    EventHandler.on(this._element, EVENT_KEYDOWN_DISMISS, event => {
      if (event.key !== ESCAPE_KEY) {
        return
      }

      if (this._config.keyboard) {
        this.hide()
        return
      }

      this._triggerBackdropTransition()
    })

    EventHandler.on(window, EVENT_RESIZE, () => {
      if (this._isShown && !this._isTransitioning) {
        this._adjustDialog()
      }
    })

    EventHandler.on(this._element, EVENT_MOUSEDOWN_DISMISS, event => {
      // a bad trick to segregate clicks that may start inside dialog but end outside, and avoid listen to scrollbar clicks
      EventHandler.one(this._element, EVENT_CLICK_DISMISS, event2 => {
        if (this._element !== event.target || this._element !== event2.target) {
          return
        }

        if (this._config.backdrop === 'static') {
          this._triggerBackdropTransition()
          return
        }

        if (this._config.backdrop) {
          this.hide()
        }
      })
    })
  }

  _hideModal() {
    const { CLASS_NAME_OPEN, EVENT_HIDDEN } = this.constructor.ConfigConstants

    this._element.style.display = 'none'
    this._element.setAttribute('aria-hidden', true)
    this._element.removeAttribute('aria-modal')
    this._element.removeAttribute('role')
    this._isTransitioning = false

    this._backdrop.hide(() => {
      document.body.classList.remove(CLASS_NAME_OPEN)
      this._resetAdjustments()
      this._scrollBar.reset()
      EventHandler.trigger(this._element, EVENT_HIDDEN)
    })
  }

  _isAnimated() {
    const { CLASS_NAME_FADE } = this.constructor.ConfigConstants
    return this._element.classList.contains(CLASS_NAME_FADE)
  }

  _triggerBackdropTransition() {
    const { EVENT_HIDE_PREVENTED, CLASS_NAME_STATIC } = this.constructor.ConfigConstants

    const hideEvent = EventHandler.trigger(this._element, EVENT_HIDE_PREVENTED)
    if (hideEvent.defaultPrevented) {
      return
    }

    const isModalOverflowing = this._element.scrollHeight > document.documentElement.clientHeight
    const initialOverflowY = this._element.style.overflowY
    // return if the following background transition hasn't yet completed
    if (initialOverflowY === 'hidden' || this._element.classList.contains(CLASS_NAME_STATIC)) {
      return
    }

    if (!isModalOverflowing) {
      this._element.style.overflowY = 'hidden'
    }

    this._element.classList.add(CLASS_NAME_STATIC)
    this._queueCallback(() => {
      this._element.classList.remove(CLASS_NAME_STATIC)
      this._queueCallback(() => {
        this._element.style.overflowY = initialOverflowY
      }, this._dialog)
    }, this._dialog)

    this._element.focus()
  }

  /**
   * The following methods are used to handle overflowing modals
   */

  _adjustDialog() {
    const isModalOverflowing = this._element.scrollHeight > document.documentElement.clientHeight
    const scrollbarWidth = this._scrollBar.getWidth()
    const isBodyOverflowing = scrollbarWidth > 0

    if (isBodyOverflowing && !isModalOverflowing) {
      const property = isRTL() ? 'paddingLeft' : 'paddingRight'
      this._element.style[property] = `${scrollbarWidth}px`
    }

    if (!isBodyOverflowing && isModalOverflowing) {
      const property = isRTL() ? 'paddingRight' : 'paddingLeft'
      this._element.style[property] = `${scrollbarWidth}px`
    }
  }

  _resetAdjustments() {
    this._element.style.paddingLeft = ''
    this._element.style.paddingRight = ''
  }

  // Static
  static _isInitialized = false
  static _clickHandler = null
  static _disposeDismissTrigger = null

  static init() {
    if (this._isInitialized) {
      return
    }

    if (typeof document === 'undefined') {
      return
    }

    const Class = this
    const {
      EVENT_CLICK_DATA_API,
      SELECTOR_DATA_TOGGLE,
      EVENT_SHOW,
      EVENT_HIDDEN,
      OPEN_SELECTOR
    } = Class.ConfigConstants

    this._clickHandler = function (event) {
      const target = SelectorEngine.getElementFromSelector(this)

      if (['A', 'AREA'].includes(this.tagName)) {
        event.preventDefault()
      }

      EventHandler.one(target, EVENT_SHOW, showEvent => {
        if (showEvent.defaultPrevented) {
          // only register focus restorer if modal will actually get shown
          return
        }

        EventHandler.one(target, EVENT_HIDDEN, () => {
          if (isVisible(this)) {
            this.focus()
          }
        })
      })

      // avoid conflict when clicking modal toggler while another one is open
      const alreadyOpen = SelectorEngine.findOne(OPEN_SELECTOR)
      if (alreadyOpen) {
        Class.getInstance(alreadyOpen).hide()
      }

      const data = Class.getOrCreateInstance(target)

      data.toggle(this)
    }

    EventHandler.on(document, EVENT_CLICK_DATA_API, SELECTOR_DATA_TOGGLE, this._clickHandler)

    this._disposeDismissTrigger = enableDismissTrigger(Class)

    this._isInitialized = true
  }

  static destroy() {
    if (!this._isInitialized) {
      return
    }

    const { EVENT_CLICK_DATA_API, SELECTOR_DATA_TOGGLE } = this.ConfigConstants

    EventHandler.off(document, EVENT_CLICK_DATA_API, SELECTOR_DATA_TOGGLE, this._clickHandler)

    this._disposeDismissTrigger()
    this._disposeDismissTrigger = null

    this._isInitialized = false
  }

  static jQueryInterface(config, relatedTarget) {
    return this.each(function () {
      const data = Modal.getOrCreateInstance(this, config)

      if (typeof config !== 'string') {
        return
      }

      if (typeof data[config] === 'undefined') {
        throw new TypeError(`No method named "${config}"`)
      }

      data[config](relatedTarget)
    })
  }
}

/**
 * Data API implementation
 */

if (typeof document !== 'undefined') {
  Modal.init()
}

/**
 * jQuery
 */

defineJQueryPlugin(Modal)

export default Modal
