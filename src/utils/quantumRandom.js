/**
 * 起卦用的随机数。
 *
 * 以前从澳大利亚国立大学的量子随机数接口（qrng.anu.edu.au）取数，但这个旧接口已经停止响应，
 * 每次请求都要等到超时（约 3 秒）才退回本地随机，摇卦和握拳起卦都会明显卡顿。
 * 现在直接用浏览器的加密级随机数（crypto.getRandomValues），同样不可预测，且立即返回。
 *
 * @param {number} count 需要几枚铜钱（例如 3 枚生一爻）
 * @returns {Promise<boolean[]>} true 表示字面（阳），false 表示背面（阴）
 */
export async function fetchQuantumUtils(count = 3) {
    const values = new Uint8Array(count);
    if (globalThis.crypto?.getRandomValues) {
        globalThis.crypto.getRandomValues(values);
        return Array.from(values, (value) => value % 2 === 0);
    }
    return Array.from({ length: count }, () => Math.random() > 0.5);
}
