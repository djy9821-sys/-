import React from 'react';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error("Uncaught error:", error, errorInfo);
        this.setState({ error, errorInfo });
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="p-6 bg-red-900/90 text-white rounded-xl border border-red-500 max-w-md mx-auto mt-10">
                    <h2 className="text-xl font-bold mb-4">页面没能正常打开</h2>
                    <p className="mb-4">可能是网络不稳定、网站刚刚更新，或者浏览器不支持 3D 效果。刷新一下通常就能恢复，命盘档案不会丢失。</p>
                    <details className="bg-black/50 p-4 rounded text-xs font-mono">
                        <summary className="cursor-pointer text-gray-300">错误详情（反馈问题时可截图）</summary>
                        <div className="mt-3 overflow-auto max-h-60">
                            <p className="text-red-300 font-bold">{this.state.error && this.state.error.toString()}</p>
                            <br />
                            <pre className="text-gray-400">{this.state.errorInfo && this.state.errorInfo.componentStack}</pre>
                        </div>
                    </details>
                    <button
                        onClick={() => window.location.reload()}
                        className="mt-6 w-full py-3 bg-white/10 hover:bg-white/20 rounded font-bold"
                    >
                        刷新页面重试
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
