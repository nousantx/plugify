import { ExecutionCore } from './core'
import { HookFunction, AsyncHookFunction, Plugin } from '../types'

// Sync-only execution
export class SyncPluginSystem<
  THooks = Record<string, HookFunction | AsyncHookFunction>
> extends ExecutionCore<THooks> {
  private executeHook<K extends keyof THooks, TArgs extends any[], TReturn = any>(
    plugin: Plugin<THooks>,
    hookName: K,
    ...args: TArgs
  ): TReturn | null {
    const hookFunction = this.getHookFunction<K, TArgs, TReturn>(plugin, hookName)

    if (typeof hookFunction !== 'function') {
      return null
    }

    try {
      const result = hookFunction(...args)

      if (result instanceof Promise) {
        console.warn(
          `Plugin "${plugin.name}" hook "${String(
            hookName
          )}" returned Promise in sync execution. Use AsyncPluginSystem instead.`
        )
        return null
      }

      return result !== null && result !== undefined ? result : null
    } catch (error) {
      console.error(`Plugin "${plugin.name}" hook "${String(hookName)}" failed:`, error)
      return null
    }
  }

  public exec<K extends keyof THooks, TArgs extends any[], TReturn = any>(
    hookName: K,
    ...args: TArgs
  ): TReturn | null {
    const pluginsWithHook = this.getPluginsWithHook(hookName)

    for (const plugin of pluginsWithHook) {
      const result = this.executeHook<K, TArgs, TReturn>(plugin, hookName, ...args)
      if (result !== null) {
        return result
      }
    }

    return null
  }

  public execAll<K extends keyof THooks, TArgs extends any[], TReturn = any>(
    hookName: K,
    ...args: TArgs
  ): TReturn[] {
    const pluginsWithHook = this.getPluginsWithHook(hookName)

    const results: TReturn[] = []
    for (const plugin of pluginsWithHook) {
      const result = this.executeHook<K, TArgs, TReturn>(plugin, hookName, ...args)
      if (result !== null) {
        results.push(result)
      }
    }

    return results
  }
}

// Async-only execution
export class AsyncPluginSystem<
  THooks = Record<string, HookFunction | AsyncHookFunction>
> extends ExecutionCore<THooks> {
  private async executeHook<K extends keyof THooks, TArgs extends any[], TReturn = any>(
    plugin: Plugin<THooks>,
    hookName: K,
    ...args: TArgs
  ): Promise<TReturn | null> {
    const hookFunction = this.getHookFunction<K, TArgs, TReturn>(plugin, hookName)

    if (typeof hookFunction !== 'function') {
      return null
    }

    try {
      const result = await hookFunction(...args)
      return result !== null && result !== undefined ? result : null
    } catch (error) {
      console.error(`Plugin "${plugin.name}" hook "${String(hookName)}" failed:`, error)
      return null
    }
  }

  public async exec<K extends keyof THooks, TArgs extends any[], TReturn = any>(
    hookName: K,
    ...args: TArgs
  ): Promise<TReturn | null> {
    const pluginsWithHook = this.getPluginsWithHook(hookName)

    for (const plugin of pluginsWithHook) {
      const result = await this.executeHook<K, TArgs, TReturn>(plugin, hookName, ...args)
      if (result !== null) {
        return result
      }
    }

    return null
  }

  public async execAll<K extends keyof THooks, TArgs extends any[], TReturn = any>(
    hookName: K,
    ...args: TArgs
  ): Promise<TReturn[]> {
    const pluginsWithHook = this.getPluginsWithHook(hookName)

    const results: TReturn[] = []
    for (const plugin of pluginsWithHook) {
      const result = await this.executeHook<K, TArgs, TReturn>(plugin, hookName, ...args)
      if (result !== null) {
        results.push(result)
      }
    }

    return results
  }
}

// Combined system with both sync and async methods
export class PluginSystem<
  THooks = Record<string, HookFunction | AsyncHookFunction>
> extends ExecutionCore<THooks> {
  private executeHookSync<K extends keyof THooks, TArgs extends any[], TReturn = any>(
    plugin: Plugin<THooks>,
    hookName: K,
    ...args: TArgs
  ): TReturn | null {
    const hookFunction = this.getHookFunction<K, TArgs, TReturn>(plugin, hookName)

    if (typeof hookFunction !== 'function') {
      return null
    }

    try {
      const result = hookFunction(...args)

      if (result instanceof Promise) {
        console.warn(
          `Plugin "${plugin.name}" hook "${String(
            hookName
          )}" returned Promise in sync execution. Use execAsync/execAllAsync instead.`
        )
        return null
      }

      return result !== null && result !== undefined ? result : null
    } catch (error) {
      console.error(`Plugin "${plugin.name}" hook "${String(hookName)}" failed:`, error)
      return null
    }
  }

  private async executeHookAsync<K extends keyof THooks, TArgs extends any[], TReturn = any>(
    plugin: Plugin<THooks>,
    hookName: K,
    ...args: TArgs
  ): Promise<TReturn | null> {
    const hookFunction = this.getHookFunction<K, TArgs, TReturn>(plugin, hookName)

    if (typeof hookFunction !== 'function') {
      return null
    }

    try {
      const result = await hookFunction(...args)
      return result !== null && result !== undefined ? result : null
    } catch (error) {
      console.error(`Plugin "${plugin.name}" hook "${String(hookName)}" failed:`, error)
      return null
    }
  }

  // Sync methods
  public exec<K extends keyof THooks, TArgs extends any[], TReturn = any>(
    hookName: K,
    ...args: TArgs
  ): TReturn | null {
    const pluginsWithHook = this.getPluginsWithHook(hookName)

    for (const plugin of pluginsWithHook) {
      const result = this.executeHookSync<K, TArgs, TReturn>(plugin, hookName, ...args)
      if (result !== null) {
        return result
      }
    }

    return null
  }

  public execAll<K extends keyof THooks, TArgs extends any[], TReturn = any>(
    hookName: K,
    ...args: TArgs
  ): TReturn[] {
    const pluginsWithHook = this.getPluginsWithHook(hookName)

    const results: TReturn[] = []
    for (const plugin of pluginsWithHook) {
      const result = this.executeHookSync<K, TArgs, TReturn>(plugin, hookName, ...args)
      if (result !== null) {
        results.push(result)
      }
    }

    return results
  }

  // Async methods
  public async execAsync<K extends keyof THooks, TArgs extends any[], TReturn = any>(
    hookName: K,
    ...args: TArgs
  ): Promise<TReturn | null> {
    const pluginsWithHook = this.getPluginsWithHook(hookName)

    for (const plugin of pluginsWithHook) {
      const result = await this.executeHookAsync<K, TArgs, TReturn>(plugin, hookName, ...args)
      if (result !== null) {
        return result
      }
    }

    return null
  }

  public async execAllAsync<K extends keyof THooks, TArgs extends any[], TReturn = any>(
    hookName: K,
    ...args: TArgs
  ): Promise<TReturn[]> {
    const pluginsWithHook = this.getPluginsWithHook(hookName)

    const results: TReturn[] = []
    for (const plugin of pluginsWithHook) {
      const result = await this.executeHookAsync<K, TArgs, TReturn>(plugin, hookName, ...args)
      if (result !== null) {
        results.push(result)
      }
    }

    return results
  }
}
