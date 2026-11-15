import { v4 as uuidv4 } from 'uuid';

const STORAGE_KEY = 'ziwei_archives_v1';
const isValidRecord = (record) => (
    record
    && typeof record === 'object'
    && !Array.isArray(record)
    && typeof record.id === 'string'
    && record.id.length > 0
    && typeof record.name === 'string'
);

/**
 * @typedef {Object} ChartRecord
 * @property {string} id
 * @property {string} name
 * @property {string} gender 'male' | 'female'
 * @property {string} type 'money' | 'ziwei' (expandable)
 * @property {Object} data The actual chart data (e.g., hexagram result, birth time)
 * @property {string} group 'family' | 'friend' | 'customer' | 'other'
 * @property {string} note
 * @property {number} createdAt
 * @property {number} updatedAt
 */

export class ArchiveManager {
    constructor(storage = globalThis.localStorage, eventTarget = globalThis.window) {
        this.storage = storage;
        this.eventTarget = eventTarget;
        this.records = this._loadFromStorage();
        // 同一个网站开着两个标签页时，另一页改了档案：这一页重新读一遍，并通知页面刷新列表。
        try {
            this.eventTarget?.addEventListener?.('storage', (event) => {
                if (event?.key != null && event.key !== STORAGE_KEY) return;
                this._syncFromStorage();
                this._notify();
            });
        } catch (e) {
            console.warn('Failed to watch archive changes:', e);
        }
    }

    _loadFromStorage() {
        try {
            const data = this.storage?.getItem(STORAGE_KEY);
            if (!data) return [];
            const parsed = JSON.parse(data);
            return Array.isArray(parsed) ? parsed.filter(isValidRecord) : [];
        } catch (e) {
            console.error('Failed to load archives:', e);
            return [];
        }
    }

    /**
     * 改档案之前先按存储里的最新内容对齐一遍。
     * 每个标签页各有一份内存里的档案：不对齐的话，后写的那一页会把另一页刚记下的盖掉。
     * 存储读不了时沿用内存里的，不清空。
     */
    _syncFromStorage() {
        if (!this.storage?.getItem) return;
        try {
            const data = this.storage.getItem(STORAGE_KEY);
            if (!data) {
                this.records = [];
                return;
            }
            const parsed = JSON.parse(data);
            if (Array.isArray(parsed)) this.records = parsed.filter(isValidRecord);
        } catch (e) {
            console.warn('Failed to re-read archives:', e);
        }
    }

    _notify() {
        try {
            // Dispatch event for reactive UI updates if needed in this page.
            this.eventTarget?.dispatchEvent?.(new Event('archive-updated'));
        } catch (e) {
            console.warn('Failed to dispatch archive update:', e);
        }
    }

    _commit(nextRecords) {
        try {
            if (!this.storage?.setItem) throw new Error('Storage unavailable');
            this.storage.setItem(STORAGE_KEY, JSON.stringify(nextRecords));
            this.records = nextRecords;
        } catch (e) {
            console.error('Failed to save archives:', e);
            return false;
        }

        this._notify();
        return true;
    }

    /** 按存储里的最新内容对齐一遍（别的标签页可能刚改过）。查重之前调用。 */
    refresh() {
        this._syncFromStorage();
    }

    /**
     * Get all records, optionally filtered
     */
    getRecords(filterFn = null) {
        const records = Array.isArray(this.records) ? this.records : [];
        if (!filterFn) return [...records];
        return records.filter(filterFn);
    }

    /**
     * Save a new record
     * @param {Omit<ChartRecord, 'id' | 'createdAt' | 'updatedAt'>} recordInput 
     */
    addRecord(recordInput) {
        this._syncFromStorage();
        const newRecord = {
            ...recordInput,
            id: uuidv4(),
            createdAt: Date.now(),
            updatedAt: Date.now()
        };
        // Add to beginning of list
        const nextRecords = [newRecord, ...this.getRecords()];
        return this._commit(nextRecords) ? newRecord : null;
    }

