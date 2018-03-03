html-format
===========

Format HTML strings by indenting, wrapping, and removing unnecessary
whitespace while preserving newlines.

Install
-------

    npm install html-format

Usage
-----

```javascript
const format = require('html-format');

const html = `\
<body>
<main class="bg">   </main>
</body>
`;

// indent = 2 spaces (default), width = 80 characters (default)
format(html) == `\
<body>
  <main class="bg"> </main>
</body>
`;

// indent = 4 spaces, width = 80 characters (default)
format(html, ' '.repeat(4)) == `\
<body>
    <main class="bg"> </main>
</body>
`;

// indent = 4 spaces, width = 20 characters
format(html, ' '.repeat(4), 20) == `\
<body>
    <main
        class="bg">
    </main>
</body>
`;
```
