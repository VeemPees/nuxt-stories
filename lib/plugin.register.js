/* eslint-disable no-console */
import Vue from 'vue'
import VueDist from 'vue/dist/vue.common.js'
import { BootstrapVueIcons } from 'bootstrap-vue'
import Markdown from './utils/markdown.client'
import { autoImport } from './utils/autoImport'
import { state, mutations, actions } from './store/nuxtStories'

Vue.config.errorHandler = function (err, vm, info) {
  console.log('ERROR', err.message, vm, info)
  if (info === 'render') {
    throw new Error(err)
  }
}

const delay = (ms) => {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

let _pOptions

const storiesStore = {
  state: state(),
  mutations,
  actions
}

export const register = Object.freeze({
  components () {
    // This works (tested manually), it's just a pain to write automated tests for.
    /* istanbul ignore next */
    autoImport.components(require.context('./components', true, /\.(vue|js)$/))
    /* istanbul ignore next */
    autoImport.components(require.context('@/components', true, /\.(vue|js)$/))
  },
  icons () {
    Vue.use(BootstrapVueIcons)
  },
  options (pOptions) {
    _pOptions = { ...pOptions }
  },
  staticStories (store) {
    const { lang } = store.state.$nuxtStories
    const { staticHost } = _pOptions
    const { mount = '/markdown', url } = staticHost
    const fetchUrl = url || `${mount}/stories.json`
    fetch(fetchUrl)
      .then(res => res.json())
      .then(stories => register.stories(store, stories[lang]))
      .catch(console.error)
  },
  storyIO (ctx) {
    const { ioOpts = {}, staticHost } = _pOptions
    if (staticHost) {
      return
    }
    const { reconnection = false, emitTimeout = 5000 } = ioOpts
    ctx.socket = ctx.$nuxtSocket({
      name: 'nuxtStories',
      channel: '',
      reconnection,
      emitTimeout,
      namespaceCfg: {
        emitters: [
          'fetchStory',
          'saveMarkdown + storiesData'
        ]
      }
    })
  },
  storiesAnchor (ctx) {
    const { staticHost } = _pOptions
    if (!staticHost) {
      register.storiesIO(ctx)
    } else {
      register.staticStories(ctx.$store)
    }
  },
  storiesIO (ctx) {
    const {
      ioOpts = {},
      lang,
      storiesDir,
      storiesAnchor,
      staticHost
    } = _pOptions
    const { reconnection = false, emitTimeout = 1000 } = ioOpts

    ctx.socket = ctx.$nuxtSocket({
      name: 'nuxtStories',
      persist: 'storiesSocket',
      channel: '',
      reconnection,
      emitTimeout,
      namespaceCfg: {
        emitters: ['fetchStories']
      }
    })

    ctx.socket.on('connect', () => {
      ctx.fetchStories({
        lang,
        storiesDir,
        storiesAnchor,
        staticHost
      })
        .then(({ stories }) => register.stories(ctx.$store, stories))
        .then(() => {
          ctx.$store.commit(
            '$nuxtStories/SET_ACTIVE_STORY',
            window.$nuxt.$route.path
          )
        })
        .catch(console.error)
    })
  },
  stories (store, stories) {
    store.commit('$nuxtStories/SET_STORIES', stories)
  },
  vuexModule (store) {
    store.registerModule(
      '$nuxtStories',
      {
        namespaced: true,
        ...storiesStore
      },
      { preserveState: false }
    )
  },
  watchers (ctx) {
    ctx.$watch('$route.path', function (n) {
      ctx.$store.commit('$nuxtStories/SET_ACTIVE_STORY', n)
      ctx.updateStory()
    })

    ctx.$watch('storiesData.frontMatter.order', function (n) {
      if (n) {
        const { activeStory } = ctx.$store.state.$nuxtStories
        ctx.$store.commit('$nuxtStories/SET_STORY_ORDER',
          {
            order: n,
            idxs: activeStory.idxs
          })
      }
    })
  }
})

export const methods = Object.freeze({
  $destroy () {
    this.$store.commit('$nuxtStories/SET_TOC', [])
    this.componentDestroy()
  },
  async compileContents (debounceMs = 300) {
    await delay(debounceMs)
    this.compileVue()
  },
  compileInnerHTML (el, binding, { context }) {
    const input = el.innerHTML.replace(/ {2}/g, '')
    const { compiled } = Markdown.parse(input)
    context.compiled = compiled
  },
  async compileVue () {
    const { toc, compiled, frontMatter } = Markdown.parse(this.storiesData.contents)
    this.$set(this.storiesData, 'frontMatter', frontMatter)
    const res = VueDist.compile(`<div>${compiled}</div>`)
    const compiledVue = {
      data () {
        return { ...frontMatter, fetched: {} }
      },
      mounted() { // works
        if (frontMatter.fetch) {
          const parsers = {
            text: (res) => res.text(),
            json: (res) => res.json()
          }
          Object.entries(frontMatter.fetch).forEach(([key, val]) => {
            if (!val) return
            const parts = val.split(/\s*\|\s*/)
            const pathPart = parts[0]
            const parseAs = parts[1] || 'text'
            fetch(pathPart)
            .then(parsers[parseAs])
            .then(resp => {
              this.$set(this.fetched, key, resp)
            })
          })
        }
      },
      render: res.render,
      staticRenderFns: res.staticRenderFns
    }
    this.$set(this.storiesData, 'compiled', compiledVue)
    this.$store.commit('$nuxtStories/SET_TOC', toc)

    if (!_pOptions.staticHost) {
      this.$set(this.storiesData, 'mdPath', `${this.$route.path}.md`)
      this.saveMarkdown().catch(console.error)
    }
  },
  async updateStory () {
    const { storiesDir, staticHost } = _pOptions
    const { lang } = this.$route.params
    if (!lang) { return }
    let contents
    if (staticHost) {
      const { mount = '/markdown' } = staticHost
      const relPath = this.$route.path.replace(`/${storiesDir}`, mount)
      const mdPath = `${relPath}.md`.replace('/.md', '.md')
      contents = await fetch(mdPath)
        .then(res => res.text())
        .catch(console.error)
    } else {
      contents = await this.fetchStory({
        mdPath: `${this.$route.path}.md`
      }).catch(console.error)
    }

    if (contents) {
      this.$set(this.storiesData, 'contents', contents)
      this.compileVue()
    }
  }
})

export const directives = Object.freeze({
  markdown: {
    componentUpdated: methods.compileInnerHTML,
    inserted: methods.compileInnerHTML
  }
})
