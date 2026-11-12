// 九星气学：从命盘档案取名单（姓名、公历生日、性别）。用的都是编出来的人。
import test from 'node:test';
import assert from 'node:assert/strict';
import { profilesFromArchive, solarYmdOfRecord } from '../src/utils/jiuxing/archiveProfiles.js';

test('公历记录直接用；八字记录优先用存好的公历', () => {
  assert.deepEqual(solarYmdOfRecord({ calendarType: 'solar', birthDate: '1990-6-15' }), [1990, 6, 15]);
  assert.deepEqual(solarYmdOfRecord({ calendarType: 'lunar', birthDate: '1990-5-23', solarDate: '1990-06-15' }), [1990, 6, 15]);
  assert.deepEqual(solarYmdOfRecord({ data: { birthDate: '2001-12-03' } }), [2001, 12, 3]);
});

test('只有农历的记录换成公历，闰月按闰月算', () => {
  // 1990 年农历五月廿三是公历 6 月 15 日；2020 年闰四月初一是公历 5 月 23 日，四月初一是 4 月 23 日
  assert.deepEqual(solarYmdOfRecord({ calendarType: 'lunar', birthDate: '1990-5-23' }), [1990, 6, 15]);
  assert.deepEqual(solarYmdOfRecord({ calendarType: 'lunar', birthDate: '2020-4-1', isLeapMonth: true }), [2020, 5, 23]);
  assert.deepEqual(solarYmdOfRecord({ calendarType: 'lunar', birthDate: '2020-4-1' }), [2020, 4, 23]);
});

test('没有生日或日期不成立的记录不进名单', () => {
  assert.equal(solarYmdOfRecord({ type: 'liuyao', name: '问事' }), null);
  assert.equal(solarYmdOfRecord({ calendarType: 'solar', birthDate: '1990-02-30' }), null);
  assert.equal(solarYmdOfRecord({ calendarType: 'lunar', birthDate: '1990-13-40' }), null);
  assert.equal(solarYmdOfRecord(null), null);
});

test('名单：同名同生日只留一条，性别换成男女', () => {
  const profiles = profilesFromArchive([
    { id: 'a', name: '甲某', gender: 'male', type: 'ziwei', calendarType: 'solar', birthDate: '1990-6-15' },
    { id: 'b', name: '甲某', gender: 'male', type: 'bazi', calendarType: 'lunar', birthDate: '1990-5-23', solarDate: '1990-06-15' },
    { id: 'c', name: '乙某', gender: 'female', type: 'bazi', calendarType: 'solar', birthDate: '1987-6-1' },
    { id: 'd', name: '一卦', type: 'liuyao' },
    { id: 'e', name: '  ', calendarType: 'solar', birthDate: '2000-1-1' },
  ]);
  assert.deepEqual(profiles, [
    { label: '甲某（1990-06-15）', name: '甲某', birth: '1990-06-15', gender: '男' },
    { label: '乙某（1987-06-01）', name: '乙某', birth: '1987-06-01', gender: '女' },
  ]);
  assert.deepEqual(profilesFromArchive(undefined), []);
});
