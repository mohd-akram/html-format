// @ts-check
const nodeTest = require("node:test");

const assert = require("assert/strict");

const format = require("./index.js");

/**
 *
 * @param {string} name
 * @param {string} input
 * @param {string} expected
 * @param {boolean} [strict]
 * @param {string} [indent]
 * @param {number} [width]
 * @param {Parameters<typeof format>[3]} [transform]
 */
function test(name, input, expected, strict = true, indent, width, transform) {
  nodeTest.test(name, () => {
    if (!strict) {
      /** @type {any} */ (format).__strict = true;
      assert.throws(() => format(input, indent, width));
    }
    /** @type {any} */ (format).__strict = strict;
    const actual = format(input, indent, width, transform);
    assert.equal(actual, expected);
    if (width == undefined) width = 80;
    for (const line of actual.split("\n")) {
      assert.ok(
        line.length <= width,
        `line.length = ${line.length} > ${width}`
      );
      // Ensure no trailing whitespace
      assert.ok(!/\s+$/.test(line));
    }
  });
}

test("No-op", "<body></body>", "<body></body>");

test("Remove extra space 1", "<body>  </body>", "<body> </body>");
test(
  "Remove extra space 2",
  "<body>   pasted  from   the internet   </body>",
  "<body> pasted from the internet </body>"
);

test("Preserve newlines", "<body>\n\n</body>", "<body>\n\n</body>");

test(
  "Preserve nested newlines",
  "<html>\n  <head>\n\n    <script></script></head></html>",
  "<html>\n  <head>\n\n    <script></script></head></html>"
);

test("Preserve trailing newline", "<body></body>\n", "<body></body>\n");

test("Trim trailing newlines", "<body></body>\n\n\n", "<body></body>\n");

test(
  "Indent once",
  "<body>\n<main></main></body>",
  "<body>\n  <main></main></body>"
);

test(
  "Indent twice",
  "<body>\n<main>\n<div></div></main></body>",
  "<body>\n  <main>\n    <div></div></main></body>"
);

test(
  "Fix wrong indents",
  "<body>\n <main>\n <div>\n  </div>\n   </main>\n </body>",
  "<body>\n  <main>\n    <div>\n    </div>\n  </main>\n</body>"
);

test(
  "Space attributes",
  '<div id="container"class="grid"></div>',
  '<div id="container" class="grid"></div>'
);

test(
  "Align attributes",
  '<div id="container"\nclass="grid"></div>',
  '<div id="container"\n  class="grid"></div>'
);

test(
  "Remove extra attribute space 1",
  '<div id="container"  class="grid"></div>',
  '<div id="container" class="grid"></div>'
);
test(
  "Remove extra attribute space 2",
  '<div id="container" class ="grid"></div>',
  '<div id="container" class="grid"></div>'
);
test(
  "Remove extra attribute space 3",
  '<div id="container" class= "grid"></div>',
  '<div id="container" class="grid"></div>'
);
test(
  "Remove extra attribute space 4",
  '<div id="container" class="grid" ></div>',
  '<div id="container" class="grid"></div>'
);
test(
  "Remove extra attribute space 5",
  '<div  id = "container"  class = "grid" ></div>',
  '<div id="container" class="grid"></div>'
);

test(
  "Wrap many attributes",
  '<input type="text" id="name" name="name" class="form-input" placeholder="Name" required>',
  '<input type="text" id="name" name="name" class="form-input" placeholder="Name"\n  required>'
);

test(
  "Do not wrap after long attribute with newline",
  '<div class="grid-cell-row-num-col-5 text-align text-center position-absolute\ndisplay-block"></div>no wrap needed',
  '<div class="grid-cell-row-num-col-5 text-align text-center position-absolute\ndisplay-block"></div>no wrap needed'
);

test(
  "Wrap long line",
  "<p>\nLorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.</p>",
  "<p>\n  Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor\n  incididunt ut labore et dolore magna aliqua.</p>"
);

test(
  "Wrap long tag",
  '<a class="external" href="https://example.com/0123456789/0123456789/01234">Go</a>',
  '<a class="external"\n  href="https://example.com/0123456789/0123456789/01234">Go</a>'
);

test(
  "Wrap after special element",
  "<pre>this is an incredibly long sentence that never seems to end</pre> this should actually wrap",
  "<pre>this is an incredibly long sentence that never seems to end</pre> this\nshould actually wrap"
);

test(
  "Do not wrap after special element",
  "<pre>this is an incredibly long sentence that never seems to end\n starting a new paragraph</pre> this should not actually wrap",
  "<pre>this is an incredibly long sentence that never seems to end\n starting a new paragraph</pre> this should not actually wrap"
);

test(
  "Do not format pre element content",
  '<pre  class= "code">\ns  p  a  c  e  </pre>  s',
  '<pre class="code">\ns  p  a  c  e  </pre> s'
);

test(
  "Do not format textarea element content",
  '<textarea  class= "code">\ns  p  a  c  e  </textarea>  s',
  '<textarea class="code">\ns  p  a  c  e  </textarea> s'
);

test(
  "Do not format style element content",
  "<style>body {  }</style>",
  "<style>body {  }</style>"
);

test(
  "Do not format script element content",
  '<script  src="js/main.js">  console.log(  )  </script>',
  '<script src="js/main.js">  console.log(  )  </script>'
);

test(
  "Format special tag attributes",
  '<script\nsrc="https://ajax.googleapis.com/ajax/libs/d3js/7.8.4/d3.min.js"></script>',
  '<script\n  src="https://ajax.googleapis.com/ajax/libs/d3js/7.8.4/d3.min.js"></script>'
);

