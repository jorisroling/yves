yves
====

a customizable value inspector for Node.js inspired by [eyes](https://github.com/cloudhead/eyes.js/)

synopsis
--------

I was tired of looking at cluttered output in the console -- something needed to be done,
`sys.inspect()` didn't display regexps correctly, and was too verbose, and I had an hour or two to spare. 
So I decided to have some fun. _yves_ were born.

*yves* also deals with circular objects in an intelligent way, and can pretty-print object literals.

usage
-----

    var inspect = require('yves').inspector({styles: {all: 'magenta'}});

    inspect(something); // inspect with the settings passed to `inspector`

or

    var yves = require('yves');

    yves.inspect(something); // inspect with the default settings

you can pass a _label_ to `inspect()`, to keep track of your inspections:

    yves.inspect(something, "a random value");

If you want to return the output of yves without printing it, you can set it up this way:

    var inspect = require('yves').inspector({ stream: null });

    sys.puts(inspect({ something: 42 }));

customization
-------------

These are the default styles and settings used by _yves_.

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
    hideFunctions: false,     // Don't output functions at all
    stream: process.stdout,   // Stream to write to, or null
    maxLength: 2048           // Truncate output if longer

You can overwrite them with your own, by passing a similar object to `inspector()` or `inspect()`.

    var inspect = require('yves').inspector({
        styles: {
            all: 'magenta',
            special: 'bold'
        },
        maxLength: 512
    });

