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
at test.js:4:17
  │
4 │     console.log(something.that.doesnt.exist);
  │                 ‾
  ╰── ReferenceError: something is not defined
```