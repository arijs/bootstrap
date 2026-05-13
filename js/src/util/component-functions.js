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

    const targetFirst = SelectorEngine.getElementFromSelector(this, dismissAttrName)
    const targetSecond = this.closest(`.${name}`)
    console.log(`bootstrap util/component-functions.js: enableDismissTrigger: handler:`, { targetFirst, targetSecond, this: this, name })
    const target = targetFirst || targetSecond
    const instance = component.getOrCreateInstance(target)

    // Method argument is left, for Alert and only, as it doesn't implement the 'hide' method
    const result = instance[method]()
  }

  EventHandler.on(document, clickEvent, `[${dismissAttrName}=".${name}"]`, handler)
  const dispose = () => {
    EventHandler.off(document, clickEvent, `[${dismissAttrName}=".${name}"]`, handler)
  }

  return dispose
}

export {
  enableDismissTrigger
}
