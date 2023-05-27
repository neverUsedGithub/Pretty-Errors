import { getPrettified } from "../index.js";

console.log(getPrettified(new Error("no trace here"), {
    noTrace: true
}));