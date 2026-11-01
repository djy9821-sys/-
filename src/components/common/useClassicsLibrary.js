/**
 * 古籍库与术语词典的加载钩子：按模块分块下载，下载过的各处共用。
 * 单独成文件：组件文件只导出组件，React Fast Refresh 才能整文件热更新。
 */
import { useEffect, useState } from 'react';
import { loadClassicsLibrary, loadGlossary } from '../../data/classics/index.js';

/**
 * 某个模块的古籍库与词典：{ data: { library, glossary } | null, error }。
 * @param {'bazi'|'ziwei'|'liuyao'|null} module 只下这个模块的古籍（null 为全部）
 * @param {{ enabled?: boolean }} [options] enabled 为假时先不加载（比如还没排出盘）
 */
export const useClassicsLibrary = (module = null, { enabled = true } = {}) => {
    const [state, setState] = useState({ module: undefined, data: null, error: null });
    useEffect(() => {
        if (!enabled) return undefined;
        let alive = true;
        loadClassicsLibrary(module)
            .then((data) => { if (alive) setState({ module, data, error: null }); })
            .catch((error) => {
                console.error('古籍库加载失败:', error);
                if (alive) setState({ module, data: null, error });
            });
        return () => { alive = false; };
    }, [module, enabled]);
    // 换了模块时，上一个模块的结果不再算数。
    return state.module === module ? { data: state.data, error: state.error } : { data: null, error: null };
};

/** 只要术语词典（不下古籍原文）：{ glossary, error }。 */
export const useGlossary = (enabled = true) => {
    const [state, setState] = useState({ glossary: null, error: null });
    useEffect(() => {
        if (!enabled) return undefined;
        let alive = true;
        loadGlossary()
            .then((glossary) => { if (alive) setState({ glossary, error: null }); })
            .catch((error) => {
                console.error('术语词典加载失败:', error);
                if (alive) setState({ glossary: null, error });
            });
        return () => { alive = false; };
    }, [enabled]);
    return state;
};
