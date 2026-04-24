/**
 * --------------------------------------------------------------------------
 * Bootstrap dropdown.js
 * Licensed under MIT (https://github.com/twbs/bootstrap/blob/main/LICENSE)
 * --------------------------------------------------------------------------
 */

import * as Popper from '@popperjs/core'
import BaseComponent from './base-component.js'
import EventHandler from './dom/event-handler.js'
import Manipulator from './dom/manipulator.js'
import SelectorEngine from './dom/selector-engine.js'
import {
  defineJQueryPlugin,
  execute,
  getElement,
  getNextActiveElement,
  isDisabled,
  isElement,
  isRTL,
  isVisible,
  noop
} from './util/index.js'

/**
 * Constants
 */

const NAME = 'dropdown'

const Default = {
  autoClose: true,
  boundary: 'clippingParents',
  display: 'dynamic',
  offset: [0, 2],
  popperConfig: null,
  reference: 'toggle'
}

const DefaultType = {
  autoClose: '(boolean|string)',
  boundary: '(string|element)',
  display: 'string',
  offset: '(array|string|function)',
  popperConfig: '(null|object|function)',
  reference: '(string|element|object)'
}

const DOCUMENT_DATA_API_REGISTRY_KEY = '__bootstrapDropdownDataApiRegistry__'

/**
 * Class definition
 */

