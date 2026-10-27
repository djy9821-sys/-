/** 订阅「所在地」设置：返回当前设置，本页或别的标签页改动后自动更新。 */
import { useEffect, useState } from 'react';
import { CURRENT_PLACE_EVENT, readCurrentPlace } from '../../utils/currentPlace';

export const useCurrentPlace = () => {
    const [place, setPlace] = useState(() => readCurrentPlace());
    useEffect(() => {
        const refresh = () => setPlace(readCurrentPlace());
        window.addEventListener(CURRENT_PLACE_EVENT, refresh);
        window.addEventListener('storage', refresh);
        return () => {
            window.removeEventListener(CURRENT_PLACE_EVENT, refresh);
            window.removeEventListener('storage', refresh);
        };
    }, []);
    return place;
};
