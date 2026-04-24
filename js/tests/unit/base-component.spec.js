import BaseComponent from '../../src/base-component.js'
import EventHandler from '../../src/dom/event-handler.js'
import { noop } from '../../src/util/index.js'
import { clearFixture, getFixture } from '../helpers/fixture.js'

class DummyClass extends BaseComponent {
  constructor(element) {
    super(element)

    EventHandler.on(this._element, `click${DummyClass.EVENT_KEY}`, noop)
  }

  static get NAME() {
    return 'dummy'
  }
}

describe('Base Component', () => {
  let fixtureEl
  const name = 'dummy'
  let element
  let instance
  const createInstance = () => {
    fixtureEl.innerHTML = '<div id="foo"></div>'
    element = fixtureEl.querySelector('#foo')
    instance = new DummyClass(element)
  }

  beforeAll(() => {
    fixtureEl = getFixture()
  })

  afterEach(() => {
    clearFixture()
  })

  describe('Static Methods', () => {
    describe('VERSION', () => {
      it('should return version', () => {
        expect(DummyClass.VERSION).toEqual(jasmine.any(String))
      })
    })

    describe('DATA_KEY', () => {
      it('should return plugin data key', () => {
        expect(DummyClass.DATA_KEY).toEqual(`bs.${name}`)
      })
    })

    describe('NAME', () => {
      it('should throw an Error if it is not initialized', () => {
        expect(() => {
          // eslint-disable-next-line no-unused-expressions
          BaseComponent.NAME
        }).toThrowError(Error)
      })

      it('should return plugin NAME', () => {
        expect(DummyClass.NAME).toEqual(name)
      })
    })

    describe('EVENT_KEY', () => {
      it('should return plugin event key', () => {
        expect(DummyClass.EVENT_KEY).toEqual(`.bs.${name}`)
      })
    })

    describe('eventName', () => {
      it('should append EVENT_KEY to a bare event name', () => {
        expect(DummyClass.eventName('show')).toEqual('show.bs.dummy')
      })
    })

    describe('ConfigConstants (base)', () => {
      it('base getConfigConstants should return overrides unchanged', () => {
        const overrides = { FOO: 'bar' }
        expect(BaseComponent.getConfigConstants(overrides)).toEqual(overrides)
      })

      it('base ConfigConstants getter should return an empty object', () => {
        expect(BaseComponent.ConfigConstants).toEqual({})
      })

      it('extendDefaultConfig on BaseComponent should use empty-object fallbacks', () => {
        const Custom = BaseComponent.extendDefaultConfig({ CUSTOM_FLAG: true })

        expect(Custom.Default).toEqual({})
        expect(Custom.DefaultType).toEqual({})
        expect(Custom.ConfigConstants.CUSTOM_FLAG).toBeTrue()
      })

      it('returned subclass getConfigConstants should support default empty overrides', () => {
        const Custom = BaseComponent.extendDefaultConfig({ TOKEN: 'x' })

        expect(Custom.getConfigConstants()).toEqual({ TOKEN: 'x' })
      })

      it('extendDefaultConfig should support being called without overrides', () => {
        const Custom = BaseComponent.extendDefaultConfig()

        expect(Custom.Default).toEqual({})
        expect(Custom.DefaultType).toEqual({})
        expect(Custom.ConfigConstants).toEqual({})
      })

      it('extendDefaultConfig should fallback when parent buckets are null', () => {
        class NullBuckets extends BaseComponent {
          static get NAME() {
            return 'null-buckets'
          }

          static get Default() {
            return null
          }

          static get DefaultType() {
            return null
          }

          static get ConfigConstants() {
            return null
          }
        }

        const Custom = NullBuckets.extendDefaultConfig({ CLASS_NAME_ACTIVE: 'active' })

        expect(Custom.Default).toEqual({})
        expect(Custom.DefaultType).toEqual({})
        expect(Custom.ConfigConstants.CLASS_NAME_ACTIVE).toEqual('active')
      })
    })

    describe('extendDefaultConfig classification', () => {
      class TypedComponent extends BaseComponent {
        static get NAME() {
          return 'typed'
        }

        static get Default() {
          return {
            fromDefault: 1
          }
        }

        static get DefaultType() {
          return {
            fromDefault: 'number',
            fromTypeOnly: '(number|boolean)'
          }
        }
      }

      it('should classify key present only in DefaultType as instance option', () => {
        const Custom = TypedComponent.extendDefaultConfig({ fromTypeOnly: false })

        expect(Custom.Default.fromTypeOnly).toBeFalse()
        expect(Custom.ConfigConstants.fromTypeOnly).toBeUndefined()
      })

      it('should infer DefaultType for a new object-valued instance option', () => {
        const Custom = TypedComponent.extendDefaultConfig({ fromDefault: { deep: true } })

        expect(Custom.Default.fromDefault).toEqual({ deep: true })
        expect(Custom.DefaultType.fromDefault).toEqual('number')
      })

      it('should infer DefaultType for a new string-valued instance option', () => {
        class StringDefault extends BaseComponent {
          static get NAME() {
            return 'string-default'
          }

          static get Default() {
            return { mode: 'a' }
          }
        }

        const Custom = StringDefault.extendDefaultConfig({ mode: 'b' })

        expect(Custom.Default.mode).toEqual('b')
        expect(Custom.DefaultType.mode).toEqual('string')
      })

      it('should infer DefaultType for a new boolean-valued instance option', () => {
        class BoolDefault extends BaseComponent {
          static get NAME() {
            return 'bool-default'
          }

          static get Default() {
            return { enabled: true }
          }
        }

        const Custom = BoolDefault.extendDefaultConfig({ enabled: false })

        expect(Custom.Default.enabled).toBeFalse()
        expect(Custom.DefaultType.enabled).toEqual('(boolean|string)')
      })

      it('should infer DefaultType for a new object-valued instance option without parent DefaultType', () => {
        class ObjectDefault extends BaseComponent {
          static get NAME() {
            return 'object-default'
          }

          static get Default() {
            return { options: null }
          }
        }

        const Custom = ObjectDefault.extendDefaultConfig({ options: { deep: true } })

        expect(Custom.Default.options).toEqual({ deep: true })
        expect(Custom.DefaultType.options).toEqual('(null|object|function)')
      })

      it('should infer DefaultType for a new array-valued instance option', () => {
        class ArrayDefault extends BaseComponent {
          static get NAME() {
            return 'array-default'
          }

          static get Default() {
            return { values: [] }
          }
        }

        const Custom = ArrayDefault.extendDefaultConfig({ values: [1, 2] })

        expect(Custom.Default.values).toEqual([1, 2])
        expect(Custom.DefaultType.values).toEqual('array')
      })

      it('should infer DefaultType for numeric fallback branch', () => {
        class NumberDefault extends BaseComponent {
          static get NAME() {
            return 'number-default'
          }

          static get Default() {
            return { count: 1 }
          }
        }

        const Custom = NumberDefault.extendDefaultConfig({ count: 2 })

        expect(Custom.Default.count).toEqual(2)
        expect(Custom.DefaultType.count).toEqual('number')
      })
    })
  })

  describe('Public Methods', () => {
    describe('constructor', () => {
      it('should accept element, either passed as a CSS selector or DOM element', () => {
        fixtureEl.innerHTML = [
          '<div id="foo"></div>',
          '<div id="bar"></div>'
        ].join('')

        const el = fixtureEl.querySelector('#foo')
        const elInstance = new DummyClass(el)
        const selectorInstance = new DummyClass('#bar')

        expect(elInstance._element).toEqual(el)
        expect(selectorInstance._element).toEqual(fixtureEl.querySelector('#bar'))
      })

      it('should not initialize and add element record to Data (caching), if argument `element` is not an HTML element', () => {
        fixtureEl.innerHTML = ''

        const el = fixtureEl.querySelector('#foo')
        const elInstance = new DummyClass(el)
        const selectorInstance = new DummyClass('#bar')

        expect(elInstance._element).not.toBeDefined()
        expect(selectorInstance._element).not.toBeDefined()
      })
    })

    describe('dispose', () => {
      it('should dispose an component', () => {
        createInstance()
        expect(DummyClass.getInstance(element)).not.toBeNull()

        instance.dispose()

        expect(DummyClass.getInstance(element)).toBeNull()
        expect(instance._element).toBeNull()
      })

      it('should de-register element event listeners', () => {
        createInstance()
        const spy = spyOn(EventHandler, 'off')

        instance.dispose()

        expect(spy).toHaveBeenCalledWith(element, DummyClass.EVENT_KEY)
      })
    })

    describe('getInstance', () => {
      it('should return an instance', () => {
        createInstance()

        expect(DummyClass.getInstance(element)).toEqual(instance)
        expect(DummyClass.getInstance(element)).toBeInstanceOf(DummyClass)
      })

      it('should accept element, either passed as a CSS selector, jQuery element, or DOM element', () => {
        createInstance()

        expect(DummyClass.getInstance('#foo')).toEqual(instance)
        expect(DummyClass.getInstance(element)).toEqual(instance)

        const fakejQueryObject = {
          0: element,
          jquery: 'foo'
        }

        expect(DummyClass.getInstance(fakejQueryObject)).toEqual(instance)
      })

      it('should return null when there is no instance', () => {
        fixtureEl.innerHTML = '<div></div>'

        const div = fixtureEl.querySelector('div')

        expect(DummyClass.getInstance(div)).toBeNull()
      })
    })

    describe('getOrCreateInstance', () => {
      it('should return an instance', () => {
        createInstance()

        expect(DummyClass.getOrCreateInstance(element)).toEqual(instance)
        expect(DummyClass.getInstance(element)).toEqual(DummyClass.getOrCreateInstance(element, {}))
        expect(DummyClass.getOrCreateInstance(element)).toBeInstanceOf(DummyClass)
      })

      it('should return new instance when there is no alert instance', () => {
        fixtureEl.innerHTML = '<div id="foo"></div>'
        element = fixtureEl.querySelector('#foo')

        expect(DummyClass.getInstance(element)).toBeNull()
        expect(DummyClass.getOrCreateInstance(element)).toBeInstanceOf(DummyClass)
      })

      it('should create instance when config is a non-object value', () => {
        fixtureEl.innerHTML = '<div id="foo"></div>'
        element = fixtureEl.querySelector('#foo')

        const created = DummyClass.getOrCreateInstance(element, 'toggle')

        expect(created).toBeInstanceOf(DummyClass)
        expect(DummyClass.getInstance(element)).toEqual(created)
      })
    })
  })
})
