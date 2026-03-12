import fs from 'fs';
import path from 'path';

const blogDir = 'src/content/blog';
const files = fs.readdirSync(blogDir).filter(file => file.endsWith('.md'));

const boldRegexes = [
  /^\s*\*\*(.*?)\*\*\s*$/,
  /^\s*<strong>(.*?)</strong>\s*$/,
  /^\s*<b>(.*?)</b>\s*$/
];

files.forEach(file => {
  const filePath = path.join(blogDir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  let newLines = [];
  let changed = false;

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    let match = null;
    for (const regex of boldRegexes) {
      const m = line.match(regex);
      if (m) {
        match = m;
        break;
      }
    }

    if (match) {
      changed = true;
      const headingText = match[1].trim();
      const newHeading = `## ${headingText}`;
      
      // Ensure empty line before
      if (newLines.length > 0 && newLines[newLines.length - 1].trim() !== '') {
        newLines.push('');
      }
      
      newLines.push(newHeading);
      
      // Ensure empty line after (will check next line in loop)
      if (i + 1 < lines.length && lines[i + 1].trim() !== '') {
        newLines.push('');
      }
    } else {
      newLines.push(line);
    }
  }

  if (changed) {
    fs.writeFileSync(filePath, newLines.join('\n'), 'utf8');
    console.log(`Updated ${file}`);
  }
});
