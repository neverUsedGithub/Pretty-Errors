import prettyErrors from "../index.js";

prettyErrors(() => {
    console.log(something.that.doesnt.exist);
});