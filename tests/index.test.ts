import { describe, it, expect } from 'vitest'
import { PluginSystem } from '../src/index.ts'

describe('Module Unit Test', () => {
  it('should pass the test', () => {
    class Str {
      constructor(plugins) {
        this.plugins = new PluginSystem(plugins)
      }

      process(input) {
        const processPlugin = this.plugins.exec('process', { input })
        if (processPlugin) return processPlugin
        return input
      }
    }

    const p = new Str([
      {
        name: 'hello',
        hooks: {
          process: ({ input }) => (input !== 'hello' ? 'hello, ' + input : input)
        }
      }
    ])

    expect(p.process('world')).toBe('hello, world')
    expect(p.process('hello')).toBe('hello')
  })
})