class Dropdown extends BaseComponent {
  constructor(element, config) {
    super(element, config)

    this._popper = null
    this._parent = this._element.parentNode // dropdown wrapper
    // TODO: v6 revert #37011 & change markup https://getbootstrap.com/docs/5.3/forms/input-group/
    const { SELECTOR_MENU } = this.constructor.ConfigConstants
    this._menu = SelectorEngine.next(this._element, SELECTOR_MENU)[0] ||
      SelectorEngine.prev(this._element, SELECTOR_MENU)[0] ||
      SelectorEngine.findOne(SELECTOR_MENU, this._parent)
    this._inNavbar = this._detectNavbar()
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
      ESCAPE_KEY: 'Escape',
      TAB_KEY: 'Tab',
      ARROW_UP_KEY: 'ArrowUp',
      ARROW_DOWN_KEY: 'ArrowDown',
      RIGHT_MOUSE_BUTTON: 2,

      CLASS_NAME_SHOW: 'show',
      CLASS_NAME_DROPUP: 'dropup',
      CLASS_NAME_DROPEND: 'dropend',
      CLASS_NAME_DROPSTART: 'dropstart',
      CLASS_NAME_DROPUP_CENTER: 'dropup-center',
      CLASS_NAME_DROPDOWN_CENTER: 'dropdown-center',

      SELECTOR_DATA_TOGGLE: '[data-bs-toggle="dropdown"]:not(.disabled):not(:disabled)',
      SELECTOR_MENU: '.dropdown-menu',
      SELECTOR_NAVBAR: '.navbar',
      SELECTOR_NAVBAR_NAV: '.navbar-nav',
      SELECTOR_VISIBLE_ITEMS: '.dropdown-menu .dropdown-item:not(.disabled):not(:disabled)',

      PLACEMENT_TOP: isRTL() ? 'top-end' : 'top-start',
      PLACEMENT_TOPEND: isRTL() ? 'top-start' : 'top-end',
      PLACEMENT_BOTTOM: isRTL() ? 'bottom-end' : 'bottom-start',
      PLACEMENT_BOTTOMEND: isRTL() ? 'bottom-start' : 'bottom-end',
      PLACEMENT_RIGHT: isRTL() ? 'left-start' : 'right-start',
      PLACEMENT_LEFT: isRTL() ? 'right-start' : 'left-start',
      PLACEMENT_TOPCENTER: 'top',
      PLACEMENT_BOTTOMCENTER: 'bottom',

      DATA_API_KEY: '.data-api'
    }
    return { ...defaults, ...overrides }
  }

  static get ConfigConstants() {
    return this.getConfigConstants()
  }

  // Public
  toggle() {
    return this._isShown() ? this.hide() : this.show()
  }

  show() {
    if (isDisabled(this._element) || this._isShown()) {
      return
    }

    const { CLASS_NAME_SHOW, SELECTOR_NAVBAR_NAV } = this.constructor.ConfigConstants
    const EVENT_SHOW = `show${this.constructor.EVENT_KEY}`
    const EVENT_SHOWN = `shown${this.constructor.EVENT_KEY}`

    const relatedTarget = {
      relatedTarget: this._element
    }

    const showEvent = EventHandler.trigger(this._element, EVENT_SHOW, relatedTarget)

    if (showEvent.defaultPrevented) {
      return
    }

    this._createPopper()

    // If this is a touch-enabled device we add extra
    // empty mouseover listeners to the body's immediate children;
    // only needed because of broken event delegation on iOS
    // https://www.quirksmode.org/blog/archives/2014/02/mouse_event_bub.html
    if ('ontouchstart' in document.documentElement && !this._parent.closest(SELECTOR_NAVBAR_NAV)) {
      for (const element of [].concat(...document.body.children)) {
        EventHandler.on(element, 'mouseover', noop)
      }
    }

    this._element.focus()
    this._element.setAttribute('aria-expanded', true)

    this._menu.classList.add(CLASS_NAME_SHOW)
    this._element.classList.add(CLASS_NAME_SHOW)
    EventHandler.trigger(this._element, EVENT_SHOWN, relatedTarget)
  }

  hide() {
    if (isDisabled(this._element) || !this._isShown()) {
      return
    }

    const relatedTarget = {
      relatedTarget: this._element
    }

    this._completeHide(relatedTarget)
  }

  dispose() {
    if (this._popper) {
      this._popper.destroy()
    }

    super.dispose()
  }

  update() {
    this._inNavbar = this._detectNavbar()
    if (this._popper) {
      this._popper.update()
    }
  }

  // Private
  _completeHide(relatedTarget) {
    const { CLASS_NAME_SHOW } = this.constructor.ConfigConstants
    const EVENT_HIDE = `hide${this.constructor.EVENT_KEY}`
    const EVENT_HIDDEN = `hidden${this.constructor.EVENT_KEY}`

    const hideEvent = EventHandler.trigger(this._element, EVENT_HIDE, relatedTarget)
    if (hideEvent.defaultPrevented) {
      return
    }

    // If this is a touch-enabled device we remove the extra
    // empty mouseover listeners we added for iOS support
    if ('ontouchstart' in document.documentElement) {
      for (const element of [].concat(...document.body.children)) {
        EventHandler.off(element, 'mouseover', noop)
      }
    }

    if (this._popper) {
      this._popper.destroy()
    }

    this._menu.classList.remove(CLASS_NAME_SHOW)
    this._element.classList.remove(CLASS_NAME_SHOW)
    this._element.setAttribute('aria-expanded', 'false')
    Manipulator.removeDataAttribute(this._menu, 'popper')
    EventHandler.trigger(this._element, EVENT_HIDDEN, relatedTarget)
  }

  _getConfig(config) {
    config = super._getConfig(config)

    if (typeof config.reference === 'object' && !isElement(config.reference) &&
      typeof config.reference.getBoundingClientRect !== 'function'
    ) {
      // Popper virtual elements require a getBoundingClientRect method
      throw new TypeError(`${NAME.toUpperCase()}: Option "reference" provided type "object" without a required "getBoundingClientRect" method.`)
    }

    return config
  }

  _createPopper() {
    if (typeof Popper === 'undefined') {
      throw new TypeError('Bootstrap\'s dropdowns require Popper (https://popper.js.org/docs/v2/)')
    }

    let referenceElement = this._element

    if (this._config.reference === 'parent') {
      referenceElement = this._parent
    } else if (isElement(this._config.reference)) {
      referenceElement = getElement(this._config.reference)
    } else if (typeof this._config.reference === 'object') {
      referenceElement = this._config.reference
    }

    const popperConfig = this._getPopperConfig()
    this._popper = Popper.createPopper(referenceElement, this._menu, popperConfig)
  }

  _isShown() {
    const { CLASS_NAME_SHOW } = this.constructor.ConfigConstants
    return this._menu.classList.contains(CLASS_NAME_SHOW)
  }

  _getPlacement() {
    const { CLASS_NAME_DROPEND, CLASS_NAME_DROPSTART, CLASS_NAME_DROPUP_CENTER, CLASS_NAME_DROPDOWN_CENTER, CLASS_NAME_DROPUP, PLACEMENT_RIGHT, PLACEMENT_LEFT, PLACEMENT_TOPCENTER, PLACEMENT_BOTTOMCENTER, PLACEMENT_TOPEND, PLACEMENT_TOP, PLACEMENT_BOTTOMEND, PLACEMENT_BOTTOM } = this.constructor.ConfigConstants
    const parentDropdown = this._parent

    if (parentDropdown.classList.contains(CLASS_NAME_DROPEND)) {
      return PLACEMENT_RIGHT
    }

    if (parentDropdown.classList.contains(CLASS_NAME_DROPSTART)) {
      return PLACEMENT_LEFT
    }

    if (parentDropdown.classList.contains(CLASS_NAME_DROPUP_CENTER)) {
      return PLACEMENT_TOPCENTER
    }

    if (parentDropdown.classList.contains(CLASS_NAME_DROPDOWN_CENTER)) {
      return PLACEMENT_BOTTOMCENTER
    }

    // We need to trim the value because custom properties can also include spaces
    const isEnd = getComputedStyle(this._menu).getPropertyValue('--bs-position').trim() === 'end'

    if (parentDropdown.classList.contains(CLASS_NAME_DROPUP)) {
      return isEnd ? PLACEMENT_TOPEND : PLACEMENT_TOP
    }

    return isEnd ? PLACEMENT_BOTTOMEND : PLACEMENT_BOTTOM
  }

  _detectNavbar() {
    const { SELECTOR_NAVBAR } = this.constructor.ConfigConstants
    return this._element.closest(SELECTOR_NAVBAR) !== null
  }

  _getOffset() {
    const { offset } = this._config

    if (typeof offset === 'string') {
      return offset.split(',').map(value => Number.parseInt(value, 10))
    }

    if (typeof offset === 'function') {
      return popperData => offset(popperData, this._element)
    }

    return offset
  }

  _getPopperConfig() {
    const defaultBsPopperConfig = {
      placement: this._getPlacement(),
      modifiers: [{
        name: 'preventOverflow',
        options: {
          boundary: this._config.boundary
        }
      },
      {
        name: 'offset',
        options: {
          offset: this._getOffset()
        }
      }]
    }

    // Disable Popper if we have a static display or Dropdown is in Navbar
    if (this._inNavbar || this._config.display === 'static') {
      Manipulator.setDataAttribute(this._menu, 'popper', 'static') // TODO: v6 remove
      defaultBsPopperConfig.modifiers = [{
        name: 'applyStyles',
        enabled: false
      }]
    }

    return {
      ...defaultBsPopperConfig,
      ...execute(this._config.popperConfig, [undefined, defaultBsPopperConfig])
    }
  }

  _selectMenuItem({ key, target }) {
    const { ARROW_DOWN_KEY, SELECTOR_VISIBLE_ITEMS } = this.constructor.ConfigConstants
    const items = SelectorEngine.find(SELECTOR_VISIBLE_ITEMS, this._menu).filter(element => isVisible(element))

    if (!items.length) {
      return
    }

    // if target isn't included in items (e.g. when expanding the dropdown)
    // allow cycling to get the last item in case key equals ARROW_UP_KEY
    getNextActiveElement(items, target, key === ARROW_DOWN_KEY, !items.includes(target)).focus()
  }

  // Static
  static jQueryInterface(config) {
    return this.each(function () {
      const data = Dropdown.getOrCreateInstance(this, config)

      if (typeof config !== 'string') {
        return
      }

      if (typeof data[config] === 'undefined') {
        throw new TypeError(`No method named "${config}"`)
      }

      data[config]()
    })
  }

  static clearMenus(event) {
    const Class = this
    const { RIGHT_MOUSE_BUTTON, TAB_KEY, SELECTOR_DATA_TOGGLE, CLASS_NAME_SHOW } = Class.ConfigConstants
    const SELECTOR_DATA_TOGGLE_SHOWN = `${SELECTOR_DATA_TOGGLE}.${CLASS_NAME_SHOW}`

    if (event.button === RIGHT_MOUSE_BUTTON || (event.type === 'keyup' && event.key !== TAB_KEY)) {
      return
    }

    const openToggles = SelectorEngine.find(SELECTOR_DATA_TOGGLE_SHOWN)

    for (const toggle of openToggles) {
      const context = Class.getInstance(toggle)
      if (!context || context._config.autoClose === false) {
        continue
      }

      const composedPath = event.composedPath()
      const isToggleTarget = composedPath.includes(context._element) || context._element.contains(event.target)
      const isMenuTarget = composedPath.includes(context._menu)
      if (
        isToggleTarget ||
        (context._config.autoClose === 'inside' && !isMenuTarget) ||
        (context._config.autoClose === 'outside' && isMenuTarget)
      ) {
        continue
      }

      // Tab navigation through the dropdown menu or events from contained inputs shouldn't close the menu
      if (context._menu.contains(event.target) && ((event.type === 'keyup' && event.key === TAB_KEY) || /input|select|option|textarea|form/i.test(event.target.tagName))) {
        continue
      }

      const relatedTarget = { relatedTarget: context._element }

      if (event.type === 'click') {
        relatedTarget.clickEvent = event
      }

      context._completeHide(relatedTarget)
    }
  }

  static dataApiKeydownHandler(event) {
    // If not an UP | DOWN | ESCAPE key => not a dropdown command
    // If input/textarea && if key is other than ESCAPE => not a dropdown command
    // Class is injected via event._bsDropdownClass by the init() wrapper so that subclasses
    // with custom ConfigConstants work correctly; fall back to Dropdown for plain usage.
    const Class = event._bsDropdownClass || Dropdown
    const { ESCAPE_KEY, TAB_KEY, ARROW_UP_KEY, ARROW_DOWN_KEY, SELECTOR_DATA_TOGGLE } = Class.ConfigConstants

    const isInput = /input|textarea/i.test(event.target.tagName)
    const isEscapeEvent = event.key === ESCAPE_KEY
    const isUpOrDownEvent = [ARROW_UP_KEY, ARROW_DOWN_KEY].includes(event.key)

    if (!isUpOrDownEvent && !isEscapeEvent) {
      return
    }

    if (isInput && !isEscapeEvent) {
      return
    }

    event.preventDefault()

    // TODO: v6 revert #37011 & change markup https://getbootstrap.com/docs/5.3/forms/input-group/
    const getToggleButton = this.matches(SELECTOR_DATA_TOGGLE) ?
      this :
      (SelectorEngine.prev(this, SELECTOR_DATA_TOGGLE)[0] ||
        SelectorEngine.next(this, SELECTOR_DATA_TOGGLE)[0] ||
        SelectorEngine.findOne(SELECTOR_DATA_TOGGLE, event.delegateTarget.parentNode))

    const instance = Class.getOrCreateInstance(getToggleButton)

    if (isUpOrDownEvent) {
      event.stopPropagation()
      instance.show()
      instance._selectMenuItem(event)
      return
    }

    if (instance._isShown()) { // else is escape and we check if it is shown
      event.stopPropagation()
      instance.hide()
      getToggleButton.focus()
    }
  }

  static init() {
    if (typeof document === 'undefined') {
      return
    }

    const existingRegistration = document[DOCUMENT_DATA_API_REGISTRY_KEY]
    if (existingRegistration) {
      this._clearMenusHandler = existingRegistration.clearMenusHandler
      this._keydownHandler = existingRegistration.keydownHandler
      this._toggleClickHandler = existingRegistration.toggleClickHandler
      this._isInitialized = true
      defineJQueryPlugin(this)
      return
    }

    this._isInitialized = false

    const Class = this // capture class for use in handler closures below
    const { SELECTOR_DATA_TOGGLE, SELECTOR_MENU, DATA_API_KEY } = Class.ConfigConstants
    const EVENT_CLICK_DATA_API = `click${this.EVENT_KEY}${DATA_API_KEY}`
    const EVENT_KEYDOWN_DATA_API = `keydown${this.EVENT_KEY}${DATA_API_KEY}`
    const EVENT_KEYUP_DATA_API = `keyup${this.EVENT_KEY}${DATA_API_KEY}`

    // Store handler references for destroy().
    // clearMenus is non-delegated: EventHandler calls fn.apply(document, [event])
    // so `this` inside it would be document; use an arrow function to capture Class.
    this._clearMenusHandler = event => Class.clearMenus(event)

    // dataApiKeydownHandler is delegated: EventHandler calls fn.call(target, event)
    // so `this` inside it is the matched DOM element - correct for DOM navigation.
    // We inject Class via the event so the handler can read the right ConfigConstants.
    this._keydownHandler = function (event) {
      event._bsDropdownClass = Class
      Class.dataApiKeydownHandler.call(this, event)
      delete event._bsDropdownClass
    }

    // Toggle click: delegated, `this` is the matched toggle element.
    this._toggleClickHandler = function (event) {
      event.preventDefault()
      Class.getOrCreateInstance(this).toggle()
    }

    EventHandler.on(document, EVENT_KEYDOWN_DATA_API, SELECTOR_DATA_TOGGLE, this._keydownHandler)
    EventHandler.on(document, EVENT_KEYDOWN_DATA_API, SELECTOR_MENU, this._keydownHandler)
    EventHandler.on(document, EVENT_CLICK_DATA_API, this._clearMenusHandler)
    EventHandler.on(document, EVENT_KEYUP_DATA_API, this._clearMenusHandler)
    EventHandler.on(document, EVENT_CLICK_DATA_API, SELECTOR_DATA_TOGGLE, this._toggleClickHandler)

    document[DOCUMENT_DATA_API_REGISTRY_KEY] = {
      keydownEventName: EVENT_KEYDOWN_DATA_API,
      keyupEventName: EVENT_KEYUP_DATA_API,
      clickEventName: EVENT_CLICK_DATA_API,
      toggleSelector: SELECTOR_DATA_TOGGLE,
      menuSelector: SELECTOR_MENU,
      clearMenusHandler: this._clearMenusHandler,
      keydownHandler: this._keydownHandler,
      toggleClickHandler: this._toggleClickHandler
    }

    defineJQueryPlugin(this)

    this._isInitialized = true
  }

  static destroy() {
    if (typeof document === 'undefined') {
      return
    }

    const existingRegistration = document[DOCUMENT_DATA_API_REGISTRY_KEY]
    if (!existingRegistration && !this._isInitialized) {
      return
    }

    if (!existingRegistration) {
      this._clearMenusHandler = null
      this._keydownHandler = null
      this._toggleClickHandler = null
      this._isInitialized = false
      return
    }

    EventHandler.off(document, existingRegistration.keydownEventName, existingRegistration.toggleSelector, existingRegistration.keydownHandler)
    EventHandler.off(document, existingRegistration.keydownEventName, existingRegistration.menuSelector, existingRegistration.keydownHandler)
    EventHandler.off(document, existingRegistration.clickEventName, existingRegistration.clearMenusHandler)
    EventHandler.off(document, existingRegistration.keyupEventName, existingRegistration.clearMenusHandler)
    EventHandler.off(document, existingRegistration.clickEventName, existingRegistration.toggleSelector, existingRegistration.toggleClickHandler)
    delete document[DOCUMENT_DATA_API_REGISTRY_KEY]

    this._clearMenusHandler = null
    this._keydownHandler = null
    this._toggleClickHandler = null
    this._isInitialized = false
  }

  static _isInitialized = false
  static _clearMenusHandler = null
  static _keydownHandler = null
  static _toggleClickHandler = null
}

/**
 * Init on import (browser only)
 */

if (typeof document !== 'undefined') {
  Dropdown.init()
}

export default Dropdown
