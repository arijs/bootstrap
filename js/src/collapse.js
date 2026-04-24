/**
 * --------------------------------------------------------------------------
 * Bootstrap collapse.js
 * Licensed under MIT (https://github.com/twbs/bootstrap/blob/main/LICENSE)
 * --------------------------------------------------------------------------
 */

import BaseComponent from './base-component.js'
import EventHandler from './dom/event-handler.js'
import SelectorEngine from './dom/selector-engine.js'
import {
  defineJQueryPlugin,
  getElement,
  reflow
} from './util/index.js'

/**
 * Constants
 */

const NAME = 'collapse'
const DATA_KEY = 'bs.collapse'
const EVENT_KEY = `.${DATA_KEY}`

const Default = {
  parent: null,
  toggle: true
}

const DefaultType = {
  parent: '(null|element)',
  toggle: 'boolean'
}

/**
 * Class definition
 */

class Collapse extends BaseComponent {
  constructor(element, config) {
    super(element, config)

    const { SELECTOR_DATA_TOGGLE } = this.constructor.ConfigConstants

    this._isTransitioning = false
    this._triggerArray = []

    const toggleList = SelectorEngine.find(SELECTOR_DATA_TOGGLE)

    for (const elem of toggleList) {
      const selector = SelectorEngine.getSelectorFromElement(elem)
      const filterElement = SelectorEngine.find(selector)
        .filter(foundElement => foundElement === this._element)

      if (selector !== null && filterElement.length) {
        this._triggerArray.push(elem)
      }
    }

    this._initializeChildren()

    if (!this._config.parent) {
      this._addAriaAndCollapsedClass(this._triggerArray, this._isShown())
    }

    if (this._config.toggle) {
      this.toggle()
    }
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
      EVENT_SHOW: `show${EVENT_KEY}`,
      EVENT_SHOWN: `shown${EVENT_KEY}`,
      EVENT_HIDE: `hide${EVENT_KEY}`,
      EVENT_HIDDEN: `hidden${EVENT_KEY}`,
      EVENT_CLICK_DATA_API: `click${EVENT_KEY}.data-api`,
      CLASS_NAME_SHOW: 'show',
      CLASS_NAME_COLLAPSE: 'collapse',
      CLASS_NAME_COLLAPSING: 'collapsing',
      CLASS_NAME_COLLAPSED: 'collapsed',
      // CLASS_NAME_DEEPER_CHILDREN:
      // intentionally undefined so it is generated unless
      // specifically provided by the user
      CLASS_NAME_DEEPER_CHILDREN: undefined,
      CLASS_NAME_HORIZONTAL: 'collapse-horizontal',
      WIDTH: 'width',
      HEIGHT: 'height',
      // SELECTOR_ACTIVES: same as above
      SELECTOR_ACTIVES: undefined,
      SELECTOR_DATA_TOGGLE: '[data-bs-toggle="collapse"]',
      DATA_API_KEY: '.data-api',
      ...overrides,
    }
    values.CLASS_NAME_DEEPER_CHILDREN ??= `:scope .${values.CLASS_NAME_COLLAPSE} .${values.CLASS_NAME_COLLAPSE}`
    values.SELECTOR_ACTIVES ??= `.${values.CLASS_NAME_COLLAPSE}.${values.CLASS_NAME_SHOW}, .${values.CLASS_NAME_COLLAPSE}.${values.CLASS_NAME_COLLAPSING}`
    return values
  }

  static get ConfigConstants() {
    return this.getConfigConstants()
  }

  // Public
  toggle() {
    if (this._isShown()) {
      this.hide()
    } else {
      this.show()
    }
  }

  show() {
    const {
      SELECTOR_ACTIVES,
      EVENT_SHOW,
      CLASS_NAME_COLLAPSE,
      CLASS_NAME_COLLAPSING,
      EVENT_SHOWN,
      CLASS_NAME_SHOW
    } = this.constructor.ConfigConstants

    if (this._isTransitioning || this._isShown()) {
      return
    }

    let activeChildren = []

    // find active children
    if (this._config.parent) {
      activeChildren = this._getFirstLevelChildren(SELECTOR_ACTIVES)
        .filter(element => element !== this._element)
        .map(element => this.constructor.getOrCreateInstance(element, { toggle: false }))
    }

    if (activeChildren.length && activeChildren[0]._isTransitioning) {
      return
    }

    const startEvent = EventHandler.trigger(this._element, EVENT_SHOW)
    if (startEvent.defaultPrevented) {
      return
    }

    for (const activeInstance of activeChildren) {
      activeInstance.hide()
    }

    const dimension = this._getDimension()

    this._element.classList.remove(CLASS_NAME_COLLAPSE)
    this._element.classList.add(CLASS_NAME_COLLAPSING)

    this._element.style[dimension] = 0

    this._addAriaAndCollapsedClass(this._triggerArray, true)
    this._isTransitioning = true

    const complete = () => {
      this._isTransitioning = false

      this._element.classList.remove(CLASS_NAME_COLLAPSING)
      this._element.classList.add(CLASS_NAME_COLLAPSE, CLASS_NAME_SHOW)

      this._element.style[dimension] = ''

      EventHandler.trigger(this._element, EVENT_SHOWN)
    }

    const capitalizedDimension = dimension[0].toUpperCase() + dimension.slice(1)
    const scrollSize = `scroll${capitalizedDimension}`

    this._queueCallback(complete, this._element, true)
    this._element.style[dimension] = `${this._element[scrollSize]}px`
  }

  hide() {
    const {
      EVENT_HIDE,
      CLASS_NAME_COLLAPSING,
      CLASS_NAME_COLLAPSE,
      CLASS_NAME_SHOW,
      EVENT_HIDDEN
    } = this.constructor.ConfigConstants

    if (this._isTransitioning || !this._isShown()) {
      return
    }

    const startEvent = EventHandler.trigger(this._element, EVENT_HIDE)
    if (startEvent.defaultPrevented) {
      return
    }

    const dimension = this._getDimension()

    this._element.style[dimension] = `${this._element.getBoundingClientRect()[dimension]}px`

    reflow(this._element)

    this._element.classList.add(CLASS_NAME_COLLAPSING)
    this._element.classList.remove(CLASS_NAME_COLLAPSE, CLASS_NAME_SHOW)

    for (const trigger of this._triggerArray) {
      const element = SelectorEngine.getElementFromSelector(trigger)

      if (element && !this._isShown(element)) {
        this._addAriaAndCollapsedClass([trigger], false)
      }
    }

    this._isTransitioning = true

    const complete = () => {
      this._isTransitioning = false
      this._element.classList.remove(CLASS_NAME_COLLAPSING)
      this._element.classList.add(CLASS_NAME_COLLAPSE)
      EventHandler.trigger(this._element, EVENT_HIDDEN)
    }

    this._element.style[dimension] = ''

    this._queueCallback(complete, this._element, true)
  }

  // Private
  _isShown(element = this._element) {
    const { CLASS_NAME_SHOW } = this.constructor.ConfigConstants
    return element.classList.contains(CLASS_NAME_SHOW)
  }

  _configAfterMerge(config) {
    config.toggle = Boolean(config.toggle) // Coerce string values
    config.parent = getElement(config.parent)
    return config
  }

  _getDimension() {
    const { CLASS_NAME_HORIZONTAL, WIDTH, HEIGHT } = this.constructor.ConfigConstants
    return this._element.classList.contains(CLASS_NAME_HORIZONTAL) ? WIDTH : HEIGHT
  }

  _initializeChildren() {
    const { SELECTOR_DATA_TOGGLE } = this.constructor.ConfigConstants

    if (!this._config.parent) {
      return
    }

    const children = this._getFirstLevelChildren(SELECTOR_DATA_TOGGLE)

    for (const element of children) {
      const selected = SelectorEngine.getElementFromSelector(element)

      if (selected) {
        this._addAriaAndCollapsedClass([element], this._isShown(selected))
      }
    }
  }

  _getFirstLevelChildren(selector) {
    const { CLASS_NAME_DEEPER_CHILDREN } = this.constructor.ConfigConstants
    const children = SelectorEngine.find(CLASS_NAME_DEEPER_CHILDREN, this._config.parent)
    // remove children if greater depth
    return SelectorEngine.find(selector, this._config.parent).filter(element => !children.includes(element))
  }

  _addAriaAndCollapsedClass(triggerArray, isOpen) {
    const { CLASS_NAME_COLLAPSED } = this.constructor.ConfigConstants

    if (!triggerArray.length) {
      return
    }

    for (const element of triggerArray) {
      element.classList.toggle(CLASS_NAME_COLLAPSED, !isOpen)
      element.setAttribute('aria-expanded', isOpen)
    }
  }

  // Static
  static _isInitialized = false

  static init() {
    const ComponentClass = this
    const { EVENT_CLICK_DATA_API, SELECTOR_DATA_TOGGLE } = this.ConfigConstants

    if (this._isInitialized) {
      return
    }

    if (typeof document === 'undefined') {
      return
    }

    this._clickHandler = function (event) {
      // preventDefault only for <a> elements (which change the URL) not inside the collapsible element
      if (event.target.tagName === 'A' || (event.delegateTarget && event.delegateTarget.tagName === 'A')) {
        event.preventDefault()
      }

      for (const element of SelectorEngine.getMultipleElementsFromSelector(this)) {
        ComponentClass.getOrCreateInstance(element, { toggle: false }).toggle()
      }
    }

    EventHandler.on(document, EVENT_CLICK_DATA_API, SELECTOR_DATA_TOGGLE, this._clickHandler)
    this._isInitialized = true
  }

  static destroy() {
    const { EVENT_CLICK_DATA_API, SELECTOR_DATA_TOGGLE } = this.ConfigConstants

    if (!this._isInitialized) {
      return
    }

    EventHandler.off(document, EVENT_CLICK_DATA_API, SELECTOR_DATA_TOGGLE, this._clickHandler)
    this._isInitialized = false
  }

  static jQueryInterface(config) {
    const _config = {}
    if (typeof config === 'string' && /show|hide/.test(config)) {
      _config.toggle = false
    }

    return this.each(function () {
      const data = Collapse.getOrCreateInstance(this, _config)

      if (typeof config === 'string') {
        if (typeof data[config] === 'undefined') {
          throw new TypeError(`No method named "${config}"`)
        }

        data[config]()
      }
    })
  }
}

/**
 * Data API implementation
 */

if (typeof document !== 'undefined') {
  Collapse.init()
}

/**
 * jQuery
 */

defineJQueryPlugin(Collapse)

export default Collapse
