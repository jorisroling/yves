import sortobject from 'deep-sort-object'
import debug from 'debug'

const ANSI_CODES = {
  bold: [1, 22],
  underline: [4, 24],
  inverse: [7, 27],
  cyan: [36, 39],
  magenta: [35, 39],
  blue: [34, 39],
  yellow: [33, 39],
  green: [32, 39],
  red: [31, 39],
  grey: [90, 39],
}

const HTML_STYLE_MAP = {
  bold: 'font-weight:bold',
  underline: 'text-decoration:underline',
}

const RESERVED_WORDS = new Set([
  'abstract', 'else', 'instanceof', 'switch', 'boolean', 'enum', 'int',
  'synchronized', 'break', 'export', 'interface', 'this', 'byte', 'extends',
  'long', 'throw', 'case', 'false', 'native', 'throws', 'catch', 'final',
  'new', 'transient', 'char', 'finally', 'null', 'true', 'class', 'float',
  'package', 'try', 'const', 'for', 'private', 'typeof', 'continue',
  'function', 'protected', 'var', 'debugger', 'goto', 'public', 'void',
  'default', 'if', 'return', 'volatile', 'delete', 'implements', 'short',
  'while', 'do', 'import', 'static', 'with', 'double', 'in', 'super',
])

// Unicode property escapes (Node 18+) replace massive hand-rolled character class regexes
const regexIdentifierName = /^[\p{ID_Start}$_][\p{ID_Continue}$\u200C\u200D]*$/u
const regexES3ReservedWord = /^(?:do|if|in|for|int|new|try|var|byte|case|char|else|enum|goto|long|null|this|true|void|with|break|catch|class|const|false|final|float|short|super|throw|while|delete|double|export|import|native|public|return|static|switch|throws|typeof|boolean|default|extends|finally|package|private|abstract|continue|debugger|function|volatile|interface|protected|transient|implements|instanceof|synchronized)$/
const regexNumber = /^(?![+-])([0-9a-fA-FxX+\-.]+)$/
const regexOctalLiteral = /^0[0-7]+$/
const regexZeroWidth = /\u200c|\u200d/

function quoteKey(word) {
  const value = word
  let valueAsNumber = Number(value)

  const valueAsUnescaped = value.replace(
    /\\u([a-fA-F0-9]{4})|\\u\{([0-9a-fA-F]+)\}/g,
    (_, $1, $2) => {
      const cp = parseInt($2 || $1, 16)
      return (cp >= 0xd800 && cp <= 0xdfff) ? '\0' : String.fromCodePoint(cp)
    }
  )

  const isIdentifier = regexIdentifierName.test(valueAsUnescaped)

  if (isIdentifier) {
    const needsQuotes = regexES3ReservedWord.test(valueAsUnescaped) || regexZeroWidth.test(valueAsUnescaped)
    if (needsQuotes) return `'${value}'`
  } else if (regexNumber.test(value) && !isNaN(valueAsNumber)) {
    if (regexOctalLiteral.test(value)) valueAsNumber = parseInt(value, 8)
    return word
  } else {
    return `'${value.replace(/['\\]/g, '\\$&')}'`
  }

  if (RESERVED_WORDS.has(word)) return `'${word}'`
  return word
}

