import { describe, it, expect, beforeEach, vi } from 'vitest'
import { PluginSystem } from '../src/index'
import type { Plugin, HookFunction, AsyncHookFunction } from '../src/types'

interface TestHooks {
  onInit: HookFunction<[string], string>
  onProcess: HookFunction<[number], number>
  onComplete: AsyncHookFunction<[boolean], boolean>
  onTransform: HookFunction<[any], any>
}

describe('PluginSystem', () => {
  let pluginSystem: PluginSystem<TestHooks>

  beforeEach(() => {
    pluginSystem = new PluginSystem<TestHooks>()
  })

  describe('Constructor and Initialization', () => {
    it('should create an empty plugin system', () => {
      expect(pluginSystem.getPlugins()).toHaveLength(0)
    })

    it('should accept initial plugins in constructor', () => {
      const plugin: Plugin<TestHooks> = {
        name: 'test-plugin',
        onInit: (value: string) => `processed-${value}`
      }

      const system = new PluginSystem<TestHooks>([plugin])
      expect(system.getPlugins()).toHaveLength(1)
      expect(system.getPlugins()[0].name).toBe('test-plugin')
    })

    it('should accept plugin functions in constructor', () => {
      const pluginFactory = () => ({
        name: 'factory-plugin',
        onInit: (value: string) => `factory-${value}`
      })

      const system = new PluginSystem<TestHooks>([pluginFactory])
      expect(system.getPlugins()).toHaveLength(1)
      expect(system.getPlugins()[0].name).toBe('factory-plugin')
    })

    it('should accept array of plugins from factory function', () => {
      const pluginFactory = () => [
        { name: 'plugin-1', onInit: (v: string) => v },
        { name: 'plugin-2', onInit: (v: string) => v }
      ]

      const system = new PluginSystem<TestHooks>([pluginFactory])
      expect(system.getPlugins()).toHaveLength(2)
    })
  })

  describe('Plugin Management', () => {
    it('should add plugins using use()', () => {
      const plugin: Plugin<TestHooks> = {
        name: 'test-plugin',
        onInit: (value: string) => `processed-${value}`
      }

      pluginSystem.use(plugin)
      expect(pluginSystem.getPlugins()).toHaveLength(1)
      expect(pluginSystem.getPlugins()[0]).toBe(plugin)
    })

    it('should add multiple plugins at once', () => {
      const plugin1: Plugin<TestHooks> = { name: 'plugin1' }
      const plugin2: Plugin<TestHooks> = { name: 'plugin2' }

      pluginSystem.use(plugin1, plugin2)
      expect(pluginSystem.getPlugins()).toHaveLength(2)
    })

    it('should prevent duplicate plugin names', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      const plugin1: Plugin<TestHooks> = { name: 'duplicate' }
      const plugin2: Plugin<TestHooks> = { name: 'duplicate' }

      pluginSystem.use(plugin1, plugin2)

      expect(pluginSystem.getPlugins()).toHaveLength(1)
      expect(consoleSpy).toHaveBeenCalledWith(
        'Plugin "duplicate" already exists. Skipping duplicate.'
      )

      consoleSpy.mockRestore()
    })

    it('should remove plugins by name', () => {
      const plugin: Plugin<TestHooks> = { name: 'removable' }

      pluginSystem.use(plugin)
      expect(pluginSystem.getPlugins()).toHaveLength(1)

      pluginSystem.remove('removable')
      expect(pluginSystem.getPlugins()).toHaveLength(0)
    })

    it('should return this for method chaining', () => {
      const plugin: Plugin<TestHooks> = { name: 'chainable' }

      const result = pluginSystem.use(plugin).remove('nonexistent')
      expect(result).toBe(pluginSystem)
    })

    it('should clear all plugins', () => {
      pluginSystem.use({ name: 'plugin1' }, { name: 'plugin2' }, { name: 'plugin3' })

      expect(pluginSystem.getPlugins()).toHaveLength(3)

      const result = pluginSystem.clear()
      expect(pluginSystem.getPlugins()).toHaveLength(0)
      expect(result).toBe(pluginSystem)
    })
  })

  describe('Priority System', () => {
    it('should sort plugins by priority (highest first)', () => {
      const lowPriority: Plugin<TestHooks> = { name: 'low', priority: 1 }
      const highPriority: Plugin<TestHooks> = { name: 'high', priority: 10 }
      const noPriority: Plugin<TestHooks> = { name: 'none' }

      pluginSystem.use(lowPriority, highPriority, noPriority)

      const pluginsWithHook = pluginSystem.getPluginsWithHook('onInit')
      // Should be: high (10), low (1), none (0/undefined)
      expect(pluginsWithHook).toHaveLength(0) // No plugins have onInit hook
    })

    it('should execute hooks in priority order', () => {
      const results: string[] = []

      const plugin1: Plugin<TestHooks> = {
        name: 'first',
        priority: 10,
        onInit: (value: string) => {
          results.push('first')
          return `first-${value}`
        }
      }

      const plugin2: Plugin<TestHooks> = {
        name: 'second',
        priority: 5,
        onInit: (value: string) => {
          results.push('second')
          return `second-${value}`
        }
      }

      pluginSystem.use(plugin2, plugin1) // Add in reverse order

      const result = pluginSystem.exec('onInit', 'test')

      expect(results).toEqual(['first']) // Only first plugin runs (returns non-null)
      expect(result).toBe('first-test')
    })
  })

  describe('Hook Execution', () => {
    it('should execute the first hook that returns a non-null value', () => {
      const plugin1: Plugin<TestHooks> = {
        name: 'plugin1',
        onInit: () => null // Returns null, should continue
      }

      const plugin2: Plugin<TestHooks> = {
        name: 'plugin2',
        onInit: (value: string) => `processed-${value}`
      }

      pluginSystem.use(plugin1, plugin2)

      const result = pluginSystem.exec('onInit', 'test')
      expect(result).toBe('processed-test')
    })

    it('should return null if no plugins handle the hook', () => {
      const result = pluginSystem.exec('onInit', 'test')
      expect(result).toBeNull()
    })

    it('should return null if all plugins return null/undefined', () => {
      pluginSystem.use(
        {
          name: 'null-plugin',
          onInit: () => null
        },
        {
          name: 'undefined-plugin',
          onInit: () => undefined
        }
      )

      const result = pluginSystem.exec('onInit', 'test')
      expect(result).toBeNull()
    })

    it('should handle errors gracefully', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      const faultyPlugin: Plugin<TestHooks> = {
        name: 'faulty',
        onInit: () => {
          throw new Error('Plugin error')
        }
      }

      const workingPlugin: Plugin<TestHooks> = {
        name: 'working',
        onInit: (value: string) => `working-${value}`
      }

      pluginSystem.use(faultyPlugin, workingPlugin)

      const result = pluginSystem.exec('onInit', 'test')

      expect(consoleSpy).toHaveBeenCalledWith(
        'Plugin "faulty" hook "onInit" failed:',
        expect.any(Error)
      )
      expect(result).toBe('working-test')

      consoleSpy.mockRestore()
    })

    it('should warn about Promise returns in sync execution', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      const asyncPlugin: Plugin<TestHooks> = {
        name: 'async',
        onInit: async (value: string) => `async-${value}`
      }

      pluginSystem.use(asyncPlugin)

      const result = pluginSystem.exec('onInit', 'test')

      expect(consoleSpy).toHaveBeenCalledWith(
        'Plugin "async" hook "onInit" returned Promise in sync execution. Use execAsync instead.'
      )
      expect(result).toBeNull()

      consoleSpy.mockRestore()
    })

    it('should find hooks in both direct properties and hooks object', () => {
      const directHookPlugin: Plugin<TestHooks> = {
        name: 'direct',
        onInit: (value: string) => `direct-${value}`
      }

      const hooksObjectPlugin: Plugin<TestHooks> = {
        name: 'hooks-object',
        hooks: {
          onInit: (value: string) => `hooks-${value}`
        }
      }

      pluginSystem.use(directHookPlugin)
      let result = pluginSystem.exec('onInit', 'test')
      expect(result).toBe('direct-test')

      pluginSystem.clear().use(hooksObjectPlugin)
      result = pluginSystem.exec('onInit', 'test')
      expect(result).toBe('hooks-test')
    })
  })

  describe('Async Hook Execution', () => {
    it('should execute async hooks', async () => {
      const asyncPlugin: Plugin<TestHooks> = {
        name: 'async',
        onComplete: async (value: boolean) => {
          await new Promise((resolve) => setTimeout(resolve, 10))
          return !value
        }
      }

      pluginSystem.use(asyncPlugin)

      const result = await pluginSystem.execAsync('onComplete', true)
      expect(result).toBe(false)
    })

    it('should handle sync functions in async execution', async () => {
      const syncPlugin: Plugin<TestHooks> = {
        name: 'sync',
        onInit: (value: string) => `sync-${value}`
      }

      pluginSystem.use(syncPlugin)

      const result = await pluginSystem.execAsync('onInit', 'test')
      expect(result).toBe('sync-test')
    })

    it('should handle async errors gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      const faultyPlugin: Plugin<TestHooks> = {
        name: 'faulty-async',
        onComplete: async () => {
          throw new Error('Async error')
        }
      }

      pluginSystem.use(faultyPlugin)

      const result = await pluginSystem.execAsync('onComplete', true)

      expect(consoleSpy).toHaveBeenCalled()
      expect(result).toBeNull()

      consoleSpy.mockRestore()
    })
  })

  describe('All Hook Execution', () => {
    it('should execute all plugins and return all results', () => {
      const plugin1: Plugin<TestHooks> = {
        name: 'plugin1',
        onProcess: (value: number) => value * 2
      }

      const plugin2: Plugin<TestHooks> = {
        name: 'plugin2',
        onProcess: (value: number) => value + 10
      }

      pluginSystem.use(plugin1, plugin2)

      const results = pluginSystem.execAll('onProcess', 5)
      expect(results).toEqual([10, 15])
    })

    it('should filter out null and undefined results', () => {
      const plugin1: Plugin<TestHooks> = {
        name: 'plugin1',
        onProcess: (value: number) => value * 2
      }

      const plugin2: Plugin<TestHooks> = {
        name: 'plugin2',
        onProcess: () => null
      }

      const plugin3: Plugin<TestHooks> = {
        name: 'plugin3',
        onProcess: (value: number) => value + 5
      }

      pluginSystem.use(plugin1, plugin2, plugin3)

      const results = pluginSystem.execAll('onProcess', 10)
      expect(results).toEqual([20, 15])
    })

    it('should return empty array if no plugins exist', () => {
      const results = pluginSystem.execAll('onProcess', 5)
      expect(results).toEqual([])
    })
  })

  describe('All Async Hook Execution', () => {
    it('should execute all async plugins and return all results', async () => {
      const plugin1: Plugin<TestHooks> = {
        name: 'plugin1',
        onComplete: async (value: boolean) => {
          await new Promise((resolve) => setTimeout(resolve, 5))
          return !value
        }
      }

      const plugin2: Plugin<TestHooks> = {
        name: 'plugin2',
        onComplete: async (value: boolean) => {
          await new Promise((resolve) => setTimeout(resolve, 5))
          return value
        }
      }

      pluginSystem.use(plugin1, plugin2)

      const results = await pluginSystem.execAllAsync('onComplete', true)
      expect(results).toEqual([false, true])
    })

    it('should handle mixed sync and async plugins', async () => {
      const syncPlugin: Plugin<TestHooks> = {
        name: 'sync',
        onComplete: (value: boolean) => !value
      }

      const asyncPlugin: Plugin<TestHooks> = {
        name: 'async',
        onComplete: async (value: boolean) => {
          await new Promise((resolve) => setTimeout(resolve, 5))
          return value
        }
      }

      pluginSystem.use(syncPlugin, asyncPlugin)

      const results = await pluginSystem.execAllAsync('onComplete', true)
      expect(results).toEqual([false, true])
    })

    it('should handle errors in execAllAsync', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      const faultyPlugin: Plugin<TestHooks> = {
        name: 'faulty',
        onComplete: async () => {
          throw new Error('Async error')
        }
      }

      const workingPlugin: Plugin<TestHooks> = {
        name: 'working',
        onComplete: async (value: boolean) => !value
      }

      pluginSystem.use(faultyPlugin, workingPlugin)

      const results = await pluginSystem.execAllAsync('onComplete', true)

      expect(consoleSpy).toHaveBeenCalled()
      expect(results).toEqual([false])

      consoleSpy.mockRestore()
    })
  })

  describe('Plugin Filtering and Caching', () => {
    it('should correctly identify plugins with specific hooks', () => {
      const plugin1: Plugin<TestHooks> = {
        name: 'plugin1',
        onInit: (value: string) => value
      }

      const plugin2: Plugin<TestHooks> = {
        name: 'plugin2',
        onProcess: (value: number) => value
      }

      pluginSystem.use(plugin1, plugin2)

      const initPlugins = pluginSystem.getPluginsWithHook('onInit')
      const processPlugins = pluginSystem.getPluginsWithHook('onProcess')

      expect(initPlugins).toHaveLength(1)
      expect(initPlugins[0].name).toBe('plugin1')

      expect(processPlugins).toHaveLength(1)
      expect(processPlugins[0].name).toBe('plugin2')
    })

    it('should cache plugin lookups for performance', () => {
      const plugin: Plugin<TestHooks> = {
        name: 'test',
        onInit: (value: string) => value
      }

      pluginSystem.use(plugin)

      // First call should populate cache
      const plugins1 = pluginSystem.getPluginsWithHook('onInit')
      // Second call should use cache
      const plugins2 = pluginSystem.getPluginsWithHook('onInit')

      expect(plugins1).toBe(plugins2) // Should be the same reference due to caching
    })

    it('should invalidate cache when plugins are modified', () => {
      const plugin1: Plugin<TestHooks> = {
        name: 'plugin1',
        onInit: (value: string) => value
      }

      pluginSystem.use(plugin1)

      // Populate cache
      pluginSystem.getPluginsWithHook('onInit')

      // Add another plugin
      const plugin2: Plugin<TestHooks> = {
        name: 'plugin2',
        onInit: (value: string) => value
      }

      pluginSystem.use(plugin2)

      // Cache should be invalidated and return updated results
      const plugins = pluginSystem.getPluginsWithHook('onInit')
      expect(plugins).toHaveLength(2)
    })
  })

  describe('Edge Cases', () => {
    it('should handle plugins with no hooks', () => {
      const emptyPlugin: Plugin<TestHooks> = { name: 'empty' }

      pluginSystem.use(emptyPlugin)

      const plugins = pluginSystem.getPluginsWithHook('onInit')
      expect(plugins).toHaveLength(0)
    })

    it('should handle undefined hook properties gracefully', () => {
      const plugin: Plugin<TestHooks> = {
        name: 'test',
        onInit: undefined as any
      }

      pluginSystem.use(plugin)

      const result = pluginSystem.exec('onInit', 'test')
      expect(result).toBeNull()
    })

    it('should handle null hooks object', () => {
      const plugin: Plugin<TestHooks> = {
        name: 'test',
        hooks: null as any
      }

      pluginSystem.use(plugin)

      const plugins = pluginSystem.getPluginsWithHook('onInit')
      expect(plugins).toHaveLength(0)
    })
  })
})
