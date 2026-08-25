const fs = require('fs');
const path = require('path');

function replaceInDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      replaceInDir(fullPath);
    } else if (fullPath.endsWith('.ts') || fullPath.endsWith('.tsx')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      let changed = false;

      // Replace .toISOString().split('T')[0] with toLocalISODate()
      const regex = /(new Date\(\)|[a-zA-Z0-9_]+)\.toISOString\(\)\.split\('T'\)\[0\]/g;
      if (regex.test(content)) {
        content = content.replace(regex, "toLocalISODate($1)");
        changed = true;
      }

      if (changed) {
        // Add import statement at the top if not exists
        if (!content.includes('import { toLocalISODate }')) {
          content = `import { toLocalISODate } from '@/lib/dateUtils';\n` + content;
        }
        fs.writeFileSync(fullPath, content, 'utf8');
        console.log('Updated', fullPath);
      }
    }
  }
}

replaceInDir('src');
