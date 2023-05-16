const tagName = String.raw`[^/\s>]+`;

const quotedAttrValue = String.raw`"(?<quotedAttrValue>[^"]*)"`;
const singleQuotedAttrValue = String.raw`'(?<singleQuotedAttrValue>[^']*)'`;
const unquotedAttrValue = String.raw`(?<unquotedAttrValue>[^\s>"']*)`;

const attrName = String.raw`[^=\s>/"']+(?=[=>\s]|$)`;
const attrValue = String.raw`${quotedAttrValue}|${singleQuotedAttrValue}|${unquotedAttrValue}`;

// Preserve strings in templates and such
const doubleQuotedString = String.raw`"(\\.|[^\\"])*"`;
const singleQuotedString = String.raw`'(\\.|[^\\'])*'`;
const quotedString = String.raw`${doubleQuotedString}|${singleQuotedString}`;

const attrText = String.raw`(?:${quotedString})|[^\s>]+`;
const attr = String.raw`(?<attrSpace>(?<=["'])\s*|\s+)(?:(?<attrName>${attrName})(?:\s*=\s*(?:${attrValue}))?|(?<attrText>${attrText}))`;

const tokens = {
  comment: String.raw`<!--.*?-->`,
  dtd: String.raw`<![^>]+>`,
  startTag: String.raw`<\s*(?<startTagName>${tagName})(?<attrs>(?:${attr})*)\s*>`,
  endTag: String.raw`<\s*/(?<endTagName>${tagName})\s*>`,
  space: String.raw`\s+`,
  quotedString,
  text: String.raw`[^<\s'"]+`,
  wildcard: String.raw`.+`,
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
  "br",
  "col",
  "command",
  "embed",
  "hr",
  "img",
  "input",
  "keygen",
  "link",
  "menuitem",
  "meta",
  "param",
  "source",
  "track",
  "wbr",
]);

function format(/** @type {string} */ html, indent = "  ", width = 80) {
  const lexer = new RegExp(grammar, "gys");
  const attrLexer = new RegExp(attr, "gy");

  /** @type {string[]} */
  const output = [];

  /** @type {string | null} */
  let specialElement = null;
  let level = 0;

  let pendingIndent = false;
  let lineLength = 0;

  const addOutput = (/** @type {string[]} */ ...args) => {
    for (const s of args) {
      const pos = s.lastIndexOf("\n");
      if (pos != -1) lineLength = s.length - pos - 1;
      if (!specialElement) {
        if (s == "\n") pendingIndent = true;
        else {
          if (
            lineLength + s.length > width &&
            /^[ \t]+$/.test(output[output.length - 1])
          ) {
            output.pop();
            addOutput("\n");
          }
          if (pendingIndent) {
            const ind = indent.repeat(level);
            output.push(ind);
            pendingIndent = false;
            lineLength += ind.length;
          }
          lineLength += s.length;
        }
      }
      output.push(s);
    }
  };

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
        addOutput(...(token[0].match(/\n/g) ?? [" "]));
      } else if (
        token.groups.dtd ||
        token.groups.comment ||
        token.groups.wildcard ||
        token.groups.quotedString
      ) {
        addOutput(token[0]);
      } else if (token.groups.text) {
        addOutput(token[0].replace(/[ \t]+/g, " "));
      } else if (token.groups.startTag) {
        const tagName = token.groups.startTagName.toLowerCase();

        addOutput(`<${tagName}`);

        if (["pre", "script", "style"].includes(tagName))
          specialElement = tagName;

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
            // Ignore slash used in self-closing tag
            if (
              lastIndex == token.groups.attrs.length &&
              token.groups.attrText == "/"
            )
              continue;

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
                    ? `=${attrToken.groups.quotedAttrValue}`
                    : ""
                }`
              );
            }

            lastToken = attrToken;
          }
          if (lastIndex != token.groups.attrs.length)
            throw new Error("Failed to parse attributes");
        }

        addOutput(">");

        if (voidTags.has(tagName)) --level;
      }
    } else addOutput(token[0]);
  }

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
