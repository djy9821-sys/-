/**
 * 「国家／省份」下拉框里的选项：海外的几组排在前面，中国各省在后。
 * 八字出生地、紫微出生地、「所在地」设置三处共用，免得排法各不一样。
 */
import React from 'react';
import { BIRTH_PROVINCES, OVERSEAS_PROVINCES } from '../../utils/birthPlaces';

const OVERSEAS_GROUPS = OVERSEAS_PROVINCES.map((name) => BIRTH_PROVINCES.find((item) => item.province === name)).filter(Boolean);
const DOMESTIC_GROUPS = BIRTH_PROVINCES.filter((item) => !OVERSEAS_PROVINCES.includes(item.province));

const renderOption = (item) => <option key={item.province} value={item.province}>{item.province}</option>;

export default function PlaceProvinceOptions() {
    return (
        <>
            <optgroup label="海外">{OVERSEAS_GROUPS.map(renderOption)}</optgroup>
            <optgroup label="中国">{DOMESTIC_GROUPS.map(renderOption)}</optgroup>
        </>
    );
}
