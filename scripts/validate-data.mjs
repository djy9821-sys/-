/**
 * 校验数据目录里的古籍条目、术语词典与经典命例：
 *   node scripts/validate-data.mjs
 *
 * 通过时打印各书、各状态的条目统计；有错误时逐条列出并以非零码退出。
 * 单元测试 test/data-files.test.js 跑的是同一套检查，所以 CI 上格式不对的 PR 会直接标红。
 */
import { collectDataErrors, loadDataFiles, summarizeData } from './lib/dataFiles.mjs';

const files = loadDataFiles();
const errors = collectDataErrors(files);
const summary = summarizeData(files);

console.log(`古籍条目：${summary.classics.total} 条，${summary.classics.files} 个文件`);
Object.entries(summary.classics.byBook).forEach(([book, stat]) => {
  console.log(`  《${book}》 ${stat.total} 条（draft ${stat.draft} / translated ${stat.translated} / reviewed ${stat.reviewed}）`);
});
console.log(`术语词典：${summary.glossary.total} 条，${summary.glossary.files} 个文件`);
console.log(`经典命例：${summary.cases.total} 条，${summary.cases.files} 个文件`);

if (errors.length) {
  console.error(`\n发现 ${errors.length} 处问题：`);
  errors.forEach((message) => console.error(`  - ${message}`));
  process.exit(1);
}
console.log('\n数据文件全部通过校验。');
