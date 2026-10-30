/**
 * 所在地设置：此刻按哪里的真太阳时算时辰。
 * 一行说明 + 「用当前定位」+ 可展开的省市/经度/时区表单；设置保存在本机，改动后广播给各页面。
 * 定位只在本机用来取经度，时区跟设备走；不上传、不保存坐标。
 */
import React, { useState } from 'react';
import { LocateFixed, MapPin } from 'lucide-react';
import { BIRTH_PROVINCES, findBirthPlace, TIMEZONE_OPTIONS } from '../../utils/birthPlaces';
import { clearCurrentPlace, describeCurrentPlace, locateCurrentPlace, placeDisplayName, saveCurrentPlace } from '../../utils/currentPlace';
import { track } from '../../utils/analytics';
import { useCurrentPlace } from './useCurrentPlace';

const TONES = {
    paper: {
        text: 'text-[#5f574f]',
        strong: 'text-[#3b342e]',
        link: 'text-[#2d6b62]',
        panel: 'border-[#cbbfac]/80 bg-[#fffaf0]/70',
        field: 'border-[#b9ad98] bg-[#fffaf0] text-[#3b342e] focus-visible:ring-[#2d6b62]',
        primary: 'bg-[#2d6b62] text-white hover:bg-[#245a52] focus-visible:ring-[#75b4aa]',
        secondary: 'border-[#9f917c] text-[#5f574f] hover:bg-[#2d6b62]/[0.06] focus-visible:ring-[#2d6b62]',
        notice: 'text-[#245a52]',
    },
    ink: {
        text: 'text-[#fbf7ed]/70',
        strong: 'text-[#fbf7ed]',
        link: 'text-[#55bba8]',
        panel: 'border-[#dcb471]/25 bg-white/[0.04]',
        field: 'border-[#dcb471]/30 bg-[#041819] text-[#fbf7ed] focus-visible:ring-[#55bba8]',
        primary: 'bg-[#2d6b62] text-white hover:bg-[#245a52] focus-visible:ring-[#75b4aa]',
        secondary: 'border-[#dcb471]/40 text-[#f0ce91] hover:bg-[#dcb471]/10 focus-visible:ring-[#55bba8]',
        notice: 'text-[#9fe0d2]',
    },
};

const LOCATE_ERRORS = {
    denied: '没有拿到定位授权：可以在手机设置里允许浏览器定位，或在下面手动选择城市、填写经度。',
    timeout: '定位超时，请到信号好些的地方再试，或手动填写。',
    unavailable: '这台设备暂时拿不到位置，请手动选择城市或填写经度。',
    unsupported: '这个浏览器不支持定位，请手动选择城市或填写经度。',
};

const timezoneLabel = (value) => `UTC${value >= 0 ? '+' : '−'}${Math.abs(value)}${value === 8 ? ' 北京时间' : ''}`;

