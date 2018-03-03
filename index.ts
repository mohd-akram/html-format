class Char {
  public stream: string;
  public pos: number;
  constructor(stream: string, pos: number) {
    this.stream = stream;
    this.pos = pos;
  }
  get value() {
    return this.stream[this.pos];
  }
}

class Token {
  public stream: string;
  public start: number;
  public end: number;
  constructor(stream: string, start: number, end: number) {
    this.stream = stream;
    this.start = start;
    this.end = end;
  }
  get value() {
    return this.stream.slice(this.start, this.end);
  }
  get whitespace() {
    let i = this.start - 1;
    for (; i >= 0 && /\s/.test(this.stream[i]); i--)
      ;
    return new Token(this.stream, i + 1, this.start);
  }
}

function nextChar(s: string, i: number, regex = /\S/g) {
  if (!regex.global)
    throw new Error('Regexp must be global');
  regex.lastIndex = i;
  const res = regex.exec(s);
  if (!res)
    return;
  return new Char(s, res.index);
}

function nextToken(s: string, i: number) {
  let char = nextChar(s, i);
  if (!char)
    return;
  const start = char.pos;
  char = nextChar(s, start + 1, /[\s<]|>/g);
  const end = char ? char.pos + Number(char.value == '>') : s.length;
  return new Token(s, start, end);
}

const voidTags = [
  'area', 'base', 'br', 'col', 'command', 'embed', 'hr', 'img', 'input',
  'keygen', 'link', 'menuitem', 'meta', 'param', 'source', 'track', 'wbr',
  '!doctype', '!--'
];

function parseTokenValue(value: string) {
  let tagName = value.replace(/^<\/?|>$/g, '').toLowerCase();

  if (tagName.startsWith('!--'))
    tagName = '!--';

  const isTagStart = /</.test(value);
  const isTagEnd = />/.test(value);

  const isStartTag = /<([^/]|$)/.test(value);
  const isEndTag = /<\//.test(value) || (
    isStartTag && voidTags.includes(tagName)
  );

  return {
    isTagStart, isTagEnd, isStartTag, isEndTag, tagName
  };
}

function format(html: string, indent = '  ', width = 80) {
  const output = [];

  let inStartTag = false;
  let inEndTag = false;
  let inSpecialElement = false;
  let indentLevel = 0;

  let prevState: any = {};
  let token: Token | undefined;
  let i = 0;

  while (token = nextToken(html, i)) {
    let tokenValue = token.value;
    let tokenWhitespaceValue = token.whitespace.value;
    let pendingWhitespace = '';
    let { isTagStart, isTagEnd, isStartTag, isEndTag, tagName } =
      parseTokenValue(tokenValue);

    // Token adjustments for edge cases
    // Remove space before tag name
    if (isTagStart && !tagName) {
      i = token.end;
      token = nextToken(html, i);
      if (!token)
        break;
      tokenValue += token.value;
      ({ isTagStart, isTagEnd, isStartTag, isEndTag, tagName } =
        parseTokenValue(tokenValue));
    }
    // Split attributes stuck together
    if (!isTagStart && (inStartTag || inEndTag)) {
      // If attribute has end quote followed by another attribute
      const regex = /[^=]"[^>]/g;
      const res = regex.exec(tokenValue);
      if (res && token.end != token.start + res.index + 2) {
        token.end = token.start + res.index + 2;
        tokenValue = token.value;
        ({ isTagStart, isTagEnd, isStartTag, isEndTag, tagName } =
          parseTokenValue(tokenValue));
        pendingWhitespace = indent;
      }
    }

    // Current State
    if (isStartTag)
      inStartTag = true;
    if (isEndTag)
      inEndTag = true;
    if (isEndTag && !isStartTag) // A void tag will be both
      --indentLevel;
    if (isTagStart && ['pre', 'script', 'style'].includes(tagName))
      inSpecialElement = !inSpecialElement;

    // Convenience
    const inTag = inStartTag || inEndTag;

    // Whitespace
    const whitespace = tokenWhitespaceValue || prevState.pendingWhitespace;
    const ignoreSpace = inTag && (
      /^[=">]/.test(tokenValue) || /(^|=)"$/.test(prevState.tokenValue)
    );
    if (inSpecialElement && !inTag)
      output.push(tokenWhitespaceValue);
    else if (whitespace && !ignoreSpace) {
      const numNewlines = (whitespace.match(/\n/g) || []).length;

      const lastNewline = Math.max(0, output.lastIndexOf('\n'));
      const lineLength = output.slice(lastNewline).reduce(
        (l, s) => l + s.length, 0
      );

      const indents = indent.repeat(
        indentLevel + Number(inTag && !isTagStart)
      );

      if (lineLength + tokenValue.length > width)
        output.push('\n', indents);
      else if (numNewlines)
        output.push(...Array(numNewlines).fill('\n'), indents);
      else
        output.push(' ');
    }

    output.push(tokenValue);

    prevState = {
      pendingWhitespace, tokenValue
    };

    // Next state
    if (inStartTag && isTagEnd && !inEndTag) // A void tag is both start & end
      ++indentLevel;
    if (isTagEnd)
      inStartTag = inEndTag = false;
    i = token.end;
  }

  if (html[html.length - 1] == '\n')
    output.push('\n');

  return output.join('');
}

export default format;

module.exports = Object.assign(exports.default, exports);
