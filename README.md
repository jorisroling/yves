# yves

A customizable value inspector for Node.js, inspired by [eyes](https://github.com/cloudhead/eyes.js/).

Handles circular objects, pretty-prints object literals, and supports ANSI color output, HTML output, and [debug](https://github.com/visionmedia/debug) integration.

## Install

```
npm install yves
```

Requires Node.js >= 18.

## Usage

```js
import yves from 'yves'

yves.inspect(something)
```

With a label:

```js
yves.inspect(something, 'my value')
```

With a custom inspector:

```js
const inspect = yves.inspector({ styles: { all: 'magenta' } })

inspect(something)
```

To return the string instead of printing to stdout:

```js
const inspect = yves.inspector({ stream: null })

console.log(inspect({ something: 42 }))
```

## Options

Pass options to `inspector()` or as the third argument to `inspect()`.

### Styles

```js
styles: {
    all:     'cyan',      // Overall style applied to everything
    label:   'underline', // Inspection labels, like 'array' in `array: [1, 2, 3]`
    other:   'inverted',  // Objects without a literal representation (functions)
    key:     'bold',      // Object keys, like 'a' in `{a: 1}`
    special: 'grey',      // null, undefined
    string:  'green',
    number:  'magenta',
    bool:    'blue',
    regexp:  'green',
}
```

Available styles: `bold`, `underline`, `inverse`, `cyan`, `magenta`, `blue`, `yellow`, `green`, `red`, `grey`.

Set `styles: false` to disable all styling. Set `colors: false` to disable ANSI codes.

### Formatting

| Option | Default | Description |
|--------|---------|-------------|
| `pretty` | `true` | Indent object literals and arrays |
| `indent` | `4` | Spaces per indentation level |
| `singleLineMax` | `2` | Max keys before an object is printed multiline |
| `trailingComma` | `true` | Add trailing commas in multiline output |
| `templateStrings` | `true` | Use backtick syntax for strings containing newlines/tabs |
| `escape` | `true` | Escape invisible characters in strings |
| `json` | `false` | Use JSON-style output (double-quoted keys and strings) |
| `sortKeys` | `false` | Sort object keys alphabetically |
| `sorted` | `false` | Deep-sort the input object before inspecting |

### Truncation

| Option | Default | Description |
|--------|---------|-------------|
| `maxLength` | `-1` | Max output length in characters (`-1` for unlimited) |
| `maxStringLength` | - | Truncate strings beyond this length |
| `maxArrayLength` | - | Show at most N array elements |
| `maxObjectKeys` | - | Show at most N object keys |

### Filtering

| Option | Default | Description |
|--------|---------|-------------|
| `includes` | `null` | Only show keys matching these strings/regexps |
| `excludes` | `null` | Hide keys matching these strings/regexps |
| `obfuscates` | `null` | Replace values of matching keys with `<<obfuscated>>` |
| `hideFunctions` | `false` | Omit function-valued properties |

```js
yves.inspect(obj, 'filtered', {
    includes: ['name', /^user/],
    obfuscates: ['password', /secret/],
})
```

### Output

| Option | Default | Description |
|--------|---------|-------------|
| `stream` | `process.stdout` | Writable stream, or `null` to return the string |
| `colors` | auto-detected | Enable ANSI color codes |
| `html` | `false` | Output HTML `<span>` tags instead of ANSI codes |
| `decycle` | `true` | Safely handle circular references |

## HTML output

```js
const inspect = yves.inspector({ stream: null, html: true, colors: true })

const html = inspect({ hello: 'world' })
// Returns a <pre> block with <span> color styling
```

## Debug integration

yves integrates with the [debug](https://github.com/visionmedia/debug) module. Use the `%y` formatter for compact output or `%Y` for sorted, function-free output:

```js
import debug from 'debug'
const log = debug('app')

log('user data: %y', userData)
```

## Console hijacking

Replace `console.log` / `console.dir` etc. with yves-powered output routed through `debug`:

```js
yves.console('myapp')

console.log('hello')   // now outputs via debug('myapp:console:log')
console.dir({ a: 1 })  // pretty-printed via yves

yves.console_unset()   // restore original console
```

## API

- **`yves.inspect(obj, label?, options?)`** -- inspect and print to stream
- **`yves.inspector(options?)`** -- returns a reusable inspect function
- **`yves.options(opts)`** -- update global defaults
- **`yves.stylize(str, style, options)`** -- apply a single ANSI/HTML style
- **`yves.typeOf(value)`** -- enhanced `typeof` (distinguishes array, regexp, date, buffer, null, bigint)
- **`yves.debugger(namespace)`** -- create a [debug](https://github.com/visionmedia/debug) logger
- **`yves.console(namespace?)`** -- hijack console with debug-powered output
- **`yves.console_unset()`** -- restore original console methods

## License

MIT
