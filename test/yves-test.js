var util = require('util');
var yves = require('../lib/yves');


yves.inspect({
    number: 42,
    string: "John Galt",
    regexp: /[a-z]+/,
    array: [99, 168, 'x', {}],
    func: function () {},
    bool: false,
    nil: null,
    undef: undefined,
    object: {attr: []},
}, "native types");

yves.inspect({
    number: new(Number)(42),
    string: new(String)("John Galt"),
    regexp: new(RegExp)(/[a-z]+/),
    array: new(Array)(99, 168, 'x', {}),
    bool: new(Boolean)(false),
    object: new(Object)({attr: []}),
    date: new(Date)
}, "wrapped types");

const o ={t:'circular object'}
o.o = o

yves.inspect({
    circular: o
}, "newlines",{templateStrings:false});
  

console.log(o)



var obj = {};
obj.that = { self: obj };
obj.self = obj;

yves.inspect(obj, "circular object");
yves.inspect({hello: 'moto'}, "small object");
yves.inspect({hello: new(Array)(6) }, "big object");
yves.inspect(["hello 'world'", 'hello "world"', 'hello `world`'], "quotes");
yves.inspect({
    recommendations: [{
        id: 'a7a6576c2c822c8e2bd81a27e41437d8',
        key: [ 'spree', 3.764316258020699 ],
        value: {
            _id: 'a7a6576c2c822c8e2bd81a27e41437d8',
            _rev: '1-2e2d2f7fd858c4a5984bcf809d22ed98',
            type: 'domain',
            domain: 'spree',
            weight: 3.764316258020699,
            product_id: 30
        }
    }]
}, 'complex');

yves.inspect([null], "null in array");

var inspect = yves.inspector({ stream: null });

console.log(inspect('something', "something"));
console.log(inspect("something else"));

console.log(inspect(["no color"], null, { styles: false }));

yves.inspect('This String is truncated completely', 'String truncated completely', { maxStringLength: 0 });
yves.inspect('This String is way too long', 'String too long', { maxStringLength: 12 });
yves.inspect('This String is exactly right', 'String exactly short enough', { maxStringLength: 29 });
yves.inspect('This String is short enough', 'String is shorter', { maxStringLength: 30 });

yves.inspect(['a', 'b', 'c'], 'Array short enough', { maxArrayLength: 4 });
yves.inspect(['a', 'b', 'c'], 'Array exactly short enough', { maxArrayLength: 3 });
yves.inspect(['a', 'b', 'c'], 'Array length too long', { maxArrayLength: 2 });
yves.inspect(['a', 'b', 'c'], 'Array length too long', { maxArrayLength: 1 });
yves.inspect(['a', 'b', 'c'], 'Array trunctated completely', { maxArrayLength: 0 });

yves.inspect({ 'a': 'A', 'b': 'B', 'c': 'C' }, 'Object short enough', { maxObjectKeys: 4 });
yves.inspect({ 'a': 'A', 'b': 'B', 'c': 'C' }, 'Object exactly short enough', { maxObjectKeys: 3 });
yves.inspect({ 'a': 'A', 'b': 'B', 'c': 'C' }, 'Object has too many keys', { maxObjectKeys: 2 });
yves.inspect({ 'a': 'A', 'b': 'B', 'c': 'C' }, 'Object has too many keys', { maxObjectKeys: 1 });
yves.inspect({ 'a': 'A', 'b': 'B', 'c': 'C' }, 'Object truncated completely', { maxObjectKeys: 0 });

yves.inspect(1234567890, 'Number too long', { maxStringLength: 6 });

yves.inspect({
    name:  "Something about ogres",
    story: "Once upon a time, in a land far far away.",
    tags: [
        "ogres",
        "donkey",
        "fairytail",
        "prince",
        "evil"
    ],
    related: [
        "A story about an angry prince and his quest to rule the land"
    ],
    link: "http://farfaraway.ff"
},
'Combination truncated',
{
    maxObjectKeys: 4,
    maxArrayLength: 2,
    maxStringLength: 39
});

yves.inspect({
    number: 42,
    string: "John Galt",
    regexp: /[a-z]+/,
    array: [99, 168, 'x', {}],
    func: function () {},
    bool: false,
    nil: null,
    undef: undefined,
    joris: 'gek',
    jules: 'rules',
    wolf: 'lief',
    object: {attr: []},
}, "includes",{includes: [/^joris/, 'jules', /.*olf/]});

yves.inspect({
    number: 42,
    string: "John Galt",
    regexp: /[a-z]+/,
    array: [99, 168, 'x', {}],
    func: function () {},
    bool: false,
    nil: null,
    undef: undefined,
    joris: 'gek',
    jules: 'rules',
    wolf: 'lief',
    object: {attr: []},
}, "excludes",{excludes: [/^joris/, 'jules', /.*olf/]});


yves.inspect({
    number: 42,
    string: "John Galt",
    regexp: /[a-z]+/,
    array: [99, 168, 'x', {}],
    func: function () {},
    bool: false,
    nil: null,
    undef: undefined,
    joris: 'gek',
    jules: 'rules',
    wolf: 'lief',
    object: {attr: []},
}, "obfuscates",{obfuscates: [/^joris/, 'jules', /.*olf/]});


yves.inspect({
    number: 42,
    string: "John Galt",
    regexp: /[a-z]+/,
    array: [99, 168, 'x', {}],
    func: function () {},
    bool: false,
    nil: null,
    undef: undefined,
    joris: 'gek',
    jules: 'rules',
    wolf: 'lief',
    object: {attr: []},
}, "html",{html: true});


var buf = new Buffer("joris is gek")
yves.inspect({
  date: new Date(),
  buffer: buf,
}, "buffer",{});

// // yves.inspect(buf, "buffer",{});
//
// console.log(yves.typeOf(buf));
// console.log(typeof buf);
// console.log(buf.toString('hex'));
// console.log(buf.inspect());
//
// console.log(buf);

yves.inspect({
  string: "\nHELLO\nWORLD",
  templateStrings:false,
}, "newlines",{templateStrings:false});

yves.inspect({
  string: "\nHELLO\nWORLD",
  templateStrings:true,
}, "newlines",{templateStrings:true});


var debug = yves.debugger('test')
debug('hello')
debug('world')

yves.console('yves-test')

console.log('hello')
console.log('world')

console.dir({joris:'gek'})

