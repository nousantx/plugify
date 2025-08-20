export interface HookContext<T = any> {
  plugins: PluginSystem<T>
  [key: string]: any
}

export type HookFunction<TArgs = any, TReturn = any> = (
  context: TArgs & HookContext
) => TReturn | null | undefined

export type PluginFunction<T = any> = () => Plugin<T> | Plugin<T>[]

export type PluginInput<T = any> = Plugin<T> | PluginFunction<T> | Plugin<T>[]

export interface Plugin<T = any> {
  name: string
  priority?: number
  hooks?: Partial<T>
}

export class PluginSystem<THooks = Record<string, HookFunction>> {
  private plugins: Plugin<THooks>[] = []
  private hookCache: Map<keyof THooks, Plugin<THooks>[]> = new Map()

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

  /**
   * Add one or more plugins to the system
   */
  public use(...pluginInputs: PluginInput<THooks>[]): this {
    const newPlugins = this.flattenPlugins(pluginInputs)
    this.plugins.push(...newPlugins)
    this.sortPlugins()
    this.clearCache()
    return this
  }

  /**
   * Remove a plugin by name
   */
  public remove(pluginName: string): this {
    this.plugins = this.plugins.filter((p) => p.name !== pluginName)
    this.clearCache()
    return this
  }

  /**
   * Get all registered plugins
   */
  public getPlugins(): Plugin<THooks>[] {
    return [...this.plugins]
  }

  /**
   * Get plugins that have a specific hook
   */
  public getPluginsWithHook<K extends keyof THooks>(hookName: K): Plugin<THooks>[] {
    if (this.hookCache.has(hookName)) {
      return this.hookCache.get(hookName)!
    }

    const pluginsWithHook = this.plugins
      .filter((plugin) => plugin.hooks && hookName in plugin.hooks)
      .sort((a, b) => (b.priority || 0) - (a.priority || 0))

    this.hookCache.set(hookName, pluginsWithHook)
    return pluginsWithHook
  }

  /**
   * Execute a hook with the given context
   * Returns the first non-null/undefined result
   */
  public exec<K extends keyof THooks, TContext = any, TReturn = any>(
    hookName: K,
    context: TContext
  ): TReturn | null {
    const pluginsWithHook = this.getPluginsWithHook(hookName)

    for (const plugin of pluginsWithHook) {
      const hookFunction = plugin.hooks![hookName] as HookFunction<TContext, TReturn>

      if (hookFunction) {
        try {
          const result = hookFunction({
            ...context,
            plugins: this
          } as TContext & HookContext)

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

  /**
   * Execute a hook and collect all results (not just the first one)
   */
  public execAll<K extends keyof THooks, TContext = any, TReturn = any>(
    hookName: K,
    context: TContext
  ): TReturn[] {
    const pluginsWithHook = this.getPluginsWithHook(hookName)
    const results: TReturn[] = []

    for (const plugin of pluginsWithHook) {
      const hookFunction = plugin.hooks![hookName] as HookFunction<TContext, TReturn>

      if (hookFunction) {
        try {
          const result = hookFunction({
            ...context,
            plugins: this
          } as TContext & HookContext)

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

  /**
   * Check if a plugin with the given name exists
   */
  public hasPlugin(name: string): boolean {
    return this.plugins.some((p) => p.name === name)
  }

  /**
   * Get a specific plugin by name
   */
  public getPlugin(name: string): Plugin<THooks> | null {
    return this.plugins.find((p) => p.name === name) || null
  }

  private sortPlugins(): void {
    this.plugins.sort((a, b) => (b.priority || 0) - (a.priority || 0))
  }

  private clearCache(): void {
    this.hookCache.clear()
  }
}

export default PluginSystem
