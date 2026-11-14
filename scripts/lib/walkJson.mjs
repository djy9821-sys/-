/** 列出一个目录（含子目录）下的全部 .json 文件，按名字排好。只在 Node 里用。 */
import fs from 'node:fs';
import path from 'node:path';

export const walkJson = (dir) => {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  const visit = (current) => {
    fs.readdirSync(current, { withFileTypes: true })
      .sort((a, b) => a.name.localeCompare(b.name))
      .forEach((item) => {
        const full = path.join(current, item.name);
        if (item.isDirectory()) visit(full);
        else if (item.isFile() && item.name.endsWith('.json')) out.push(full);
      });
  };
  visit(dir);
  return out;
};
