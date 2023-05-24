# Pretty-Errors
Prettifies Node runtime errrors.

# Usage
```js
import prettyErrors from "pretty-errors";

prettyErrors(() => {
    console.log(something.that.doesnt.exist);
});
```