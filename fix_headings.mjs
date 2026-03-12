import fs from 'fs';
import path from 'path';

const blogDir = 'src/content/blog';
const skipFiles = ['arsenal-wolves.md', 'deforestation.md'];

const files = fs.readdirSync(blogDir).filter(f => f.endsWith('.md') && !skipFiles.includes(f));

files.forEach(file => {
  const filePath = path.join(blogDir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split(/\r?\n/);
  const newLines = [];
  let changed = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Pattern: **Text** or <strong>Text</strong>
    const strongMatch = trimmed.match(/^<strong>(.*?)<\/strong>$/);
    const starMatch = trimmed.match(/^\*\*(.*?)\*\*$/);

    let headingText = null;
    if (strongMatch) headingText = strongMatch[1];
    else if (starMatch) headingText = starMatch[1];

    if (headingText && headingText.trim()) {
      changed = true;
      const cleanHeading = headingText.trim();
      const newHeading = `## ${cleanHeading}`;

      // Ensure blank line before
      if (newLines.length > 0 && newLines[newLines.length - 1].trim() !== '') {
        newLines.push('');
      }

      newLines.push(newHeading);

      // Ensure blank line after if next line is not empty
      if (i + 1 < lines.length && lines[i + 1].trim() !== '') {
        newLines.push('');
      }
    } else {
      newLines.push(line);
    }
  }

  if (changed) {
    fs.writeFileSync(filePath, newLines.join('\n'));
    console.log(`Updated ${file}`);
  }
});
