# html-format

Format HTML strings by indenting, wrapping, and removing unnecessary
whitespace while preserving newlines.

## Install

    npm install html-format

## Usage

```javascript
import format from "html-format";

const html = `\
<body>
<main class="grid">   </main>
</body>
`;

// indent = 2 spaces (default), width = 80 characters (default)
format(html) ==
  `\
<body>
  <main class="grid"> </main>
</body>
`;

// indent = 4 spaces, width = 80 characters (default)
format(html, " ".repeat(4)) ==
  `\
<body>
    <main class="grid"> </main>
</body>
`;

// indent = 4 spaces, width = 20 characters
format(html, " ".repeat(4), 20) ==
  `\
<body>
    <main
        class="grid">
    </main>
</body>
`;
```

### Transform (experimental)

You can make modifications to the formatting by passing a transform function. It
is provided with the current token to be formatted, and the space preceding it.

For example, to always add line breaks before certain block elements:

```javascript
const tokens = new Set(["<div", "</div>", "<p"]);

const html = "<div><div><p>Hello, world!</p></div></div>";

format(html, "  ", 80, (token) =>
  tokens.has(token) ? ["\n", token] : undefined
);

/*
<div>
  <div>
    <p>Hello, world!</p>
  </div>
</div>
*/
```

The default transform is equivalent to `(token, space) => [space, token]`.

If nothing is returned from the function, the default formatting occurs.
Otherwise, it is expected that an array of tokens is returned.

#### Tokens

For the start tag, it will be provided as the initial part (eg. `<div`),
followed by a token for each attribute, followed by an end to the start tag
(`>` or `/>`). Text is provided as individual word tokens, except inside special
elements (`pre`, `script`, `style` and `textarea`) where it is provided as a
single string. An end tag is provided as eg. `</div>`.
