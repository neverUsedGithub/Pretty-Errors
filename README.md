# Pretty-Errors
Prettifies Node runtime errrors.

# Usage
```js
import prettyErrors from "pretty-errors";

prettyErrors(() => {
    console.log(something.that.doesnt.exist);
});
```
```
at tests\test.js:3:1 
    │
  3 │ prettyErrors(() => {
    │ ‾‾‾‾‾‾‾‾‾‾‾‾
at index.js:206:16 in function prettyErrors
    │
206 │         return funct();
    │                ‾‾‾‾‾
at tests\test.js:4:17
    │
  4 │     console.log(something.that.doesnt.exist);
    │                 ‾‾‾‾‾‾‾‾‾
    ╰── ReferenceError: something is not defined
```