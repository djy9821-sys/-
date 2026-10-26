import React, { useEffect, useMemo, useState } from 'react';
import {
    AlertCircle,
    Archive,
    ArrowLeft,
    ArrowRight,
    Briefcase,
    CheckCircle2,
    Download,
    Folder,
    Heart,
    Search,
    Trash2,
    Upload,
    User,
    Users,
    X,
} from 'lucide-react';
import { archiveManager } from '../utils/archiveManager';
import { parseClockTime, recordToBaziForm } from '../utils/baziRecord';

const GROUP_META = {
    self: { label: '自己', icon: User },
    father: { label: '父亲', icon: Users },
    mother: { label: '母亲', icon: Users },
    son: { label: '儿子', icon: Users },
    daughter: { label: '女儿', icon: Users },
    girlfriend: { label: '女友', icon: Heart },
    boyfriend: { label: '男友', icon: Heart },
    family: { label: '家人', icon: Users },
    friend: { label: '朋友', icon: Users },
    customer: { label: '客户', icon: Briefcase },
    other: { label: '其他', icon: Folder },
    ungrouped: { label: '未分组', icon: Folder },
};

const GROUP_ORDER = [
    'self', 'father', 'mother', 'son', 'daughter', 'girlfriend', 'boyfriend',
    'family', 'friend', 'customer', 'other', 'ungrouped',
];

const TIME_LABELS = {
    0: '早子时', 1: '丑时', 2: '寅时', 3: '卯时', 4: '辰时', 5: '巳时', 6: '午时',
    7: '未时', 8: '申时', 9: '酉时', 10: '戌时', 11: '亥时', 12: '晚子时',
};

const TYPE_LABELS = {
    ziwei: '紫微斗数',
    bazi: '八字',
    money: '金钱卦',
    unknown: '其他记录',
};

const MAX_IMPORT_BYTES = 2 * 1024 * 1024;
const isPlainObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const hasOwn = (object, key) => Object.prototype.hasOwnProperty.call(object, key);

const toDisplayText = (value, fallback = '') => (
    typeof value === 'string' || typeof value === 'number'
        ? String(value).trim() || fallback
        : fallback
);

const getGroupId = (record) => {
    const groupId = toDisplayText(record?.group, 'ungrouped');
    return hasOwn(GROUP_META, groupId) ? groupId : 'other';
};

const getGroupMeta = (groupId) => (
    hasOwn(GROUP_META, groupId) ? GROUP_META[groupId] : GROUP_META.other
);

const getRecordDate = (record) => toDisplayText(
    record?.birthDate
    || record?.solarDate
    || record?.data?.birthDate
    || record?.data?.solarDate,
    '日期未记录',
);

const getRecordType = (record) => (
    hasOwn(TYPE_LABELS, record?.type) ? TYPE_LABELS[record.type] : TYPE_LABELS.unknown
);

const getCalendarLabel = (record) => {
    if (record?.calendarType === 'lunar') return '农历';
    if (record?.calendarType === 'solar' || (!record?.calendarType && record?.solarDate)) return '公历';
    return '历法未记录';
};

const getGenderLabel = (record) => (
    record?.gender === 'male' ? '乾造' : record?.gender === 'female' ? '坤造' : '性别未记录'
);

const canOpenRecord = (record) => (record?.type === 'bazi' ? recordToBaziForm(record) !== null : record?.type === 'ziwei'
    && ['male', 'female'].includes(record?.gender)
    && (
        ['solar', 'lunar'].includes(record?.calendarType)
        || (!record?.calendarType && Boolean(record?.solarDate || record?.data?.solarDate))
    )
    && record?.timeHour != null
    && record.timeHour !== ''
    && Number.isInteger(Number(record?.timeHour))
    && Number(record?.timeHour) >= 0
    && Number(record?.timeHour) <= 12
    && getRecordDate(record) !== '日期未记录');

