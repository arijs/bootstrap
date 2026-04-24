/**
 * --------------------------------------------------------------------------
 * Bootstrap util/component-functions.js
 * Licensed under MIT (https://github.com/twbs/bootstrap/blob/main/LICENSE)
 * --------------------------------------------------------------------------
 */

import EventHandler from '../dom/event-handler.js'
import SelectorEngine from '../dom/selector-engine.js'
import { isDisabled } from './index.js'

const enableDismissTrigger = (component, method = 'hide') => {
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

    const target = SelectorEngine.getElementFromSelector(this) || this.closest(`.${name}`)
    const instance = component.getOrCreateInstance(target)

    // Method argument is left, for Alert and only, as it doesn't implement the 'hide' method
    const result = instance[method]()
  }

  EventHandler.on(document, clickEvent, `[data-bs-dismiss="${name}"]`, handler)
  const dispose = () => {
    EventHandler.off(document, clickEvent, `[data-bs-dismiss="${name}"]`, handler)
  }

  return dispose
}

export {
  enableDismissTrigger
}
