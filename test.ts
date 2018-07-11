import * as assert from 'assert';

import format from '.';

function test(
  input: string, expected: string, indent?: string, width?: number
) {
  const actual = format(input, indent, width);
  assert.equal(actual, expected);
  if (width == undefined)
    width = 80;
  for (const line of actual.split('\n'))
    assert.ok(line.length <= width, `line.length = ${line.length} > ${width}`);
}

// No-op
test('<body></body>', '<body></body>');

// Remove extra space
test('<body>  </body>', '<body> </body>');
test(
  '<body>   pasted  from   the internet   </body>',
  '<body> pasted from the internet </body>'
);

// Preserve newlines
test('<body>\n\n</body>', '<body>\n\n</body>');

// Preserve trailing newline
test('<body></body>\n\n\n', '<body></body>\n');

// Indent once
test('<body>\n<main></main></body>', '<body>\n  <main></main></body>');

// Indent twice
test(
  '<body>\n<main>\n<div></div></main></body>',
  '<body>\n  <main>\n    <div></div></main></body>'
);

// Fix wrong indents
test(
  '<body>\n <main>\n <div>\n  </div>\n   </main>\n </body>',
  '<body>\n  <main>\n    <div>\n    </div>\n  </main>\n</body>'
);

// Space attributes
test(
  '<div id="container"class="grid"></div>',
  '<div id="container" class="grid"></div>'
);

// Align attributes
test(
  '<div id="container"\nclass="grid"></div>',
  '<div id="container"\n  class="grid"></div>'
);

// Remove tag space
test(
  '< div >< /div >',
  '<div></div>'
);

// Remove extra attribute space
test(
  '<div id="container"  class="grid" ></div>',
  '<div id="container" class="grid"></div>'
);
test(
  '<div id = "container"  class="grid"></div>',
  '<div id="container" class="grid"></div>'
);

// Wrap many attributes
test(
  '<input type="text" id="name" name="name" class="form-input" placeholder="Name" required>',
  '<input type="text" id="name" name="name" class="form-input" placeholder="Name"\n  required>'
);

// Wrap long line
test(
  '<p>\nLorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.</p>',
  '<p>\n  Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor\n  incididunt ut labore et dolore magna aliqua.</p>'
);

// Do not format pre tag content
test(
  '<pre  class= "code">  s  p  a  c  e  </pre>  s',
  '<pre class="code">  s  p  a  c  e  </pre> s'
);

// Do not format style tag content
test('<style>body {  }</style>', '<style>body {  }</style>');

// Do not format script tag content
test(
  '<script  src="js/main.js">  console.log(  )  </script>',
  '<script src="js/main.js">  console.log(  )  </script>'
);

// Do not indent after doctype
test('<!doctype html>\n<html></html>', '<!doctype html>\n<html></html>');

// Do not indent after comment
test(
  '<!-- useless comment -->\n<div></div>',
  '<!-- useless comment -->\n<div></div>'
);

// Do not parse tags inside special elements
test(
  '<script>html = "</div>  </div>"</script><div>  </div>',
  '<script>html = "</div>  </div>"</script><div> </div>'
);
test(
  '<!--< div>\n</div>  -->\n<div  ></div>',
  '<!--< div>\n</div>  -->\n<div></div>'
);

// Format element after empty comment
test(
  '<!---->\n< div>  </div>',
  '<!---->\n<div> </div>'
);

// Different indent
test(
  '<body>\n<main class="bg">   </main>\n</body>',
  '<body>\n    <main class="bg"> </main>\n</body>',
  ' '.repeat(4)
);

// Different indent and width
test(
  '<body>\n<main class="bg">   </main>\n</body>',
  '<body>\n    <main\n        class="bg">\n    </main>\n</body>',
  ' '.repeat(4), 20
);
