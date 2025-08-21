import { HookFunction, AsyncHookFunction, PluginInput, Plugin } from '../types'

export class Core<THooks = Record<string, HookFunction | AsyncHookFunction>> {
  protected plugins: Plugin<THooks>[] = []
  protected hookCache: Map<keyof THooks, Plugin<THooks>[]> = new Map()
  protected sortedPlugins: Plugin<THooks>[] = []
  protected isDirty = false

  constructor(plugins: PluginInput<THooks>[] = []) {
    this.use(...plugins)
  }

  protected flattenPlugins(pluginInputs: PluginInput<THooks>[]): Plugin<THooks>[] {
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

  protected ensureSorted(): void {
    if (this.isDirty) {
      this.sortedPlugins =
        this.plugins.length === 0
          ? []
          : [...this.plugins].sort((a, b) => (b.priority || 0) - (a.priority || 0))
      this.isDirty = false
    }
  }

  protected invalidateCache(): void {
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

  protected getHookFunction<K extends keyof THooks, TArgs extends any[], TReturn = any>(
    plugin: Plugin<THooks>,
    hookName: K
  ): HookFunction<TArgs, TReturn> | AsyncHookFunction<TArgs, TReturn> | undefined {
    return (plugin[hookName] as any) || plugin.hooks?.[hookName]
  }
}

export abstract class ExecutionCore<
  THooks = Record<string, HookFunction | AsyncHookFunction>
> extends Core<THooks> {
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

  public clear(): this {
    this.plugins.length = 0
    this.sortedPlugins.length = 0
    this.isDirty = false
    this.hookCache.clear()
    return this
  }
}
