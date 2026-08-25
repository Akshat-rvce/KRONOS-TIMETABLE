const fs = require('fs');
const path = require('path');

function fixUseClient(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      fixUseClient(fullPath);
    } else if (fullPath.endsWith('.ts') || fullPath.endsWith('.tsx')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      if (content.includes('"use client"')) {
        // remove all occurrences
        content = content.replace(/['"]use client['"];?\r?\n?/g, '');
        // prepend at the top
        content = '"use client";\n' + content;
        fs.writeFileSync(fullPath, content, 'utf8');
        console.log('Fixed', fullPath);
      }
    }
  }
}

fixUseClient('src');
