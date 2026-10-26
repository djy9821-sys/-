import test from 'node:test';
import assert from 'node:assert/strict';

import { buildLiuYaoReading } from '../src/utils/liuyao.js';
import {
  buildLiuYaoRecord, describeLiuYaoRecord, formatCastTime, isLiuYaoRecord, liuYaoRecordToInput, parseCastTime,
} from '../src/utils/liuyaoRecord.js';

const castAt = new Date(2026, 9, 26, 10, 7, 42);

test('起卦时间按墙上时间保存并能原样读回', () => {
  assert.equal(formatCastTime(castAt), '2026-10-26 10:07:42');
  assert.equal(parseCastTime('2026-10-26 10:07:42').getTime(), castAt.getTime());
  assert.equal(parseCastTime('2026-10-26 10:07').getTime(), new Date(2026, 9, 26, 10, 7).getTime());
  assert.equal(parseCastTime('2026-02-30 10:07'), null);
  assert.equal(parseCastTime('昨天'), null);
  assert.equal(parseCastTime(null), null);
});

test('卦例存档后能重新装出同一卦', () => {
  const reading = buildLiuYaoReading([7, 9, 8, 8, 6, 7], castAt, { question: '问换工作', method: 'gesture' });
  const record = buildLiuYaoRecord(reading, castAt, { group: 'friend', note: ' 事后应验 ' });
  assert.equal(record.type, 'liuyao');
  assert.equal(record.name, '问换工作');
  assert.equal(record.group, 'friend');
  assert.equal(record.note, '事后应验');
  assert.equal(record.data.castAt, '2026-10-26 10:07:42');
  assert.deepEqual(record.data.values, [7, 9, 8, 8, 6, 7]);
  assert.equal(record.data.hexagram, reading.hexagram.name);
  assert.equal(record.data.changed, reading.changed.name);
  assert.deepEqual(record.data.movingPositions, [2, 5]);

  const input = liuYaoRecordToInput({ ...record, id: 'x' });
  assert.deepEqual(input.values, [7, 9, 8, 8, 6, 7]);
  assert.equal(input.castDate.getTime(), castAt.getTime());
  assert.equal(input.method, 'gesture');
  const again = buildLiuYaoReading(input.values, input.castDate, { question: input.question, method: input.method });
  assert.deepEqual(again.lines.map((line) => `${line.god}${line.relative}${line.ganZhi}`), reading.lines.map((line) => `${line.god}${line.relative}${line.ganZhi}`));
  assert.equal(again.time.day, reading.time.day);

  // 没写所问时用卦名做名称
  const unnamed = buildLiuYaoRecord(buildLiuYaoReading([7, 7, 7, 7, 7, 7], castAt), castAt);
  assert.equal(unnamed.name, '乾为天卦');
  assert.equal(unnamed.data.changed, null);
});

test('残缺或别的类型的记录不能当六爻卦例打开', () => {
  assert.equal(isLiuYaoRecord(null), false);
  assert.equal(isLiuYaoRecord({ type: 'ziwei', data: { values: [7, 7, 7, 7, 7, 7], castAt: '2026-10-26 10:07' } }), false);
  assert.equal(isLiuYaoRecord({ type: 'liuyao', data: { values: [7, 7, 7, 7, 7], castAt: '2026-10-26 10:07' } }), false);
  assert.equal(isLiuYaoRecord({ type: 'liuyao', data: { values: [7, 7, 7, 7, 7, 5], castAt: '2026-10-26 10:07' } }), false);
  assert.equal(isLiuYaoRecord({ type: 'liuyao', data: { values: [7, 7, 7, 7, 7, 7], castAt: '' } }), false);
  assert.equal(isLiuYaoRecord({ type: 'liuyao', data: { values: [6, 7, 8, 9, 6, 7], castAt: '2026-10-26 10:07' } }), true);
});

test('档案列表的卦例摘要', () => {
  const reading = buildLiuYaoReading([7, 9, 8, 8, 6, 7], castAt, { question: '问换工作' });
  const summary = describeLiuYaoRecord(buildLiuYaoRecord(reading, castAt));
  assert.equal(summary.hexagramText, `${reading.hexagram.name} → ${reading.changed.name}`);
  assert.equal(summary.castText, '起卦 2026-10-26 10:07');
  assert.equal(summary.dayText, `${reading.time.day}日`);
  assert.equal(summary.methodText, '摇铜钱');
  assert.equal(describeLiuYaoRecord({ type: 'liuyao', data: {} }).hexagramText, '卦象未记录');
  assert.equal(describeLiuYaoRecord({ type: 'liuyao', data: { hexagram: '乾为天', changed: null } }).hexagramText, '乾为天（静卦）');
});
