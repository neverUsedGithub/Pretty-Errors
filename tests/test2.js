import { start, stop } from "../index.js";

start();

console.log(new Error("ee"))

stop();

console.log(new Error("ee"))