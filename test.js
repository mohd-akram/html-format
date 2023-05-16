const nodeTest = require("node:test");

const assert = require("assert/strict");

const format = require("./index.js");

/**
 *
 * @param {string} name
 * @param {string} input
 * @param {string} expected
 * @param {string} [indent]
 * @param {number} [width]
 */
function test(name, input, expected, indent, width) {
  nodeTest.test(name, () => {
    const actual = format(input, indent, width);
    assert.equal(actual, expected);
    if (width == undefined) width = 80;
    for (const line of actual.split("\n"))
      assert.ok(
        line.length <= width,
        `line.length = ${line.length} > ${width}`
      );
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

test("Preserve trailing newline", "<body></body>\n\n\n", "<body></body>\n");

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
  "Align attributes",
  '<div id="container"\nclass="grid"></div>',
  '<div id="container"\n  class="grid"></div>'
);

test("Remove tag space", "< div >< /div >", "<div></div>");

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
  "Wrap long line",
  "<p>\nLorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.</p>",
  "<p>\n  Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor\n  incididunt ut labore et dolore magna aliqua.</p>"
);

test(
  "Do not format pre tag content",
  '<pre  class= "code">  s  p  a  c  e  </pre>  s',
  '<pre class="code">  s  p  a  c  e  </pre> s'
);

test(
  "Do not format style tag content",
  "<style>body {  }</style>",
  "<style>body {  }</style>"
);

test(
  "Do not format script tag content",
  '<script  src="js/main.js">  console.log(  )  </script>',
  '<script src="js/main.js">  console.log(  )  </script>'
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
  "Do not parse tags inside special elements 1",
  '<script>html = "</div>  </div>"</script><div>  </div>',
  '<script>html = "</div>  </div>"</script><div> </div>'
);
test(
  "Do not parse tags inside special elements 2",
  "<!--< div>\n</div>  -->\n<div  ></div>",
  "<!--< div>\n</div>  -->\n<div></div>"
);

test(
  "Format element after empty comment",
  "<!---->\n< div>  </div>",
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
  "Different indent",
  '<body>\n<main class="bg">   </main>\n</body>',
  '<body>\n    <main class="bg"> </main>\n</body>',
  " ".repeat(4)
);

test(
  "Different indent and width",
  '<body>\n<main class="bg">   </main>\n</body>',
  '<body>\n    <main class="bg"\n        > </main>\n</body>',
  " ".repeat(4),
  20
);

test(
  "Handle space around non-attribute quotes correctly",
  '<a {{#if (equals pageLink "/users") }} class="is-active" {{/if}}>Users</a>',
  '<a {{#if (equals pageLink "/users") }} class="is-active" {{/if}}>Users</a>'
);

test(
  "Handle space inside non-attribute quotes correctly",
  '<a {{#if (equals value " do not show ") }} hidden {{/if}}>Users</a>',
  '<a {{#if (equals value " do not show ") }} hidden {{/if}}>Users</a>'
);

test("Handle invalid HTML", "<", "<");

test("Void tags work correctly", "<br>\n<br>", "<br>\n<br>");

test("Handle self-closing tag", "<br / >", "<br>");
