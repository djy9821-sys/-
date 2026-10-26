/**
 * 关于、隐私与免责声明。以后上架 App 时，这一页也可作为隐私说明的基础。
 */
import React from 'react';
import { ArrowLeft } from 'lucide-react';

const Section = ({ title, children }) => (
    <section className="rounded-2xl border border-[#dcb471]/15 bg-white/[0.03] p-4 sm:p-5">
        <h3 className="font-serif text-base font-bold tracking-[0.08em] text-[#f0ce91]">{title}</h3>
        <div className="mt-2 space-y-2 text-sm leading-7 text-[#fbf7ed]/75">{children}</div>
    </section>
);

export default function AboutView({ onBack, version }) {
    return (
        <div className="mx-auto w-full max-w-2xl pb-10">
            <header className="flex items-center gap-3 py-3">
                <button type="button" onClick={onBack} className="inline-flex size-11 items-center justify-center rounded-full border border-[#dcb471]/20 bg-white/[0.03] text-[#fbf7ed] hover:bg-[#dcb471]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#55bba8]" aria-label="返回首页">
                    <ArrowLeft className="size-5" aria-hidden="true" />
                </button>
                <div>
                    <h2 className="font-serif text-xl font-bold tracking-[0.12em] text-[#fbf7ed]">关于与隐私</h2>
                    <p className="text-xs text-[#fbf7ed]/55">古书派 · 东方术数工具</p>
                </div>
            </header>

            <div className="space-y-3">
                <Section title="古书派是什么">
                    <p>古书派提供紫微斗数、八字排盘与六爻起卦等传统术数工具。排盘全部在你的设备上计算：八字按节气换月，支持真太阳时、夏令时校正与早晚子时，紫微按十二宫与四化排布，六爻按京房纳甲装卦。</p>
                </Section>

                <Section title="你的资料存在哪里">
                    <p>姓名、生辰、出生地和命盘档案只保存在当前浏览器里，不会上传到我们的服务器。换手机或清除浏览器数据前，请在「命盘档案」里导出备份。</p>
                    <p>「导出给 AI」只是把整理好的文字复制到剪贴板，由你自己决定是否粘贴给 ChatGPT、Claude 等第三方 AI；粘贴之后的资料按对方的隐私政策处理。</p>
                    <p>六爻「手势起卦」的摄像头画面只在你的设备上实时识别手势，不会录制或上传；不开启摄像头也能点按钮完成起卦。「所在地」设置只保存在本机，用来按真太阳时判断此刻的时辰。</p>
                    <p>网站使用 Google Analytics 统计访问量与页面使用情况，用于改进产品，不包含你的生辰资料。</p>
                </Section>

                <Section title="免责声明">
                    <p>命理内容属于传统文化研究与自我观察的参考，不构成医疗、法律、投资或任何专业建议。旺衰、喜用等结论为程序估算，重要决定请结合实际情况并咨询相关专业人士。</p>
                </Section>

                <Section title="开源与反馈">
                    <p>古书派是开源项目，排盘基于 lunar-javascript 与 iztro 等开源库。发现排盘差异或有功能建议，欢迎反馈。</p>
                </Section>
            </div>

            <p className="mt-6 text-center text-[11px] text-[#fbf7ed]/40">版本 {version}</p>
        </div>
    );
}
