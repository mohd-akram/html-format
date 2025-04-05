const tagName = String.raw`[A-Za-z][^/\s>]*`;

// Preserve strings in templates and such
// Avoid apostrophes and unintentional captures
const doubleQuotedString = String.raw`\B"(?:\\[^<>\n]|[^\\"<>\n])*"\B`;
const singleQuotedString = String.raw`\B'(?:\\[^<>\n]|[^\\'<>\n])*'\B`;
const quotedString = String.raw`${doubleQuotedString}|${singleQuotedString}`;

const quotedAttrValue = String.raw`"(?<quotedAttrValue>[^"]*)"`;
const singleQuotedAttrValue = String.raw`'(?<singleQuotedAttrValue>[^']*)'`;
// https://mothereff.in/unquoted-attributes
const unquotedAttrValue = String.raw`(?<unquotedAttrValue>[^\s"'\`=<>]+)`;

const attrName = String.raw`[^=\s>/"']+(?=[=>\s]|$)`;
const attrValue = String.raw`${quotedAttrValue}|${singleQuotedAttrValue}|${unquotedAttrValue}`;
const attrNameValue = String.raw`(?<attrName>${attrName})(?:\s*=\s*(?:${attrValue}))?`;

// Make sure not to swallow the closing slash if one exists
const attrText = String.raw`${quotedString}|[^\s>]*[^\s>/]|[^\s>]*/(?!\s*>)`;

const attr = String.raw`(?<attrSpace>\s*)(?:${attrNameValue}|(?<attrText>${attrText}))`;

const tokens = {
  comment: String.raw`<!--.*?-->`,
  dtd: String.raw`<![^>]+>`,
  startTag: String.raw`<(?<startTagName>${tagName})(?<attrs>(?:${attr})*)\s*(?<closingSlash>/?)\s*>`,
  endTag: String.raw`</(?<endTagName>${tagName})\s*>`,
  space: String.raw`\s+`,
  text: String.raw`[^<\s"']+|${quotedString}|['"]`,
  wildcard: String.raw`.`,
};

const grammar = Object.entries(tokens)
  .map(([k, v]) => `(?<${k}>${v})`)
  .join("|");

/**
 *
 * @param {RegExp} lexer
 * @param {string} s
 */
function* getTokens(lexer, s) {
  let res;
  let { lastIndex } = lexer;
  while ((res = lexer.exec(s))) {
    yield /** @type {RegExpExecArray & { groups: Record<string, string> }} */ (
      res
    );
    ({ lastIndex } = lexer);
  }
  if (lastIndex != s.length) throw new Error("Failed to parse string");
}

const voidTags = new Set([
  "area",
  "base",
  "basefont",
  "bgsound",
  "br",
  "col",
  "command",
  "embed",
  "frame",
  "hr",
  "image",
  "img",
  "input",
  "keygen",
  "link",
  "meta",
  "param",
  "source",
  "track",
  "wbr",
]);