const prepareImportedRecord = (record) => {
    if (!isPlainObject(record)) return null;
    const id = toDisplayText(record.id);
    const name = toDisplayText(record.name);
    if (!id || !name) return null;

    const timeHour = Number(record.timeHour);
    const importedType = toDisplayText(record.type, 'unknown');
    const importedGroup = toDisplayText(record.group, 'ungrouped');
    return {
        ...record,
        id,
        name,
        type: hasOwn(TYPE_LABELS, importedType) ? importedType : 'unknown',
        group: hasOwn(GROUP_META, importedGroup) ? importedGroup : 'other',
        note: toDisplayText(record.note),
        gender: ['male', 'female'].includes(record.gender) ? record.gender : undefined,
        calendarType: ['solar', 'lunar'].includes(record.calendarType) ? record.calendarType : undefined,
        birthDate: toDisplayText(record.birthDate),
        solarDate: toDisplayText(record.solarDate),
        timeHour: Number.isInteger(timeHour) && timeHour >= 0 && timeHour <= 12 ? timeHour : undefined,
        data: isPlainObject(record.data) ? record.data : {},
        createdAt: Number.isFinite(Number(record.createdAt)) ? Number(record.createdAt) : Date.now(),
        updatedAt: Number.isFinite(Number(record.updatedAt)) ? Number(record.updatedAt) : Date.now(),
    };
};

const getRecordTime = (record) => {
    if (record?.timeHour == null || record.timeHour === '') return '时辰未记录';
    const value = Number(record?.timeHour);
    const label = Number.isInteger(value) && TIME_LABELS[value] ? TIME_LABELS[value] : '';
    // 八字精确到分钟的命盘：显示钟表时间，时辰是按真太阳时换算的结果。
    const exactClock = record?.type === 'bazi' && record?.data?.timeMode === 'exact' && parseClockTime(record.data.clockTime);
    if (exactClock && label) return `${record.data.clockTime} ${label}`;
    return label || '时辰未记录';
};

