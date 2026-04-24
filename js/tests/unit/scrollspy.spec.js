import EventHandler from '../../src/dom/event-handler.js'
import ScrollSpy from '../../src/scrollspy.js'
import {
  clearFixture, createEvent, getFixture, jQueryMock
} from '../helpers/fixture.js'

describe('ScrollSpy', () => {
  let fixtureEl

  const getElementScrollSpy = element => element.scrollTo ?
    spyOn(element, 'scrollTo').and.callThrough() :
    spyOnProperty(element, 'scrollTop', 'set').and.callThrough()

  const scrollTo = (el, height) => {
    el.scrollTop = height
  }

  const onScrollStop = (callback, element, timeout = 30) => {
    let handle = null
    const onScroll = function () {
      if (handle) {
        window.clearTimeout(handle)
      }

      handle = setTimeout(() => {
        element.removeEventListener('scroll', onScroll)
        callback()
      }, timeout + 1)
    }

    element.addEventListener('scroll', onScroll)
  }

  const getDummyFixture = () => {
    return [
      '<nav id="navBar" class="navbar">',
      '  <ul class="nav">',
      '    <li class="nav-item"><a id="li-jsm-1" class="nav-link" href="#div-jsm-1">div 1</a></li>',
      '  </ul>',
      '</nav>',
      '<div class="content" data-bs-target="#navBar" style="overflow-y: auto">',
      '  <div id="div-jsm-1">div 1</div>',
      '</div>'
    ].join('')
  }

  const testElementIsActiveAfterScroll = ({ elementSelector, targetSelector, contentEl, scrollSpy, cb }) => {
    const element = fixtureEl.querySelector(elementSelector)
    const target = fixtureEl.querySelector(targetSelector)
    // add top padding to fix Chrome on Android failures
    const paddingTop = 0
    const parentOffset = getComputedStyle(contentEl).getPropertyValue('position') === 'relative' ? 0 : contentEl.offsetTop
    const scrollHeight = (target.offsetTop - parentOffset) + paddingTop

    contentEl.addEventListener('activate.bs.scrollspy', event => {
      if (scrollSpy._activeTarget !== element) {
        return
      }

      expect(element).toHaveClass('active')
      expect(scrollSpy._activeTarget).toEqual(element)
      expect(event.relatedTarget).toEqual(element)
      cb()
    })

    setTimeout(() => { // in case we scroll something before the test
      scrollTo(contentEl, scrollHeight)
    }, 100)
  }

  beforeAll(() => {
    fixtureEl = getFixture()
  })

  afterEach(() => {
    clearFixture()
  })

  describe('VERSION', () => {
    it('should return plugin version', () => {
      expect(ScrollSpy.VERSION).toEqual(jasmine.any(String))
    })
  })

  describe('Default', () => {
    it('should return plugin default config', () => {
      expect(ScrollSpy.Default).toEqual(jasmine.any(Object))
    })
  })

  describe('ConfigConstants', () => {
    it('should return defaults when called without overrides', () => {
      const constants = ScrollSpy.getConfigConstants()

      expect(constants.CLASS_NAME_ACTIVE).toEqual('active')
      expect(constants.SELECTOR_DATA_SPY).toEqual('[data-bs-spy="scroll"]')
    })
  })

  describe('DATA_KEY', () => {
    it('should return plugin data key', () => {
      expect(ScrollSpy.DATA_KEY).toEqual('bs.scrollspy')
    })
  })

  describe('data-api lifecycle', () => {
    it('should expose init and destroy static methods', () => {
      expect(typeof ScrollSpy.init).toBe('function')
      expect(typeof ScrollSpy.destroy).toBe('function')
    })

    it('init should be idempotent', () => {
      ScrollSpy.destroy()
      expect(ScrollSpy._isInitialized).toBeFalse()

      ScrollSpy.init()
      ScrollSpy.init()

      expect(ScrollSpy._isInitialized).toBeTrue()
      ScrollSpy.destroy()
      ScrollSpy.init()
    })

    it('destroy should return early when not initialized', () => {
      ScrollSpy.destroy()
      expect(ScrollSpy._isInitialized).toBeFalse()

      expect(() => ScrollSpy.destroy()).not.toThrow()
      expect(ScrollSpy._isInitialized).toBeFalse()

      ScrollSpy.init()
    })
  })

  describe('private branch behavior', () => {
    it('should activate dropdown toggle when target is a dropdown item', () => {
      fixtureEl.innerHTML = [
        '<div class="dropdown">',
        '  <button class="dropdown-toggle">Toggle</button>',
        '  <a class="dropdown-item" href="#section">Section</a>',
        '</div>'
      ].join('')

      const dropdownItem = fixtureEl.querySelector('.dropdown-item')
      const dropdownToggle = fixtureEl.querySelector('.dropdown-toggle')
      const scrollSpy = Object.create(ScrollSpy.prototype)

      scrollSpy._activateParents(dropdownItem)

      expect(dropdownToggle).toHaveClass('active')
    })

    it('smooth scroll handler should fallback to scrollTop when root has no scrollTo', () => {
      fixtureEl.innerHTML = [
        '<nav id="spy-nav">',
        '  <a class="nav-link" href="#section-a">A</a>',
        '</nav>',
        '<div id="container"></div>',
        '<section id="section-a"></section>'
      ].join('')

      const navEl = fixtureEl.querySelector('#spy-nav')
      const anchor = fixtureEl.querySelector('a[href="#section-a"]')
      const container = fixtureEl.querySelector('#container')
      const section = fixtureEl.querySelector('#section-a')

      Object.defineProperty(container, 'offsetTop', { value: 20, configurable: true })
      Object.defineProperty(section, 'offsetTop', { value: 120, configurable: true })

      const rootElement = { scrollTop: 0 }
      const scrollSpy = Object.create(ScrollSpy.prototype)
      scrollSpy._config = {
        smoothScroll: true,
        target: navEl
      }
      scrollSpy._rootElement = rootElement
      scrollSpy._element = container
      scrollSpy._observableSections = new Map([['#section-a', section]])

      scrollSpy._maybeEnableSmoothScroll()

      anchor.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))

      expect(rootElement.scrollTop).toEqual(100)
    })

    it('smooth scroll handler should use root.scrollTo when available', () => {
      fixtureEl.innerHTML = [
        '<nav id="spy-nav-2">',
        '  <a class="nav-link" href="#section-b">B</a>',
        '</nav>',
        '<div id="container-b"></div>',
        '<section id="section-b"></section>'
      ].join('')

      const navEl = fixtureEl.querySelector('#spy-nav-2')
      const anchor = fixtureEl.querySelector('a[href="#section-b"]')
      const container = fixtureEl.querySelector('#container-b')
      const section = fixtureEl.querySelector('#section-b')

      Object.defineProperty(container, 'offsetTop', { value: 10, configurable: true })
      Object.defineProperty(section, 'offsetTop', { value: 210, configurable: true })

      const rootElement = {
        scrollTo: jasmine.createSpy('scrollTo')
      }

      const scrollSpy = Object.create(ScrollSpy.prototype)
      scrollSpy._config = {
        smoothScroll: true,
        target: navEl
      }
      scrollSpy._rootElement = rootElement
      scrollSpy._element = container
      scrollSpy._observableSections = new Map([['#section-b', section]])

      scrollSpy._maybeEnableSmoothScroll()

      anchor.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))

      expect(rootElement.scrollTo).toHaveBeenCalledWith({ top: 200, behavior: 'smooth' })
    })

    it('observer callback should use _rootElement scrollTop when present', () => {
      const targetLink = document.createElement('a')
      const section = document.createElement('div')
      section.id = 'section-c'
      Object.defineProperty(section, 'offsetTop', { value: 50, configurable: true })

      const scrollSpy = Object.create(ScrollSpy.prototype)
      scrollSpy._rootElement = { scrollTop: 25 }
      scrollSpy._targetLinks = new Map([['#section-c', targetLink]])
      scrollSpy._previousScrollData = {
        visibleEntryTop: 0,
        parentScrollTop: 0
      }
      scrollSpy._clearActiveClass = jasmine.createSpy('_clearActiveClass')
      scrollSpy._process = jasmine.createSpy('_process')

      scrollSpy._observerCallback([
        {
          isIntersecting: false,
          target: section
        }
      ])

      expect(scrollSpy._previousScrollData.parentScrollTop).toEqual(25)
      expect(scrollSpy._clearActiveClass).toHaveBeenCalledWith(targetLink)
    })

    it('smooth scroll handler should fallback to window when _rootElement is null', () => {
      fixtureEl.innerHTML = [
        '<nav id="spy-nav-3">',
        '  <a class="nav-link" href="#section-d">D</a>',
        '</nav>',
        '<div id="container-d"></div>',
        '<section id="section-d"></section>'
      ].join('')

      const navEl = fixtureEl.querySelector('#spy-nav-3')
      const anchor = fixtureEl.querySelector('a[href="#section-d"]')
      const container = fixtureEl.querySelector('#container-d')
      const section = fixtureEl.querySelector('#section-d')

      Object.defineProperty(container, 'offsetTop', { value: 5, configurable: true })
      Object.defineProperty(section, 'offsetTop', { value: 55, configurable: true })

      const scrollToSpy = spyOn(window, 'scrollTo').and.callFake(() => {})

      const scrollSpy = Object.create(ScrollSpy.prototype)
      scrollSpy._config = {
        smoothScroll: true,
        target: navEl
      }
      scrollSpy._rootElement = null
      scrollSpy._element = container
      scrollSpy._observableSections = new Map([['#section-d', section]])

      scrollSpy._maybeEnableSmoothScroll()

      anchor.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))

      expect(scrollToSpy).toHaveBeenCalledWith({ top: 50, behavior: 'smooth' })
    })

    it('observer callback should fallback to documentElement scrollTop when _rootElement is null', () => {
      const targetLink = document.createElement('a')
      const section = document.createElement('div')
      section.id = 'section-e'
      Object.defineProperty(section, 'offsetTop', { value: 20, configurable: true })

      spyOnProperty(document.documentElement, 'scrollTop', 'get').and.returnValue(42)

      const scrollSpy = Object.create(ScrollSpy.prototype)
      scrollSpy._rootElement = null
      scrollSpy._targetLinks = new Map([['#section-e', targetLink]])
      scrollSpy._previousScrollData = {
        visibleEntryTop: 0,
        parentScrollTop: 0
      }
      scrollSpy._clearActiveClass = jasmine.createSpy('_clearActiveClass')
      scrollSpy._process = jasmine.createSpy('_process')

      scrollSpy._observerCallback([
        {
          isIntersecting: false,
          target: section
        }
      ])

      expect(scrollSpy._previousScrollData.parentScrollTop).toEqual(42)
      expect(scrollSpy._clearActiveClass).toHaveBeenCalledWith(targetLink)
    })
  })

  describe('constructor', () => {
    it('should take care of element either passed as a CSS selector or DOM element', () => {
      fixtureEl.innerHTML = getDummyFixture()

      const sSpyEl = fixtureEl.querySelector('.content')
      const sSpyBySelector = new ScrollSpy('.content')
      const sSpyByElement = new ScrollSpy(sSpyEl)

      expect(sSpyBySelector._element).toEqual(sSpyEl)
      expect(sSpyByElement._element).toEqual(sSpyEl)
    })

    it('should null, if element is not scrollable', () => {
      fixtureEl.innerHTML = [
        '<nav id="navigation" class="navbar">',
        '  <ul class="navbar-nav">' +
        '     <li class="nav-item"><a class="nav-link active" id="one-link" href="#">One</a></li>' +
        '  </ul>',
        '</nav>',
        '<div id="content">',
        '  <div id="1" style="height: 300px;">test</div>',
        '</div>'
      ].join('')

      const scrollSpy = new ScrollSpy(fixtureEl.querySelector('#content'), {
        target: '#navigation'
      })

      expect(scrollSpy._observer.root).toBeNull()
      expect(scrollSpy._rootElement).toBeNull()
    })

    it('should respect threshold option', () => {
      fixtureEl.innerHTML = [
        '<ul id="navigation" class="navbar">',
        '   <a class="nav-link active" id="one-link" href="#">One</a>' +
        '</ul>',
        '<div id="content">',
        '  <div id="one-link">test</div>',
        '</div>'
      ].join('')

      const scrollSpy = new ScrollSpy('#content', {
        target: '#navigation',
        threshold: [1]
      })

      expect(scrollSpy._observer.thresholds).toEqual([1])
    })

    it('should respect threshold option markup', () => {
      fixtureEl.innerHTML = [
        '<ul id="navigation" class="navbar">',
        '   <a class="nav-link active" id="one-link" href="#">One</a>' +
        '</ul>',
        '<div id="content" data-bs-threshold="0,0.2,1">',
        '  <div id="one-link">test</div>',
        '</div>'
      ].join('')

      const scrollSpy = new ScrollSpy('#content', {
        target: '#navigation'
      })

      // See https://stackoverflow.com/a/45592926
      const expectToBeCloseToArray = (actual, expected) => {
        expect(actual.length).toBe(expected.length)
        for (const x of actual) {
          const i = actual.indexOf(x)
          expect(x).withContext(`[${i}]`).toBeCloseTo(expected[i])
        }
      }

      expectToBeCloseToArray(scrollSpy._observer.thresholds, [0, 0.2, 1])
    })

    it('should not take count to not visible sections', () => {
      fixtureEl.innerHTML = [
        '<nav id="navigation" class="navbar">',
        '  <ul class="navbar-nav">',
        '    <li class="nav-item"><a class="nav-link active" id="one-link" href="#one">One</a></li>',
        '    <li class="nav-item"><a class="nav-link" id="two-link" href="#two">Two</a></li>',
        '    <li class="nav-item"><a class="nav-link" id="three-link" href="#three">Three</a></li>',
        '  </ul>',
        '</nav>',
        '<div id="content" style="height: 200px; overflow-y: auto;">',
        '  <div id="one" style="height: 300px;">test</div>',
        '  <div id="two" hidden style="height: 300px;">test</div>',
        '  <div id="three"  style="display: none;">test</div>',
        '</div>'
      ].join('')

      const scrollSpy = new ScrollSpy(fixtureEl.querySelector('#content'), {
        target: '#navigation'
      })

      expect(scrollSpy._observableSections.size).toBe(1)
      expect(scrollSpy._targetLinks.size).toBe(1)
    })

    it('should not process element without target', () => {
      fixtureEl.innerHTML = [
        '<nav id="navigation" class="navbar">',
        '  <ul class="navbar-nav">',
        '    <li class="nav-item"><a class="nav-link active" id="one-link" href="#">One</a></li>',
        '    <li class="nav-item"><a class="nav-link" id="two-link" href="#two">Two</a></li>',
        '    <li class="nav-item"><a class="nav-link" id="three-link" href="#three">Three</a></li>',
        '  </ul>',
        '</nav>',
        '<div id="content" style="height: 200px; overflow-y: auto;">',
        '  <div id="two" style="height: 300px;">test</div>',
        '  <div id="three" style="height: 10px;">test2</div>',
        '</div>'
      ].join('')

      const scrollSpy = new ScrollSpy(fixtureEl.querySelector('#content'), {
        target: '#navigation'
      })

      expect(scrollSpy._targetLinks).toHaveSize(2)
    })

    it('should only switch "active" class on current target', () => {
      return new Promise(resolve => {
        fixtureEl.innerHTML = [
          '<div id="root" class="active" style="display: block">',
          '  <div class="topbar">',
          '    <div class="topbar-inner">',
          '      <div class="container" id="ss-target">',
          '        <ul class="nav">',
          '          <li class="nav-item"><a href="#masthead">Overview</a></li>',
          '          <li class="nav-item"><a href="#detail">Detail</a></li>',
          '        </ul>',
          '      </div>',
          '    </div>',
          '  </div>',
          '  <div id="scrollspy-example" style="height: 100px; overflow: auto;">',
          '     <div style="height: 200px;" id="masthead">Overview</div>',
          '     <div style="height: 200px;" id="detail">Detail</div>',
          '  </div>',
          '</div>'
        ].join('')

        const scrollSpyEl = fixtureEl.querySelector('#scrollspy-example')
        const rootEl = fixtureEl.querySelector('#root')
        const scrollSpy = new ScrollSpy(scrollSpyEl, {
          target: 'ss-target'
        })

        const spy = spyOn(scrollSpy, '_process').and.callThrough()

        onScrollStop(() => {
          expect(rootEl).toHaveClass('active')
          expect(spy).toHaveBeenCalled()
          resolve()
        }, scrollSpyEl)

        scrollTo(scrollSpyEl, 350)
      })
    })

    it('should not process data if `activeTarget` is same as given target', () => {
      return new Promise((resolve, reject) => {
        fixtureEl.innerHTML = [
          '<nav class="navbar">',
          '  <ul class="nav">',
          '    <li class="nav-item"><a class="nav-link" id="a-1" href="#div-1">div 1</a></li>',
          '    <li class="nav-item"><a class="nav-link" id="a-2" href="#div-2">div 2</a></li>',
          '  </ul>',
          '</nav>',
          '<div class="content" style="overflow: auto; height: 50px">',
          '  <div id="div-1" style="height: 100px; padding: 0; margin: 0">div 1</div>',
          '  <div id="div-2" style="height: 200px; padding: 0; margin: 0">div 2</div>',
          '</div>'
        ].join('')

        const contentEl = fixtureEl.querySelector('.content')
        const scrollSpy = new ScrollSpy(contentEl, {
          offset: 0,
          target: '.navbar'
        })

        const triggerSpy = spyOn(EventHandler, 'trigger').and.callThrough()

        scrollSpy._activeTarget = fixtureEl.querySelector('#a-1')
        testElementIsActiveAfterScroll({
          elementSelector: '#a-1',
          targetSelector: '#div-1',
          contentEl,
          scrollSpy,
          cb: reject
        })

        setTimeout(() => {
          expect(triggerSpy).not.toHaveBeenCalled()
          resolve()
        }, 100)
      })
    })

    it('should only switch "active" class on current target specified w element', () => {
      return new Promise(resolve => {
        fixtureEl.innerHTML = [
          '<div id="root" class="active" style="display: block">',
          '  <div class="topbar">',
          '    <div class="topbar-inner">',
          '      <div class="container" id="ss-target">',
          '        <ul class="nav">',
          '          <li class="nav-item"><a href="#masthead">Overview</a></li>',
          '          <li class="nav-item"><a href="#detail">Detail</a></li>',
          '        </ul>',
          '      </div>',
          '    </div>',
          '  </div>',
          '  <div id="scrollspy-example" style="height: 100px; overflow: auto;">',
          '    <div style="height: 200px;" id="masthead">Overview</div>',
          '    <div style="height: 200px;" id="detail">Detail</div>',
          '  </div>',
          '</div>'
        ].join('')

        const scrollSpyEl = fixtureEl.querySelector('#scrollspy-example')
        const rootEl = fixtureEl.querySelector('#root')
        const scrollSpy = new ScrollSpy(scrollSpyEl, {
          target: fixtureEl.querySelector('#ss-target')
        })

        const spy = spyOn(scrollSpy, '_process').and.callThrough()

        onScrollStop(() => {
          expect(rootEl).toHaveClass('active')
          expect(scrollSpy._activeTarget).toEqual(fixtureEl.querySelector('[href="#detail"]'))
          expect(spy).toHaveBeenCalled()
          resolve()
        }, scrollSpyEl)

        scrollTo(scrollSpyEl, 350)
      })
    })

    it('should add the active class to the correct element', () => {
      return new Promise(resolve => {
        fixtureEl.innerHTML = [
          '<nav class="navbar">',
          '  <ul class="nav">',
          '    <li class="nav-item"><a class="nav-link" id="a-1" href="#div-1">div 1</a></li>',
          '    <li class="nav-item"><a class="nav-link" id="a-2" href="#div-2">div 2</a></li>',
          '  </ul>',
          '</nav>',
          '<div class="content" style="overflow: auto; height: 50px">',
          '  <div id="div-1" style="height: 100px; padding: 0; margin: 0">div 1</div>',
          '  <div id="div-2" style="height: 200px; padding: 0; margin: 0">div 2</div>',
          '</div>'
        ].join('')

        const contentEl = fixtureEl.querySelector('.content')
        const scrollSpy = new ScrollSpy(contentEl, {
          offset: 0,
          target: '.navbar'
        })

        testElementIsActiveAfterScroll({
          elementSelector: '#a-1',
          targetSelector: '#div-1',
          contentEl,
          scrollSpy,
          cb() {
            testElementIsActiveAfterScroll({
              elementSelector: '#a-2',
              targetSelector: '#div-2',
              contentEl,
              scrollSpy,
              cb: resolve
            })
          }
        })
      })
    })

    it('should add to nav the active class to the correct element (nav markup)', () => {
      return new Promise(resolve => {
        fixtureEl.innerHTML = [
          '<nav class="navbar">',
          '  <nav class="nav">',
          '    <a class="nav-link" id="a-1" href="#div-1">div 1</a>',
          '    <a class="nav-link" id="a-2" href="#div-2">div 2</a>',
          '  </nav>',
          '</nav>',
          '<div class="content" style="overflow: auto; height: 50px">',
          '  <div id="div-1" style="height: 100px; padding: 0; margin: 0">div 1</div>',
          '  <div id="div-2" style="height: 200px; padding: 0; margin: 0">div 2</div>',
          '</div>'
        ].join('')

        const contentEl = fixtureEl.querySelector('.content')
        const scrollSpy = new ScrollSpy(contentEl, {
          offset: 0,
          target: '.navbar'
        })

        testElementIsActiveAfterScroll({
          elementSelector: '#a-1',
          targetSelector: '#div-1',
          contentEl,
          scrollSpy,
          cb() {
            testElementIsActiveAfterScroll({
              elementSelector: '#a-2',
              targetSelector: '#div-2',
              contentEl,
              scrollSpy,
              cb: resolve
            })
          }
        })
      })
    })

    it('should add to list-group, the active class to the correct element (list-group markup)', () => {
      return new Promise(resolve => {
        fixtureEl.innerHTML = [
          '<nav class="navbar">',
          '  <div class="list-group">',
          '    <a class="list-group-item" id="a-1" href="#div-1">div 1</a>',
          '    <a class="list-group-item" id="a-2" href="#div-2">div 2</a>',
          '  </div>',
          '</nav>',
          '<div class="content" style="overflow: auto; height: 50px">',
          '  <div id="div-1" style="height: 100px; padding: 0; margin: 0">div 1</div>',
          '  <div id="div-2" style="height: 200px; padding: 0; margin: 0">div 2</div>',
          '</div>'
        ].join('')

        const contentEl = fixtureEl.querySelector('.content')
        const scrollSpy = new ScrollSpy(contentEl, {
          offset: 0,
          target: '.navbar'
        })

        testElementIsActiveAfterScroll({
          elementSelector: '#a-1',
          targetSelector: '#div-1',
          contentEl,
          scrollSpy,
          cb() {
            testElementIsActiveAfterScroll({
              elementSelector: '#a-2',
              targetSelector: '#div-2',
              contentEl,
              scrollSpy,
              cb: resolve
            })
          }
        })
      })
    })

    it('should clear selection if above the first section', () => {
      return new Promise(resolve => {
        fixtureEl.innerHTML = [
          '<div id="header" style="height: 500px;"></div>',
          '<nav id="navigation" class="navbar">',
          '  <ul class="navbar-nav">',
          '    <li class="nav-item"><a id="one-link"   class="nav-link active" href="#one">One</a></li>',
          '    <li class="nav-item"><a id="two-link"   class="nav-link" href="#two">Two</a></li>',
          '    <li class="nav-item"><a id="three-link" class="nav-link" href="#three">Three</a></li>',
          '  </ul>',
          '</nav>',
          '<div id="content" style="height: 200px; overflow-y: auto;">',
          '  <div id="spacer" style="height: 200px;"></div>',
          '  <div id="one" style="height: 100px;">text</div>',
          '  <div id="two" style="height: 100px;">text</div>',
          '  <div id="three" style="height: 100px;">text</div>',
          '  <div id="spacer" style="height: 100px;"></div>',
          '</div>'
        ].join('')

        const contentEl = fixtureEl.querySelector('#content')
        const scrollSpy = new ScrollSpy(contentEl, {
          target: '#navigation',
          offset: contentEl.offsetTop
        })
        const spy = spyOn(scrollSpy, '_process').and.callThrough()

        onScrollStop(() => {
          const active = () => fixtureEl.querySelector('.active')
          expect(spy).toHaveBeenCalled()

          expect(fixtureEl.querySelectorAll('.active')).toHaveSize(1)
          expect(active().getAttribute('id')).toEqual('two-link')
          onScrollStop(() => {
            expect(active()).toBeNull()
            resolve()
          }, contentEl)
          scrollTo(contentEl, 0)
        }, contentEl)

        scrollTo(contentEl, 200)
      })
    })

    it('should not clear selection if above the first section and first section is at the top', () => {
      return new Promise(resolve => {
        fixtureEl.innerHTML = [
          '<div id="header" style="height: 500px;"></div>',
          '<nav id="navigation" class="navbar">',
          '  <ul class="navbar-nav">',
          '    <li class="nav-item"><a id="one-link" class="nav-link active" href="#one">One</a></li>',
          '    <li class="nav-item"><a id="two-link" class="nav-link" href="#two">Two</a></li>',
          '    <li class="nav-item"><a id="three-link" class="nav-link" href="#three">Three</a></li>',
          '  </ul>',
          '</nav>',
          '<div id="content" style="height: 150px; overflow-y: auto;">',
          '  <div id="one" style="height: 100px;">test</div>',
          '  <div id="two" style="height: 100px;">test</div>',
          '  <div id="three" style="height: 100px;">test</div>',
          '  <div id="spacer" style="height: 100px;">test</div>',
          '</div>'
        ].join('')

        const negativeHeight = 0
        const startOfSectionTwo = 101
        const contentEl = fixtureEl.querySelector('#content')
        // eslint-disable-next-line no-unused-vars
        const scrollSpy = new ScrollSpy(contentEl, {
          target: '#navigation',
          rootMargin: '0px 0px -50%'
        })

        onScrollStop(() => {
          const activeId = () => fixtureEl.querySelector('.active').getAttribute('id')

          expect(fixtureEl.querySelectorAll('.active')).toHaveSize(1)
          expect(activeId()).toEqual('two-link')
          scrollTo(contentEl, negativeHeight)

          onScrollStop(() => {
            expect(fixtureEl.querySelectorAll('.active')).toHaveSize(1)
            expect(activeId()).toEqual('one-link')
            resolve()
          }, contentEl)

          scrollTo(contentEl, 0)
        }, contentEl)

        scrollTo(contentEl, startOfSectionTwo)
      })
    })

    it('should correctly select navigation element on backward scrolling when each target section height is 100%', () => {
      return new Promise(resolve => {
        fixtureEl.innerHTML = [
          '<nav class="navbar">',
          '  <ul class="nav">',
          '    <li class="nav-item"><a id="li-100-1" class="nav-link" href="#div-100-1">div 1</a></li>',
          '    <li class="nav-item"><a id="li-100-2" class="nav-link" href="#div-100-2">div 2</a></li>',
          '    <li class="nav-item"><a id="li-100-3" class="nav-link" href="#div-100-3">div 3</a></li>',
          '    <li class="nav-item"><a id="li-100-4" class="nav-link" href="#div-100-4">div 4</a></li>',
          '    <li class="nav-item"><a id="li-100-5" class="nav-link" href="#div-100-5">div 5</a></li>',
          '  </ul>',
          '</nav>',
          '<div class="content" style="position: relative; overflow: auto; height: 100px">',
          '  <div id="div-100-1" style="position: relative; height: 100%; padding: 0; margin: 0">div 1</div>',
          '  <div id="div-100-2" style="position: relative; height: 100%; padding: 0; margin: 0">div 2</div>',
          '  <div id="div-100-3" style="position: relative; height: 100%; padding: 0; margin: 0">div 3</div>',
          '  <div id="div-100-4" style="position: relative; height: 100%; padding: 0; margin: 0">div 4</div>',
          '  <div id="div-100-5" style="position: relative; height: 100%; padding: 0; margin: 0">div 5</div>',
          '</div>'
        ].join('')

        const contentEl = fixtureEl.querySelector('.content')
        const scrollSpy = new ScrollSpy(contentEl, {
          offset: 0,
          target: '.navbar'
        })

        scrollTo(contentEl, 0)
        testElementIsActiveAfterScroll({
          elementSelector: '#li-100-5',
          targetSelector: '#div-100-5',
          contentEl,
          scrollSpy,
          cb() {
            scrollTo(contentEl, 0)
            testElementIsActiveAfterScroll({
              elementSelector: '#li-100-2',
              targetSelector: '#div-100-2',
              contentEl,
              scrollSpy,
              cb() {
                scrollTo(contentEl, 0)
                testElementIsActiveAfterScroll({
                  elementSelector: '#li-100-3',
                  targetSelector: '#div-100-3',
                  contentEl,
                  scrollSpy,
                  cb() {
                    scrollTo(contentEl, 0)
                    testElementIsActiveAfterScroll({
                      elementSelector: '#li-100-2',
                      targetSelector: '#div-100-2',
                      contentEl,
                      scrollSpy,
                      cb() {
                        scrollTo(contentEl, 0)
                        testElementIsActiveAfterScroll({
                          elementSelector: '#li-100-1',
                          targetSelector: '#div-100-1',
                          contentEl,
                          scrollSpy,
                          cb: resolve
                        })
                      }
                    })
                  }
                })
              }
            })
          }
        })
      })
    })
  })

  describe('refresh', () => {
    it('should disconnect existing observer', () => {
      fixtureEl.innerHTML = getDummyFixture()

      const el = fixtureEl.querySelector('.content')
      const scrollSpy = new ScrollSpy(el)

      const spy = spyOn(scrollSpy._observer, 'disconnect')

      scrollSpy.refresh()

      expect(spy).toHaveBeenCalled()
    })
  })

  describe('dispose', () => {
    it('should dispose a scrollspy', () => {
      fixtureEl.innerHTML = getDummyFixture()

      const el = fixtureEl.querySelector('.content')
      const scrollSpy = new ScrollSpy(el)

      expect(ScrollSpy.getInstance(el)).not.toBeNull()

      scrollSpy.dispose()

      expect(ScrollSpy.getInstance(el)).toBeNull()
    })
  })

  describe('jQueryInterface', () => {
    it('should create a scrollspy', () => {
      fixtureEl.innerHTML = getDummyFixture()

      const div = fixtureEl.querySelector('.content')

      jQueryMock.fn.scrollspy = ScrollSpy.jQueryInterface
      jQueryMock.elements = [div]

      jQueryMock.fn.scrollspy.call(jQueryMock, { target: '#navBar' })

      expect(ScrollSpy.getInstance(div)).not.toBeNull()
    })

    it('should create a scrollspy with given config', () => {
      fixtureEl.innerHTML = getDummyFixture()

      const div = fixtureEl.querySelector('.content')

      jQueryMock.fn.scrollspy = ScrollSpy.jQueryInterface
      jQueryMock.elements = [div]

      jQueryMock.fn.scrollspy.call(jQueryMock, { rootMargin: '100px' })
      const spy = spyOn(ScrollSpy.prototype, 'constructor')
      expect(spy).not.toHaveBeenCalledWith(div, { rootMargin: '100px' })

      const scrollspy = ScrollSpy.getInstance(div)
      expect(scrollspy).not.toBeNull()
      expect(scrollspy._config.rootMargin).toEqual('100px')
    })

    it('should not re create a scrollspy', () => {
      fixtureEl.innerHTML = getDummyFixture()

      const div = fixtureEl.querySelector('.content')
      const scrollSpy = new ScrollSpy(div)

      jQueryMock.fn.scrollspy = ScrollSpy.jQueryInterface
      jQueryMock.elements = [div]

      jQueryMock.fn.scrollspy.call(jQueryMock)

      expect(ScrollSpy.getInstance(div)).toEqual(scrollSpy)
    })

    it('should call a scrollspy method', () => {
      fixtureEl.innerHTML = getDummyFixture()

      const div = fixtureEl.querySelector('.content')
      const scrollSpy = new ScrollSpy(div)

      const spy = spyOn(scrollSpy, 'refresh')

      jQueryMock.fn.scrollspy = ScrollSpy.jQueryInterface
      jQueryMock.elements = [div]

      jQueryMock.fn.scrollspy.call(jQueryMock, 'refresh')

      expect(ScrollSpy.getInstance(div)).toEqual(scrollSpy)
      expect(spy).toHaveBeenCalled()
    })

    it('should throw error on undefined method', () => {
      fixtureEl.innerHTML = getDummyFixture()

      const div = fixtureEl.querySelector('.content')
      const action = 'undefinedMethod'

      jQueryMock.fn.scrollspy = ScrollSpy.jQueryInterface
      jQueryMock.elements = [div]

      expect(() => {
        jQueryMock.fn.scrollspy.call(jQueryMock, action)
      }).toThrowError(TypeError, `No method named "${action}"`)
    })

    it('should throw error on protected method', () => {
      fixtureEl.innerHTML = getDummyFixture()

      const div = fixtureEl.querySelector('.content')
      const action = '_getConfig'

      jQueryMock.fn.scrollspy = ScrollSpy.jQueryInterface
      jQueryMock.elements = [div]

      expect(() => {
        jQueryMock.fn.scrollspy.call(jQueryMock, action)
      }).toThrowError(TypeError, `No method named "${action}"`)
    })

    it('should throw error if method "constructor" is being called', () => {
      fixtureEl.innerHTML = getDummyFixture()

      const div = fixtureEl.querySelector('.content')
      const action = 'constructor'

      jQueryMock.fn.scrollspy = ScrollSpy.jQueryInterface
      jQueryMock.elements = [div]

      expect(() => {
        jQueryMock.fn.scrollspy.call(jQueryMock, action)
      }).toThrowError(TypeError, `No method named "${action}"`)
    })
  })

  describe('getInstance', () => {
    it('should return scrollspy instance', () => {
      fixtureEl.innerHTML = getDummyFixture()

      const div = fixtureEl.querySelector('.content')
      const scrollSpy = new ScrollSpy(div, { target: fixtureEl.querySelector('#navBar') })

      expect(ScrollSpy.getInstance(div)).toEqual(scrollSpy)
      expect(ScrollSpy.getInstance(div)).toBeInstanceOf(ScrollSpy)
    })

    it('should return null if there is no instance', () => {
      fixtureEl.innerHTML = getDummyFixture()

      const div = fixtureEl.querySelector('.content')
      expect(ScrollSpy.getInstance(div)).toBeNull()
    })
  })

  describe('getOrCreateInstance', () => {
    it('should return scrollspy instance', () => {
      fixtureEl.innerHTML = getDummyFixture()

      const div = fixtureEl.querySelector('.content')
      const scrollspy = new ScrollSpy(div)

      expect(ScrollSpy.getOrCreateInstance(div)).toEqual(scrollspy)
      expect(ScrollSpy.getInstance(div)).toEqual(ScrollSpy.getOrCreateInstance(div, {}))
      expect(ScrollSpy.getOrCreateInstance(div)).toBeInstanceOf(ScrollSpy)
    })

    it('should return new instance when there is no scrollspy instance', () => {
      fixtureEl.innerHTML = getDummyFixture()

      const div = fixtureEl.querySelector('.content')

      expect(ScrollSpy.getInstance(div)).toBeNull()
      expect(ScrollSpy.getOrCreateInstance(div)).toBeInstanceOf(ScrollSpy)
    })

    it('should return new instance when there is no scrollspy instance with given configuration', () => {
      fixtureEl.innerHTML = getDummyFixture()

      const div = fixtureEl.querySelector('.content')

      expect(ScrollSpy.getInstance(div)).toBeNull()
      const scrollspy = ScrollSpy.getOrCreateInstance(div, {
        offset: 1
      })
      expect(scrollspy).toBeInstanceOf(ScrollSpy)

      expect(scrollspy._config.offset).toEqual(1)
    })

    it('should return the instance when exists without given configuration', () => {
      fixtureEl.innerHTML = getDummyFixture()

      const div = fixtureEl.querySelector('.content')
      const scrollspy = new ScrollSpy(div, {
        offset: 1
      })
      expect(ScrollSpy.getInstance(div)).toEqual(scrollspy)

      const scrollspy2 = ScrollSpy.getOrCreateInstance(div, {
        offset: 2
      })
      expect(scrollspy).toBeInstanceOf(ScrollSpy)
      expect(scrollspy2).toEqual(scrollspy)

      expect(scrollspy2._config.offset).toEqual(1)
    })
  })

  describe('event handler', () => {
    it('should create scrollspy on window load event', () => {
      fixtureEl.innerHTML = [
        '<div id="nav"></div>' +
        '<div id="wrapper" data-bs-spy="scroll" data-bs-target="#nav" style="overflow-y: auto"></div>'
      ].join('')

      const scrollSpyEl = fixtureEl.querySelector('#wrapper')

      window.dispatchEvent(createEvent('load'))

      expect(ScrollSpy.getInstance(scrollSpyEl)).not.toBeNull()
    })
  })

  describe('SmoothScroll', () => {
    it('should not enable smoothScroll', () => {
      fixtureEl.innerHTML = getDummyFixture()
      const offSpy = spyOn(EventHandler, 'off').and.callThrough()
      const onSpy = spyOn(EventHandler, 'on').and.callThrough()

      const div = fixtureEl.querySelector('.content')
      const target = fixtureEl.querySelector('#navBar')
      // eslint-disable-next-line no-new
      new ScrollSpy(div, {
        offset: 1
      })

      expect(offSpy).not.toHaveBeenCalledWith(target, 'click.bs.scrollspy')
      expect(onSpy).not.toHaveBeenCalledWith(target, 'click.bs.scrollspy')
    })

    it('should enable smoothScroll', () => {
      fixtureEl.innerHTML = getDummyFixture()
      const offSpy = spyOn(EventHandler, 'off').and.callThrough()
      const onSpy = spyOn(EventHandler, 'on').and.callThrough()

      const div = fixtureEl.querySelector('.content')
      const target = fixtureEl.querySelector('#navBar')
      // eslint-disable-next-line no-new
      new ScrollSpy(div, {
        offset: 1,
        smoothScroll: true
      })

      expect(offSpy).toHaveBeenCalledWith(target, 'click.bs.scrollspy')
      expect(onSpy).toHaveBeenCalledWith(target, 'click.bs.scrollspy', '[href]', jasmine.any(Function))
    })

    it('should not smoothScroll to element if it not handles a scrollspy section', () => {
      fixtureEl.innerHTML = [
        '<nav id="navBar" class="navbar">',
        '  <ul class="nav">',
        '    <a id="anchor-1" href="#div-jsm-1">div 1</a></li>',
        '    <a id="anchor-2" href="#foo">div 2</a></li>',
        '  </ul>',
        '</nav>',
        '<div class="content" data-bs-target="#navBar" style="overflow-y: auto">',
        '  <div id="div-jsm-1">div 1</div>',
        '</div>'
      ].join('')

      const div = fixtureEl.querySelector('.content')
      // eslint-disable-next-line no-new
      new ScrollSpy(div, {
        offset: 1,
        smoothScroll: true
      })

      const clickSpy = getElementScrollSpy(div)

      fixtureEl.querySelector('#anchor-2').click()
      expect(clickSpy).not.toHaveBeenCalled()
    })

    it('should call `scrollTop` if element doesn\'t not support `scrollTo`', () => {
      fixtureEl.innerHTML = getDummyFixture()

      const div = fixtureEl.querySelector('.content')
      const link = fixtureEl.querySelector('[href="#div-jsm-1"]')
      delete div.scrollTo
      const clickSpy = getElementScrollSpy(div)
      // eslint-disable-next-line no-new
      new ScrollSpy(div, {
        offset: 1,
        smoothScroll: true
      })

      link.click()
      expect(clickSpy).toHaveBeenCalled()
    })

    it('should smoothScroll to the proper observable element on anchor click', done => {
      fixtureEl.innerHTML = getDummyFixture()

      const div = fixtureEl.querySelector('.content')
      const link = fixtureEl.querySelector('[href="#div-jsm-1"]')
      const observable = fixtureEl.querySelector('#div-jsm-1')
      const clickSpy = getElementScrollSpy(div)
      // eslint-disable-next-line no-new
      new ScrollSpy(div, {
        offset: 1,
        smoothScroll: true
      })

      setTimeout(() => {
        if (div.scrollTo) {
          expect(clickSpy).toHaveBeenCalledWith({ top: observable.offsetTop - div.offsetTop, behavior: 'smooth' })
        } else {
          expect(clickSpy).toHaveBeenCalledWith(observable.offsetTop - div.offsetTop)
        }

        done()
      }, 100)
      link.click()
    })

    it('should smoothscroll to observable with anchor link that contains a french word as id', done => {
      fixtureEl.innerHTML = [
        '<nav id="navBar" class="navbar">',
        '  <ul class="nav">',
        '    <li class="nav-item"><a id="li-jsm-1" class="nav-link" href="#présentation">div 1</a></li>',
        '  </ul>',
        '</nav>',
        '<div class="content" data-bs-target="#navBar" style="overflow-y: auto">',
        '  <div id="présentation">div 1</div>',
        '</div>'
      ].join('')

      const div = fixtureEl.querySelector('.content')
      const link = fixtureEl.querySelector('[href="#présentation"]')
      const observable = fixtureEl.querySelector('#présentation')
      const clickSpy = getElementScrollSpy(div)
      // eslint-disable-next-line no-new
      new ScrollSpy(div, {
        offset: 1,
        smoothScroll: true
      })

      setTimeout(() => {
        if (div.scrollTo) {
          expect(clickSpy).toHaveBeenCalledWith({ top: observable.offsetTop - div.offsetTop, behavior: 'smooth' })
        } else {
          expect(clickSpy).toHaveBeenCalledWith(observable.offsetTop - div.offsetTop)
        }

        done()
      }, 100)
      link.click()
    })
  })
})
