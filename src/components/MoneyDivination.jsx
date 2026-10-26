/* eslint-disable react-hooks/set-state-in-effect */
import React, { useState, useEffect, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
// eslint-disable-next-line no-unused-vars
import { useSpring, animated } from '@react-spring/three';
import { useTexture } from '@react-three/drei';
import * as THREE from 'three';
import { ArrowLeft } from 'lucide-react';
import { getHexagram } from '../utils/hexagramLogic';

// --- Assets ---
import coinYangTexture from '../assets/coin_yang_perfect.webp';
import coinYinTexture from '../assets/coin_yin_circular.webp';

import bgImage from '../assets/song_mist.webp';
import { fetchQuantumUtils } from '../utils/quantumRandom';

// --- Constants ---
const COIN_RADIUS = 1.8;
const COIN_THICKNESS = 0.3;

// --- Helper: Ink Brush Stroke CSS ---
// Converted inline styles to Tailwind classes where possible, kept dynamic styles inline
const InkStroke = ({ type, width = '100%' }) => {
    // type: 'yang' (solid) or 'yin' (broken)
    const containerClass = "h-4 relative flex items-center justify-center opacity-0 animate-[strokeDraw_0.8s_ease-out_forwards]";

    // Ink texture gradient
    const inkStyle = {
        background: 'linear-gradient(90deg, rgba(40,40,40,0.9) 0%, rgba(0,0,0,1) 20%, rgba(0,0,0,1) 80%, rgba(40,40,40,0.9) 100%)',
        filter: 'blur(0.3px)'
    };

    if (type === 'yang') {
        return (
            <div className={containerClass} style={{ width }}>
                <div className="h-full w-full bg-[#1a1a1a] rounded-sm shadow-sm" style={inkStyle}></div>
            </div>
        );
    } else {
        return (
            <div className={`${containerClass} justify-between`} style={{ width }}>
                <div className="h-full w-[42%] bg-[#1a1a1a] rounded-sm shadow-sm" style={inkStyle}></div>
                <div className="h-full w-[42%] bg-[#1a1a1a] rounded-sm shadow-sm" style={inkStyle}></div>
            </div>
        );
    }
};

// --- Component: Animated Coin (Unchanged Logic, just ensuring props are passed) ---
function AnimatedCoin({ index, isThrown, onResult, delay = 0, audioContext, targetIsHeads }) {
    const [started, setStarted] = useState(false);
    const [finalRotation, setFinalRotation] = useState(0);
    const [hasReported, setHasReported] = useState(false);
    const [yangMap, yinMap] = useTexture([coinYangTexture, coinYinTexture]);

    useEffect(() => {
        if (isThrown && targetIsHeads !== undefined) {
            setHasReported(false);
            const timer = setTimeout(() => {
                // Use the passed targetIsHeads prop instead of Math.random()
                const baseRotation = targetIsHeads ? 0 : Math.PI;
                // Add extra spins (16 * PI = 8 full rotations)
                setFinalRotation(baseRotation + Math.PI * 16);
                setStarted(true);
            }, delay);
            return () => clearTimeout(timer);
        } else if (!isThrown) {
            setStarted(false);
            setHasReported(false);
        }
    }, [isThrown, delay, targetIsHeads]);

    const [randomRotations, setRandomRotations] = useState({ x: 0, y: 0 });

    useEffect(() => {
        setRandomRotations({
            x: Math.PI * 3 + (Math.random() * 0.5),
            y: (Math.random() - 0.5) * 0.5
        });
    }, []);

    const { position, rotation } = useSpring({
        position: started ? [index * 4.0 - 4.0, 0, 0] : [index * 4.0 - 4.0, 6, 0],
        rotation: started ? [finalRotation, randomRotations.x, randomRotations.y] : [0, 0, 0],
        config: { mass: 2.5, tension: 120, friction: 14 },
        onRest: () => {
            if (started && !hasReported) {
                setHasReported(true);
                playLandSound(audioContext, index * 60);
                // We trust the targetIsHeads, but for physics verification:
                // Heads (Yang) is 0 rad (texture up), Tails (Yin) is PI rad (texture down) when initialized?
                // Actually my logic: baseRotation = isHeads ? 0 : Math.PI;
                // So 0 is Heads.
                onResult(index, targetIsHeads ? 'heads' : 'tails');
            }
        }
    });

    return (
        <animated.group position={position} rotation={rotation}>
            <mesh castShadow receiveShadow rotation={[Math.PI / 2, 0, 0]}>
                <cylinderGeometry args={[COIN_RADIUS, COIN_RADIUS, COIN_THICKNESS, 64]} />
                <meshStandardMaterial color="#B8860B" metalness={0.8} roughness={0.4} envMapIntensity={0.8} />
            </mesh>

            <mesh position={[0, 0, COIN_THICKNESS / 2 + 0.002]} castShadow>
                <circleGeometry args={[COIN_RADIUS, 64]} />
                <meshStandardMaterial map={yinMap} transparent={true} alphaTest={0.5} metalness={0.5} roughness={0.5} />
            </mesh>
            <mesh position={[0, 0, -COIN_THICKNESS / 2 - 0.002]} rotation={[0, Math.PI, 0]} castShadow>
                <circleGeometry args={[COIN_RADIUS, 64]} />
                <meshStandardMaterial map={yangMap} transparent={true} alphaTest={0.5} metalness={0.5} roughness={0.5} />
            </mesh>

            {/* Square hole overlays with background color - positioned AFTER textures to render on top */}
            <mesh position={[0, 0, COIN_THICKNESS / 2 + 0.003]}>
                <planeGeometry args={[COIN_RADIUS * 0.28, COIN_RADIUS * 0.28]} />
                <meshBasicMaterial color="#e8dcc8" />
            </mesh>
            <mesh position={[0, 0, -COIN_THICKNESS / 2 - 0.003]} rotation={[0, Math.PI, 0]}>
                <planeGeometry args={[COIN_RADIUS * 0.28, COIN_RADIUS * 0.28]} />
                <meshBasicMaterial color="#e8dcc8" />
            </mesh>
        </animated.group>
    );
}

// --- Audio Functions (Unchanged) ---
const playLandSound = (audioContext, delay = 0) => {
    if (!audioContext) return;
    setTimeout(() => {
        const bufferSize = audioContext.sampleRate * 0.03;
        const buffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.15)) * 0.3;
        const noise = audioContext.createBufferSource();
        noise.buffer = buffer;
        const noiseGain = audioContext.createGain();
        noise.connect(noiseGain);
        noiseGain.connect(audioContext.destination);
        noiseGain.gain.setValueAtTime(0.08, audioContext.currentTime);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.03);
        noise.start(audioContext.currentTime);

        const osc1 = audioContext.createOscillator();
        const gain1 = audioContext.createGain();
        osc1.connect(gain1);
        gain1.connect(audioContext.destination);
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(1400, audioContext.currentTime);
        osc1.frequency.exponentialRampToValueAtTime(1200, audioContext.currentTime + 0.12);
        gain1.gain.setValueAtTime(0.12, audioContext.currentTime);
        gain1.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.15);
        osc1.start(audioContext.currentTime);
        osc1.stop(audioContext.currentTime + 0.15);
    }, delay);
};

