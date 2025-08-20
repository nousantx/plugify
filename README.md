# Plugify

A lightweight, type-safe plugin system for JavaScript and TypeScript applications that makes building extensible software architectures simple and intuitive.

## Features

- **Type Safety**: Full TypeScript support with generic hook definitions
- **Priority System**: Execute plugins in order of priority (highest first)
- **Async Support**: Handle both synchronous and asynchronous hooks
- **Flexible Execution**: Execute first match, or collect results from all plugins
- **Performance Optimized**: Built-in caching and lazy evaluation
- **Error Resilient**: Graceful error handling that doesn't break the plugin chain
- **Zero Dependencies**: Lightweight with no external dependencies
- **Method Chaining**: Fluent API for easy plugin management

## Installation

```bash
npm install @nousantx/plugify
```

## Quick Start

```typescript
import { PluginSystem } from '@nousantx/plugify'

// Define your hook interface
interface MyHooks {
  onInit: (config: Config) => Config
  onProcess: (data: string) => string
  onComplete: (result: any) => Promise<void>
}

// Create a plugin system
const plugins = new PluginSystem<MyHooks>()

// Add plugins
plugins.use({
  name: 'validator',
  priority: 10,
  onProcess: (data) => {
    return data.trim().toLowerCase()
  }
})

plugins.use({
  name: 'transformer',
  priority: 5,
  onProcess: (data) => {
    return `processed: ${data}`
  }
})

// Execute hooks
const result = plugins.exec('onProcess', 'Hello World')
console.log(result) // "hello world" (validator runs first due to higher priority)
```

## API Reference

### PluginSystem Constructor

```typescript
constructor(plugins?: PluginInput<THooks>[])
```

### Methods

- `use(...plugins: PluginInput<THooks>[]): this` - Add plugins
- `remove(pluginName: string): this` - Remove plugin by name
- `clear(): this` - Remove all plugins
- `getPlugins(): readonly Plugin<THooks>[]` - Get all plugins
- `getPluginsWithHook<K>(hookName: K): readonly Plugin<THooks>[]` - Get plugins with specific hook
- `exec<K>(hookName: K, ...args): TReturn | null` - Execute first matching hook
- `execAsync<K>(hookName: K, ...args): Promise<TReturn | null>` - Execute first matching async hook
- `execAll<K>(hookName: K, ...args): TReturn[]` - Execute all matching hooks
- `execAllAsync<K>(hookName: K, ...args): Promise<TReturn[]>` - Execute all matching async hooks

## Usage Examples

### Basic Plugin Registration

```typescript
// Direct plugin object
plugins.use({
  name: 'logger',
  onInit: (config) => {
    console.log('Initializing with:', config)
    return config
  }
})

// Plugin factory function
plugins.use(() => ({
  name: 'dynamic-plugin',
  onProcess: (data) => `[${Date.now()}] ${data}`
}))

// Multiple plugins at once
plugins.use(plugin1, plugin2, plugin3)

// Array of plugins
plugins.use([plugin1, plugin2])
```

### Hook Execution Modes

#### `exec()` - First Match

Executes plugins in priority order and returns the first non-null/undefined result:

```typescript
const result = plugins.exec('onProcess', inputData)
// Returns result from highest priority plugin that handles the hook
```

#### `execAsync()` - First Match (Async)

Same as `exec()` but handles async hooks:

```typescript
const result = await plugins.execAsync('onComplete', data)
```

#### `execAll()` - All Results

Executes all plugins and collects all non-null results:

```typescript
const results = plugins.execAll('onValidate', input)
// Returns array of all validation results
```

#### `execAllAsync()` - All Results (Async)

Same as `execAll()` but handles async hooks:

```typescript
const results = await plugins.execAllAsync('onTransform', data)
```

### Priority System

Plugins execute in priority order (highest first):

```typescript
plugins.use(
  { name: 'first', priority: 100, onInit: () => 'high' },
  { name: 'second', priority: 50, onInit: () => 'medium' },
  { name: 'third', onInit: () => 'low' } // priority defaults to 0
)

const result = plugins.exec('onInit')
// Returns 'high' (from first plugin)
```

### Plugin Management

```typescript
// Add plugins (with duplicate protection)
plugins.use(newPlugin)

// Remove plugin by name
plugins.remove('plugin-name')

// Get all plugins
const allPlugins = plugins.getPlugins()

// Get plugins that implement a specific hook
const processPlugins = plugins.getPluginsWithHook('onProcess')

// Clear all plugins
plugins.clear()

// Method chaining
plugins.use(plugin1).use(plugin2).remove('old-plugin')
```

### Error Handling

Plugify handles errors gracefully - if one plugin fails, others continue to execute:

```typescript
plugins.use({
  name: 'faulty',
  onProcess: () => {
    throw new Error('Something went wrong')
  }
})

plugins.use({
  name: 'backup',
  onProcess: (data) => `backup: ${data}`
})

// Will log error from 'faulty' plugin but return result from 'backup'
const result = plugins.exec('onProcess', 'test')
```

## License

MIT © 2025-Present [NOuSantx](https://github.com/nousantx)
