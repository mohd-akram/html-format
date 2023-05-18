const tagName = String.raw`[^/\s>]+`;

const quotedAttrValue = String.raw`"(?<quotedAttrValue>[^"]*)"`;
const singleQuotedAttrValue = String.raw`'(?<singleQuotedAttrValue>[^']*)'`;
// https://mothereff.in/unquoted-attributes
const unquotedAttrValue = String.raw`(?<unquotedAttrValue>[^\s"'\`=<>]+)`;

const attrName = String.raw`[^=\s>/"']+(?=[=>\s]|$)`;
const attrValue = String.raw`${quotedAttrValue}|${singleQuotedAttrValue}|${unquotedAttrValue}`;

// Preserve strings in templates and such
const doubleQuotedString = String.raw`"(?:\\.|[^\\"\n])*"`;
const singleQuotedString = String.raw`'(?:\\.|[^\\'\n])*'`;
const quotedString = String.raw`${doubleQuotedString}|${singleQuotedString}`;

const attrText = String.raw`(?:${quotedString})|[^\s>]+`;
const attr = String.raw`(?<attrSpace>(?<=["'])\s*|\s+)(?:(?<attrName>${attrName})(?:\s*=\s*(?:${attrValue}))?|(?<attrText>${attrText}))`;

const tokens = {
  comment: String.raw`<!--.*?-->`,
  dtd: String.raw`<![^>]+>`,
  startTag: String.raw`<\s*(?<startTagName>${tagName})(?<attrs>(?:${attr})*)\s*>`,
  endTag: String.raw`<\s*/\s*(?<endTagName>${tagName})\s*>`,
  space: String.raw`\s+`,
  quotedString,
  text: String.raw`[^<\s'"]+`,
  wildcard: String.raw`.+?`,
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
      if (!specialElement) {
        if (s == "\n") pendingIndent = true;
        else {
          const newline = s.indexOf("\n");
          const len = newline == -1 ? s.length : newline;
          if (
            lineLength + len > width &&
            /^[ \t]+$/.test(output[output.length - 1])
          ) {
            output.pop();
            addOutput("\n");
          }
          if (pendingIndent) {
            pendingIndent = false;
            addOutput(indent.repeat(level));
          }
        }
      }
      const pos = s.lastIndexOf("\n");
      if (pos == -1) lineLength += s.length;
      else lineLength = s.length - pos - 1;
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
        addOutput(...(token[0].match(/\n/g)?.slice(0, 2) ?? [" "]));
      } else if (
        token.groups.dtd ||
        token.groups.comment ||
        token.groups.wildcard ||
        token.groups.quotedString ||
        token.groups.text
      ) {
        addOutput(token[0]);
      } else if (token.groups.startTag) {
        const tagName = token.groups.startTagName.toLowerCase();

        addOutput(`<${tagName}`);

        if (["pre", "script", "style"].includes(tagName))
          specialElement = tagName;

        ++level;

        let selfClosing = voidTags.has(tagName);

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

            // Detect self-closing tag
            if (
              lastIndex == token.groups.attrs.length &&
              token.groups.attrText == "/"
            ) {
              selfClosing = true;
            }

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

        addOutput(">");

        if (selfClosing) --level;
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
