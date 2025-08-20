export type HookFunction<TArgs extends any[] = any[], TReturn = any> = (
  ...args: TArgs
) => TReturn | null | undefined

export type AsyncHookFunction<TArgs extends any[] = any[], TReturn = any> = (
  ...args: TArgs
) => Promise<TReturn | null | undefined>

export type PluginFunction<T = any> = () => Plugin<T> | Plugin<T>[]

export type PluginInput<T = any> = Plugin<T> | PluginFunction<T> | Plugin<T>[]

export interface PluginBase<T = any> {
  name: string
  priority?: number
  hooks?: T
}

export type PluginHooks<T> = {
  [K in keyof T]?: T[K] extends HookFunction<infer Args, infer Return>
    ? HookFunction<Args, Return>
    : T[K] extends AsyncHookFunction<infer Args, infer Return>
      ? AsyncHookFunction<Args, Return>
      : never
}

export type Plugin<T = any> = PluginBase<T> & PluginHooks<T>