function htmlEscape(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function merge(...objs) {
  const target = {}
  for (const o of objs) {
    for (const k of Object.keys(o)) {
      if (k === 'styles') {
        target.styles = o.styles ? { ...o.styles } : false
      } else {
        target[k] = o[k]
      }
    }
  }
  return target
}

function typeOf(value) {
  let s = typeof value
  if (s === 'object' || s === 'function') {
    if (value === null) return 'null'
    // Order matters: iterate all types, last match wins (most specific types are last)
    const types = [Object, Array, String, RegExp, Number, Function, Boolean, Date, Buffer]
    for (const T of types) {
      try { if (value instanceof T) s = T.name.toLowerCase() } catch { /* ignore */ }
    }
  }
  return s
}

function getCircularReplacer() {
  const seen = new WeakSet()
  return (key, value) => {
    if (typeof value === 'object' && value !== null) {
      if (seen.has(value)) return
      seen.add(value)
    }
    if (typeof value === 'bigint') return value.toString()
    return value
  }
}

// --- Core stringify functions (take ctx to avoid global mutable state) ---

function stringify(obj, options, ctx) {
  const stylize = (str, style) => yves.stylize(str, options?.styles?.[style], options)

  const index = ctx.stack.indexOf(obj)
  if (index !== -1) {
    return stylize('.'.repeat(ctx.stack.length - index), 'special')
  }
  ctx.stack.push(obj)

  const result = (() => {
    switch (typeOf(obj)) {
    case 'string': {
      if (options?.templateStrings && !options?.json && /[\r\n\t\u0001-\u001F]/u.test(obj)) {
        const escaped = options?.html ? htmlEscape(obj.replace(/`/g, '\\`')) : obj.replace(/`/g, '\\`')
        return stylize('`' + escaped + '`', 'string')
      }
      const quoted = obj.indexOf("'") === -1 && !options?.json
        ? `'${obj.replace(/'/g, "\\'")}'`
        : `"${obj.replace(/"/g, '\\"')}"`
      return stylize(stringifyString(quoted, options), 'string')
    }
    case 'buffer':
      return stringifyBuffer(obj, options, ctx)
    case 'regexp':
      return stylize(obj.toString(), 'regexp')
    case 'number':
      return stylize(`${obj}`, 'number')
    case 'bigint':
      return stylize(`${obj}n`, 'number')
    case 'function':
      return options?.stream
        ? stylize(options.functions ? obj.toString() : 'Function', 'other')
        : '[Function]'
    case 'null':
      return stylize('null', 'special')
    case 'undefined':
      return stylize('undefined', 'special')
    case 'boolean':
      return stylize(`${obj}`, 'bool')
    case 'date':
      return stylize(`new Date("${obj.toISOString()}")`, 'date')
    case 'array':
      return stringifyArray(obj, options, ctx.stack.length, ctx)
    case 'object':
      return stringifyObject(obj, options, ctx.stack.length, ctx)
    }
  })()

  ctx.stack.pop()
  return result
}

function stringifyBuffer(obj, options, ctx) {
  if (ctx.seen.has(obj)) return stringify('[Circular]', options, ctx)
  ctx.seen.add(obj)
  const hex = [...Buffer.from(obj)].map(b => b.toString(16).padStart(2, '0')).join(' ')
  return yves.stylize(`<Buffer ${hex}>`, options?.styles?.other, options)
}

function stringifyString(str, options) {
  let result = str
  if (options?.escape) {
    result = result
      .replace(/\r/g, '\\r')
      .replace(/\n/g, '\\n')
      .replace(/\t/g, '\\t')
      .replace(/[\u0001-\u001F]/gu, m => `\\x${m.charCodeAt(0).toString(16).padStart(2, '0')}`)
    if (options?.html) result = htmlEscape(result)
  }
  if (options && Object.hasOwn(options, 'maxStringLength') && options.maxStringLength >= 0) {
    if (result.length > options.maxStringLength) {
      const len = Math.max(0, options.maxStringLength - 3)
      result = result.slice(0, len) + '...'
    }
  }
  return result
}

function stringifyArray(ary, options, level, ctx) {
  if (ctx.seen.has(ary)) return stringify('[Circular]', options, ctx)
  ctx.seen.add(ary)

  const pretty = options?.pretty && (
    ary.length > 4 ||
    ary.some(o => (o !== null && typeof o === 'object' && Object.keys(o).length > 0) || (Array.isArray(o) && o.length > 0))
  )
  const ws = pretty ? '\n' + ' '.repeat(level * (options?.indent ?? 4)) : ' '

  const truncate = options && Object.hasOwn(options, 'maxArrayLength') && options.maxArrayLength >= 0
  const length = truncate ? Math.min(ary.length, options.maxArrayLength) : ary.length

  const out = []
  for (let i = 0; i < length; i++) {
    out.push(stringify(ary[i], options, ctx))
  }
  if (length < ary.length) out.push('<<truncated>>')

  if (out.length === 0) return '[]'

  const trailing = (options?.json || !options?.trailingComma) || !pretty ? '' : ','
  const closing = pretty ? ws.slice(0, -1 * (options?.indent ?? 4)) : ws
  return `[${ws}${out.join(`,${pretty ? ws : ' '}`)}${trailing}${closing}]`
}

function yvesInclude(key, includes) {
  if (!includes?.length) return true
  return includes.some(inc =>
    typeof inc === 'string' ? key === inc : (inc instanceof RegExp && inc.test(key))
  )
}

function yvesExclude(key, excludes) {
  if (!excludes?.length) return false
  return excludes.some(exc =>
    typeof exc === 'string' ? key === exc : (exc instanceof RegExp && exc.test(key))
  )
}

function yvesObfuscate(key, obfuscates) {
  if (!obfuscates?.length) return false
  return obfuscates.some(obf =>
    typeof obf === 'string' ? key === obf : (obf instanceof RegExp && obf.test(key))
  )
}

function stringifyObject(obj, options, level, ctx) {
  if (ctx.seen.has(obj)) return stringify('[Circular]', options, ctx)
  ctx.seen.add(obj)

  const keys = options?.showHidden ? Object.keys(obj) : Object.getOwnPropertyNames(obj)
  if (options?.sortKeys) keys.sort()

  const pretty = options?.pretty && (
    keys.length > (options?.singleLineMax ?? 2) ||
    keys.some(k => typeof obj[k] === 'object')
  )
  const ws = pretty ? '\n' + ' '.repeat(level * (options?.indent ?? 4)) : ' '

  const truncate = options && Object.hasOwn(options, 'maxObjectKeys') && options.maxObjectKeys >= 0
  const includeKeys = truncate ? keys.slice(0, options.maxObjectKeys) : keys

  const out = []
  for (const k of includeKeys) {
    if (level === 1 && options?.exclude?.includes(k)) continue
    if (!Object.hasOwn(obj, k)) continue
    if (yvesExclude(k, options?.excludes)) continue
    if (!yvesInclude(k, options?.includes)) continue
    if (obj[k] instanceof Function && options?.hideFunctions) continue

    const keyStr = options?.json ? `"${k}"` : quoteKey(k)
    const styledKey = yves.stylize(keyStr, options?.styles?.key, options)
    const val = yvesObfuscate(k, options?.obfuscates)
      ? stringify('<<obfuscated>>', options, ctx)
      : stringify(obj[k], options, ctx)
    out.push(`${styledKey}: ${val}`)
  }

  if (includeKeys.length < keys.length) {
    out.push(yves.stylize('<<truncated>>', options?.styles?.key, options?.styles))
  }

  if (out.length === 0) return '{}'

  const trailing = (options?.json || !options?.trailingComma) || !pretty ? '' : ','
  const closing = pretty ? ws.slice(0, -1 * (options?.indent ?? 4)) : ws
  return `{${ws}${out.join(`,${pretty ? ws : ' '}`)}${trailing}${closing}}`
}

// --- Main yves object ---

const yves = (...args) => {
  const results = args.map(a => yves.inspector({ stream: null })(a))
  const log = yves._console?.log ?? console.log
  log(results.join(' '))
}

yves.supportsColors = () => {
  if ('YVES_COLORS' in process.env) return true
  if (process.stdout && !process.stdout.isTTY) return false
  if (process.platform === 'win32') return true
  if (process.env.TERM === 'dumb') return false
  if (/^screen|^xterm|^vt100|color|ansi|cygwin|linux/i.test(process.env.TERM)) return true
  return false
}

yves.defaults = {
  styles: {
    all: 'cyan',
    label: 'underline',
    other: 'inverted',
    key: 'bold',
    special: 'grey',
    string: 'green',
    number: 'magenta',
    bool: 'blue',
    regexp: 'green',
  },
  pretty: true,
  indent: 4,
  hideFunctions: false,
  showHidden: false,
  sortKeys: false,
  stream: process?.stdout,
  maxLength: -1,
  colors: yves.supportsColors(),
  html: false,
  json: false,
  escape: true,
  functions: false,
  singleLineMax: 2,
  sorted: false,
  includes: null,
  excludes: null,
  obfuscate: null,
  decycle: true,
  trailingComma: true,
  templateStrings: true,
}

yves.options = (opts) => {
  yves.defaults = { ...yves.defaults, ...opts }
}

yves.inspector = function (options) {
  const that = this
  return (obj, label, opts) => {
    const lmyopts = merge(yves.defaults ?? {}, options ?? {}, opts ?? {})
    if (lmyopts.sorted && typeOf(obj) === 'object') {
      obj = sortobject(obj)
    }
    if (lmyopts.decycle) {
      try {
        JSON.stringify(obj, (key, value) => typeof value === 'bigint' ? value.toString() : value)
      } catch (e) {
        if (e.message.startsWith('Converting circular structure to JSON')) {
          try {
            obj = JSON.parse(JSON.stringify(obj, getCircularReplacer()))
          } catch (e2) {
            return `Error: ${e2.message}`
          }
        } else {
          return `Error: ${e.message}`
        }
      }
    }
    const myopts = merge(options ?? {}, opts ?? {})
    const result = that.inspect.call(that, obj, label, myopts)
    if (myopts.html && !myopts.stream) {
      const colorStyle = myopts?.styles?.all ? `color:${myopts.styles.all};` : ''
      return `<pre class="yves" style="padding:8px;background-color:black;color:white;overflow:auto;border-radius:6px;${colorStyle}">${result}</pre>`
    }
    return result
  }
}

yves.debugger = (namespace, options) => {
  if (!namespace && !options) return debug

  if (!options) {
    const deb = debug(namespace)
    deb.log = (yves._console?.log ?? console.log).bind(console)
    if (typeof window !== 'undefined' && window.document) { // eslint-disable-line no-undef
      if (!window.debug) window.debug = deb // eslint-disable-line no-undef
    } else if (typeof process !== 'undefined') {
      if (!global.debug) global.debug = deb
    }
    return deb
  }

  debug.formatters[namespace] = (y) =>
    yves.inspector()(y, null, { ...options, stream: null })
}

if (!debug.formatters.y) {
  debug.formatters.y = (y) => yves.inspector()(y, null, { stream: null })
}

yves.debugger('y', { stream: null })
yves.debugger('Y', { stream: null, sortKeys: true, hideFunctions: true, singleLineMax: 0 })

yves._console = null
yves._console_namespace = ''

yves.console = (namespace = '') => {
  if (namespace.length && !namespace.endsWith(':')) namespace += ':'
  yves._console_namespace = namespace

  yves.debugLog = yves.debugger(`${namespace}console:log`)
  yves.debugInfo = yves.debugger(`${namespace}console:info`)
  yves.debugWarn = yves.debugger(`${namespace}console:warn`)
  yves.debugError = yves.debugger(`${namespace}console:error`)
  yves.debugDir = yves.debugger(`${namespace}console:dir`)

  yves.console_setup()
  yves.console_set()
}

yves.console_setup = () => {
  if (!yves._console) {
    yves._console = {
      log: console.log,
      info: console.info,
      warn: console.warn,
      error: console.error,
      dir: console.dir,
    }
  }
}

yves.debugLog = null
yves.logLevel = 0
yves.log = (...args) => (yves.debugLog ?? yves._console?.log ?? console.log)(...args)

yves.debugInfo = null
yves.info = (...args) => (yves.debugInfo ?? yves._console?.info ?? console.info)(...args)

yves.debugWarn = null
yves.warn = (...args) => (yves.debugWarn ?? yves._console?.warn ?? console.warn)(...args)

yves.debugError = null
yves.error = (...args) => (yves.debugError ?? yves._console?.error ?? console.error)(...args)

yves.debugDir = null
yves.dir = (...args) => {
  const fn = yves.debugDir ?? yves._console?.dir ?? console.dir
  fn('%y', ...args)
}

yves.console_set = () => {
  console.log = yves.log
  console.info = yves.info
  console.warn = yves.warn
  console.error = yves.error
  console.dir = yves.dir
}

yves.console_unset = () => {
  if (yves._console) {
    if (yves._console.log) console.log = yves._console.log
    if (yves._console.info) console.info = yves._console.info
    if (yves._console.warn) console.warn = yves._console.warn
    if (yves._console.error) console.error = yves._console.error
    if (yves._console.dir) console.dir = yves._console.dir
  }
}

yves.inspect = function (obj, label, options) {
  options = merge(this.defaults, options ?? {})
  const ctx = { stack: [], seen: new Set() }
  return this.print(stringify(obj, options, ctx), label, options)
}

yves.print = (str, label, options) => {
  if (options && !options.html && str) {
    for (let c = 0, i = 0; i < str.length; i++) {
      if (str.charAt(i) === '\x1b') { i += 4 }
      else if (c === options.maxLength) { str = `${str.slice(0, i - 1)}\u2026`; break }
      else { c++ }
    }
  }

  const styledLabel = label
    ? `${yves.stylize(label, options?.styles?.label, options)}: `
    : ''
  const styledStr = yves.stylize(str, options?.styles?.all, options)
  const reset = options?.html ? '' : (options?.colors ? '\x1b[0m' : '')

  if (options?.stream) {
    return options.stream.write(`${styledLabel}${styledStr}${reset}\n`)
  }
  return `${styledLabel}${styledStr}${reset}`
}

yves.stylize = (str, style, options) => {
  if (!options?.colors) return str

  if (options.html) {
    if (!style) return str
    const cssStyle = HTML_STYLE_MAP[style]
    return cssStyle
      ? `<span style="${cssStyle}">${str}</span>`
      : `<span style="color:${style}">${str}</span>`
  }

  if (!style || !ANSI_CODES[style]) return str
  const [open, close] = ANSI_CODES[style]
  const endCode = close === 39 && options?.styles?.all
    ? ANSI_CODES[options.styles.all][0]
    : close
  return `\x1b[${open}m${str}\x1b[${endCode}m`
}

yves.typeOf = typeOf
export default yves
