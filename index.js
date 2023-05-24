import { readFileSync } from "fs";
import chalk from "chalk";
import Prism from 'prismjs';
import path from "path";

function getLocation(err) {
    const firstLine = err.stack.split("\n")[1];
    let errorLocation;

    if (firstLine.includes("("))
        errorLocation = firstLine.substring(
            firstLine.indexOf("(") + 1,
            firstLine.lastIndexOf(")")
        );
    else
        errorLocation = firstLine
            .trim()
            .substring(3);

    errorLocation = errorLocation.replace("file:///", "");

    const location = { line: "", col: "" };
    let passedColons = 0;
    let filename = "";
    
    for (let i = 0; i < errorLocation.length; i++) {
        if (errorLocation[i] === ":") passedColons++;
        if (passedColons <= 1)
            filename += errorLocation[i];
        else if (passedColons <= 2 && errorLocation[i] !== ":")
            location.line += errorLocation[i];
        else if (errorLocation[i] !== ":")
            location.col += errorLocation[i];
    }
    
    return {
        filename,
        location: {
            line: parseInt(location.line),
            col: parseInt(location.col)
        }
    }
}

const THEME = {
    "keyword": chalk.hex("cc99cd"),
    "builtin": chalk.hex("cc99cd"),
    "class-name": chalk.hex("f8c555"),
    "function": chalk.hex("f08d49"),
    "boolean": chalk.hex("f08d49"),
    "number": chalk.hex("f08d49"),
    "string": chalk.hex("7ec699"),
    "char": chalk.hex("7ec699"),
    "symbol": chalk.hex("f8c555"),
    "regex": chalk.hex("7ec699"),
    "url": chalk.hex("67cdcc"),
    "operator": chalk.hex("67cdcc"),
    "variable": chalk.hex("7ec699"),
    "constant": chalk.hex("f8c555"),
    "property": chalk.hex("f8c555"),
    "punctuation": chalk.reset,
    "important": chalk.bold.hex("cc99cd"),
    "comment": chalk.hex("999")
}

/**
 * @param {Prism.Token} token 
 * @returns {(text: string) => string}
 */
function getColor(token) {
    return THEME[token.type];
}

/**
 * 
 * @param {Prism.TokenStream} token 
 * @returns {string}
 */
function highlightStream(token) {
    let str = "";

    if (Array.isArray(token)) {
        for (const child of token) {
            str += highlightStream(child);
        }
        return str;
    }

    if (typeof token === "string") return chalk.reset(token);

    return getColor(token)(
        typeof token.content === "string"
            ? token.content
            : highlightStream(token.content)
    );
}

/**
 * Get a prettified version of an error.
 * @param {Error} err The error object.
 * @param {{ underline?: string }} [opts] Settings to use.
 * @returns {string}
 */
export function getPrettified(err, opts) {
    const loc = getLocation(err);
    const filecontent = readFileSync(loc.filename, { encoding: "utf8" });
    const currentLine = filecontent.split("\n")[loc.location.line - 1];
    const tokens = Prism.tokenize(currentLine, Prism.languages.javascript);

    let highlightedLine = highlightStream(tokens);
    const lineNumberLength = loc.location.line.toString().length;
    const delim = THEME.comment("│");
    const lineStart = `${" ".repeat(lineNumberLength)} ${delim} `;

    return `${THEME.comment("at")} ${THEME.symbol(`${path.basename(loc.filename)}:${loc.location.line}:${loc.location.col}`)}
${lineStart}
${THEME.number(loc.location.line)} ${delim} ${highlightedLine}
${lineStart}${" ".repeat(loc.location.col - 1)}${chalk.redBright(opts?.underline ?? "‾")}
${" ".repeat(lineNumberLength)} ${THEME.comment("╰──")} ${chalk.redBright(err.name)}${THEME.comment(":")} ${THEME.symbol(err.message)}`
}

/**
 * Run a function in `pretty-error` mode.
 * @template {() => any} T
 * @param {T} funct The function to run in `pretty-error` mode
 * @param {{ underline?: string }} [opts] Settings to use.
 * @returns {ReturnType<T>}
 */
export default function prettyErrors(funct, opts) {
    try {
        return funct();
    } catch(err) {
        const msg = getPrettified(err, opts)
        process.stdout.write(msg);
        process.exit(1);
    }
}

