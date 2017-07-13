//
// Yves - a customizable value inspector for Node.js
//
//   usage:
//
//       var inspect = require('yves').inspector({styles: {all: 'magenta'}});
//       inspect(something); // inspect with the settings passed to `inspector`
//
//     or
//
//       var yves = require('yves');
//       yves.inspect(something); // inspect with the default settings
//
var yves = exports,
    stack = [];

yves.supportsColors = function() {
  if (process.stdout && !process.stdout.isTTY) {
    return false;
  }

  if (process.platform === 'win32') {
    return true;
  }

  if ('COLORTERM' in process.env) {
    return true;
  }

  if (process.env.TERM === 'dumb') {
    return false;
  }

  if (/^screen|^xterm|^vt100|color|ansi|cygwin|linux/i.test(process.env.TERM)) {
    return true;
  }

  return false;
}



yves.defaults = {
    styles: {                 // Styles applied to stdout
        all:     'cyan',      // Overall style applied to everything
        label:   'underline', // Inspection labels, like 'array' in `array: [1, 2, 3]`
        other:   'inverted',  // Objects which don't have a literal representation, such as functions
        key:     'bold',      // The keys in object literals, like 'a' in `{a: 1}`
        special: 'grey',      // null, undefined...
        string:  'green',
        number:  'magenta',
        bool:    'blue',      // true false
        regexp:  'green',     // /\d+/
    },
    pretty: true,             // Indent object literals
    indent: 4,
    hideFunctions: false,
    showHidden: false,
    sortKeys: false,
    stream: process && process.stdout,
    maxLength: -1,//2048,           // Truncate output if longer
    colors: yves.supportsColors(),
    html: false,
	json: false,
	escape: true,
	functions: false,
    singleLineMax: 2,
};

// Return a curried inspect() function, with the `options` argument filled in.
yves.inspector = function (options) {
    var that = this;
    return function (obj, label, opts) {
        var myopts=merge(options || {}, opts || {});
        var result=that.inspect.call(that, obj, label, myopts);
        if (myopts.html && !myopts.stream) {
            return '<pre class="yves" style="padding:8px;background-color: black;'+((myopts && myopts.styles && myopts.styles.all)?('color:'+myopts.styles.all+';'):'')+'">'+result+'</pre>';
        } else {
            return result;
        }
    };
};


// If we have a `stream` defined, use it to print a styled string,
// if not, we just return the stringified object.
yves.inspect = function (obj, label, options) {
    options = merge(this.defaults, options || {});
    stack = [];
    if (options.stream) {
        return this.print(stringify(obj, options), label, options);
    } else {
        return stringify(obj, options) + (options.styles ? (options.html?'':(options.colors?'\x1b[39m':'')) : '');
    }
};

// Output using the 'stream', and an optional label
// Loop through `str`, and truncate it after `options.maxLength` has been reached.
// Because escape sequences are, at this point embeded within
// the output string, we can't measure the length of the string
// in a useful way, without separating what is an escape sequence,
// versus a printable character (`c`). So we resort to counting the
// length manually.
yves.print = function (str, label, options) {
    if (!this.html) {
        for (var c = 0, i = 0; i < str.length; i++) {
            if (str.charAt(i) === '\x1b') { i += 4 } // `4` because '\x1b[25m'.length + 1 == 5
            else if (c === options.maxLength) {
               str = str.slice(0, i - 1) + '…';
               break;
            } else { c++ }
        }
    }
    return options.stream.write.call(options.stream, (label ?
        this.stylize(label, options.styles.label, options) + ': ' : '') +
        this.stylize(str,   options.styles.all, options) + (this.html?'':(options.colors?'\x1b[0m':'')) + "\n");
};

// Apply a style to a string, eventually,
// I'd like this to support passing multiple
// styles.
yves.stylize = function (str, style, options) {
    if (options.colors) {
        if (options.html) {
            var codes = {
                'bold'      : 'font-weight:bold',
                'underline' : 'text-decoration: underline',
            };
            if (style) {
                if (codes[style]) {
                    return '<span style="'+style+'">'+str+'</span>';
                } else {
                    return '<span style="color:'+style+'">'+str+'</span>';
                }
            } else { 
                return str;
            }
        } else {
            var codes = {
                'bold'      : [1,  22],
                'underline' : [4,  24],
                'inverse'   : [7,  27],
                'cyan'      : [36, 39],
                'magenta'   : [35, 39],
                'blue'      : [34, 39],
                'yellow'    : [33, 39],
                'green'     : [32, 39],
                'red'       : [31, 39],
                'grey'      : [90, 39]
            }, endCode;

            if (style && codes[style]) {
                endCode = (codes[style][1] === 39 && options.styles.all) ? codes[options.styles.all][0]
                                                                 : codes[style][1];
                return '\x1b[' + codes[style][0] + 'm' + str +
                       '\x1b[' + endCode + 'm';
            } else { return str }
        }
    } else {
        return str;
    }
};

