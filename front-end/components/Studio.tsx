import React, { useState, useEffect, useRef } from 'react';
import {
    Bot, User, Send, Sparkles, MapPin, MoreHorizontal,
    ChevronRight, ChevronDown, CheckCircle2, AlertTriangle,
    X, Loader2, Clock, FileText, Layout, Settings,
    Users, BookOpen, History, Terminal,
    Edit3, Hash, Zap, ChevronLeft, Save // Added missing icons
} from 'lucide-react';
import { api } from '../api';
import SaveProgressModal from './SaveProgressModal';

interface StudioProps {
    projectId: string;
    onOpenWiki: () => void;
}

const Studio: React.FC<StudioProps> = ({ projectId, onOpenWiki }) => {
    const [project, setProject] = useState<any>(null);
    const [chapters, setChapters] = useState<any[]>([]);
    const [characters, setCharacters] = useState<any[]>([]);
    const [activeChapterId, setActiveChapterId] = useState<string>('');
    const [activeTab, setActiveTab] = useState<'chat' | 'context' | 'tools' | 'outline'>('chat');
    const [showNav, setShowNav] = useState(true);
    const [showCopilot, setShowCopilot] = useState(true);

    // Editor State
    const [content, setContent] = useState('');
    const [detailedOutline, setDetailedOutline] = useState('');
    const [ghostText, setGhostText] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const editorRef = useRef<HTMLDivElement>(null);
    const [detectedEntity, setDetectedEntity] = useState<string | null>(null);
    const [retrievedContext, setRetrievedContext] = useState<any[]>([]);

    // Save Progress State
    const [showSaveProgress, setShowSaveProgress] = useState(false);
    const [isSaveCompleted, setIsSaveCompleted] = useState(false);
    const [saveExecutionReport, setSaveExecutionReport] = useState<any>(null);

    // Toast State
    const [showToast, setShowToast] = useState(false);
    const [toastMessage, setToastMessage] = useState("");

    // Generation Context State
    const [generationContext, setGenerationContext] = useState<any>(null);

    // Load project data on mount
    useEffect(() => {
        loadProject();
    }, [projectId]);

    const loadProject = async () => {
        try {
            const data = await api.getProject(projectId);
            setProject(data);
            setChapters(data.chapters || []);
            setCharacters(data.entity_versions?.filter((e: any) => e.entity_type === 'character') || []);

            // Set first chapter as active if exists
            if (data.chapters && data.chapters.length > 0) {
                setActiveChapterId(data.chapters[0].id);
            }
        } catch (e) {
            console.error('Failed to load project', e);
        }
    };

    const currentChapter = chapters.find(c => c.id === activeChapterId);

    // Sync content when chapter changes (only when switching chapters, not on edits)
    useEffect(() => {
        const chapter = chapters.find(c => c.id === activeChapterId);
        if (chapter) {
            setContent(chapter.content || '');
            setDetailedOutline(chapter.detailed_outline || '');
            setGhostText('');
        }
    }, [activeChapterId, chapters.length]); // Only re-run when switching chapters or chapter count changes

    const loadChapterDetails = async (id: string) => {
        // Simple check if it's a UUID (real chapter)
        if (id.length > 10 && !id.startsWith('ch-')) {
            try {
                // We don't have a getChapter API yet in api.ts? We do have updateChapter.
                // We might need getChapter. But wait, getProject returns chapters.
                // Let's assume for now we just want to support saving.
                // Or we can add a getChapter method.
                // For this iteration, let's just allow editing and saving.
            } catch (e) {
                console.error(e);
            }
        }
    };

    // Monitor text selection for copilot
    useEffect(() => {
        const handleSelectionChange = () => {
            const selection = window.getSelection();
            const selectedStr = selection?.toString() || '';

            // Only track selection within the editor
            if (selection && selection.rangeCount > 0 && editorRef.current?.contains(selection.anchorNode)) {
                setSelectedText(selectedStr);

                // Calculate selection position in content for later replacement
                if (selectedStr && editorRef.current) {
                    const range = selection.getRangeAt(0);
                    const preSelectionRange = range.cloneRange();
                    preSelectionRange.selectNodeContents(editorRef.current);
                    preSelectionRange.setEnd(range.startContainer, range.startOffset);
                    const start = preSelectionRange.toString().length;
                    const end = start + selectedStr.length;
                    setSelectedTextInfo({ start, end });
                }
            } else {
                setSelectedText('');
                setSelectedTextInfo(null);
            }
        };

        document.addEventListener('selectionchange', handleSelectionChange);
        return () => document.removeEventListener('selectionchange', handleSelectionChange);
    }, [content]); // Re-run when content changes to ensure accurate position tracking


    // Copilot State
    const [copilotInput, setCopilotInput] = useState('');
    const [copilotMessages, setCopilotMessages] = useState<{ id: string, text: string, isAi: boolean }[]>([]);
    const [selectedText, setSelectedText] = useState('');
    const [selectedTextInfo, setSelectedTextInfo] = useState<{ start: number; end: number } | null>(null);

    // Generate Chapter State
    const [showGenerateModal, setShowGenerateModal] = useState(false);
    const [generateInstructions, setGenerateInstructions] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);

    const handleGenerateChapter = async () => {
        if (!project) return;

        setIsGenerating(true);
        setShowGenerateModal(false);
        setGenerationContext(null); // Reset context
        setContent(""); // Clear editor for new generation

        try {
            await api.generateChapter(
                project.id,
                generateInstructions,
                activeChapterId, // Use activeChapterId instead of currentChapter?.id
                (chunk) => {
                    setContent(prev => prev + chunk);
                    // Auto-scroll to bottom
                    if (editorRef.current) {
                        editorRef.current.scrollTop = editorRef.current.scrollHeight;
                    }
                },
                (context) => {
                    setGenerationContext(context);
                    setActiveTab('context'); // Auto switch to context tab
                }
            );
        } catch (error) {
            console.error("Generation failed:", error);
            setToastMessage("生成失败，请重试");
            setShowToast(true);
        } finally {
            setIsGenerating(false);
        }
    };

    // --- Editor Logic ---

    const simulateAiSuggestion = async () => {
        if (!content.trim()) return;

        // Take the last 500 chars as context for autocomplete
        const context = content.slice(-500);
        const prompt = `自然地续写故事。只提供下一句话或短语。请用中文回答。上下文: "${context}"`;

        try {
            let suggestion = '';
            await api.chat(
                [{ role: 'user', content: prompt }],
                "Genre: Cyberpunk Xianxia",
                15, // Hardcoded chapter for now
                (chunk) => { suggestion += chunk; }
            );
            // Clean up
            suggestion = suggestion.trim();
            if (suggestion && !suggestion.startsWith(' ')) suggestion = ' ' + suggestion;
            setGhostText(suggestion);
        } catch (e) {
            console.error("Autocomplete failed", e);
        }
    };

    // Analyze cursor position to find entities for Context Tab
    const checkContextAtCursor = async () => {
        const selection = window.getSelection();
        if (!selection || selection.rangeCount === 0) return;

        const node = selection.anchorNode;
        if (!node || node.nodeType !== Node.TEXT_NODE) return;

        const text = node.textContent || '';
        // Simple word extraction around cursor - in real app, use more robust selection logic
        // For now, we just take the whole paragraph or a window
        const query = text.slice(0, 50);

        if (query.length > 5) {
            try {
                // Use a hardcoded project ID for now as we don't have a real project manager in frontend yet
                const results = await api.retrieveContext(projectId, query, currentChapter?.chapter_number || 1);
                if (results && results.length > 0) {
                    setDetectedEntity("发现相关上下文");
                    setRetrievedContext(results);
                } else {
                    setDetectedEntity(null);
                }
            } catch (e) {
                console.error("Context retrieval failed", e);
            }
        }
    };

    const handleContentChange = (e: React.FormEvent<HTMLDivElement>) => {
        const newText = e.currentTarget.innerText;
        setContent(newText);
        setGhostText('');
        setIsTyping(true);

        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

        typingTimeoutRef.current = setTimeout(() => {
            setIsTyping(false);
            checkContextAtCursor();
            simulateAiSuggestion();
        }, 1500);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Tab' && ghostText) {
            e.preventDefault();
            setContent(prev => prev + ghostText);
            setGhostText('');
            // Move cursor to end (simple implementation)
            setTimeout(() => {
                if (editorRef.current) {
                    const range = document.createRange();
                    const sel = window.getSelection();
                    range.selectNodeContents(editorRef.current);
                    range.collapse(false);
                    sel?.removeAllRanges();
                    sel?.addRange(range);
                }
            }, 0);
        } else if (ghostText && !['Shift', 'Control', 'Alt', 'Meta'].includes(e.key)) {
            setGhostText('');
        }
    };

    // --- Copilot Logic ---

    const handleCopilotSend = async () => {
        if (!copilotInput.trim()) return;

        const newUserMsg = { id: Date.now().toString(), text: copilotInput, isAi: false };
        setCopilotMessages(prev => [...prev, newUserMsg]);
        setCopilotInput('');

        const aiMsgId = (Date.now() + 1).toString();
        setCopilotMessages(prev => [...prev, { id: aiMsgId, text: '', isAi: true }]);

        try {
            // Construct history for API
            const history = copilotMessages.map(m => ({
                role: m.isAi ? 'assistant' : 'user',
                content: m.text
            }));
            history.push({ role: 'user', content: copilotInput });

            // Determine system prompt based on whether text is selected
            let systemPrompt = '';
            if (selectedText) {
                // Text editing mode - ask AI to modify selected text
                systemPrompt = `User has selected the following text from their chapter:\n\n"${selectedText}"\n\nThey want you to help modify it. Please provide the improved version based on their instruction. Only output the modified text, not explanations.`;
            } else {
                // General conversation mode
                systemPrompt = `Current Chapter Content: ${content.slice(0, 1000)}...`;
            }

            let fullText = '';
            await api.chat(
                history,
                systemPrompt,
                15,
                (chunk) => {
                    fullText += chunk;
                    setCopilotMessages(prev => prev.map(m =>
                        m.id === aiMsgId ? { ...m, text: fullText } : m
                    ));
                }
            );
        } catch (e) {
            setCopilotMessages(prev => prev.map(m =>
                m.id === aiMsgId ? { ...m, text: "错误: 无法连接到 AI。" } : m
            ));
        }
    };

    // Apply AI suggestion to editor
    const applyAiSuggestion = (suggestion: string) => {
        if (selectedTextInfo && selectedTextInfo.start !== undefined && selectedTextInfo.end !== undefined) {
            // Replace selected text
            const before = content.substring(0, selectedTextInfo.start);
            const after = content.substring(selectedTextInfo.end);
            const newContent = before + suggestion + after;
            setContent(newContent);

            // Clear selection
            setSelectedText('');
            setSelectedTextInfo(null);

            // Show toast
            setToastMessage("已应用 AI 建议");
            setShowToast(true);
            setTimeout(() => setShowToast(false), 3000);
        } else {
            // Insert at cursor position (or append if no cursor position detected)
            setContent(prev => prev + '\n\n' + suggestion);

            setToastMessage("已插入 AI 建议");
            setShowToast(true);
            setTimeout(() => setShowToast(false), 3000);
        }
    };

    // Save Logic
    const [isSaving, setIsSaving] = useState(false);

    const handleSaveChapter = async () => {
        if (!activeChapterId) return;

        // Reset and show progress modal
        setShowSaveProgress(true);
        setIsSaveCompleted(false);
        setSaveExecutionReport(null);
        setIsSaving(true);

        try {
            // Only try to save if it looks like a real ID (UUID)
            if (activeChapterId.length > 10 && !activeChapterId.startsWith('ch-')) {
                const result = await api.updateChapter(activeChapterId, {
                    content: content,
                    detailed_outline: detailedOutline
                });

                console.log("Chapter saved and analyzed.");

                // Show completion
                setIsSaveCompleted(true);
                setSaveExecutionReport(result.execution_report);

                // Refresh project data to get updated chapters
                await loadProject();
            } else {
                alert("演示模式下无法保存 (Mock Chapter)");
                setShowSaveProgress(false);
            }
        } catch (e) {
            console.error("Failed to save chapter", e);
            alert("保存失败");
            setShowSaveProgress(false);
        } finally {
            setIsSaving(false);
        }
    };

    const handleCloseSaveProgress = () => {
        setShowSaveProgress(false);
        setIsSaveCompleted(false);

        // Build summary message from execution report
        let summaryParts = ["✅ 保存成功"];

        if (saveExecutionReport) {
            const analysisStep = saveExecutionReport.steps_completed?.find((s: any) => s.step === 'analysis');
            const eventsStep = saveExecutionReport.steps_completed?.find((s: any) => s.step === 'events');
            const outlineStep = saveExecutionReport.steps_completed?.find((s: any) => s.step === 'outline_sync');

            if (analysisStep?.details?.entities_updated > 0) {
                summaryParts.push(`更新${analysisStep.details.entities_updated}实体`);
            }
            if (eventsStep?.details?.events_extracted > 0) {
                summaryParts.push(`提取${eventsStep.details.events_extracted}事件`);
            }
            if (outlineStep?.details?.subsequent_updated > 0) {
                summaryParts.push(`同步${outlineStep.details.subsequent_updated}章`);
            }
        }

        const toastMsg = summaryParts.join(" | ");
        setToastMessage(toastMsg);
        setSaveExecutionReport(null);

        // Show success toast
        setShowToast(true);
        setTimeout(() => setShowToast(false), 3000);
    };

    return (
        <div className="flex h-full w-full bg-slate-950 overflow-hidden">

            {/* Left Sidebar: Navigation */}
            <div className={`${showNav ? 'w-64' : 'w-0'} flex-shrink-0 bg-slate-900 border-r border-slate-800 transition-all duration-300 flex flex-col overflow-hidden relative`}>
                <div className="p-4 border-b border-slate-800 flex items-center justify-between">
                    <h2 className="font-semibold text-slate-200 flex items-center gap-2">
                        <BookOpen className="w-4 h-4 text-indigo-500" />
                        章节列表
                    </h2>
                    <div className="flex gap-1">
                        <div className="w-2 h-2 rounded-full bg-red-500" />
                        <div className="w-2 h-2 rounded-full bg-yellow-500" />
                        <div className="w-2 h-2 rounded-full bg-green-500" />
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                    {chapters.map(ch => (
                        <div
                            key={ch.id}
                            onClick={() => setActiveChapterId(ch.id)}
                            className={`group flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer text-sm transition-colors ${activeChapterId === ch.id
                                ? 'bg-indigo-600/20 text-indigo-200'
                                : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                                }`}
                        >
                            <div className="flex items-center gap-2 truncate">
                                {ch.status === 'published' && <CheckCircle2 className="w-3 h-3 text-emerald-500 flex-shrink-0" />}
                                {ch.status === 'draft' && <Edit3 className="w-3 h-3 text-amber-500 flex-shrink-0" />}
                                {ch.status === 'outline' && <Hash className="w-3 h-3 text-slate-600 flex-shrink-0" />}
                                <span className="truncate">第{ch.chapter_number}章: {ch.title}</span>
                            </div>
                        </div>
                    ))}

                    {/* Generate Next Chapter Button */}
                    <button
                        onClick={() => setShowGenerateModal(true)}
                        className="w-full mt-4 flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-400 hover:text-indigo-300 border border-indigo-500/20 transition-all group"
                    >
                        <Zap className="w-4 h-4 group-hover:scale-110 transition-transform" />
                        <span className="text-sm font-medium">生成下一章</span>
                    </button>
                </div>
            </div>

            {/* Generate Chapter Modal */}
            {showGenerateModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-2xl w-full max-w-lg mx-4 p-6 animate-in zoom-in-95 duration-200">
                        <h3 className="text-lg font-bold text-slate-100 mb-4 flex items-center gap-2">
                            <Sparkles className="w-5 h-5 text-indigo-500" />
                            生成下一章
                        </h3>

                        <div className="mb-4">
                            <label className="block text-sm font-medium text-slate-400 mb-2">
                                剧情构思 / 指令
                            </label>
                            <textarea
                                value={generateInstructions}
                                onChange={(e) => setGenerateInstructions(e.target.value)}
                                placeholder="例如：主角在遗迹中发现了上古剑谱，但遭遇了守护兽的袭击..."
                                className="w-full h-32 bg-slate-800 border border-slate-700 rounded-lg p-3 text-sm text-slate-300 focus:outline-none focus:border-indigo-500 transition-colors resize-none"
                            />
                        </div>

                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setShowGenerateModal(false)}
                                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors text-sm"
                            >
                                取消
                            </button>
                            <button
                                onClick={handleGenerateChapter}
                                disabled={isGenerating}
                                className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition-colors text-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isGenerating ? (
                                    <>
                                        <Sparkles className="w-4 h-4 animate-spin" />
                                        生成中...
                                    </>
                                ) : (
                                    <>
                                        <Zap className="w-4 h-4" />
                                        开始生成
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Main Editor Area */}
            <div className="flex-1 flex flex-col relative">
                {/* Toolbar */}
                <div className="h-14 border-b border-slate-800 bg-slate-900/50 flex items-center justify-between px-4">
                    <div className="flex items-center gap-2">
                        <button onClick={() => setShowNav(!showNav)} className="p-2 hover:bg-slate-800 rounded-lg text-slate-400">
                            {showNav ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        </button>
                        <span className="text-sm font-medium text-slate-300 ml-2">{currentChapter?.title}</span>
                        <span className="text-xs bg-slate-800 text-slate-500 px-2 py-0.5 rounded">草稿</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleSaveChapter}
                            disabled={isSaving}
                            className={`p-2 rounded-lg transition-colors ${isSaving ? 'text-indigo-400 bg-indigo-400/10' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}
                            title="保存并分析"
                        >
                            {isSaving ? <Sparkles className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        </button>
                        <button onClick={() => setShowCopilot(!showCopilot)} className={`p-2 rounded-lg transition-colors ${showCopilot ? 'bg-indigo-600 text-white' : 'hover:bg-slate-800 text-slate-400'}`}>
                            <Layout className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Editor */}
                <div className="flex-1 overflow-y-auto p-12" onClick={() => editorRef.current?.focus()}>
                    <div className="max-w-3xl mx-auto">
                        <div
                            ref={editorRef}
                            contentEditable={!isSaving}
                            onInput={handleContentChange}
                            onKeyDown={handleKeyDown}
                            className={`outline-none text-lg leading-relaxed text-slate-300 min-h-[500px] whitespace-pre-wrap ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}`}
                            suppressContentEditableWarning
                        >
                            {content}
                            {ghostText && <span className="text-slate-600 italic">{ghostText}</span>}
                        </div>
                    </div>
                </div>
            </div>

            {/* Right Sidebar: Copilot & Context */}
            <div className={`${showCopilot ? 'w-80' : 'w-0'} flex-shrink-0 bg-slate-900 border-l border-slate-800 transition-all duration-300 flex flex-col overflow-hidden`}>
                {/* Tabs */}
                <div className="flex border-b border-slate-800">
                    <button
                        onClick={() => setActiveTab('chat')}
                        className={`flex-1 py-3 text-xs font-medium flex items-center justify-center gap-2 ${activeTab === 'chat' ? 'text-indigo-400 border-b-2 border-indigo-500' : 'text-slate-500 hover:text-slate-300'}`}
                    >
                        <Bot className="w-4 h-4" />
                        助手
                    </button>
                    <button
                        onClick={() => setActiveTab('context')}
                        className={`flex-1 py-3 text-xs font-medium flex items-center justify-center gap-2 ${activeTab === 'context' ? 'text-indigo-400 border-b-2 border-indigo-500' : 'text-slate-500 hover:text-slate-300'}`}
                    >
                        <Sparkles className="w-4 h-4" />
                        上下文
                        {detectedEntity && <span className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse" />}
                    </button>
                    <button
                        onClick={() => setActiveTab('outline')}
                        className={`flex-1 py-3 text-xs font-medium flex items-center justify-center gap-2 ${activeTab === 'outline' ? 'text-indigo-400 border-b-2 border-indigo-500' : 'text-slate-500 hover:text-slate-300'}`}
                    >
                        <Layout className="w-4 h-4" />
                        细纲
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4">
                    {activeTab === 'chat' && (
                        <div className="h-full flex flex-col">
                            {/* Selected Text Indicator */}
                            {selectedText && (
                                <div className="mb-3 p-2 bg-indigo-500/10 border border-indigo-500/30 rounded-lg">
                                    <div className="flex items-center gap-2 text-xs">
                                        <Edit3 className="w-3 h-3 text-indigo-400" />
                                        <span className="text-indigo-300 font-medium">
                                            已选中 {selectedText.length} 个字符
                                        </span>
                                    </div>
                                    <div className="mt-1 text-xs text-slate-400 line-clamp-2">
                                        {selectedText}
                                    </div>
                                </div>
                            )}

                            <div className="flex-1 space-y-4 mb-4">
                                {copilotMessages.map(msg => (
                                    <div key={msg.id} className="space-y-2">
                                        <div className={`flex gap-3 ${msg.isAi ? '' : 'flex-row-reverse'}`}>
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${msg.isAi ? 'bg-indigo-600' : 'bg-slate-700'}`}>
                                                {msg.isAi ? <Bot className="w-4 h-4 text-white" /> : <User className="w-4 h-4 text-slate-300" />}
                                            </div>
                                            <div className={`p-3 rounded-xl text-sm ${msg.isAi ? 'bg-slate-800 text-slate-300' : 'bg-indigo-600/20 text-indigo-200'}`}>
                                                {msg.text}
                                            </div>
                                        </div>

                                        {/* Apply to Editor button for AI messages */}
                                        {msg.isAi && msg.text && (
                                            <div className="flex justify-end pr-11">
                                                <button
                                                    onClick={() => applyAiSuggestion(msg.text)}
                                                    className="text-xs text-indigo-400 hover:text-indigo-300 hover:underline flex items-center gap-1"
                                                >
                                                    <Sparkles className="w-3 h-3" />
                                                    应用到编辑器
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                            <div className="relative">
                                <input
                                    type="text"
                                    value={copilotInput}
                                    onChange={(e) => setCopilotInput(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleCopilotSend()}
                                    placeholder="向助手提问..."
                                    className="w-full bg-slate-800 border border-slate-700 rounded-lg py-2 pl-3 pr-10 text-sm focus:outline-none focus:border-indigo-500 transition-colors"
                                />
                                <button onClick={handleCopilotSend} className="absolute right-2 top-2 text-slate-400 hover:text-indigo-400">
                                    <Send className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    )}





                    {activeTab === 'context' && (
                        <div className="space-y-4">
                            {generationContext ? (
                                <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-500">
                                    <div className="bg-indigo-500/10 border border-indigo-500/30 rounded-lg p-3">
                                        <div className="flex items-center gap-2 text-indigo-400 mb-2">
                                            <Sparkles className="w-4 h-4" />
                                            <span className="font-semibold text-sm">生成上下文</span>
                                        </div>
                                        <p className="text-xs text-slate-400">
                                            生成当前章时，传给LLM的上下文信息概览。
                                        </p>
                                    </div>

                                    {/* 角色记忆 (RAG) */}
                                    <div className="space-y-2">
                                        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                                            <Users className="w-3 h-3" />
                                            角色记忆与世界观
                                        </h3>
                                        <div className="bg-slate-900 rounded-lg border border-slate-800 p-3 text-xs text-slate-300">
                                            <div className="mb-2">
                                                <span className="text-slate-500 block mb-1">相关角色</span>
                                                <div className="text-slate-200">
                                                    {generationContext.rag.characters.length > 0
                                                        ? generationContext.rag.characters.join(", ")
                                                        : <span className="text-slate-600 italic">无相关角色</span>}
                                                </div>
                                            </div>
                                            <div>
                                                <span className="text-slate-500 block mb-1">历史事件</span>
                                                <div className="text-slate-200">
                                                    {generationContext.rag.events.length > 0
                                                        ? generationContext.rag.events.join(", ")
                                                        : <span className="text-slate-600 italic">无相关事件</span>}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* 大纲 */}
                                    <div className="space-y-2">
                                        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                                            <BookOpen className="w-3 h-3" />
                                            大纲上下文
                                        </h3>
                                        <div className="bg-slate-900 rounded-lg border border-slate-800 p-3 text-xs text-slate-300 space-y-3">
                                            <div>
                                                <span className="text-slate-500">当前卷: </span>
                                                <span className="text-indigo-300 font-medium">{generationContext.outline.current_volume}</span>
                                            </div>
                                            <div>
                                                <span className="text-slate-500 block mb-1">上下文范围</span>
                                                <div className="pl-2 border-l-2 border-slate-700 space-y-1">
                                                    {generationContext.outline.surrounding_chapters.map((ch: string, i: number) => (
                                                        <div key={i} className="truncate text-slate-400">{ch}</div>
                                                    ))}
                                                </div>
                                            </div>
                                            <div className="pt-2 border-t border-slate-800 flex justify-between items-center">
                                                <span className="text-slate-500">完整大纲</span>
                                                <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 text-[10px]">
                                                    {generationContext.outline.summary}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* 上文 */}
                                    <div className="space-y-2">
                                        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                                            <History className="w-3 h-3" />
                                            上文概要
                                        </h3>
                                        <div className="bg-slate-900 rounded-lg border border-slate-800 p-3 text-xs text-slate-300 leading-relaxed">
                                            {generationContext.prev_chapter.summary}
                                        </div>
                                    </div>

                                    {/* 指令 */}
                                    <div className="space-y-2">
                                        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                                            <Terminal className="w-3 h-3" />
                                            创作指令
                                        </h3>
                                        <div className="bg-slate-900 rounded-lg border border-slate-800 p-3 text-xs text-slate-300">
                                            <div className="mb-1 text-indigo-400 font-medium flex items-center gap-2">
                                                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                                                {generationContext.instructions.type}
                                            </div>
                                            <div className="text-slate-400 pl-3.5">
                                                {generationContext.instructions.content}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                // Fallback to detected entity view
                                detectedEntity ? (
                                    <div className="bg-indigo-500/10 border border-indigo-500/30 rounded-lg p-3">
                                        <div className="flex items-center gap-2 text-indigo-400 mb-2">
                                            <Sparkles className="w-4 h-4" />
                                            <span className="font-semibold text-sm">发现相关上下文</span>
                                        </div>
                                        <p className="text-xs text-slate-400 mb-3">
                                            基于你的光标位置，以下是来自 Wiki/向量数据库的相关信息。
                                        </p>

                                        {retrievedContext.length > 0 ? (
                                            retrievedContext.map((item, idx) => (
                                                <div key={idx} className="bg-slate-900 p-2 rounded border border-slate-800 text-xs text-slate-300 mb-2">
                                                    {item.payload?.content || JSON.stringify(item.payload)}
                                                </div>
                                            ))
                                        ) : (
                                            <div className="bg-slate-900 p-2 rounded border border-slate-800 text-xs text-slate-300">
                                                检测到: <span className="text-white font-bold">{detectedEntity}</span>
                                                <br />
                                                (暂无具体的 RAG 条目)
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="text-center py-8 text-slate-500 text-xs">
                                        <MapPin className="w-8 h-8 mx-auto mb-2 opacity-20" />
                                        <p>生成章节时将在此显示上下文</p>
                                        <p className="mt-1 opacity-50">或将光标放在文本中以查看相关信息</p>
                                    </div>
                                )
                            )}

                            <div className="border-t border-slate-800 pt-4">
                                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">活跃实体 (第15章)</h3>
                                <div className="space-y-2">
                                    {characters.slice(0, 5).map(char => (
                                        <div key={char.id} className="flex items-center gap-3 p-2 hover:bg-slate-800 rounded-lg cursor-pointer transition-colors group">
                                            <div className="w-8 h-8 rounded-md bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-300">
                                                {char.entity_id.charAt(0)}
                                            </div>
                                            <div>
                                                <div className="text-sm font-medium text-slate-200">{char.entity_id}</div>
                                                <div className="text-[10px] text-slate-500">角色</div>
                                            </div>
                                            <button onClick={onOpenWiki} className="ml-auto opacity-0 group-hover:opacity-100 p-1 hover:bg-slate-700 rounded text-slate-400">
                                                <MoreHorizontal className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'outline' && (
                        <div className="h-full flex flex-col">
                            <div className="mb-4">
                                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">本章细纲</h3>
                                <p className="text-xs text-slate-400 mb-4">
                                    细纲将作为 AI 写作的重要参考。请详细描述本章的情节发展。
                                </p>
                                <textarea
                                    value={detailedOutline}
                                    onChange={(e) => setDetailedOutline(e.target.value)}
                                    className="w-full h-64 bg-slate-800 border border-slate-700 rounded-lg p-3 text-sm text-slate-300 focus:outline-none focus:border-indigo-500 transition-colors resize-none mb-4"
                                    placeholder="例如：林凡进入防火墙核心，发现守护者竟然是..."
                                />
                                <button
                                    onClick={async () => {
                                        try {
                                            // Only try to save if it looks like a real ID (UUID)
                                            if (activeChapterId.length > 10 && !activeChapterId.startsWith('ch-')) {
                                                await api.updateChapter(activeChapterId, { detailed_outline: detailedOutline });
                                                alert("细纲已保存");
                                            } else {
                                                alert("演示模式下无法保存细纲 (Mock Chapter)");
                                            }
                                        } catch (e) {
                                            console.error("Failed to save detailed outline", e);
                                            alert("保存失败");
                                        }
                                    }}
                                    className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                                >
                                    <Save className="w-4 h-4" />
                                    保存细纲
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Save Progress Modal */}
            <SaveProgressModal
                isOpen={showSaveProgress}
                isCompleted={isSaveCompleted}
                executionReport={saveExecutionReport}
                onClose={handleCloseSaveProgress}
            />

            {/* Toast Notification */}
            {showToast && (
                <div className="fixed top-4 right-4 bg-emerald-500 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 z-[60] animate-in fade-in slide-in-from-top-2">
                    <CheckCircle2 className="w-4 h-4" />
                    <span className="font-medium">{toastMessage}</span>
                </div>
            )}
        </div>
    );
};

export default Studio;