export default function ArchiveView({ onBack, onLoadRecord }) {
    const [records, setRecords] = useState([]);
    const [activeGroup, setActiveGroup] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [pendingDeleteId, setPendingDeleteId] = useState(null);
    const [notice, setNotice] = useState(null);

    useEffect(() => {
        const refreshRecords = () => setRecords(archiveManager.getRecords());
        refreshRecords();
        window.addEventListener('archive-updated', refreshRecords);
        return () => window.removeEventListener('archive-updated', refreshRecords);
    }, []);

    const groupCounts = useMemo(() => records.reduce((counts, record) => {
        const groupId = getGroupId(record);
        counts[groupId] = (counts[groupId] ?? 0) + 1;
        return counts;
    }, {}), [records]);

    const groupOptions = useMemo(() => {
        const presentGroups = Object.keys(groupCounts);
        const orderedGroups = [
            ...GROUP_ORDER.filter((groupId) => presentGroups.includes(groupId)),
            ...presentGroups.filter((groupId) => !GROUP_ORDER.includes(groupId)).sort(),
        ];
        return [
            { id: 'all', label: '全部', icon: Archive, count: records.length },
            ...orderedGroups.map((groupId) => ({
                id: groupId,
                ...getGroupMeta(groupId),
                count: groupCounts[groupId],
            })),
        ];
    }, [groupCounts, records.length]);

    const resolvedActiveGroup = activeGroup === 'all' || groupCounts[activeGroup]
        ? activeGroup
        : 'all';

    const filteredRecords = useMemo(() => {
        const query = searchQuery.trim().toLocaleLowerCase('zh-CN');
        return records.filter((record) => {
            const matchesGroup = resolvedActiveGroup === 'all' || getGroupId(record) === resolvedActiveGroup;
            const searchableText = [
                toDisplayText(record?.name),
                toDisplayText(record?.note),
                getRecordDate(record),
                getRecordType(record),
                getCalendarLabel(record),
                getRecordTime(record),
                getGroupMeta(getGroupId(record)).label,
            ].filter(Boolean).join(' ').toLocaleLowerCase('zh-CN');
            return matchesGroup && (!query || searchableText.includes(query));
        });
    }, [records, resolvedActiveGroup, searchQuery]);

    const groupedRecords = useMemo(() => {
        if (resolvedActiveGroup !== 'all') {
            return filteredRecords.length > 0
                ? [{ id: resolvedActiveGroup, ...getGroupMeta(resolvedActiveGroup), records: filteredRecords }]
                : [];
        }

        const recordsByGroup = filteredRecords.reduce((groups, record) => {
            const groupId = getGroupId(record);
            if (!groups.has(groupId)) groups.set(groupId, []);
            groups.get(groupId).push(record);
            return groups;
        }, new Map());

        const orderedIds = [
            ...GROUP_ORDER.filter((groupId) => recordsByGroup.has(groupId)),
            ...Array.from(recordsByGroup.keys()).filter((groupId) => !GROUP_ORDER.includes(groupId)).sort(),
        ];
        return orderedIds.map((groupId) => ({
            id: groupId,
            ...getGroupMeta(groupId),
            records: recordsByGroup.get(groupId),
        }));
    }, [resolvedActiveGroup, filteredRecords]);

    const confirmDelete = (record) => {
        const deleted = archiveManager.deleteRecord(record.id);
        if (!deleted) {
            setNotice({ type: 'error', message: '删除失败，请检查浏览器存储空间后重试。' });
            return;
        }
        setRecords(archiveManager.getRecords());
        setPendingDeleteId(null);
        setNotice({ type: 'success', message: `“${record.name || '未命名'}”已从档案中删除。` });
    };

    const handleBackup = () => {
        archiveManager.exportData();
        setNotice({ type: 'success', message: `已下载 ${records.length} 条档案的 JSON 备份。` });
    };

    const handleImport = (event) => {
        const file = event.currentTarget.files?.[0];
        event.currentTarget.value = '';
        if (!file) return;
        if (file.size > MAX_IMPORT_BYTES) {
            setNotice({ type: 'error', message: '备份文件超过 2MB，为保护本机档案未执行导入。' });
            return;
        }

        setNotice({ type: 'info', message: `正在读取“${file.name}”…` });
        const reader = new FileReader();
        reader.onload = ({ target }) => {
            try {
                const parsed = JSON.parse(String(target?.result ?? ''));
                if (!Array.isArray(parsed)) throw new Error('备份根节点不是数组');

                const existingIds = new Set(archiveManager.getRecords().map((record) => toDisplayText(record?.id)).filter(Boolean));
                const prepared = parsed.map(prepareImportedRecord);
                const valid = prepared.filter(Boolean);
                const fresh = valid.filter((record) => !existingIds.has(record.id));
                const invalidCount = prepared.length - valid.length;
                const conflictCount = valid.length - fresh.length;

                if (fresh.length === 0) {
                    setNotice({
                        type: 'info',
                        message: conflictCount > 0
                            ? `未新增档案：${conflictCount} 条同 ID 档案已保留本机版本${invalidCount ? `，另跳过 ${invalidCount} 条无效记录` : ''}。`
                            : '备份中没有可导入的有效档案。',
                    });
                    return;
                }

                const result = archiveManager.importData(JSON.stringify(fresh));
                if (!result.success) throw new Error(result.error || '写入失败');
                setRecords(archiveManager.getRecords());
                setPendingDeleteId(null);
                setNotice({
                    type: 'success',
                    message: `新增 ${fresh.length} 条档案${conflictCount ? `，保留 ${conflictCount} 条本机同 ID 档案` : ''}${invalidCount ? `，跳过 ${invalidCount} 条无效记录` : ''}。`,
                });
            } catch {
                setNotice({ type: 'error', message: '导入失败：请选择由本页面导出的 JSON 备份文件。' });
            }
        };
        reader.onerror = () => {
            setNotice({ type: 'error', message: '文件读取失败，请重新选择备份文件。' });
        };
        reader.readAsText(file);
    };

    const clearFilters = () => {
        setActiveGroup('all');
        setSearchQuery('');
    };

    return (
        <div className="relative flex h-full flex-1 flex-col overflow-hidden bg-[#090806] text-stone-100 animate-in fade-in duration-300">
            <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
                <div className="absolute -right-28 -top-24 size-72 rounded-full bg-[#245f58]/10 blur-3xl" />
                <div className="absolute -bottom-32 -left-20 size-72 rounded-full bg-[#8f352d]/10 blur-3xl" />
            </div>

            <header
                className="relative z-10 flex shrink-0 items-center gap-3 border-b border-[#d8cbae]/10 bg-[#0d0b09]/90 px-3 pb-3 backdrop-blur-xl sm:px-4"
                style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}
            >
                <button
                    type="button"
                    onClick={onBack}
                    aria-label="返回首页"
                    className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full text-[#d5b876] transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#61a69c]"
                >
                    <ArrowLeft className="size-5" aria-hidden="true" />
                </button>
                <div className="flex min-w-0 items-center gap-2.5">
                    <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg border border-[#9f3c32]/50 bg-[#782a25]/30 font-serif text-sm font-bold text-[#e0aaa3]" aria-hidden="true">藏</span>
                    <div className="min-w-0">
                        <h1 className="truncate text-lg font-bold tracking-[0.14em]">命盘档案</h1>
                        <p className="text-[10px] tracking-[0.18em] text-stone-500">本机保存 · 随时调阅</p>
                    </div>
                </div>
            </header>

            <main className="relative z-10 flex-1 overflow-y-auto px-3 py-4 sm:px-4 sm:py-6">
                <div className="mx-auto max-w-4xl space-y-4">
                    <section className="overflow-hidden rounded-[24px] border border-[#d0c4b2] bg-[#f2eadc] text-[#302a25] shadow-2xl shadow-black/25" aria-labelledby="archive-summary-title">
                        <div className="flex flex-col gap-4 border-b border-[#cabda8]/80 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                            <div>
                                <p className="text-[10px] font-semibold tracking-[0.2em] text-[#927f68]">本机档案库</p>
                                <h2 id="archive-summary-title" className="mt-1 font-serif text-2xl font-bold text-[#2e2924]">
                                    共 {records.length} 条命盘
                                </h2>
                                <p className="mt-1 text-xs leading-5 text-[#786e63]">
                                    {Object.keys(groupCounts).length > 0 ? `已整理为 ${Object.keys(groupCounts).length} 个分组` : '保存命盘后，会自动汇集在这里'}
                                </p>
                            </div>
                            <div className="grid grid-cols-2 gap-2 sm:flex">
                                <label className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border border-[#82745f] bg-[#fffaf0]/70 px-3 text-sm font-bold text-[#5c544a] transition-colors hover:bg-[#fffaf0] focus-within:ring-2 focus-within:ring-[#2d6b62]">
                                    <Upload className="size-4 text-[#2d6b62]" aria-hidden="true" />
                                    导入档案
                                    <input type="file" accept="application/json,.json" onChange={handleImport} className="sr-only" />
                                </label>
                                <button
                                    type="button"
                                    onClick={handleBackup}
                                    disabled={records.length === 0}
                                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#2d6b62] px-3 text-sm font-bold text-white transition-colors hover:bg-[#245950] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#70b2a8] disabled:cursor-not-allowed disabled:bg-[#9a9488]"
                                >
                                    <Download className="size-4" aria-hidden="true" />
                                    下载备份
                                </button>
                            </div>
                        </div>

                        <p className="border-b border-[#cabda8]/70 px-4 py-2 text-[10px] leading-5 text-[#81776b] sm:px-6">
                            JSON 备份包含姓名与出生资料，文件未加密，请保存到可信设备。
                        </p>

                        {notice && (
                            <div
                                role={notice.type === 'error' ? 'alert' : 'status'}
                                aria-live="polite"
                                className={`mx-4 mt-4 flex items-start gap-2 rounded-xl border px-3 py-2.5 text-xs leading-5 sm:mx-6 ${notice.type === 'error'
                                    ? 'border-[#a33b30]/35 bg-[#a33b30]/[0.07] text-[#87342d]'
                                    : notice.type === 'info'
                                        ? 'border-[#9b8252]/35 bg-[#c9a85c]/[0.09] text-[#765e2d]'
                                        : 'border-[#2d6b62]/35 bg-[#2d6b62]/[0.07] text-[#245a52]'
                                }`}
                            >
                                {notice.type === 'error'
                                    ? <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                                    : <CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden="true" />}
                                <span className="flex-1">{notice.message}</span>
                                <button type="button" onClick={() => setNotice(null)} aria-label="关闭提示" className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg hover:bg-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2d6b62]">
                                    <X className="size-3.5" aria-hidden="true" />
                                </button>
                            </div>
                        )}

                        <div className="space-y-3 px-4 py-4 sm:px-6">
                            <div className="relative">
                                <label htmlFor="archive-search" className="sr-only">搜索姓名、备注、日期或类型</label>
                                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#81776b]" aria-hidden="true" />
                                <input
                                    id="archive-search"
                                    type="search"
                                    value={searchQuery}
                                    onChange={(event) => setSearchQuery(event.target.value)}
                                    placeholder="搜索姓名、备注、日期或类型"
                                    className="min-h-11 w-full rounded-xl border border-[#b9ad98] bg-[#fffaf0]/75 py-2 pl-10 pr-4 text-sm text-[#302a25] outline-none placeholder:text-[#9d9386] focus:border-[#2d6b62] focus:ring-2 focus:ring-[#2d6b62]/15"
                                />
                            </div>

                            <div className="-mx-1 overflow-x-auto px-1 pb-1">
                                <div className="flex w-max min-w-full gap-2" role="group" aria-label="档案分组筛选">
                                    {groupOptions.map((group) => {
                                        const Icon = group.icon;
                                        const isActive = resolvedActiveGroup === group.id;
                                        return (
                                            <button
                                                key={group.id}
                                                type="button"
                                                onClick={() => setActiveGroup(group.id)}
                                                aria-pressed={isActive}
                                                className={`inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full border px-3 text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2d6b62] ${isActive
                                                    ? 'border-[#2d6b62] bg-[#2d6b62] text-white'
                                                    : 'border-[#b9ad98] bg-[#fffaf0]/65 text-[#6f665d] hover:border-[#81735f]'
                                                }`}
                                            >
                                                <Icon className="size-3.5" aria-hidden="true" />
                                                {group.label}
                                                <span className={`tabular-nums ${isActive ? 'text-white/75' : 'text-[#9a8f82]'}`}>{group.count}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            <p className="text-[11px] text-[#81776b]" aria-live="polite">
                                当前显示 {filteredRecords.length} 条{records.length !== filteredRecords.length ? `，档案库共 ${records.length} 条` : ''}
                            </p>
                        </div>
                    </section>

                    {filteredRecords.length === 0 ? (
                        <section className="rounded-[24px] border border-[#d0c4b2] bg-[#f2eadc] px-5 py-12 text-center text-[#302a25] shadow-xl shadow-black/20" aria-label="档案空状态">
                            <span className="mx-auto inline-flex size-14 items-center justify-center rounded-2xl border border-[#b9ad98] bg-[#fffaf0]/70 text-[#2d6b62]">
                                <Archive className="size-7" aria-hidden="true" />
                            </span>
                            <h2 className="mt-4 font-serif text-xl font-bold">
                                {records.length === 0 ? '还没有保存命盘' : '没有找到符合条件的档案'}
                            </h2>
                            <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-[#756d63]">
                                {records.length === 0
                                    ? '完成紫微排盘后点击保存，命主资料会保留在本机档案库中。'
                                    : '可以更换分组或搜索词，再查看其他档案。'}
                            </p>
                            <button type="button" onClick={records.length === 0 ? onBack : clearFilters} className="mt-4 min-h-11 rounded-xl bg-[#2d6b62] px-4 text-sm font-bold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#70b2a8]">
                                {records.length === 0 ? '返回首页开始排盘' : '清除筛选'}
                            </button>
                        </section>
                    ) : (
                        <div className="space-y-5">
                            {groupedRecords.map((group) => {
                                const GroupIcon = group.icon;
                                const groupHeadingId = `archive-group-${GROUP_ORDER.indexOf(group.id)}`;
                                return (
                                    <section key={group.id} aria-labelledby={groupHeadingId}>
                                        <div className="mb-2 flex items-center justify-between px-1">
                                            <h2 id={groupHeadingId} className="flex items-center gap-2 text-sm font-bold tracking-[0.1em] text-[#d8c9aa]">
                                                <GroupIcon className="size-4 text-[#64a69d]" aria-hidden="true" />
                                                {group.label}
                                            </h2>
                                            <span className="text-xs tabular-nums text-stone-500">{group.records.length} 条</span>
                                        </div>

                                        <div className="space-y-2.5">
                                            {group.records.map((record) => {
                                                const isConfirmingDelete = pendingDeleteId === record.id;
                                                const groupMeta = getGroupMeta(getGroupId(record));
                                                const recordName = toDisplayText(record.name, '未命名');
                                                const recordNote = toDisplayText(record.note);
                                                const isOpenable = canOpenRecord(record);
                                                return (
                                                    <article key={record.id} className="overflow-hidden rounded-2xl border border-[#d0c4b2] bg-[#f2eadc] text-[#302a25] shadow-lg shadow-black/15">
                                                        <div className="flex items-stretch">
                                                            <button
                                                                type="button"
                                                                onClick={() => isOpenable && onLoadRecord?.(record)}
                                                                disabled={!isOpenable}
                                                                className="group min-h-[5.5rem] min-w-0 flex-1 px-4 py-3 text-left transition-colors hover:bg-[#fffaf0]/55 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#2d6b62] disabled:cursor-not-allowed disabled:hover:bg-transparent"
                                                                aria-label={isOpenable ? `打开${recordName}的${getRecordType(record)}命盘` : `${recordName}的${getRecordType(record)}暂不支持打开或资料不完整`}
                                                            >
                                                                <div className="flex items-start gap-3">
                                                                    <span className={`mt-0.5 inline-flex size-10 shrink-0 items-center justify-center rounded-xl border font-serif text-base font-bold ${record.gender === 'female'
                                                                        ? 'border-[#a33b30]/35 bg-[#a33b30]/[0.06] text-[#96372e]'
                                                                        : record.gender === 'male'
                                                                            ? 'border-[#2d6b62]/35 bg-[#2d6b62]/[0.07] text-[#2d6b62]'
                                                                            : 'border-[#b9ad98] bg-[#e9dfcd] text-[#756d63]'
                                                                    }`} aria-hidden="true">
                                                                        {recordName.slice(0, 1)}
                                                                    </span>
                                                                    <span className="min-w-0 flex-1">
                                                                        <span className="flex items-center gap-2">
                                                                            <strong className="truncate text-base font-bold text-[#302a25] sm:text-lg">{recordName}</strong>
                                                                            <span className="shrink-0 rounded-full border border-[#b9ad98] bg-[#fffaf0]/65 px-2 py-0.5 text-[9px] font-bold text-[#756d63]">{groupMeta.label}</span>
                                                                        </span>
                                                                        <span className="mt-1 block text-[11px] leading-5 text-[#756d63] sm:text-xs">
                                                                            {[getRecordType(record), getGenderLabel(record), `${getCalendarLabel(record)} ${getRecordDate(record)}`, getRecordTime(record)].map((part, index) => (
                                                                                <React.Fragment key={index}>{index > 0 && ' · '}<span className="whitespace-nowrap">{part}</span></React.Fragment>
                                                                            ))}
                                                                        </span>
                                                                        {recordNote && <span className="mt-1 block truncate text-[11px] text-[#8c8174]">备注：{recordNote}</span>}
                                                                    </span>
                                                                    <span className="mt-3 inline-flex shrink-0 items-center gap-1 text-[10px] font-bold text-[#2d6b62] sm:text-xs">
                                                                        {isOpenable ? '排盘' : '暂不可开'} {isOpenable && <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />}
                                                                    </span>
                                                                </div>
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => setPendingDeleteId(isConfirmingDelete ? null : record.id)}
                                                                aria-expanded={isConfirmingDelete}
                                                                aria-controls={`delete-confirm-${record.id}`}
                                                                aria-label={isConfirmingDelete ? `取消删除${recordName}` : `删除${recordName}`}
                                                                className={`inline-flex min-h-11 w-12 shrink-0 items-center justify-center border-l border-[#d0c4b2] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#a33b30] ${isConfirmingDelete
                                                                    ? 'bg-[#a33b30]/10 text-[#96372e]'
                                                                    : 'text-[#9a8f82] hover:bg-[#a33b30]/[0.06] hover:text-[#96372e]'
                                                                }`}
                                                            >
                                                                <Trash2 className="size-4" aria-hidden="true" />
                                                            </button>
                                                        </div>

                                                        {isConfirmingDelete && (
                                                            <div id={`delete-confirm-${record.id}`} className="flex flex-col gap-3 border-t border-[#a33b30]/20 bg-[#a33b30]/[0.055] px-4 py-3 sm:flex-row sm:items-center sm:justify-between" role="group" aria-label={`确认删除${recordName}`}>
                                                                <div>
                                                                    <p className="text-sm font-bold text-[#87342d]">确定删除“{recordName}”吗？</p>
                                                                    <p className="mt-0.5 text-[11px] text-[#8a655f]">删除后无法恢复，建议先下载备份。</p>
                                                                </div>
                                                                <div className="grid grid-cols-2 gap-2 sm:flex">
                                                                    <button type="button" onClick={() => setPendingDeleteId(null)} className="min-h-11 rounded-lg border border-[#b9ad98] bg-[#fffaf0]/65 px-4 text-xs font-bold text-[#655d54] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2d6b62]">取消</button>
                                                                    <button type="button" onClick={() => confirmDelete(record)} className="min-h-11 rounded-lg bg-[#96372e] px-4 text-xs font-bold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d1847b]">确认删除</button>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </article>
                                                );
                                            })}
                                        </div>
                                    </section>
                                );
                            })}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
