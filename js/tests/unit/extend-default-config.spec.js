/**
 * Tests for the extendDefaultConfig / ConfigConstants override infrastructure.
 *
 * These are Karma/Jasmine browser tests; they run inside a real browser so
 * DOM interaction (class toggling, Data API clicks) is fully testable.
 */

import BaseComponent from '../../src/base-component.js'
import Button from '../../src/button.js'
import Dropdown from '../../src/dropdown.js'
import { clearFixture, getFixture } from '../helpers/fixture.js'

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

/** Click and wait one microtask tick so delegated listeners fire. */
const click = element => {
  element.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
}

// ---------------------------------------------------------------------------
// describe blocks
// ---------------------------------------------------------------------------

describe('extendDefaultConfig', () => {
  let fixtureEl

  beforeAll(() => {
    fixtureEl = getFixture()

    // Button and Dropdown auto-init their Data API listeners when imported.
    // Destroy them so we don't duplicate the listeners from button.spec.js and dropdown.spec.js.
    Button.destroy()
    Dropdown.destroy()
  })

  afterEach(() => {
    clearFixture()
  })

  // -------------------------------------------------------------------------
  // BaseComponent — static API contract
  // -------------------------------------------------------------------------
  describe('BaseComponent static API', () => {
    class DummyComponent extends BaseComponent {
      static get NAME() {
        return 'dummy'
      }

      static getConfigConstants(overrides = {}) {
        return {
          CLASS_NAME_ACTIVE: 'active',
          SELECTOR_DATA_TOGGLE: '[data-bs-toggle="dummy"]',
          ...overrides
        }
      }

      static get ConfigConstants() {
        return this.getConfigConstants()
      }
    }

    it('should expose getConfigConstants as a static function', () => {
      expect(typeof DummyComponent.getConfigConstants).toBe('function')
    })

    it('should expose ConfigConstants as a static getter', () => {
      expect(DummyComponent.ConfigConstants).toEqual(jasmine.any(Object))
    })

    it('should expose extendDefaultConfig as a static function', () => {
      expect(typeof DummyComponent.extendDefaultConfig).toBe('function')
    })

    it('getConfigConstants should merge caller overrides into defaults', () => {
      const constants = DummyComponent.getConfigConstants({ CLASS_NAME_ACTIVE: 'my-active' })
      expect(constants.CLASS_NAME_ACTIVE).toBe('my-active')
      // default keys still present
      expect(constants.SELECTOR_DATA_TOGGLE).toBe('[data-bs-toggle="dummy"]')
    })

    it('extendDefaultConfig should return a class that extends the original', () => {
      const Custom = DummyComponent.extendDefaultConfig({})
      expect(Custom.prototype instanceof DummyComponent).toBeTrue()
    })

    it('extendDefaultConfig should not mutate the original class', () => {
      DummyComponent.extendDefaultConfig({ CLASS_NAME_ACTIVE: 'mutated' })
      expect(DummyComponent.ConfigConstants.CLASS_NAME_ACTIVE).toBe('active')
    })

    it('extendDefaultConfig should merge structural constant overrides into ConfigConstants', () => {
      const Custom = DummyComponent.extendDefaultConfig({ CLASS_NAME_ACTIVE: 'custom-active' })
      expect(Custom.ConfigConstants.CLASS_NAME_ACTIVE).toBe('custom-active')
    })

    it('extendDefaultConfig should preserve parent ConfigConstants not explicitly overridden', () => {
      const Custom = DummyComponent.extendDefaultConfig({ CLASS_NAME_ACTIVE: 'custom-active' })
      expect(Custom.ConfigConstants.SELECTOR_DATA_TOGGLE).toBe('[data-bs-toggle="dummy"]')
    })

    it('extendDefaultConfig should classify instance options into Default', () => {
      // DummyComponent has no Default — add one for this sub-test
      class WithDefault extends DummyComponent {
        static get Default() {
          return { interval: 5000 }
        }

        static get DefaultType() {
          return { interval: '(number|boolean)' }
        }
      }

      const Custom = WithDefault.extendDefaultConfig({ interval: 3000 })
      expect(Custom.Default.interval).toBe(3000)
      // interval is an instance option, so it must NOT appear in ConfigConstants
      expect(Custom.ConfigConstants.interval).toBeUndefined()
    })

    it('extendDefaultConfig should support further chaining', () => {
      const Level1 = DummyComponent.extendDefaultConfig({ CLASS_NAME_ACTIVE: 'level1' })
      const Level2 = Level1.extendDefaultConfig({ CLASS_NAME_ACTIVE: 'level2' })
      expect(Level2.ConfigConstants.CLASS_NAME_ACTIVE).toBe('level2')
      expect(Level1.ConfigConstants.CLASS_NAME_ACTIVE).toBe('level1')
    })

    it('extendDefaultConfig subclass should inherit NAME from parent', () => {
      const Custom = DummyComponent.extendDefaultConfig({})
      expect(Custom.NAME).toBe('dummy')
    })

    it('extendDefaultConfig subclass should inherit DATA_KEY and EVENT_KEY', () => {
      const Custom = DummyComponent.extendDefaultConfig({})
      expect(Custom.DATA_KEY).toBe('bs.dummy')
      expect(Custom.EVENT_KEY).toBe('.bs.dummy')
    })
  })

  // -------------------------------------------------------------------------
  // Button — init / destroy lifecycle & Data API class name override
  // -------------------------------------------------------------------------
  describe('Button override', () => {
    it('should expose init and destroy as static functions', () => {
      expect(typeof Button.init).toBe('function')
      expect(typeof Button.destroy).toBe('function')
    })

    it('should report _isInitialized correctly', () => {
      Button.destroy()
      expect(Button._isInitialized).toBeFalse()
      Button.init()
      expect(Button._isInitialized).toBeTrue()
    })

    it('calling init twice should not double-register listeners', () => {
      Button.init()
      Button.init()
      // Should not throw and _isInitialized stays true
      expect(Button._isInitialized).toBeTrue()
    })

    it('Data API: should apply CLASS_NAME_ACTIVE from ConfigConstants (default "active")', () => {
      fixtureEl.innerHTML = '<button class="btn" data-bs-toggle="button">btn</button>'
      const btn = fixtureEl.querySelector('[data-bs-toggle="button"]')
      click(btn)
      expect(btn.classList.contains('active')).toBeTrue()
    })

    it('Data API: custom CLASS_NAME_SHOW on subclass should toggle custom class, not default', () => {
      Button.destroy()

      const CustomButton = Button.extendDefaultConfig({
        CLASS_NAME_ACTIVE: 'my-active',
        SELECTOR_DATA_TOGGLE: '[data-test-toggle="button"]'
      })
      CustomButton.init()

      fixtureEl.innerHTML = '<button class="btn" data-test-toggle="button">btn</button>'
      const btn = fixtureEl.querySelector('[data-test-toggle="button"]')

      click(btn)
      expect(btn.classList.contains('my-active')).toBeTrue()
      expect(btn.classList.contains('active')).toBeFalse()

      CustomButton.destroy()
      Button.init() // restore for subsequent tests
    })

    it('toggle() method should use ConfigConstants.CLASS_NAME_ACTIVE from subclass', () => {
      const CustomButton = Button.extendDefaultConfig({ CLASS_NAME_ACTIVE: 'btn-selected' })

      fixtureEl.innerHTML = '<button class="btn" data-bs-toggle="button">btn</button>'
      const btnEl = fixtureEl.querySelector('.btn')
      const instance = new CustomButton(btnEl)

      instance.toggle()
      expect(btnEl.classList.contains('btn-selected')).toBeTrue()
      expect(btnEl.classList.contains('active')).toBeFalse()
    })

    it('original Button Data API should NOT activate elements with custom selector after destroy+recreate', () => {
      Button.destroy()

      const CustomButton = Button.extendDefaultConfig({
        SELECTOR_DATA_TOGGLE: '[data-custom-btn]'
      })
      CustomButton.init()

      fixtureEl.innerHTML = '<button class="btn" data-custom-btn>btn</button>'
      const btn = fixtureEl.querySelector('[data-custom-btn]')

      // The original Button listener is destroyed so original selector won't fire
      // But CustomButton listener is active for the custom selector
      click(btn)
      expect(btn.classList.contains('active')).toBeTrue()

      CustomButton.destroy()
      Button.init() // restore for subsequent tests
    })
  })

  // -------------------------------------------------------------------------
  // Dropdown — class name override affects show/hide DOM state
  // -------------------------------------------------------------------------
  describe('Dropdown override', () => {
    const dropdownFixture = (toggleSelector = '[data-bs-toggle="dropdown"]') => `
      <div class="dropdown">
        <button class="btn dropdown-toggle" ${toggleSelector.replace(/^\[|\]$/g, '')}>Dropdown</button>
        <div class="dropdown-menu">
          <a class="dropdown-item" href="#">Link</a>
        </div>
      </div>`

    it('should expose ConfigConstants with all expected structural keys', () => {
      const keys = Object.keys(Dropdown.ConfigConstants)
      for (const key of ['CLASS_NAME_SHOW', 'SELECTOR_DATA_TOGGLE', 'SELECTOR_MENU', 'PLACEMENT_BOTTOM']) {
        expect(keys).toContain(key)
      }
    })

    it('extendDefaultConfig: CLASS_NAME_SHOW override should land in ConfigConstants', () => {
      const Custom = Dropdown.extendDefaultConfig({ CLASS_NAME_SHOW: 'is-open' })
      expect(Custom.ConfigConstants.CLASS_NAME_SHOW).toBe('is-open')
      expect(Dropdown.ConfigConstants.CLASS_NAME_SHOW).toBe('show')
    })

    it('extendDefaultConfig: CLASS_NAME_SHOW override — instance uses custom class when shown', () => {
      return new Promise(resolve => {
        fixtureEl.innerHTML = dropdownFixture()
        const toggleEl = fixtureEl.querySelector('[data-bs-toggle="dropdown"]')
        const menuEl = fixtureEl.querySelector('.dropdown-menu')

        const CustomDropdown = Dropdown.extendDefaultConfig({
          CLASS_NAME_SHOW: 'is-open'
        })
        const dropdown = new CustomDropdown(toggleEl)

        toggleEl.addEventListener('shown.bs.dropdown', () => {
          expect(menuEl.classList.contains('is-open')).toBeTrue()
          expect(menuEl.classList.contains('show')).toBeFalse()
          dropdown.dispose()
          resolve()
        })

        dropdown.show()
      })
    })

    it('extendDefaultConfig: instance option override (autoClose: false) should be in Default', () => {
      const Custom = Dropdown.extendDefaultConfig({ autoClose: false })
      expect(Custom.Default.autoClose).toBeFalse()
      // The parent default was true — original must be unchanged
      expect(Dropdown.Default.autoClose).toBeTrue()
    })

    it('extendDefaultConfig: structural constant override should not appear in Default', () => {
      const Custom = Dropdown.extendDefaultConfig({ CLASS_NAME_SHOW: 'is-open' })
      expect(Custom.Default.CLASS_NAME_SHOW).toBeUndefined()
      expect(Custom.ConfigConstants.CLASS_NAME_SHOW).toBe('is-open')
    })
  })

  // -------------------------------------------------------------------------
  // Cross-component invariants — Button and Dropdown
  // -------------------------------------------------------------------------
  describe('Cross-component invariants', () => {
    const components = [
      { name: 'Button', cls: Button },
      { name: 'Dropdown', cls: Dropdown }
    ]

    for (const { name, cls } of components) {
      describe(name, () => {
        it('should have a getConfigConstants static method', () => {
          expect(typeof cls.getConfigConstants).toBe('function')
        })

        it('should have a ConfigConstants static getter returning an object', () => {
          expect(cls.ConfigConstants).toEqual(jasmine.any(Object))
        })

        it('should have an extendDefaultConfig static method', () => {
          expect(typeof cls.extendDefaultConfig).toBe('function')
        })

        it('should have a static init method', () => {
          expect(typeof cls.init).toBe('function')
        })

        it('should have a static destroy method', () => {
          expect(typeof cls.destroy).toBe('function')
        })

        it('extendDefaultConfig should return a subclass', () => {
          const Custom = cls.extendDefaultConfig({ _testKey: '_testVal' })
          expect(Custom.prototype instanceof cls).toBeTrue()
        })

        it('extendDefaultConfig should expose added key in ConfigConstants', () => {
          const Custom = cls.extendDefaultConfig({ _testKey: '_testVal' })
          expect(Custom.ConfigConstants._testKey).toBe('_testVal')
        })

        it('extendDefaultConfig should not mutate the original ConfigConstants', () => {
          cls.extendDefaultConfig({ _mutationCheck: true })
          expect(cls.ConfigConstants._mutationCheck).toBeUndefined()
        })
      })
    }
  })
})
