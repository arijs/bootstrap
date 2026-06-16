/**
 * --------------------------------------------------------------------------
 * Bootstrap util/component-functions.js
 * Licensed under MIT (https://github.com/twbs/bootstrap/blob/main/LICENSE)
 * --------------------------------------------------------------------------
 */

import EventHandler from '../dom/event-handler.js'
import SelectorEngine from '../dom/selector-engine.js'
import { isDisabled } from './index.js'

const enableDismissTrigger = (component, method = 'hide', {
  dismissAttrName = 'data-bs-dismiss',
} = {}) => {
  if (typeof document === 'undefined') {
    return
  }

  const clickEvent = `click.dismiss${component.EVENT_KEY}`
  const name = component.NAME
  const handler = function (event) {
    if (['A', 'AREA'].includes(this.tagName)) {
      event.preventDefault()
    }

    if (isDisabled(this)) {
      return
    }

    // Resolve the target in priority order: an explicit data-bs-target (upstream
    // convention), the dismiss value treated as a selector (VE convention, e.g.
    // `.${hash}`), then the closest `.${name}` ancestor.
    const target =
      SelectorEngine.getElementFromSelector(this) ||
      SelectorEngine.getElementFromSelector(this, dismissAttrName) ||
      this.closest(`.${name}`)
    const instance = component.getOrCreateInstance(target)

    // Method argument is left, for Alert and only, as it doesn't implement the 'hide' method
    const result = instance[method]()
  }

  // Match both the upstream convention (`data-bs-dismiss="name"`) and the VE convention
  // (`data-bs-dismiss=".name"`, a class selector targeting the hashed contract class).
  const dismissSelector = `[${dismissAttrName}="${name}"],[${dismissAttrName}=".${name}"]`
  EventHandler.on(document, clickEvent, dismissSelector, handler)
  const dispose = () => {
    EventHandler.off(document, clickEvent, dismissSelector, handler)
  }

  return dispose
}

export {
  enableDismissTrigger
}