function format(
  /** @type {string} */ html,
  indent = "  ",
  width = 80,
  /** @type {((token: string, space: string) => string[] | void) | undefined} */ transform
) {
  const lexer = new RegExp(grammar, "gys");
  const attrLexer = new RegExp(attr, "gy");

  /** @type {string[]} */
  const output = [];

  /** @type {string | null} */
  let specialElement = null;
  let level = 0;

  let lineLength = 0;
  let span = "";
  let spanLevel = 0;
  let lastSpace = "";
  let verbatimToken = "";

  const flushVerbatimOutput = () => {
    if (verbatimToken) {
      addToken(verbatimToken, true, transform);
      verbatimToken = "";
    }
  };

  const flushOutput = () => {
    flushVerbatimOutput();

    if (lastSpace && lastSpace != "\n") {
      const newline = span.indexOf("\n");
      const len = newline == -1 ? span.length : newline;
      if (lineLength + lastSpace.length + len > width) lastSpace = "\n";
    }

    const ind = lastSpace == "\n" && span ? indent.repeat(spanLevel) : "";
    const out = `${lastSpace}${ind}${span}`;

    if (out) {
      const pos = out.lastIndexOf("\n");
      if (pos == -1) lineLength += out.length;
      else lineLength = out.length - pos - 1;
      output.push(out);
    }

    span = lastSpace = "";
  };

  const addToken = (
    /** @type {string} */ token,
    /** @type {boolean} */ verbatim,
    /** @type {typeof transform} */ t
  ) => {
    const isSpace = /^\s+$/.test(token);

    if (t && !isSpace) {
      const tokens = t(token, lastSpace);
      if (tokens) {
        if (!span) lastSpace = "";
        for (const token of tokens) addToken(token, verbatim);
        return;
      }
    }

    if (!verbatim && isSpace) {
      flushOutput();
      lastSpace = token;
    } else {
      if (!span) spanLevel = level;
      span += token;
    }
  };

  const addOutput = (/** @type {string[]} */ ...tokens) => {
    flushVerbatimOutput();
    for (const t of tokens) addToken(t, false, transform);
  };

  const addVerbatimOutput = (/** @type {string} */ s) => (verbatimToken += s);

  for (const token of getTokens(lexer, html)) {
    // For testing
    if (/** @type {any} */ (format).__strict && token.groups.wildcard)
      throw new Error("Unexpected wildcard");

    if (token.groups.endTag) {
      const tagName = token.groups.endTagName.toLowerCase();
      if (tagName == specialElement) specialElement = null;
      if (!specialElement) {
        --level;
        addOutput(`</${tagName}>`);
      }
    }

    if (!specialElement) {
      if (token.groups.space) {
        addOutput(...(token[0].match(/\n/g)?.slice(0, 2) ?? [" "]));
      } else if (
        token.groups.comment ||
        token.groups.dtd ||
        token.groups.text ||
        token.groups.wildcard
      ) {
        addOutput(token[0]);
      } else if (token.groups.startTag) {
        const tagName = token.groups.startTagName.toLowerCase();

        addOutput(`<${tagName}`);

        ++level;

        if (token.groups.attrs) {
          let { lastIndex } = attrLexer;
          let attrToken;
          let lastToken;
          while (
            (attrToken =
              /** @type {RegExpExecArray & { groups: Record<string, string> }} */ (
                attrLexer.exec(token.groups.attrs)
              ))
          ) {
            ({ lastIndex } = attrLexer);

            // For testing
            if (
              /** @type {any} */ (format).__strict &&
              attrToken.groups.attrText
            )
              throw new Error("Unexpected attr text");

            if (attrToken.groups.attrText) {
              if (attrToken.groups.attrSpace)
                addOutput(/\n/.test(attrToken.groups.attrSpace) ? "\n" : " ");
              addOutput(attrToken.groups.attrText);
            } else {
              if (attrToken.groups.attrSpace || !lastToken?.groups.attrText)
                addOutput(/\n/.test(attrToken.groups.attrSpace) ? "\n" : " ");
              addOutput(
                `${attrToken.groups.attrName}${
                  attrToken.groups.quotedAttrValue
                    ? `="${attrToken.groups.quotedAttrValue}"`
                    : attrToken.groups.singleQuotedAttrValue
                    ? `='${attrToken.groups.singleQuotedAttrValue}'`
                    : attrToken.groups.unquotedAttrValue
                    ? `=${attrToken.groups.unquotedAttrValue}`
                    : ""
                }`
              );
            }

            lastToken = attrToken;
          }
          if (lastIndex != token.groups.attrs.length)
            throw new Error("Failed to parse attributes");
        }

        const hasClosingSlash = Boolean(token.groups.closingSlash);

        addOutput(hasClosingSlash ? " />" : ">");

        if (hasClosingSlash || voidTags.has(tagName)) --level;
        else if (["pre", "textarea", "script", "style"].includes(tagName))
          specialElement = tagName;
      }
    } else addVerbatimOutput(token[0]);
  }

  // Flush remaining output
  flushOutput();

  let newline = false;
  while (/^\s+$/.test(output[output.length - 1])) {
    const last = /** @type {string} */ (output.pop());
    if (/\n/.test(last)) newline = true;
  }

  if (newline) output.push("\n");

  return output.join("");
}

format.default = format;
module.exports = format;