// Convert any object to a string, ready for output.
// When an 'array' or an 'object' are encountered, they are
// passed to specialized functions, which can then recursively call
// stringify().
function stringify(obj, options) {
    var that = this, stylize = function (str, style) {
        return yves.stylize(str, options.styles[style], options)
    }, index, result;

    if ((index = stack.indexOf(obj)) !== -1) {
        return stylize(new(Array)(stack.length - index + 1).join('.'), 'special');
    }
    stack.push(obj);

    result = (function (obj) {
        switch (typeOf(obj)) {
	
            case "string"   : obj = stringifyString((obj.indexOf("'") === -1 && !options.json)? ("'" + obj.replace(/'/g,"\\'") + "'") : ('"' + obj.replace(/"/g,'\\"') + '"'),options);
                              return stylize(obj, 'string');
            case "regexp"   : return stylize('/' + obj.source + '/', 'regexp');
            case "number"   : return stylize(obj + '',    'number');
            case "function" : return options.stream ? stylize(options.functions?obj.toString():"Function", 'other') : '[Function]';
            case "null"     : return stylize("null",      'special');
            case "undefined": return stylize("undefined", 'special');
            case "boolean"  : return stylize(obj + '',    'bool');
            case "date"     : return stylize(obj.toUTCString(),'date');
            case "array"    : return stringifyArray(obj,  options, stack.length);
            case "object"   : return stringifyObject(obj, options, stack.length);
        }
    })(obj);

    stack.pop();
    return result;
};

