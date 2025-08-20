import { HookFunction, AsyncHookFunction, PluginInput, Plugin } from './types'

export class PluginSystem<THooks = Record<string, HookFunction | AsyncHookFunction>> {
  private plugins: Plugin<THooks>[] = []
  private hookCache: Map<keyof THooks, Plugin<THooks>[]> = new Map()
  private sortedPlugins: Plugin<THooks>[] = []
  private isDirty = false

  constructor(plugins: PluginInput<THooks>[] = []) {
    this.use(...plugins)
  }

  private flattenPlugins(pluginInputs: PluginInput<THooks>[]): Plugin<THooks>[] {
    const flattened: Plugin<THooks>[] = []

    for (const input of pluginInputs) {
      if (typeof input === 'function') {
        const result = input()
        if (Array.isArray(result)) {
          flattened.push(...result)
        } else {
          flattened.push(result)
        }
      } else if (Array.isArray(input)) {
        flattened.push(...input)
      } else {
        flattened.push(input)
      }
    }

    return flattened
  }

  public use(...pluginInputs: PluginInput<THooks>[]): this {
    const newPlugins = this.flattenPlugins(pluginInputs)

    const existingNames = new Set(this.plugins.map((p) => p.name))
    for (const plugin of newPlugins) {
      if (existingNames.has(plugin.name)) {
        console.warn(`Plugin "${plugin.name}" already exists. Skipping duplicate.`)
        continue
      }
      this.plugins.push(plugin)
      existingNames.add(plugin.name)
    }

    this.invalidateCache()
    return this
  }

  public remove(pluginName: string): this {
    const originalLength = this.plugins.length
    this.plugins = this.plugins.filter((p) => p.name !== pluginName)

    if (this.plugins.length !== originalLength) {
      this.invalidateCache()
    }

    return this
  }

  public getPlugins(): readonly Plugin<THooks>[] {
    return this.plugins
  }

  private ensureSorted(): void {
    if (this.isDirty) {
      this.sortedPlugins =
        this.plugins.length === 0
          ? []
          : [...this.plugins].sort((a, b) => (b.priority || 0) - (a.priority || 0))
      this.isDirty = false
    }
  }

  private invalidateCache(): void {
    this.isDirty = true
    this.hookCache.clear()
  }

  public getPluginsWithHook<K extends keyof THooks>(hookName: K): readonly Plugin<THooks>[] {
    if (this.hookCache.has(hookName)) {
      return this.hookCache.get(hookName)!
    }

    this.ensureSorted()

    const pluginsWithHook = this.sortedPlugins.filter(
      (plugin) =>
        (plugin.hooks &&
          typeof plugin.hooks === 'object' &&
          plugin.hooks !== null &&
          hookName in plugin.hooks) ||
        (hookName in plugin && typeof plugin[hookName] === 'function')
    )

    this.hookCache.set(hookName, pluginsWithHook)
    return pluginsWithHook.length > 0 ? pluginsWithHook : Object.freeze([])
  }

  private getHookFunction<K extends keyof THooks, TArgs extends any[], TReturn = any>(
    plugin: Plugin<THooks>,
    hookName: K
  ): HookFunction<TArgs, TReturn> | AsyncHookFunction<TArgs, TReturn> | undefined {
    return (plugin[hookName] as any) || plugin.hooks?.[hookName]
  }

  public exec<K extends keyof THooks, TArgs extends any[], TReturn = any>(
    hookName: K,
    ...args: TArgs
  ): TReturn | null {
    const pluginsWithHook = this.getPluginsWithHook(hookName)

    for (const plugin of pluginsWithHook) {
      const hookFunction = this.getHookFunction<K, TArgs, TReturn>(plugin, hookName)

      if (typeof hookFunction === 'function') {
        try {
          const result = hookFunction(...args)

          if (result instanceof Promise) {
            console.warn(
              `Plugin "${plugin.name}" hook "${String(
                hookName
              )}" returned Promise in sync execution. Use execAsync instead.`
            )
            continue
          }

          if (result !== null && result !== undefined) {
            return result
          }
        } catch (error) {
          console.error(`Plugin "${plugin.name}" hook "${String(hookName)}" failed:`, error)
        }
      }
    }

    return null
  }

  public async execAsync<K extends keyof THooks, TArgs extends any[], TReturn = any>(
    hookName: K,
    ...args: TArgs
  ): Promise<TReturn | null> {
    const pluginsWithHook = this.getPluginsWithHook(hookName)

    for (const plugin of pluginsWithHook) {
      const hookFunction = this.getHookFunction<K, TArgs, TReturn>(plugin, hookName)

      if (typeof hookFunction === 'function') {
        try {
          const result = await hookFunction(...args)

          if (result !== null && result !== undefined) {
            return result
          }
        } catch (error) {
          console.error(`Plugin "${plugin.name}" hook "${String(hookName)}" failed:`, error)
        }
      }
    }

    return null
  }

  public execAll<K extends keyof THooks, TArgs extends any[], TReturn = any>(
    hookName: K,
    ...args: TArgs
  ): TReturn[] {
    const pluginsWithHook = this.getPluginsWithHook(hookName)

    if (pluginsWithHook.length === 0) {
      return []
    }

    const results: TReturn[] = []

    for (const plugin of pluginsWithHook) {
      const hookFunction = this.getHookFunction<K, TArgs, TReturn>(plugin, hookName)

      if (typeof hookFunction === 'function') {
        try {
          const result = hookFunction(...args)

          if (result instanceof Promise) {
            console.warn(
              `Plugin "${plugin.name}" hook "${String(
                hookName
              )}" returned Promise in sync execution. Use execAllAsync instead.`
            )
            continue
          }

          if (result !== null && result !== undefined) {
            results.push(result)
          }
        } catch (error) {
          console.error(`Plugin "${plugin.name}" hook "${String(hookName)}" failed:`, error)
        }
      }
    }

    return results
  }

  public async execAllAsync<K extends keyof THooks, TArgs extends any[], TReturn = any>(
    hookName: K,
    ...args: TArgs
  ): Promise<TReturn[]> {
    const pluginsWithHook = this.getPluginsWithHook(hookName)

    if (pluginsWithHook.length === 0) {
      return []
    }

    const promises = pluginsWithHook
      .map((plugin) => {
        const hookFunction = this.getHookFunction<K, TArgs, TReturn>(plugin, hookName)
        if (typeof hookFunction === 'function') {
          return Promise.resolve()
            .then(() => hookFunction(...args))
            .catch((error) => {
              console.error(`Plugin "${plugin.name}" hook "${String(hookName)}" failed:`, error)
              return null
            })
        }
        return Promise.resolve(null)
      })
      .filter(Boolean)

    const results = await Promise.all(promises)
    return results.filter((result) => result !== null && result !== undefined) as TReturn[]
  }

  public clear(): this {
    this.plugins.length = 0
    this.sortedPlugins.length = 0
    this.isDirty = false
    this.hookCache.clear()
    return this
  }
}

export default PluginSystem