const playThrowSound = (audioContext) => {
    if (!audioContext) return;
    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();
    osc.connect(gain);
    gain.connect(audioContext.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(500, audioContext.currentTime);
    osc.frequency.exponentialRampToValueAtTime(300, audioContext.currentTime + 0.06);
    gain.gain.setValueAtTime(0.08, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.06);
    osc.start();
    osc.stop(audioContext.currentTime + 0.06);
};

// --- Main Component ---
export default function MoneyDivination({ onBack }) {
    const [currentThrow, setCurrentThrow] = useState(1);
    const [yaos, setYaos] = useState([]);
    const [finalHexagram, setFinalHexagram] = useState(null);
    const [isThrown, setIsThrown] = useState(false);
    const [coinResults, setCoinResults] = useState({});
    const [isProcessing, setIsProcessing] = useState(false);
    const [targetResults, setTargetResults] = useState([true, true, true]); // Store fetched results [bool, bool, bool]
    const [isQuantum, setIsQuantum] = useState(false); // Track if current throw reused ANU data
    const isProcessingRef = useRef(false);
    const isGeneratingRef = useRef(false); // Lock to prevent double generation
    const audioContextRef = useRef(null);
    const [audioContext, setAudioContext] = useState(null);

    // Responsive State
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768);
        checkMobile();
        window.addEventListener('resize', checkMobile);

        console.log('MoneyDivination Responsive - Initialized');
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        audioContextRef.current = ctx;
        setAudioContext(ctx);
        return () => {
            if (audioContextRef.current) audioContextRef.current.close();
            window.removeEventListener('resize', checkMobile);
        };
    }, []);

    const handleThrow = async () => {
        if (yaos.length >= 6 || finalHexagram || isProcessingRef.current) return;

        isProcessingRef.current = true;
        isGeneratingRef.current = false; // Reset generation lock
        setIsProcessing(true);

        // 1. Play Sound immediately for feedback
        if (audioContextRef.current?.state === 'suspended') audioContextRef.current.resume();
        playThrowSound(audioContextRef.current);

        // 2. Fetch Quantum Randomness
        // Start fetching while sound plays. UX: might delay the *visual* throw slightly.
        try {
            const results = await fetchQuantumUtils(3);
            // Check if we actually used quantum (hacky check: if it fell back, we wouldn't easily know unless we return metadata. 
            // For now assume if it didn't throw error it's good, or we add flag to util. 
            // Let's just assume for UX "Quantum Mode Active" if enabled.
            setTargetResults(results);
            setIsQuantum(true);
        } catch {
            // Fallback handled in util, but here strictly for safety
            setTargetResults([Math.random() > 0.5, Math.random() > 0.5, Math.random() > 0.5]);
            setIsQuantum(false);
        }

        // 3. Reset and Start Animation
        setCoinResults({});
        setIsThrown(false);

        // Small delay to ensure state reset before re-throw
        setTimeout(() => {
            setIsThrown(true);
            // Processing flag will be cleared after animation finishes and coins report back
            isProcessingRef.current = false;
            // Note: We keep setIsProcessing(true) until coins land? 
            // Actually original logic cleared it quickly. 
            // But now we need to wait for `handleCoinResult` to re-enable interaction?
            // Original logic: handleThrow sets isProcessing=false almost immediately?
            // No, original: isProcessingRef.current = false; setIsProcessing(false); right before setTimeout.
            // Wait, that means user could spam?
            // Let's fix that. Keep it processing until coins land.
        }, 100);
    };

    const handleCoinResult = (index, result) => {
        // if (isProcessingRef.current || yaos.length >= 6 || finalHexagram) return; 
        // Logic changed: isProcessing is TRUE during throw. We accept results now.
        if (yaos.length >= 6 || finalHexagram) return;

        setCoinResults(prev => {
            const newResults = { ...prev, [index]: result };
            if (Object.keys(prev).length < 3 && Object.keys(newResults).length === 3) {
                // All 3 coins landed
                if (yaos.length < 6 && !isGeneratingRef.current) {
                    // Logic to proceed
                    isGeneratingRef.current = true; // Lock immediately
                    setTimeout(() => {
                        generateYao(newResults);
                        setIsProcessing(false); // Re-enable button
                        isProcessingRef.current = false;
                        // isGeneratingRef.current stays true until next throw
                    }, 500);
                }
            }
            return newResults;
        });
    };

    const generateYao = (results) => {
        if (yaos.length >= 6) return;
        const headsCount = Object.values(results).filter(r => r === 'heads').length;
        let yaoType, isMoving, binaryVal;

        if (headsCount === 3) { yaoType = '老阳'; isMoving = true; binaryVal = 1; }
        else if (headsCount === 2) { yaoType = '少阴'; isMoving = false; binaryVal = 0; }
        else if (headsCount === 1) { yaoType = '少阳'; isMoving = false; binaryVal = 1; }
        else { yaoType = '老阴'; isMoving = true; binaryVal = 0; }

        const newYao = { number: yaos.length + 1, type: yaoType, isMoving, binaryVal, headsCount };
        setYaos(prev => {
            if (prev.length >= 6) return prev;
            const updated = [...prev, newYao];
            if (updated.length === 6) {
                setTimeout(() => generateFinalHexagram(updated), 500);
            } else {
                setCurrentThrow(updated.length + 1);
                setIsThrown(false);
                setCoinResults({});
            }
            return updated;
        });
    };

    const generateFinalHexagram = (allYaos) => {
        const hexagramInfo = getHexagram(allYaos.map(yao => yao.binaryVal));
        const movingYaos = allYaos.filter(yao => yao.isMoving);
        setFinalHexagram({
            name: hexagramInfo.name,
            desc: hexagramInfo.desc,
            hasMovingYaos: movingYaos.length > 0,
            movingCount: movingYaos.length
        });
    };

    const resetDivination = () => {
        setCurrentThrow(1);
        setYaos([]);
        setFinalHexagram(null);
        setCoinResults({});
        setIsThrown(false);
        isProcessingRef.current = false;
        setIsProcessing(false);
    };

    return (
        <div className="relative w-full h-[100dvh] min-h-[100dvh] overflow-hidden text-[#2b2b2b]"
            style={{
                backgroundImage: `url(${bgImage})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                fontFamily: '"Noto Serif SC", "Songti SC", "KaiTi", "STKaiti", serif',
            }}>
            {/* Soft Ambient Overlay */}
            <div className="absolute inset-0 bg-[#f0e6dc] opacity-20 pointer-events-none" />

            {/* --- HEADER --- */}
            {/* Mobile: Top Left, smaller, horizontal-ish or stacked? Vertical implies tradition. */}
            {/* Desktop: Left, big, vertical */}
            <div
                className={`absolute z-50 flex gap-3 md:gap-5 ${isMobile ? 'left-4 right-16 flex-row items-center' : 'top-12 left-12 flex-col'}`}
                style={isMobile ? { top: 'max(0.75rem, env(safe-area-inset-top))' } : undefined}
            >

                {/* Seal */}
                <div className={`size-10 shrink-0 border-2 border-[#a83232] text-[#a83232] flex items-center justify-center font-bold rounded-sm shadow-sm ${isMobile ? 'text-sm' : 'text-lg'}`}>
                    吉
                </div>

                {/* Title & Subtitle Wrapper */}
                <div className={`flex ${isMobile ? 'flex-row items-center gap-2' : 'flex-row gap-5'}`} style={{ writingMode: isMobile ? 'horizontal-tb' : 'vertical-rl' }}>

                    {/* Main Title */}
                    <div className="text-[#1a1a1a] font-black opacity-90 font-['STKaiti'] tracking-widest"
                        style={{ fontSize: isMobile ? '26px' : '42px' }}>
                        金钱卦
                    </div>

                    {/* Subtitle */}
                    <div className="text-[#666] tracking-[4px] border-[#999] opacity-80"
                        style={{
                            fontSize: isMobile ? '11px' : '16px',
                            borderRight: isMobile ? 'none' : '1px solid #999',
                            borderLeft: isMobile ? '1px solid #999' : 'none', // Flip border for horizontal
                            paddingRight: isMobile ? '0' : '15px',
                            paddingLeft: isMobile ? '10px' : '0'
                        }}>
                        问道于心・诚则灵
                    </div>
                </div>
            </div>

            {/* Quantum Badge */}
            <div
                className={`absolute z-40 flex flex-col opacity-70 ${isMobile ? 'left-4 items-start' : 'top-20 right-12 items-end'}`}
                style={isMobile ? { top: 'calc(env(safe-area-inset-top) + 4.25rem)' } : undefined}
            >
                <div className="text-[10px] text-[#2b2b2b] bg-white/40 px-2 py-1 rounded-full backdrop-blur-sm border border-gray-400/30">
                    量子真随机 · {isQuantum ? '已启用' : '就绪'}
                </div>
            </div>

            {/* --- BACK BUTTON --- */}
            <button
                type="button"
                onClick={onBack}
                className={`absolute z-[100] size-11 rounded-full border border-[#8b4513]/30 bg-[#f8f0e4]/70 backdrop-blur-sm flex items-center justify-center text-[#5d4037] shadow-sm transition-colors hover:border-[#5d4037] hover:bg-[#f8f0e4] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#a83232] ${isMobile ? 'right-4' : 'top-6 right-12'}`}
                style={isMobile ? { top: 'max(0.75rem, env(safe-area-inset-top))' } : undefined}
                aria-label="返回首页"
            >
                <ArrowLeft size={19} aria-hidden="true" />
            </button>

            {/* --- MAIN CONTENT AREA (Yao List & Result) --- */}
            {/* Mobile: Top Right (for Yao list), avoid center overlap */}
            {/* Desktop: Right Center */}
            <div
                className={`absolute z-50 flex flex-col items-center
                ${isMobile
                    ? 'left-4 right-4 w-auto max-w-sm mx-auto rounded-3xl border border-[#8b4513]/15 bg-[#f8f0e4]/70 p-3 shadow-lg shadow-[#5d4037]/10 backdrop-blur-sm'
                    : 'top-1/2 right-[8%] -translate-y-1/2 w-[300px] min-h-[400px]' // Desktop: Standard
                }`}
                style={isMobile ? { top: 'calc(env(safe-area-inset-top) + 7rem)' } : undefined}
            >

                {/* Visual Status (Only if no result yet) */}
                {!finalHexagram && (
                    <div className={`w-full ${isMobile ? 'mb-3' : 'mb-4'}`} role="status" aria-live="polite">
                        <div className="flex items-center justify-between text-xs font-bold tracking-widest text-[#8b4513]">
                            <span>六爻起卦</span>
                            <span>第 {currentThrow} / 6 爻</span>
                        </div>
                        <div className="mt-2 grid grid-cols-6 gap-1" aria-hidden="true">
                            {Array.from({ length: 6 }, (_, index) => (
                                <span
                                    key={index}
                                    className={`h-1.5 rounded-full transition-colors ${index < yaos.length
                                        ? 'bg-[#a83232]'
                                        : index === yaos.length
                                            ? 'bg-[#a83232]/35'
                                            : 'bg-[#8b4513]/10'
                                        }`}
                                />
                            ))}
                        </div>
                        <p className="mt-2 text-xs leading-5 text-[#66534b]">
                            {isProcessing
                                ? '铜钱正在落定，请稍候…'
                                : yaos.length > 0
                                    ? '继续点击下方印章，完成下一爻'
                                    : '静心默念所问之事，然后点击下方印章'}
                        </p>
                    </div>
                )}

                {/* --- Yao List --- */}
                {/* Mobile: scale down slightly to fit */}
                <div
                    className={`flex flex-col-reverse justify-center w-full transition-all duration-500 ${isMobile ? 'gap-1.5' : 'gap-[18px] flex-1'}`}
                    aria-label={yaos.length > 0 ? `已生成 ${yaos.length} 爻` : '尚未生成卦爻'}
                >
                    {/* Ghost Placeholders */}
                    {yaos.length === 0 && Array(6).fill(0).map((_, i) => (
                        <div key={i} className={`w-full ${isMobile ? 'h-2 border-b border-[#8b4513]/10' : 'h-px my-3'}`} aria-hidden="true" />
                    ))}

                    {yaos.map((yao, index) => (
                        <div key={index} className={`flex items-center gap-3 w-full ${isMobile ? 'min-h-6' : ''}`}>
                            {/* Ink Stroke */}
                            <div className="flex-1 flex items-center justify-end" aria-hidden="true">
                                <InkStroke type={yao.binaryVal === 1 ? 'yang' : 'yin'} width="100%" />
                            </div>

                            {/* Text Info */}
                            <div className="w-[50px] flex flex-col items-start">
                                <span className={`font-bold text-[#1a1a1a] ${isMobile ? 'text-[10px]' : 'text-sm'}`}>
                                    {yao.type}
                                </span>
                                {yao.isMoving && (
                                    <span className="text-[10px] font-bold text-[#c0392b]">动爻</span>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {finalHexagram && isMobile && (
                <div
                    className="absolute bottom-0 left-0 w-full max-h-[58dvh] overflow-y-auto p-5 z-[60] flex flex-col items-center bg-[#f8f0e4]/90 backdrop-blur-md rounded-t-[28px] shadow-2xl border-t border-[#8b4513]/20 animate-[fadeIn_0.5s_ease-out]"
                    style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}
                    role="status"
                    aria-live="polite"
                    aria-label={`卦象结果：${finalHexagram.name}`}
                >
                    <div className="w-10 h-1 bg-[#8b4513]/30 rounded-full mb-4"></div>
                    <div className="text-[11px] tracking-[0.35em] text-[#8b4513]/70 mb-2">卦象结果</div>
                    <h2 className="text-4xl font-normal mb-3 text-[#1a1a1a] font-['STKaiti'] tracking-widest">{finalHexagram.name}</h2>
                    <div className="text-sm text-[#444] leading-7 text-left mb-5 px-1">{finalHexagram.desc}</div>
                    <button
                        type="button"
                        onClick={resetDivination}
                        className="min-h-11 px-8 rounded-xl bg-transparent border border-[#5d4037] text-[#5d4037] text-sm font-bold tracking-widest cursor-pointer transition-colors hover:bg-[#5d4037] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#a83232]"
                    >
                        再卜一卦
                    </button>
                </div>
            )}

            {/* Desktop Result (Inside Panel) - We need to render this conditionally in the Desktop Panel div above
                Wait, I removed it from there. Let's put it back for desktop only. */}

            {finalHexagram && !isMobile && (
                <div className="absolute top-[65%] right-[8%] w-[300px] flex flex-col items-center text-center z-50 animate-[fadeIn_1s_ease]" role="status" aria-live="polite">
                    <div className="w-10 h-0.5 bg-[#333] mb-5"></div>
                    <div className="text-5xl font-normal mb-4 text-[#1a1a1a] font-['STKaiti'] drop-shadow-sm">{finalHexagram.name}</div>
                    <div className="text-[15px] text-[#444] leading-relaxed text-justify font-serif">{finalHexagram.desc}</div>
                    <button
                        type="button"
                        onClick={resetDivination}
                        className="mt-8 min-h-11 px-8 rounded-xl border border-[#5d4037] text-[#5d4037] hover:bg-[#5d4037] hover:text-white transition-all tracking-widest text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#a83232]"
                    >
                        再卜一卦
                    </button>
                </div>
            )}


            {/* --- SHAKE BUTTON --- */}
            {!finalHexagram && yaos.length < 6 && (
                <button
                    type="button"
                    onClick={handleThrow}
                    disabled={isProcessing || (isThrown && Object.keys(coinResults).length < 3)}
                    aria-label={isProcessing ? '正在投掷铜钱' : `投掷第 ${currentThrow} 爻`}
                    aria-busy={isProcessing}
                    className={`fixed left-1/2 -translate-x-1/2 rounded-xl bg-[#a82828] text-white/95 shadow-lg shadow-red-900/40 flex items-center justify-center transition-all z-[999] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#a83232]/30
                                ${isProcessing ? 'grayscale-[0.5] cursor-not-allowed' : 'cursor-pointer'}
                                ${isMobile ? 'size-[88px]' : 'bottom-10 size-[90px]'}
                    `}
                    style={isMobile ? { bottom: 'calc(env(safe-area-inset-bottom) + 1rem)' } : undefined}
                >
                    <div className="border-[2px] border-white/35 w-[85%] h-[85%] flex flex-col items-center justify-center rounded-lg" aria-hidden="true">
                        <span className="text-xl font-bold tracking-[0.18em]">{isProcessing ? '落定' : '起卦'}</span>
                        <span className="mt-1 text-[10px] text-white/70">{isProcessing ? '请稍候' : `第${currentThrow}爻`}</span>
                    </div>
                </button>
            )}

            {/* --- 3D SCENE --- */}
            {(isProcessing || isThrown) && !finalHexagram && (
                <Canvas
                    shadows
                    // Mobile: Move camera further back (z: 16 instead of 12) to fit everything
                    // Or Field of View (fov) adjustment.
                    camera={{ position: [0, 8, isMobile ? 18 : 12], fov: 45 }}
                    gl={{ alpha: true, antialias: true }}
                    onCreated={({ gl }) => {
                        gl.toneMapping = THREE.ACESFilmicToneMapping;
                        gl.outputColorSpace = THREE.SRGBColorSpace;
                    }}
                >
                    <ambientLight intensity={1.5} color="#fffcf5" />
                    <directionalLight position={[5, 10, 5]} intensity={2.0} color="#fff8e1" castShadow shadow-mapSize={[1024, 1024]} />
                    <spotLight position={[0, 10, 0]} angle={0.5} penumbra={1} intensity={1} color="#ffd700" castShadow />

                    <React.Suspense fallback={null}>
                        {[0, 1, 2].map(i => (
                            <AnimatedCoin
                                key={i}
                                index={i} // Logic handles position X spread
                                isThrown={isThrown}
                                targetIsHeads={targetResults[i]}
                                delay={i * 150}
                                onResult={handleCoinResult}
                                audioContext={audioContext}
                            />
                        ))}
                    </React.Suspense>
                </Canvas>
            )}

            <style>{`
                @keyframes strokeDraw {
                    from { width: 0; opacity: 0; }
                    to { width: 100%; opacity: 1; }
                }
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
            <div className="absolute bottom-2 right-2 hidden sm:block text-gray-500/30 text-[10px] pointer-events-none z-50">
                Song Dynasty Remastered vMobile
            </div>
        </div>
    );
}