function htmlspecialchars (string, quote_style, charset, double_encode) {
    var optTemp = 0,
        i = 0,
        noquotes = false;
    if (typeof quote_style === 'undefined' || quote_style === null) {
        quote_style = 2;
    }
    string = string.toString();
    if (double_encode !== false) { 
        string = string.replace(/&/g, '&amp;');
    }
    string = string.replace(/</g, '&lt;').replace(/>/g, '&gt;');
//	console.log(string);
    var OPTS = {
        'ENT_NOQUOTES': 0,
        'ENT_HTML_QUOTE_SINGLE': 1,
        'ENT_HTML_QUOTE_DOUBLE': 2,
        'ENT_COMPAT': 2,
        'ENT_QUOTES': 3,
        'ENT_IGNORE': 4
    };
    if (quote_style === 0) {
        noquotes = true;
    }
    if (typeof quote_style !== 'number') { 
        quote_style = [].concat(quote_style);
        for (var i = 0; i < quote_style.length; i++) {
            if (OPTS[quote_style[i]] === 0) {
                noquotes = true;
            }
            else if (OPTS[quote_style[i]]) {
                optTemp = optTemp | OPTS[quote_style[i]];
            }
        }
        quote_style = optTemp;
    }
    if (quote_style & OPTS.ENT_HTML_QUOTE_SINGLE) {
        string = string.replace(/'/g, '&#039;');
    }
    if (!noquotes) {
        string = string.replace(/"/g, '&quot;');
    }
    return string;
}

// Escape invisible characters in a string
function stringifyString (str, options) {
	var result;
	if (options.escape) {
	    result=str.replace(/\n/g, '\\n').replace(/\t/g, '\\t').replace(/[\u0001-\u001F]/g, function (match) {
	        return '\\x' + match[0].charCodeAt(0).toString(16);
	    });
		if (options.html) {
			result=htmlspecialchars(result);
		}
	} else {
		result=str;
	}
	
    // Truncate the string if a maximum length is configured
    var truncate = options.hasOwnProperty('maxStringLength') && options.maxStringLength >= 0;
    if(truncate && result.length > options.maxStringLength) {
        var length = Math.min(result.length, options.maxStringLength - 3);
        result = result.substr(0, length) + "...";
    }

    return result;
}

// Convert an array to a string, such as [1, 2, 3].
// This function calls stringify() for each of the elements
// in the array.
function stringifyArray(ary, options, level) {
    var out = [];
    var pretty = options.pretty && (ary.length > 4 || ary.some(function (o) {
        return (o !== null && typeof(o) === 'object' && Object.keys(o).length > 0) ||
               (Array.isArray(o) && o.length > 0);
    }));
    var ws = pretty ? '\n' + new(Array)(level * options.indent + 1).join(' ') : ' ';

    var truncate = options.hasOwnProperty('maxArrayLength') && options.maxArrayLength >= 0;

    var length = truncate ? Math.min(ary.length, options.maxArrayLength) : ary.length;
    for (var i = 0; i < length; i++) {
        out.push(stringify(ary[i], options));
    }

    // Add a special String if the array was truncated
    if(length < ary.length) {
        out.push('<<truncated>>');
    }

    if (out.length === 0) {
        return '[]';
    } else {
        return '[' + ws
                   + out.join(',' + (pretty ? ws : ' '))
                   + (pretty ? ws.slice(0, -1*options.indent) : ws) +
               ']';
    }
};

var quote_reserved_words = function(word) {
	var reserved_words=['abstract', 'else', 'instanceof', 'switch', 'boolean', 'enum', 'int', 'synchronized', 'break', 'export', 'interface', 'this', 'byte', 'extends', 'long', 'throw', 'case', 'false', 'native', 'throws', 'catch', 'final', 'new', 'transient', 'char', 'finally', 'null', 'true', 'class', 'float', 'package', 'try', 'const', 'for', 'private', 'typeof', 'continue', 'function', 'protected', 'var', 'debugger', 'goto', 'public', 'void', 'default', 'if', 'return', 'volatile', 'delete', 'implements', 'short', 'while', 'do', 'import', 'static', 'with', 'double', 'in', 'super'];
    return function(word) {
		for (var i in reserved_words) {
			if (word === reserved_words[i]) {
				return "'" + word + "'";
			}
		}
		return word;
	} 
}();


// Convert an object to a string, such as {a: 1}.
// This function calls stringify() for each of its values,
// and does not output functions or prototype values.
function stringifyObject(obj, options, level) {
	if ( obj instanceof Buffer) return 'Buffer';
    var out = [];
    var pretty = options.pretty && (Object.keys(obj).length > options.singleLineMax ||
                                    Object.keys(obj).some(function (k) { return typeof(obj[k]) === 'object' }));
    var ws = pretty ? '\n' + new(Array)(level * options.indent + 1).join(' ') : ' ';

    var keys = options.showHidden ? Object.keys(obj) : Object.getOwnPropertyNames(obj);
    if (options.sortKeys) keys.sort();

    var truncate = options.hasOwnProperty('maxObjectKeys') && options.maxObjectKeys >= 0;

    // Slice the keys to the maximum length if they exceed the maxObjectKeys option
    var includeKeys = (truncate) ? keys.slice(0, options.maxObjectKeys) : keys;
    includeKeys.forEach(function (k) {
		if (!(level== 1 && options.exclude && ~options.exclude.indexOf(k))) {
			if (Object.prototype.hasOwnProperty.call(obj, k)
			  && !(obj[k] instanceof Function && options.hideFunctions)) {
	            out.push((options.json?'"':'')+yves.stylize(options.json?k:quote_reserved_words(k), options.styles.key, options) + (options.json?'"':'') + ': ' +
						 stringify(obj[k], options));
			}
		}
    });

    // Append a special String if the Object was truncated
    if (includeKeys.length < keys.length) {
        out.push(yves.stylize('<<truncated>>', options.styles.key, options.styles));
    }

    if (out.length === 0) {
        return '{}';
    } else {
        return "{" + ws
                   + out.join(',' + (pretty ? ws : ' '))
                   + (pretty ? ws.slice(0, -1*options.indent) : ws) +
               "}";
   }
};

// A better `typeof`
function typeOf(value) {
    var s = typeof(value),
        types = [Object, Array, String, RegExp, Number, Function, Boolean, Date];

    if (s === 'object' || s === 'function') {
        if (value) {
            types.forEach(function (t) {
                if (value instanceof t) { s = t.name.toLowerCase() }
            });
        } else { s = 'null' }
    }
    return s;
}

function merge(/* variable args */) {
    var objs = Array.prototype.slice.call(arguments);
    var target = {};

    objs.forEach(function (o) {
        Object.keys(o).forEach(function (k) {
            if (k === 'styles') {
                if (! o.styles) {
                    target.styles = false;
                } else {
                    target.styles = {}
                    for (var s in o.styles) {
                        target.styles[s] = o.styles[s];
                    }
                }
            } else {
                target[k] = o[k];
            }
        });
    });
    return target;
}