export default function PlaceSetting({ tone = 'paper', now = new Date(), className = '', lead = '此刻' }) {
    const styles = TONES[tone] ?? TONES.paper;
    const place = useCurrentPlace();
    const [open, setOpen] = useState(false);
    const [province, setProvince] = useState(place?.province ?? '');
    const [city, setCity] = useState(place?.city ?? '');
    const [longitude, setLongitude] = useState(place ? String(place.longitude) : '');
    const [timezone, setTimezone] = useState(place?.timezone ?? 8);
    const [error, setError] = useState('');
    const [locating, setLocating] = useState(false);
    const [notice, setNotice] = useState('');
    const canLocate = typeof navigator !== 'undefined' && Boolean(navigator.geolocation);

    // 展开表单时才把已保存的设置填进输入框，避免在 effect 里同步改状态。
    const toggleOpen = () => {
        if (!open) {
            setProvince(place?.province ?? '');
            setCity(place?.city ?? '');
            setLongitude(place ? String(place.longitude) : '');
            setTimezone(place?.timezone ?? 8);
            setError('');
        }
        setNotice('');
        setOpen((value) => !value);
    };

    const cities = BIRTH_PROVINCES.find((item) => item.province === province)?.cities ?? [];
    const description = describeCurrentPlace(now, place);
    // 定位得到的时区可能不在常用列表里（如欧美），补一项让下拉框能显示。
    const timezoneOptions = TIMEZONE_OPTIONS.some((item) => item.value === timezone)
        ? TIMEZONE_OPTIONS
        : [...TIMEZONE_OPTIONS, { value: timezone, label: `${timezoneLabel(timezone)}（设备时区）` }].sort((a, b) => a.value - b.value);

    const changeProvince = (value) => {
        const options = BIRTH_PROVINCES.find((item) => item.province === value)?.cities ?? [];
        setProvince(value);
        const only = options.length === 1 ? options[0] : null;
        setCity(only?.name ?? '');
        setLongitude(only ? only.longitude.toFixed(2) : '');
        setTimezone(options[0]?.timezone ?? 8);
        setError('');
    };
    const changeCity = (value) => {
        const found = findBirthPlace(province, value);
        setCity(value);
        if (found) {
            setLongitude(found.longitude.toFixed(2));
            setTimezone(found.timezone);
        }
        setError('');
    };
    const submit = (event) => {
        event.preventDefault();
        const saved = saveCurrentPlace({ province, city, longitude: Number(longitude), timezone: Number(timezone) });
        if (!saved) {
            setError('请选择城市，或填写 -180 到 180 之间的经度。');
            return;
        }
        setError('');
        setOpen(false);
        setNotice('');
        // 只记时区，不记城市经度：足够看出海外用户的比例。
        track('place_set', { timezone: saved.timezone, has_city: Boolean(saved.city), source: 'manual' });
    };
    const reset = () => {
        clearCurrentPlace();
        setError('');
        setNotice('');
        setOpen(false);
        track('place_clear');
    };
    const locate = async () => {
        if (locating) return;
        setLocating(true);
        setError('');
        setNotice('');
        try {
            const located = await locateCurrentPlace(undefined, new Date());
            const saved = saveCurrentPlace(located);
            if (!saved) throw Object.assign(new Error('定位结果无效'), { code: 'unavailable' });
            setProvince('');
            setCity('');
            setLongitude(String(saved.longitude));
            setTimezone(saved.timezone);
            setOpen(false);
            setNotice(`已按当前定位设置：${placeDisplayName(saved)}，${timezoneLabel(saved.timezone)}。只保存经度与时区，不保存坐标。`);
            track('place_set', { timezone: saved.timezone, has_city: false, source: 'geo' });
        } catch (caught) {
            setError(LOCATE_ERRORS[caught?.code] ?? LOCATE_ERRORS.unavailable);
            setOpen(true);
            track('place_locate_failed', { reason: caught?.code ?? 'unknown' });
        } finally {
            setLocating(false);
        }
    };

    return (
        <div className={`text-xs leading-5 ${styles.text} ${className}`}>
            <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <MapPin className="size-3.5 shrink-0 opacity-70" aria-hidden="true" />
                <span>
                    {lead}{description.set ? description.detail : `按设备时间计算时辰。在国内以外的地方，或离东经 120° 较远时，设置所在地可按真太阳时定时辰`}
                </span>
                {canLocate && (
                    <button type="button" onClick={locate} disabled={locating} aria-busy={locating} className={`-my-1.5 inline-flex min-h-8 items-center gap-1 px-1 font-bold underline-offset-2 hover:underline disabled:opacity-60 ${styles.link}`}>
                        <LocateFixed className="size-3.5" aria-hidden="true" />{locating ? '定位中…' : '用当前定位'}
                    </button>
                )}
                <button type="button" onClick={toggleOpen} aria-expanded={open} className={`-my-1.5 inline-flex min-h-8 items-center px-1 font-bold underline-offset-2 hover:underline ${styles.link}`}>
                    {open ? '收起' : description.set ? '修改所在地' : '手动设置'}
                </button>
            </p>
            {notice && <p className={`mt-1 ${styles.notice}`} role="status">{notice}</p>}
            {error && !open && <p className="mt-1 text-[#c0392b]" role="alert">{error}</p>}
            {open && (
                <form onSubmit={submit} className={`mt-2 grid gap-2 rounded-xl border p-3 sm:grid-cols-2 ${styles.panel}`}>
                    {canLocate && (
                        <p className="sm:col-span-2">
                            <button type="button" onClick={locate} disabled={locating} aria-busy={locating} className={`inline-flex min-h-10 items-center gap-1.5 rounded-lg border px-3 text-sm font-bold focus-visible:outline-none focus-visible:ring-2 disabled:opacity-60 ${styles.secondary}`}>
                                <LocateFixed className="size-4" aria-hidden="true" />{locating ? '定位中…' : '用当前定位'}
                            </button>
                            <span className="ml-2 text-[11px]">人在国外时最方便：授权一次，经度与时区自动填好。</span>
                        </p>
                    )}
                    <label className="block">
                        <span className={`block text-[11px] ${styles.text}`}>省份 / 地区</span>
                        <select value={province} onChange={(event) => changeProvince(event.target.value)} className={`mt-1 min-h-10 w-full rounded-lg border px-2 text-sm focus-visible:outline-none focus-visible:ring-2 ${styles.field}`}>
                            <option value="">选择省份</option>
                            {BIRTH_PROVINCES.map((item) => <option key={item.province} value={item.province}>{item.province}</option>)}
                        </select>
                    </label>
                    <label className="block">
                        <span className={`block text-[11px] ${styles.text}`}>城市</span>
                        <select value={city} onChange={(event) => changeCity(event.target.value)} disabled={!cities.length} className={`mt-1 min-h-10 w-full rounded-lg border px-2 text-sm focus-visible:outline-none focus-visible:ring-2 disabled:opacity-50 ${styles.field}`}>
                            <option value="">选择城市</option>
                            {cities.map((item) => <option key={item.name} value={item.name}>{item.name}</option>)}
                        </select>
                    </label>
                    <label className="block">
                        <span className={`block text-[11px] ${styles.text}`}>经度（°E，可微调；西经填负数）</span>
                        <input type="text" inputMode="decimal" value={longitude} onChange={(event) => { setLongitude(event.target.value); setError(''); }} placeholder="例如 106.70" className={`mt-1 min-h-10 w-full rounded-lg border px-2 text-sm tabular-nums focus-visible:outline-none focus-visible:ring-2 ${styles.field}`} />
                    </label>
                    <label className="block">
                        <span className={`block text-[11px] ${styles.text}`}>时区</span>
                        <select value={timezone} onChange={(event) => setTimezone(Number(event.target.value))} className={`mt-1 min-h-10 w-full rounded-lg border px-2 text-sm focus-visible:outline-none focus-visible:ring-2 ${styles.field}`}>
                            {timezoneOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                        </select>
                    </label>
                    {error && <p className="text-[11px] text-[#c0392b] sm:col-span-2" role="alert">{error}</p>}
                    <div className="flex flex-wrap gap-2 sm:col-span-2">
                        <button type="submit" className={`inline-flex min-h-10 items-center rounded-lg px-4 text-sm font-bold focus-visible:outline-none focus-visible:ring-2 ${styles.primary}`}>保存</button>
                        {place && <button type="button" onClick={reset} className={`inline-flex min-h-10 items-center rounded-lg border px-3 text-sm font-bold focus-visible:outline-none focus-visible:ring-2 ${styles.secondary}`}>改回设备时间</button>}
                        <button type="button" onClick={() => setOpen(false)} className={`inline-flex min-h-10 items-center rounded-lg border px-3 text-sm font-bold focus-visible:outline-none focus-visible:ring-2 ${styles.secondary}`}>取消</button>
                    </div>
                    <p className={`text-[11px] sm:col-span-2 ${styles.text}`}>只影响“此刻”“今天”的时辰判断，不改变已排的命盘。设置只保存在这台设备上；定位只用来换算经度，不上传、不保存坐标。</p>
                </form>
            )}
        </div>
    );
}
