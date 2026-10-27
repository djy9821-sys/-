import test from 'node:test';
import assert from 'node:assert/strict';

import { HEXAGRAM_MAP } from '../src/utils/hexagramLogic.js';

const byName = (name) => Object.values(HEXAGRAM_MAP).find((item) => item.name === name);

// 卦辞只收《周易》经文，不混入大象传；错字和缺漏按通行本改正。
test('六十四卦齐全，卦辞按通行本', () => {
  assert.equal(Object.keys(HEXAGRAM_MAP).length, 64);
  assert.equal(byName('乾为天').desc, '元亨利贞。');
  assert.equal(byName('坤为地').desc, '元亨，利牝马之贞。君子有攸往，先迷后得主，利。西南得朋，东北丧朋。安贞吉。');
  assert.equal(byName('水雷屯').desc, '元亨利贞。勿用有攸往，利建侯。');
  assert.equal(byName('水风井').desc, '改邑不改井，无丧无得，往来井井。汔至亦未繘井，羸其瓶，凶。');
  const values = Object.values(HEXAGRAM_MAP);
  assert.ok(values.every(({ desc }) => !desc.includes('君子以')), '卦辞里不应混入大象传');
  assert.ok(values.every(({ desc }) => !desc.includes('有筱')));
});