    /**
     * Update an existing record
     */
    updateRecord(id, updates) {
        this._syncFromStorage();
        const index = this.records.findIndex(r => r.id === id);
        if (index === -1) return null;

        const currentRecord = this.records[index];
        const nextRecords = [...this.records];
        nextRecords[index] = {
            ...this.records[index],
            ...updates,
            id: currentRecord.id,
            createdAt: currentRecord.createdAt,
            updatedAt: Date.now()
        };
        return this._commit(nextRecords) ? nextRecords[index] : null;
    }

    /**
     * 把一条记录提到最前面（档案里新的在前），顺带可以改几个字段。
     * 再排一次同一张盘时用：不多记一条，只是让它回到「最近」的位置。
     */
    touchRecord(id, updates = {}) {
        this._syncFromStorage();
        const current = this.records.find(r => r.id === id);
        if (!current) return null;
        const touched = {
            ...current,
            ...updates,
            id: current.id,
            createdAt: current.createdAt,
            updatedAt: Date.now()
        };
        const nextRecords = [touched, ...this.records.filter(r => r.id !== id)];
        return this._commit(nextRecords) ? touched : null;
    }

    /**
     * Delete a record
     */
    deleteRecord(id) {
        this._syncFromStorage();
        const nextRecords = this.getRecords().filter(r => r.id !== id);
        return this._commit(nextRecords);
    }

    /**
     * 一次删掉符合条件的多条记录，只落盘一次。返回被删掉的记录；没写进去时返回 null。
     */
    removeRecords(predicate) {
        this._syncFromStorage();
        const removed = this.getRecords().filter(predicate);
        if (removed.length === 0) return [];
        const ids = new Set(removed.map(r => r.id));
        return this._commit(this.getRecords().filter(r => !ids.has(r.id))) ? removed : null;
    }

    /**
     * 把删掉的记录原样放回去（撤销用）：编号、时间都不变，已经在档案里的编号跳过。
     */
    restoreRecords(records) {
        this._syncFromStorage();
        const existingIds = new Set(this.records.map(r => r.id));
        const fresh = (Array.isArray(records) ? records : []).filter(r => isValidRecord(r) && !existingIds.has(r.id));
        if (fresh.length === 0) return true;
        return this._commit([...fresh, ...this.records]);
    }

    /**
     * Export all data as JSON blob
     */
    exportData() {
        const dataStr = JSON.stringify(this.records, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = `ziwei_backup_${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    /**
     * Import data from JSON file content
     * @param {string} jsonString 
     * @param {boolean} merge If true, keeps existing and adds new (deduping by ID). If false, overwrites.
     */
    importData(jsonString, merge = true) {
        this._syncFromStorage();
        try {
            const imported = JSON.parse(jsonString);
            if (!Array.isArray(imported)) throw new Error('Invalid format');

            if (merge) {
                // 安全合并：同 ID 始终保留本机版本，只添加备份中的新记录。
                const currentMap = new Map(this.getRecords().map(r => [r.id, r]));
                imported.forEach(rec => {
                    if (
                        rec
                        && typeof rec === 'object'
                        && !Array.isArray(rec)
                        && typeof rec.id === 'string'
                        && typeof rec.name === 'string'
                        && rec.id
                        && rec.name
                        && !currentMap.has(rec.id)
                    ) {
                        currentMap.set(rec.id, rec);
                    }
                });
                const nextRecords = Array.from(currentMap.values())
                    .sort((a, b) => b.updatedAt - a.updatedAt);
                if (!this._commit(nextRecords)) throw new Error('Storage unavailable');
            } else {
                const validRecords = imported.filter((rec) => (
                    rec
                    && typeof rec === 'object'
                    && !Array.isArray(rec)
                    && typeof rec.id === 'string'
                    && typeof rec.name === 'string'
                    && rec.id
                    && rec.name
                ));
                if (!this._commit(validRecords)) throw new Error('Storage unavailable');
            }

            return { success: true, count: this.records.length };
        } catch (e) {
            console.error('Import failed:', e);
            return { success: false, error: e.message };
        }
    }
}

// Singleton instance
export const archiveManager = new ArchiveManager();
