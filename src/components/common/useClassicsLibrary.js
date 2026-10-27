/**
 * 古籍库只加载一次，各处面板与提示词共用；enabled 为假时先不加载（比如还没排出盘）。
 * 单独成文件：组件文件只导出组件，React Fast Refresh 才能整文件热更新。
 */
import { useEffect, useState } from 'react';
import { loadClassicsLibrary } from '../../data/classics/index.js';

export const useClassicsLibrary = (enabled = true) => {
    const [data, setData] = useState(null);
    const [error, setError] = useState(null);
    useEffect(() => {
        if (!enabled) return undefined;
        let alive = true;
        loadClassicsLibrary()
            .then((loaded) => { if (alive) setData(loaded); })
            .catch((loadError) => {
                console.error('古籍库加载失败:', loadError);
                if (alive) setError(loadError);
            });
        return () => { alive = false; };
    }, [enabled]);
    return { data, error };
};
