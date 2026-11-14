import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const readProjectFile = (relativePath) => readFile(
  new URL(`../${relativePath}`, import.meta.url),
  'utf8',
);

test('启动封面只留两扇门：问命进首页，藏经阁读原典', async () => {
  const source = await readProjectFile('src/components/WelcomeCover.jsx');

  for (const [title, action] of [
    ['问命', 'home'],
    ['藏经阁', 'cangjing'],
  ]) {
    assert.match(source, new RegExp(`title: '${title}'[\\s\\S]*?action: '${action}'`));
  }
  assert.equal(source.match(/action: '/g).length, 2, '封面上只有两个入口');

  assert.doesNotMatch(source, /奇门|梅花|马前课/);
  assert.doesNotMatch(source, /https?:\/\//);
  // 藏经阁那扇门去的页面在 App 里接上了
  const app = await readProjectFile('src/App.jsx');
  assert.match(app, /cangjing: 'cangjing'/);
  assert.match(app, /view === 'cangjing' \?/);
});

test('封面仅首次展示，退出后保留原有首页状态机', async () => {
  const source = await readProjectFile('src/App.jsx');

  assert.match(source, /gushupai-welcome-cover-seen-v1/);
  // 默认进入首页；带 #/bazi 等地址打开时直接进入对应功能，不显示封面。
  assert.match(source, /const \[view, setView\] = useState\(initialViewFromLocation\)/);
  assert.match(source, /viewFromHash\(globalThis\.location\?\.hash\)/);
  assert.match(source, /if \(initialViewFromLocation\(\) !== 'home'\) return false;/);
  assert.match(source, /globalThis\.localStorage\?\.getItem\(WELCOME_COVER_KEY\) !== 'seen'/);
  assert.match(source, /<WelcomeCover[\s\S]*?onEnter=\{\(\) => leaveWelcomeCover\('home'\)\}[\s\S]*?onNavigate=\{leaveWelcomeCover\}/);
  assert.match(source, /查看品牌封面/);
});

test('封面视觉完全本地化并适配手机安全区', async () => {
  const styles = await readProjectFile('src/components/WelcomeCover.css');

  assert.match(styles, /\.welcome-cover\s*\{/);
  assert.match(styles, /env\(safe-area-inset-top/);
  assert.match(styles, /env\(safe-area-inset-bottom/);
  assert.match(styles, /@media \(max-width: 350px\)/);
  assert.match(styles, /@media \(prefers-reduced-motion: reduce\)/);
  assert.doesNotMatch(styles, /url\(\s*['"]?https?:\/\//);
  // 标题用的字体是随网站一起发的子集，许可文件也在
  assert.match(styles, /url\("\.\.\/assets\/fonts\/gsp-kai-display\.woff2"\)/);
  await readProjectFile('public/licenses/LXGW-WenKai-OFL.txt');
  await readProjectFile('public/licenses/WebGL-Fluid-Simulation-MIT.txt');
});
