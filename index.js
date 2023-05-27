import { readFileSync } from "fs";
import chalk from "chalk";
import Prism from 'prismjs';
import path from "path";

/**
 * @typedef {{ filename: string, functionName: string | null, location: { line: number, col: number }}} Location
 * @typedef {{
 *     underline?: string
 *     noTrace?: boolean,
 *     smartUnderline?: boolean,
 *     skipNodeFiles?: boolean
 * }} Options
 */

/**
 * Get the location from an error.
 * @param {Error} err The error.
 * @param {number} index The index of the line on the stack to get location of.
 * @returns {Location}
 */
function getLocation(err, index) {
    if (!err.stack)
        throw new Error(`getLocation(err) failed: error.stack was empty.`);
    
    const firstLine = err.stack.split("\n")[index + 1];
    let functionName = null;
    let errorLocation;

    if (firstLine.includes("(")) {
        functionName = firstLine.trim().substring(3);
        functionName = functionName.substring(0, functionName.indexOf("(")).trim();

        errorLocation = firstLine.substring(
            firstLine.indexOf("(") + 1,
            firstLine.lastIndexOf(")")
        );
    }
    else
        errorLocation = firstLine
            .trim()
            .substring(3);

    errorLocation = errorLocation.replace("file://" + (process.platform === "win32" ? "/" : ""), "");

    const location = { line: "", col: "" };
    let filename = "";
    
    let i = errorLocation.length - 1;
    while ("0123456789".includes(errorLocation[i])) {
      location.col = errorLocation[i] + location.col;
      i--;
    }
    i--;
    while ("0123456789".includes(errorLocation[i])) {
      location.line = errorLocation[i] + location.line;
      i--;
    }
          
    filename = errorLocation.slice(0, i);
    
    return {
        filename,
        functionName,
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
 * 
 * @param {Location} loc 
 * @param {string} lineStart
 * @param {number} maxLineNumberLength
 * @param {number} underlineLength
 * @param {string} delim
 * @param {string} highlightedLine
 * @param {Options} [opts]
 * @returns {string}
 */
function formatErrorLine(loc, lineStart, maxLineNumberLength, underlineLength, delim, highlightedLine, opts) {
    return `${THEME.comment("at")} ${THEME.symbol(`${path.relative(process.cwd(), loc.filename)}:${loc.location.line}:${loc.location.col}`)} ${loc.functionName ? `${THEME.comment("in")} ${THEME.keyword("function")} ${THEME.function(loc.functionName)}` : ""}
${lineStart}
${THEME.number(loc.location.line.toString().padStart(maxLineNumberLength))} ${delim} ${highlightedLine}
${lineStart}${" ".repeat(loc.location.col - 1)}${chalk.red((opts?.underline ?? "‾").repeat(underlineLength))}`
}

/**
 * Get a prettified version of an error.
 * @param {Error} err The error object.
 * @param {Options} [opts] The settings to use.
 * @returns {string}
 */
export function getPrettified(err, opts) {
    const MAX_STACK_LENGTH = opts?.noTrace ? 1 : (err.stack?.split("\n") || []).length - 2;
    const delim = THEME.comment("│");
    let maxLineNumberLength = 0;
    /** @type {{ loc: Location, highlightedLine: string, underlineLength: number }[]} */
    let highlighted = [];

    for (let i = MAX_STACK_LENGTH; i >= 0; i--) {
        const loc = getLocation(err, i);
        if (loc.filename.startsWith("node:internal"))
            continue;
        if (opts?.skipNodeFiles && loc.filename.startsWith("node:"))
            continue;
        const filecontent = readFileSync(loc.filename, { encoding: "utf8" });
        const currentLine = filecontent.split("\n")[loc.location.line - 1];
        const tokens = Prism.tokenize(currentLine, Prism.languages.javascript);
        let underlineLength = 1;

        if (opts?.smartUnderline ?? true) {
            let currentIndex = 0;

            for (const tok of tokens) {
                currentIndex += tok.length;

                if (loc.location.col <= currentIndex) {
                    underlineLength = typeof tok === "string"
                        ? tok.trim().length
                        : tok.length;
                    break;
                }
            }
        }

        let highlightedLine = highlightStream(tokens);
        const lineNumberLength = loc.location.line.toString().length;

        if (lineNumberLength > maxLineNumberLength)
            maxLineNumberLength = lineNumberLength;

        highlighted.push({ loc, highlightedLine, underlineLength });
    }
    
    const lineStart = `${" ".repeat(maxLineNumberLength)} ${delim} `;

    let lines = "";

    for (let i = 0; i < highlighted.length; i++) {
        lines += formatErrorLine(highlighted[i].loc, lineStart, maxLineNumberLength, highlighted[i].underlineLength, delim, highlighted[i].highlightedLine, opts);
        if (i !== highlighted.length - 1)
            lines += `\n`;
    }

    return `${lines}
${" ".repeat(maxLineNumberLength)} ${THEME.comment("╰──")} ${chalk.red(err.name)}${THEME.comment(":")} ${THEME.symbol(err.message)}`
}

/**
 * Execute a function while handling exceptions and pretty printing them.
 * @template {() => any} T
 * @param {T} funct The function.
 * @param {Options} [opts] The settings to use.
 * @returns {ReturnType<T>}
 */
export default function prettyErrors(funct, opts) {
    try {
        return funct();
    } catch(err) {
        const msg = getPrettified(err, opts)
        console.error(msg);
        process.exit(1);
    }
}

const defaultPrepare = Error.prepareStackTrace;

/**
 * Prettify every error.
 * @param {Options} [opts] The settings to use.
 */
export function start(opts) {
    Error.prepareStackTrace = (err) => {
        return "\n" + getPrettified(err, opts) + "\n";
    }
}

/**
 * Stop prettying every error.
 */
export function stop() {
    Error.prepareStackTrace = defaultPrepare;
}