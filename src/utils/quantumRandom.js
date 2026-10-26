/**
 * Fetches true random numbers from the ANU Quantum Random Numbers Server.
 * @param {number} count - The number of random items needed (e.g., 3 for 3 coins).
 * @returns {Promise<boolean[]>} - An array of booleans (true for Heads/Yang, false for Tails/Yin).
 */
// 量子随机数服务在国外，国内常常连不上或很慢；失败一次后本次访问不再请求，
// 直接用浏览器的加密级随机数，避免每次摇卦都等几秒。
let remoteUnavailable = false;

const secureRandomBooleans = (count) => {
    const values = new Uint8Array(count);
    if (globalThis.crypto?.getRandomValues) {
        globalThis.crypto.getRandomValues(values);
        return Array.from(values, (value) => value % 2 === 0);
    }
    return Array(count).fill(0).map(() => Math.random() > 0.5);
};

export async function fetchQuantumUtils(count = 3) {
    if (remoteUnavailable) return secureRandomBooleans(count);
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2000); // 2s timeout

        const response = await fetch(`https://qrng.anu.edu.au/API/jsonI.php?length=${count}&type=uint8`, {
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            throw new Error(`API Error: ${response.status}`);
        }

        const data = await response.json();

        if (data && data.success && Array.isArray(data.data)) {
            // Convert uint8 to boolean (even = true/Heads, odd = false/Tails) 
            // This is arbitrary but valid for distribution
            return data.data.slice(0, count).map(num => num % 2 === 0);
        } else {
            throw new Error('Invalid data structure');
        }

    } catch (error) {
        remoteUnavailable = true;
        console.warn('Quantum Randomness failed, falling back to crypto random:', error);
        return secureRandomBooleans(count);
    }
}
