import test from 'node:test';
import assert from 'node:assert/strict';

import { ArchiveManager } from '../src/utils/archiveManager.js';

const STORAGE_KEY = 'ziwei_archives_v1';

class MemoryStorage {
  constructor(initialValue = null) {
    this.value = initialValue;
    this.failWrites = false;
  }

  getItem(key) {
    return key === STORAGE_KEY ? this.value : null;
  }

  setItem(key, value) {
    if (this.failWrites) throw new Error('quota exceeded');
    if (key === STORAGE_KEY) this.value = value;
  }
}

const createManager = (initialRecords = []) => {
  const storage = new MemoryStorage(JSON.stringify(initialRecords));
  const events = [];
  const manager = new ArchiveManager(storage, {
    dispatchEvent(event) {
      events.push(event.type);
    },
  });
  return { manager, storage, events };
};

test('损坏的档案根节点与无效记录不会使档案库崩溃', () => {
  const objectStorage = new MemoryStorage(JSON.stringify({ records: [] }));
  const mixedStorage = new MemoryStorage(JSON.stringify([
    null,
    { id: {}, name: '坏记录' },
    { id: 'valid', name: '有效记录', type: 'ziwei' },
  ]));

  assert.deepEqual(new ArchiveManager(objectStorage).getRecords(), []);
  assert.deepEqual(new ArchiveManager(mixedStorage).getRecords().map(({ id }) => id), ['valid']);
});

test('新增档案仅在成功落盘后更新内存且系统字段不可覆盖', () => {
  const { manager, storage, events } = createManager();
  const saved = manager.addRecord({ id: 'caller-id', name: '杨先生', type: 'ziwei' });

  assert.notEqual(saved.id, 'caller-id');
  assert.equal(manager.getRecords().length, 1);
  assert.deepEqual(events, ['archive-updated']);

  storage.failWrites = true;
  const originalConsoleError = console.error;
  console.error = () => {};
  let failed;
  try {
    failed = manager.addRecord({ name: '写入失败', type: 'ziwei' });
  } finally {
    console.error = originalConsoleError;
  }
  assert.equal(failed, null);
  assert.equal(manager.getRecords().length, 1);
});

test('合并导入保留本机同ID档案并只添加新档案', () => {
  const local = { id: 'same', name: '本机新版', type: 'ziwei', updatedAt: 200 };
  const { manager } = createManager([local]);
  const result = manager.importData(JSON.stringify([
    { id: 'same', name: '备份旧版', type: 'ziwei', updatedAt: 100 },
    { id: 'new', name: '新增档案', type: 'ziwei', updatedAt: 300 },
    { id: {}, name: '无效档案' },
  ]));

  assert.equal(result.success, true);
  assert.equal(result.count, 2);
  assert.equal(manager.getRecords().find(({ id }) => id === 'same').name, '本机新版');
  assert.equal(manager.getRecords().find(({ id }) => id === 'new').name, '新增档案');
});

test('两个标签页共用一份档案：各记各的不会互相盖掉，另一页的改动能通知到这一页', () => {
  const storage = new MemoryStorage(JSON.stringify([]));
  const listeners = [];
  const events = [];
  const tabOne = new ArchiveManager(storage, {
    dispatchEvent(event) { events.push(event.type); },
    addEventListener(type, listener) { if (type === 'storage') listeners.push(listener); },
  });
  const tabTwo = new ArchiveManager(storage, { dispatchEvent() {} });

  const first = tabOne.addRecord({ name: '第一页排的', type: 'bazi' });
  // 第二页内存里还是空的：写之前先按存储对齐，第一页那条还在。
  tabTwo.addRecord({ name: '第二页排的', type: 'bazi' });
  assert.deepEqual(JSON.parse(storage.value).map(({ name }) => name), ['第二页排的', '第一页排的']);

  // 浏览器把另一页的改动用 storage 事件通知过来：这一页重读，并让列表刷新。
  assert.equal(listeners.length, 1);
  events.length = 0;
  listeners[0]({ key: STORAGE_KEY });
  assert.deepEqual(tabOne.getRecords().map(({ name }) => name), ['第二页排的', '第一页排的']);
  assert.deepEqual(events, ['archive-updated']);
  // 别的键变了不用管。
  listeners[0]({ key: 'something-else' });
  assert.deepEqual(events, ['archive-updated']);

  // 第一页接着改自己那条：第二页记的不受影响。
  tabOne.updateRecord(first.id, { note: '补了备注' });
  assert.deepEqual(JSON.parse(storage.value).map(({ name, note }) => [name, note ?? '']), [['第二页排的', ''], ['第一页排的', '补了备注']]);

  // 存储一时读不了：沿用内存里的，不把档案清空。
  const broken = new ArchiveManager(storage, { dispatchEvent() {} });
  const originalGetItem = storage.getItem.bind(storage);
  storage.getItem = () => { throw new Error('denied'); };
  const originalWarn = console.warn;
  console.warn = () => {};
  try {
    broken.addRecord({ name: '读不了时排的', type: 'bazi' });
  } finally {
    console.warn = originalWarn;
    storage.getItem = originalGetItem;
  }
  assert.equal(JSON.parse(storage.value).length, 3);
});
