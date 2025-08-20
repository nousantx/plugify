# Plugify

A fast and quick way to add plugin system to your code.

## Installation

```bash
npm i plugify
```

## Usage

```javascript
import { PluginSystem } from 'plugify'

class MyClass {
  constructor(plugins) {
    this.plugins = new PluginSystem(plugins)
  }

  process(name) {
    return this.plugins.exec('getName', name) || name
  }
}

const c = new MyClass([
  {
    name: 'say-hello',
    getName: (name) => `hello, ${name}!`
  }
])

console.log(c.process('world')) // hello, world!
console.log(c.process('human')) // hello, human!
```

## LICENSE

MIT © 2025-Present
