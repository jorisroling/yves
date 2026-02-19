import { describe, it, expect } from 'vitest'
import yves from '../lib/yves.mjs'

const inspect = yves.inspector({ stream: null })

// Strip ANSI escape codes for assertion matching
const strip = (s) => s.replace(/\x1b\[\d+m/g, '')

describe('typeOf', () => {
  it('identifies native types', () => {
    expect(yves.typeOf('hello')).toBe('string')
    expect(yves.typeOf(42)).toBe('number')
    expect(yves.typeOf(true)).toBe('boolean')
    expect(yves.typeOf(null)).toBe('null')
    expect(yves.typeOf(undefined)).toBe('undefined')
    expect(yves.typeOf(/abc/)).toBe('regexp')
    expect(yves.typeOf([])).toBe('array')
    expect(yves.typeOf({})).toBe('object')
    expect(yves.typeOf(() => {})).toBe('function')
    expect(yves.typeOf(new Date())).toBe('date')
    expect(yves.typeOf(Buffer.from('x'))).toBe('buffer')
  })

  it('identifies bigint', () => {
    expect(yves.typeOf(42n)).toBe('bigint')
  })

  it('identifies wrapped types', () => {
    expect(yves.typeOf(new Number(42))).toBe('number') // eslint-disable-line no-new-wrappers
    expect(yves.typeOf(new String('hi'))).toBe('string') // eslint-disable-line no-new-wrappers
    expect(yves.typeOf(new Boolean(true))).toBe('boolean') // eslint-disable-line no-new-wrappers
    expect(yves.typeOf(new RegExp('abc'))).toBe('regexp')
    expect(yves.typeOf(new Array(3))).toBe('array')
  })
})

describe('stringify native types', () => {
  it('formats strings', () => {
    expect(strip(inspect('hello'))).toBe("'hello'")
  })

  it('formats strings with single quotes using double quotes', () => {
    expect(strip(inspect("it's"))).toBe('"it\'s"')
  })

  it('formats numbers', () => {
    expect(strip(inspect(42))).toBe('42')
    expect(strip(inspect(3.14))).toBe('3.14')
    expect(strip(inspect(-0))).toBe('0')
  })

  it('formats bigint', () => {
    expect(strip(inspect(123n))).toBe('123n')
  })

  it('formats booleans', () => {
    expect(strip(inspect(true))).toBe('true')
    expect(strip(inspect(false))).toBe('false')
  })

  it('formats null', () => {
    expect(strip(inspect(null))).toBe('null')
  })

  it('formats undefined', () => {
    expect(strip(inspect(undefined))).toBe('undefined')
  })

  it('formats regexps', () => {
    expect(strip(inspect(/[a-z]+/gi))).toBe('/[a-z]+/gi')
  })

  it('formats dates', () => {
    const d = new Date('2024-01-15T12:00:00.000Z')
    expect(strip(inspect(d))).toBe('new Date("2024-01-15T12:00:00.000Z")')
  })

  it('formats functions', () => {
    expect(strip(inspect(function myFn() {}))).toBe('[Function]')
  })

  it('formats buffers', () => {
    const result = strip(inspect(Buffer.from([0xca, 0xfe])))
    expect(result).toBe('<Buffer ca fe>')
  })
})

describe('arrays', () => {
  it('formats simple arrays inline', () => {
    expect(strip(inspect(['a', 'b', 'c']))).toBe("[ 'a', 'b', 'c' ]")
  })

  it('formats empty arrays', () => {
    expect(strip(inspect([]))).toBe('[]')
  })

  it('formats nested arrays with pretty printing', () => {
    const result = strip(inspect([{ a: 1 }]))
    expect(result).toContain('a: 1')
  })

  it('respects maxArrayLength', () => {
    const result = strip(inspect(['a', 'b', 'c'], null, { maxArrayLength: 2 }))
    expect(result).toContain("'a'")
    expect(result).toContain("'b'")
    expect(result).toContain('<<truncated>>')
    expect(result).not.toContain("'c'")
  })

  it('handles maxArrayLength=0', () => {
    const result = strip(inspect(['a', 'b'], null, { maxArrayLength: 0 }))
    expect(result).toContain('<<truncated>>')
    expect(result).not.toContain("'a'")
  })
})

describe('objects', () => {
  it('formats simple objects inline', () => {
    const result = strip(inspect({ a: 1 }))
    expect(result).toBe('{ a: 1 }')
  })

  it('formats empty objects', () => {
    expect(strip(inspect({}))).toBe('{}')
  })

  it('formats objects with pretty printing when complex', () => {
    const result = strip(inspect({ a: 1, b: 2, c: 3 }))
    expect(result).toContain('\n')
    expect(result).toContain('a: 1')
  })

  it('respects maxObjectKeys', () => {
    const result = strip(inspect({ a: 'A', b: 'B', c: 'C' }, null, { maxObjectKeys: 2 }))
    expect(result).toContain("a: 'A'")
    expect(result).toContain("b: 'B'")
    expect(result).toContain('<<truncated>>')
    expect(result).not.toContain("c: 'C'")
  })

  it('handles maxObjectKeys=0', () => {
    const result = strip(inspect({ a: 1 }, null, { maxObjectKeys: 0 }))
    expect(result).toContain('<<truncated>>')
    expect(result).not.toContain('a:')
  })

  it('hides functions when hideFunctions is set', () => {
    const result = strip(inspect({ a: 1, fn: () => {} }, null, { hideFunctions: true }))
    expect(result).toContain('a: 1')
    expect(result).not.toContain('fn')
  })

  it('quotes reserved words as keys', () => {
    const result = strip(inspect({ class: 1 }))
    expect(result).toContain("'class': 1")
  })

  it('sorts keys when sortKeys is set', () => {
    const result = strip(inspect({ c: 3, a: 1, b: 2 }, null, { sortKeys: true, singleLineMax: 0 }))
    const aPos = result.indexOf('a:')
    const bPos = result.indexOf('b:')
    const cPos = result.indexOf('c:')
    expect(aPos).toBeLessThan(bPos)
    expect(bPos).toBeLessThan(cPos)
  })
})

describe('circular references', () => {
  it('decycles by default (strips circular properties)', () => {
    const obj = { a: 1 }
    obj.self = obj
    const result = strip(inspect(obj))
    expect(result).toContain('a: 1')
    expect(result).not.toContain('self')
  })

  it('shows dot markers with decycle disabled', () => {
    const noCycle = yves.inspector({ stream: null, decycle: false })
    const obj = { a: 1 }
    obj.self = obj
    const result = strip(noCycle(obj))
    expect(result).toContain('a: 1')
    expect(result).toContain('self: .')
  })

  it('shows depth via dot count with decycle disabled', () => {
    const noCycle = yves.inspector({ stream: null, decycle: false })
    const obj = {}
    obj.nested = { ref: obj }
    const result = strip(noCycle(obj))
    expect(result).toContain('ref: ..')
  })
})

describe('string truncation', () => {
  it('truncates long strings', () => {
    const result = strip(inspect('This String is way too long', null, { maxStringLength: 12 }))
    expect(result).toBe("'This Str...")
  })

  it('does not truncate short-enough strings', () => {
    const result = strip(inspect('short', null, { maxStringLength: 100 }))
    expect(result).toBe("'short'")
  })

  it('truncates to ... when maxStringLength is 0', () => {
    const result = strip(inspect('hello', null, { maxStringLength: 0 }))
    expect(result).toBe('...')
  })
})

describe('include/exclude/obfuscate filters', () => {
  const obj = { name: 'John', age: 30, secret: 'xyz', score: 99 }

  it('includes only matching keys', () => {
    const result = strip(inspect(obj, null, { includes: ['name', 'age'] }))
    expect(result).toContain("name: 'John'")
    expect(result).toContain('age: 30')
    expect(result).not.toContain('secret')
    expect(result).not.toContain('score')
  })

  it('includes keys matching regex', () => {
    const result = strip(inspect(obj, null, { includes: [/^s/] }))
    expect(result).toContain('secret')
    expect(result).toContain('score')
    expect(result).not.toContain('name')
  })

  it('excludes matching keys', () => {
    const result = strip(inspect(obj, null, { excludes: ['secret'] }))
    expect(result).not.toContain('secret')
    expect(result).toContain('name')
  })

  it('excludes keys matching regex', () => {
    const result = strip(inspect(obj, null, { excludes: [/^s/] }))
    expect(result).not.toContain('secret')
    expect(result).not.toContain('score')
    expect(result).toContain('name')
  })

  it('obfuscates matching keys', () => {
    const result = strip(inspect(obj, null, { obfuscates: ['secret'] }))
    expect(result).toContain("secret: '<<obfuscated>>'")
    expect(result).toContain("name: 'John'")
  })

  it('obfuscates keys matching regex', () => {
    const result = strip(inspect(obj, null, { obfuscates: [/^s/] }))
    expect(result).toContain("secret: '<<obfuscated>>'")
    expect(result).toContain("score: '<<obfuscated>>'")
    expect(result).toContain("name: 'John'")
  })
})

describe('template strings', () => {
  it('uses backtick syntax for multiline strings', () => {
    const result = strip(inspect('line1\nline2', null, { templateStrings: true }))
    expect(result).toContain('`')
    expect(result).toContain('line1')
    expect(result).toContain('line2')
  })

  it('uses regular quotes when templateStrings is false', () => {
    const result = strip(inspect('line1\nline2', null, { templateStrings: false }))
    expect(result).toContain('\\n')
    expect(result).not.toContain('`')
  })
})

describe('HTML output', () => {
  it('wraps in <pre> tag with inspector', () => {
    const htmlInspect = yves.inspector({ stream: null, html: true, colors: true })
    const result = htmlInspect({ a: 1 })
    expect(result).toContain('<pre class="yves"')
    expect(result).toContain('</pre>')
  })

  it('uses <span> for styling', () => {
    const htmlInspect = yves.inspector({ stream: null, html: true, colors: true })
    const result = htmlInspect({ a: 1 })
    expect(result).toContain('<span')
  })
})

describe('stylize', () => {
  it('applies ANSI codes when colors enabled', () => {
    const result = yves.stylize('hello', 'green', { colors: true })
    expect(result).toBe('\x1b[32mhello\x1b[39m')
  })

  it('returns plain string when colors disabled', () => {
    const result = yves.stylize('hello', 'green', { colors: false })
    expect(result).toBe('hello')
  })

  it('returns plain string for unknown style', () => {
    const result = yves.stylize('hello', 'unknown', { colors: true })
    expect(result).toBe('hello')
  })

  it('uses HTML span in html mode', () => {
    const result = yves.stylize('hello', 'green', { colors: true, html: true })
    expect(result).toBe('<span style="color:green">hello</span>')
  })

  it('uses CSS property for bold in HTML mode', () => {
    const result = yves.stylize('hello', 'bold', { colors: true, html: true })
    expect(result).toBe('<span style="font-weight:bold">hello</span>')
  })
})

describe('inspector currying', () => {
  it('returns a reusable function', () => {
    const myInspect = yves.inspector({ stream: null })
    expect(typeof myInspect).toBe('function')
  })

  it('applies base options', () => {
    const myInspect = yves.inspector({ stream: null, maxStringLength: 5 })
    const result = strip(myInspect('hello world'))
    expect(result).toBe("'h...")
  })

  it('allows per-call overrides', () => {
    const myInspect = yves.inspector({ stream: null, maxStringLength: 5 })
    const result = strip(myInspect('hello world', null, { maxStringLength: 100 }))
    expect(result).toBe("'hello world'")
  })
})

describe('labels', () => {
  it('prepends label to output', () => {
    const result = strip(inspect(42, 'my value'))
    expect(result).toMatch(/^my value: 42/)
  })

  it('works without label', () => {
    const result = strip(inspect(42))
    expect(result).toBe('42')
  })
})

describe('JSON mode', () => {
  it('uses double quotes for keys', () => {
    const result = strip(inspect({ a: 1 }, null, { json: true }))
    expect(result).toContain('"a": 1')
  })

  it('uses double quotes for string values', () => {
    const result = strip(inspect({ a: 'hello' }, null, { json: true }))
    expect(result).toContain('"hello"')
  })

  it('omits trailing commas', () => {
    const result = strip(inspect({ a: 1, b: 2, c: 3 }, null, { json: true }))
    expect(result).not.toMatch(/,\s*\}/)
  })
})

describe('edge cases', () => {
  it('handles deeply nested objects', () => {
    const obj = { a: { b: { c: { d: 1 } } } }
    const result = strip(inspect(obj))
    expect(result).toContain('d: 1')
  })

  it('handles arrays with null elements', () => {
    const result = strip(inspect([null, null]))
    expect(result).toContain('null')
  })

  it('handles mixed arrays', () => {
    const result = strip(inspect([1, 'two', true, null]))
    expect(result).toContain('1')
    expect(result).toContain("'two'")
    expect(result).toContain('true')
    expect(result).toContain('null')
  })

  it('handles empty string', () => {
    const result = strip(inspect(''))
    expect(result).toBe("''")
  })
})