test(
  "Wrap special tag",
  '<script async src="https://www.googletagmanager.com/gtag/js?id=0123456789"></script>',
  '<script async\n  src="https://www.googletagmanager.com/gtag/js?id=0123456789"></script>'
);

test(
  "Do not indent after doctype",
  "<!doctype html>\n<html></html>",
  "<!doctype html>\n<html></html>"
);

test(
  "Do not indent after comment",
  "<!-- useless comment -->\n<div></div>",
  "<!-- useless comment -->\n<div></div>"
);

test(
  "Do not parse tags inside quotes",
  '<script>html = "</div>  </div>"</script><div>  </div>',
  '<script>html = "</div>  </div>"</script><div> </div>'
);

test(
  "Do not parse tags inside comments",
  "<!--< div>\n</div>  -->\n<div  ></div>",
  "<!--< div>\n</div>  -->\n<div></div>"
);

test(
  "Format element after empty comment",
  "<!---->\n<div>  </div>",
  "<!---->\n<div> </div>"
);

test(
  "Do not remove space before double/triple equals 1",
  `<ng-container *ngIf="formType === 'signup'">`,
  `<ng-container *ngIf="formType === 'signup'">`
);

test(
  "Do not remove space before double/triple equals 2",
  `<ng-container *ngIf="formType !== 'signup'">`,
  `<ng-container *ngIf="formType !== 'signup'">`
);

test(
  "Handle attribute-like text inside tag",
  "<div {% if a==2 %}hidden{% endif %}>",
  "<div {% if a==2 %}hidden{% endif %}>",
  false
);

test(
  "Different indent",
  '<body>\n<main class="bg">   </main>\n</body>',
  '<body>\n    <main class="bg"> </main>\n</body>',
  true,
  " ".repeat(4)
);

test(
  "Different indent and width",
  '<body>\n<main class="bg">   </main>\n</body>',
  '<body>\n    <main class="bg">\n    </main>\n</body>',
  true,
  " ".repeat(4),
  21
);

test(
  "Handle space around non-attribute quotes correctly",
  '<a {{#if (equals pageLink "/users") }} class="is-active" {{/if}}>Users</a>',
  '<a {{#if (equals pageLink "/users") }} class="is-active" {{/if}}>Users</a>',
  false
);

test(
  "Handle space inside non-attribute quotes correctly",
  '<a {{#if (equals value " do not show ") }} hidden {{/if}}>Users</a>',
  '<a {{#if (equals value " do not show ") }} hidden {{/if}}>Users</a>',
  false
);

test(
  "Handle consecutive quotes",
  '<a {{#if (equals value " do not "" show user ") }} hidden {{/if}}>Users</a>',
  '<a {{#if (equals value " do not "" show user ") }} hidden {{/if}}>Users</a>',
  false
);

test(
  "Preserve quoted strings",
  ":\"  leave  m\\\"e  alone\"  '  and  m\\'e  too':",
  ":\"  leave  m\\\"e  alone\" '  and  m\\'e  too':"
);

test(
  "Ignore quoted strings with newlines",
  "Collector's  \n<div>\nstuff\n</div>'",
  "Collector's\n<div>\n  stuff\n</div>'"
);

test(
  "Preserve incomplete HTML",
  "<pre>do not remove me",
  "<pre>do not remove me"
);

test(
  "Handle invalid HTML",
  "< this is a very long sentence to test the regex",
  "< this is a very long sentence to test the regex",
  false
);

test("Void tags work correctly", "<br>\n<br>", "<br>\n<br>");

test(
  "Handle self-closing tag",
  "<circle / >\n<circle/ >",
  "<circle />\n<circle />"
);

test("Handle extraneous slashes 1", "<circle x/y / >", "<circle x/y />", false);
test("Handle extraneous slashes 2", "<circle / / >", "<circle / />", false);

test(
  "Handle arbitrary text in tag",
  '<div =x {{#if 1}}class="active"{{/if}} =>\nstuff\n</div>',
  '<div =x {{#if 1}}class="active"{{/if}} =>\n  stuff\n</div>',
  false
);

test(
  "Transform",
  "<div> this is a long line </div>",
  "<div> this\n  is a\n  long\n  line\n</div>",
  true,
  "  ",
  10,
  (token, space) => [space, token]
);

test(
  "Transform with newline in verbatim text",
  "<script>\n</script>",
  "<script>\n</script>",
  true,
  "  ",
  10,
  (token, space) => [space, token]
);

test(
  "Transform with changed space",
  "<div>\n<div><div></div></div></div>",
  "\n<div>\n  <div>\n    <div>\n    </div>\n  </div>\n</div>",
  true,
  "  ",
  80,
  (token) => (["<div", "</div>"].includes(token) ? ["\n", token] : undefined)
);

test(
  "Transform with removed space",
  "\n<div>\n  <div>\n    <div>\n    </div>\n  </div>\n</div>",
  "<div><div><div></div></div></div>",
  true,
  "  ",
  80,
  (token) => (/^<\/?div>?$/.test(token) ? [token] : undefined)
);

test(
  "Transform script",
  "<script>\n// my first program\nconsole.log('hello world');\n</script>",
  "<script>\nconsole.log('hello world');\n</script>",
  true,
  "  ",
  80,
  (() => {
    let inScript = false;
    let inScriptTag = false;
    let script = "";
    return (token, space) => {
      if (inScript) {
        if (token == "</script>") {
          // Remove comments
          const out = [script.replace(/^\s*\/\/.*$/gm, ""), space, token];
          script = "";
          inScript = false;
          return out;
        }
        script += space + token;
        // Return nothing until we've collected the entire script
        return [];
      }
      if (inScriptTag && token == ">") {
        inScriptTag = false;
        inScript = true;
      }
      if (token == "<script") inScriptTag = true;
    };
  })()
);
