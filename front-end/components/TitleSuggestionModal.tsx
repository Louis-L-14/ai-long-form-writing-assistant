import React, { useState } from 'react';
import { X, RefreshCw, Sparkles } from 'lucide-react';

interface TitleSuggestionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (title: string) => void;
    projectData: any;
}

const TitleSuggestionModal: React.FC<TitleSuggestionModalProps> = ({
    isOpen,
    onClose,
    onSelect,
    projectData
}) => {
    const [suggestions, setSuggestions] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);

    const fetchSuggestions = async () => {
        setLoading(true);
        try {
            const { api } = await import('../api');
            const result = await api.suggestTitle(projectData);
            setSuggestions(result.suggestions || []);
        } catch (e) {
            console.error("Failed to fetch title suggestions", e);
            setSuggestions(["修仙之路", "剑道独尊", "星际征途", "都市修真", "异界纵横"]);
        } finally {
            setLoading(false);
        }
    };

    React.useEffect(() => {
        if (isOpen && suggestions.length === 0) {
            fetchSuggestions();
        }
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-2xl w-full max-w-md mx-4 animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-slate-800">
                    <div className="flex items-center gap-2">
                        <div className="p-2 rounded-lg bg-gradient-to-r from-purple-500/10 to-indigo-500/10 border border-purple-500/20">
                            <Sparkles className="w-5 h-5 text-purple-400" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-100">AI 书名建议</h3>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1 hover:bg-slate-800 rounded transition-colors text-slate-400 hover:text-slate-200"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-4">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                            <Sparkles className="w-8 h-8 animate-pulse mb-3" />
                            <p className="text-sm">小创正在生成书名建议...</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {suggestions.map((title, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => {
                                        onSelect(title);
                                        onClose();
                                    }}
                                    className="w-full p-3 rounded-lg bg-slate-800/50 hover:bg-slate-800 border border-slate-700 hover:border-indigo-500/50 text-left transition-all group"
                                >
                                    <div className="flex items-center justify-between">
                                        <span className="text-slate-200 font-medium group-hover:text-indigo-300 transition-colors">
                                            {title}
                                        </span>
                                        <span className="text-xs text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                            点击选择
                                        </span>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex justify-end gap-2 p-4 border-t border-slate-800">
                    <button
                        onClick={fetchSuggestions}
                        disabled={loading}
                        className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-slate-100 transition-colors flex items-center gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        换一批
                    </button>
                </div>
            </div>
        </div>
    );
};

export default TitleSuggestionModal;
