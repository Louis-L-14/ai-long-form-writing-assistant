import React, { useState } from 'react';
import { Send, Sparkles, Check, Loader2 } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import { OutlineVolume } from '../types';
import { api } from '../api';
import EditableField from './EditableField';
import OutlineEditor from './OutlineEditor';
import CharacterListEditor, { Character } from './CharacterListEditor';

type TabType = 'unified' | 'skeleton' | 'characters' | 'first_chapter' | 'world' | 'outline';

const GenesisWizard: React.FC<{ onComplete: (projectId: string) => void }> = ({ onComplete }) => {
    const [activeTab, setActiveTab] = useState<TabType>('unified');
    const [input, setInput] = useState('');
    const [loadingStates, setLoadingStates] = useState({
        unified: false,
        skeleton: false,
        characters: false,
        first_chapter: false,
        world: false,
        outline: false
    });

    const [previewData, setPreviewData] = useState<any>({
        // Skeleton Fields
        story_formula: "",
        volume1_goal: "",
        golden_finger_rules: [] as string[],
        core_hook: "",
        emotional_tone: "",

        // Legacy/Derived Fields
        title: "未命名项目",
        genre: "未定",
        theme: "未知",

        characters: [] as Character[],

        // World structure (new)
        world: {
            macro: { era: "", space_structure: "", civilization: "" },
            conflict: { main_contradiction: "", ultimate_goal: "" },
            power_system: { source: "", levels: [], cost: "", ceiling: "" },
            factions: [],
            economy: { currencies: [], acquisition: "", structure: "" },
            rules: { public_rules: [], hidden_rules: [], taboos: [] },
            history: { key_events: [], conflicting_stories: [] },
            space: { regions: [], dungeons: [] },
            information: { public_view: "", mc_view: "", truth: "", revelation_pace: "" },
            order_keepers: { surface_enemy: "", mid_enemy: "", top_enemy: "" },
            aesthetic: { visual_tags: "", emotional_tone: "", forbidden_styles: "" },
            mc_position: { cheat_nature: "", interested_parties: "", explanation_layers: "" }
        },

        outline: [] as OutlineVolume[],
        first_chapter_title: "",
        first_chapter_content: ""
    });

    const [aiResponse, setAiResponse] = useState('');
    const [chatHistory, setChatHistory] = useState<{ role: 'user' | 'assistant' | 'system', content: string }[]>([]);
    const [agentStatus, setAgentStatus] = useState<string>('');
    const [abortController, setAbortController] = useState<AbortController | null>(null);

    const normalizeCharacters = (incoming: any[], existing: Character[]) => {
        const existingNames = new Set(existing.map((c: any) => c.name));
        return incoming
            .filter(Boolean)
            .map((char, idx) => ({
                id: char.id || `char_${Date.now()}_${idx}`,
                name: char.name || `角色${existing.length + idx + 1}`,
                age: char.age || '',
                personality: char.personality || '',
                appearance: char.appearance || '',
                background: char.background || '',
                relationships: char.relationships || '',
                role: (char.role === 'protagonist' || char.role === 'antagonist' || char.role === 'supporting') ? char.role : 'supporting',
                goal: char.goal || '',
                advantage: char.advantage || ''
            }))
            .filter(char => !existingNames.has(char.name));
    };

    const normalizeWorldPayload = (prevWorld: any, data: any) => {
        const incoming = data.world || {};

        const mergedWorld = {
            ...prevWorld,
            ...incoming,
            macro: { ...prevWorld.macro, ...(incoming.macro || {}) },
            conflict: { ...prevWorld.conflict, ...(incoming.conflict || {}) },
            power_system: { ...prevWorld.power_system, ...(incoming.power_system || {}) },
            economy: { ...prevWorld.economy, ...(incoming.economy || {}) },
            rules: { ...prevWorld.rules, ...(incoming.rules || {}) },
            history: { ...prevWorld.history, ...(incoming.history || {}) },
            space: { ...prevWorld.space, ...(incoming.space || {}) },
            information: { ...prevWorld.information, ...(incoming.information || {}) },
            order_keepers: { ...prevWorld.order_keepers, ...(incoming.order_keepers || {}) },
            aesthetic: { ...prevWorld.aesthetic, ...(incoming.aesthetic || {}) },
            mc_position: { ...prevWorld.mc_position, ...(incoming.mc_position || {}) },
            factions: incoming.factions || prevWorld.factions
        };

        if (!incoming.power_system && data.power_system) {
            mergedWorld.power_system = { ...mergedWorld.power_system, source: data.power_system };
        }
        if (!incoming.factions && data.main_faction) {
            mergedWorld.factions = [
                { name: data.main_faction, stance: "敌对", resources: "", relation_to_mc: "对立" },
                ...(prevWorld.factions || [])
            ];
        }
        if (!incoming.rules?.public_rules && data.world_details?.core_rules) {
            mergedWorld.rules = { ...mergedWorld.rules, public_rules: data.world_details.core_rules };
        }

        return mergedWorld;
    };

    const isSkeletonComplete = () => !!previewData.story_formula && !!previewData.volume1_goal;
    const isCharactersComplete = () => previewData.characters.length > 0;
    const isFirstChapterComplete = () => !!previewData.first_chapter_content && previewData.first_chapter_content.length > 100;
    const isWorldComplete = () => {
        const world = previewData.world || {};
        return !!(
            world.power_system?.source ||
            (world.power_system?.levels && world.power_system.levels.length > 0) ||
            (world.factions && world.factions.length > 0) ||
            world.macro?.era ||
            world.conflict?.main_contradiction
        );
    };
    const isOutlineComplete = () => previewData.outline.length > 0;

    const getMissingItems = () => {
        const missing = [];
        if (!isSkeletonComplete()) missing.push("骨架小纲");
        if (!isCharactersComplete()) missing.push("主要角色");
        if (!isFirstChapterComplete()) missing.push("首章试写");
        if (!isWorldComplete()) missing.push("世界观");
        if (!isOutlineComplete()) missing.push("大纲");
        return missing;
    };

    const tabConfig = [
        {
            key: 'unified' as TabType,
            label: '🤖 小创',
            prompt: `我是小创，你的创作助手！\n目前还缺少：${getMissingItems().join('、') || '无，已全部完成！'}\n告诉我你的想法，我来帮你完善...`
        },
        { key: 'skeleton' as TabType, label: '📐 骨架', prompt: '描述你的核心创意、金手指或故事公式...', complete: isSkeletonComplete() },
        { key: 'characters' as TabType, label: '👥 角色', prompt: '描述角色的背景、性格、目标...', complete: isCharactersComplete() },
        { key: 'first_chapter' as TabType, label: '✍️ 首章', prompt: '点击生成第一章，或输入创作思路...', complete: isFirstChapterComplete(), disabled: !isCharactersComplete() },
        { key: 'world' as TabType, label: '🌍 世界', prompt: '描述世界观、力量体系、主要势力...', complete: isWorldComplete(), disabled: !isFirstChapterComplete() },
        { key: 'outline' as TabType, label: '📋 大纲', prompt: '补充大纲需求或点击生成...', complete: isOutlineComplete(), disabled: !isWorldComplete() }
    ];

    const getInspirationContext = async (query: string): Promise<string> => {
        try {
            const insp = await api.inspiration(query);

            if (insp.error) {
                console.warn("Inspiration service returned error:", insp.error);
                if (insp.error === 'search_unavailable' || (insp.message && insp.message.includes("search_unavailable"))) {
                    toast('网络搜索暂时不可用，将使用内置知识', { icon: '⚠️', position: 'bottom-right' });
                } else {
                    toast.error(`灵感搜索错误: ${insp.message || '未知错误'}`, { position: 'bottom-right' });
                }
                return "";
            }

            if (insp.results && insp.results.length > 0) {
                toast.success(`已参考 ${insp.results.length} 条网络灵感`, { position: 'bottom-right' });
                return insp.results.map(r =>
                    `【${r.title}】${r.content.slice(0, 200)}... (来源: ${r.url})`
                ).join("\n\n");
            }
            return "";
        } catch (e: any) {
            console.error("Inspiration failed", e);
            toast.error('灵感搜索失败，将使用内置知识', { position: 'bottom-right' });
            return "";
        }
    };

    const handleGenerate = async (tab: TabType) => {
        if (!input.trim() && tab !== 'outline' && tab !== 'first_chapter') return;

        const currentInput = input; // Capture input value

        // Create new AbortController for this request
        const controller = new AbortController();
        setAbortController(controller);

        setLoadingStates(prev => ({ ...prev, [tab]: true }));
        setAiResponse('');

        // Clear input immediately after sending (only for unified tab)
        if (tab === 'unified') {
            setInput('');
            setChatHistory(prev => [...prev, { role: 'user', content: currentInput }]);
        }

        try {
            let fullResponse = '';

            if (tab === 'unified') {
                setAgentStatus("正在连接小创...");

                // Fetch inspiration for unified mode too
                // Use currentInput instead of input because input is cleared
                const inspirationContext = await getInspirationContext(currentInput);
                if (inspirationContext) {
                    setChatHistory(prev => [...prev, { role: 'system', content: "🔍 已联网搜索相关灵感" }]);
                }

                await api.generateUnified(currentInput, previewData, inspirationContext, (update) => {
                    if (update.type === 'status') {
                        setAgentStatus(update.message);
                    } else if (update.type === 'result') {
                        const data = update.data;

                        // Check for module completions and add system messages
                        if (data.concept) {
                            setChatHistory(prev => [...prev, { role: 'system', content: "✅ 核心概念构建完成" }]);
                        }
                        if (data.characters && data.characters.length > 0) {
                            setChatHistory(prev => [...prev, { role: 'system', content: "✅ 主要角色设定完成" }]);
                        }
                        if (data.world) {
                            setChatHistory(prev => [...prev, { role: 'system', content: "✅ 世界观架构完成" }]);
                        }
                        if (data.outline && data.outline.length > 0) {
                            setChatHistory(prev => [...prev, { role: 'system', content: "✅ 故事大纲生成完成" }]);
                        }
                        if (data.title && data.content) { // First chapter
                            setChatHistory(prev => [...prev, { role: 'system', content: "✅ 第一章撰写完成" }]);
                        }

                        // Add assistant response ONLY if it exists and is not empty
                        if (data.response && data.response.trim()) {
                            setChatHistory(prev => [...prev, { role: 'assistant', content: data.response }]);
                        }

                        // Merge unified data
                        setPreviewData((prev: any) => {
                            const newData = { ...prev };
                            if (data.concept) {
                                newData.title = data.concept.title || prev.title;
                                newData.genre = data.concept.genre || prev.genre;
                                newData.theme = data.concept.theme || prev.theme;
                            }
                            // Skeleton fields
                            if (data.story_formula) newData.story_formula = data.story_formula;
                            if (data.volume1_goal) newData.volume1_goal = data.volume1_goal;
                            if (data.golden_finger_rules) newData.golden_finger_rules = data.golden_finger_rules;
                            if (data.core_hook) newData.core_hook = data.core_hook;
                            if (data.emotional_tone) newData.emotional_tone = data.emotional_tone;

                            if (data.characters) {
                                const normalizedChars = normalizeCharacters(data.characters, prev.characters);
                                if (normalizedChars.length > 0) {
                                    newData.characters = [...prev.characters, ...normalizedChars];
                                }
                            }
                            if (data.world || data.power_system || data.main_faction || data.world_details) {
                                newData.world = normalizeWorldPayload(prev.world, data);
                            }
                            if (data.outline) {
                                newData.outline = data.outline;
                            }
                            if (data.title) {
                                newData.first_chapter_title = data.title;
                                newData.first_chapter_content = data.content;
                            }
                            return newData;
                        });
                    }
                });
            } else {
                // ... (existing logic for other tabs) ...
                // Note: I need to preserve the existing logic for other tabs which I'm not showing here to save space in the tool call, 
                // but since I'm replacing a large block, I must be careful.
                // The prompt says "Update chatHistory type, handleGenerate logic...".
                // I will include the rest of handleGenerate to be safe.

                if (tab === 'skeleton') {
                    const inspirationContext = await getInspirationContext(input);

                    await api.generateSkeleton(input, inspirationContext, (chunk) => {
                        fullResponse += chunk;
                    });
                } else if (tab === 'characters') {
                    // Add inspiration for characters
                    const inspirationContext = await getInspirationContext(input + " 角色设定");
                    // Note: generateProtagonist doesn't support inspiration_context yet in the API signature in api.ts, 
                    // but we can append it to user input as a workaround or update api.ts.
                    // The plan said "Update generateUnified", but for others we might need to append to input if we don't change their API.
                    // Let's append to input for now to be safe and minimally invasive, or better, let's just update the API signature if we can.
                    // Actually, the plan didn't explicitly say we'd update generateProtagonist signature. 
                    // Let's append it to input for characters and world for now, as it's the safest way without changing all backend signatures.
                    // Wait, generateUnified supports it. 
                    // For characters/world, let's append to input.

                    const effectiveInput = inspirationContext ? `${input}\n\n参考灵感:\n${inspirationContext}` : input;

                    await api.generateProtagonist(effectiveInput, previewData, (chunk) => {
                        fullResponse += chunk;
                    });
                } else if (tab === 'world') {
                    const inspirationContext = await getInspirationContext(input + " 世界观设定");
                    const effectiveInput = inspirationContext ? `${input}\n\n参考灵感:\n${inspirationContext}` : input;

                    await api.generateWorld(effectiveInput, previewData, (chunk) => {
                        fullResponse += chunk;
                    });
                } else if (tab === 'outline') {
                    await api.generateOutline(input || "根据已有信息生成完整大纲", previewData, (chunk) => {
                        fullResponse += chunk;
                    });
                } else if (tab === 'first_chapter') {
                    await api.generateFirstChapter(input || "根据大纲撰写第一章", previewData, (chunk) => {
                        fullResponse += chunk;
                    });
                }

                // Extract JSON from response for non-unified tabs
                const jsonMatch = fullResponse.match(/\{[\s\S]*\}/);
                if (!jsonMatch) {
                    throw new Error("No valid JSON found in response");
                }
                const data = JSON.parse(jsonMatch[0]);

                if (tab === 'characters') {
                    setPreviewData((prev: any) => ({
                        ...prev,
                        characters: data.characters
                            ? [...prev.characters, ...normalizeCharacters(data.characters, prev.characters)]
                            : prev.characters
                    }));
                } else if (tab === 'first_chapter') {
                    setPreviewData((prev: any) => ({
                        ...prev,
                        first_chapter_title: data.title || prev.first_chapter_title,
                        first_chapter_content: data.content || prev.first_chapter_content
                    }));
                } else if (tab === 'skeleton') {
                    setPreviewData((prev: any) => ({
                        ...prev,
                        story_formula: data.story_formula || prev.story_formula,
                        volume1_goal: data.volume1_goal || prev.volume1_goal,
                        golden_finger_rules: data.golden_finger_rules || prev.golden_finger_rules,
                        core_hook: data.core_hook || prev.core_hook,
                        emotional_tone: data.emotional_tone || prev.emotional_tone,
                        title: data.title || prev.title // Update title from skeleton generation
                    }));
                } else if (tab === 'world') {
                    setPreviewData((prev: any) => ({
                        ...prev,
                        world: normalizeWorldPayload(prev.world, data)
                    }));
                } else {
                    setPreviewData((prev: any) => ({ ...prev, ...data }));
                }

                setAiResponse(data.response || "AI 已更新内容，请查看右侧预览。");
            }

            setInput('');

        } catch (error: any) {
            console.error("Generation error:", error);
            setAiResponse(`错误: ${error.message}`);
        } finally {
            setLoadingStates(prev => ({ ...prev, [tab]: false }));
            setAbortController(null);
        }
    };

    const handleStop = () => {
        if (abortController) {
            abortController.abort();
            setAbortController(null);
            setLoadingStates({
                unified: false,
                skeleton: false,
                characters: false,
                first_chapter: false,
                world: false,
                outline: false
            });
            setAgentStatus('');
        }
    };

    const getProgress = () => {
        const steps = [
            isSkeletonComplete(),
            isCharactersComplete(),
            isWorldComplete(),
            isOutlineComplete(),
            isFirstChapterComplete()
        ];
        const completed = steps.filter(Boolean).length;
        return (completed / steps.length) * 100;
    };

    const canComplete = isFirstChapterComplete();

    return (
        <div className="flex h-full bg-slate-950 text-slate-200">
            <Toaster />
            {/* Left: Input and Generation Controls */}
            <div className="flex-1 flex flex-col border-r border-slate-800 max-w-2xl">
                <div className="p-6 border-b border-slate-800 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                        <Sparkles className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-white">创世向导</h2>
                        <p className="text-xs text-slate-400">AI 驱动的世界构建</p>
                    </div>
                </div>

                {/* Tab Navigation */}
                <div className="flex border-b border-slate-800 bg-slate-900/50">
                    {tabConfig.map(tab => (
                        <button
                            key={tab.key}
                            onClick={() => !tab.disabled && setActiveTab(tab.key)}
                            disabled={tab.disabled}
                            className={`flex-1 px-4 py-3 text-sm font-medium transition-all flex items-center justify-center gap-2 ${activeTab === tab.key
                                ? 'text-indigo-400 border-b-2 border-indigo-500 bg-slate-900'
                                : tab.disabled
                                    ? 'text-slate-700 cursor-not-allowed'
                                    : 'text-slate-500 hover:text-slate-300 hover:bg-slate-900/30'
                                }`}
                        >
                            {tab.label}
                            {/* @ts-ignore */}
                            {tab.complete && <Check className="w-3 h-3 text-emerald-500" />}
                        </button>
                    ))}
                </div>

                {/* Content Area */}
                <div className="flex-1 flex flex-col min-h-0">
                    {/* Advisor Panel (Red Box) - Only visible on 'unified' tab */}
                    {activeTab === 'unified' && (
                        <div className="p-4 bg-slate-900/50 border-b border-slate-800 shrink-0">
                            <div className="flex items-start gap-3">
                                <div className="p-2 bg-indigo-500/10 rounded-lg shrink-0">
                                    <Sparkles className="w-4 h-4 text-indigo-400" />
                                </div>
                                <div className="text-sm">
                                    <h3 className="font-medium text-indigo-300 mb-1">创作向导</h3>
                                    <p className="text-slate-400 leading-relaxed">
                                        {getMissingItems().length > 0 ? (
                                            <>
                                                目前还需完善：
                                                <span className="text-amber-400 font-medium mx-1">
                                                    {getMissingItems().join('、')}
                                                </span>
                                                。
                                                <br />
                                                <span className="text-slate-500 text-xs mt-1 block">
                                                    建议：{getMissingItems().includes('骨架小纲') ? '先确定故事公式和第一卷目标。' :
                                                        getMissingItems().includes('主要角色') ? '设定主角的性格和金手指。' :
                                                            getMissingItems().includes('首章试写') ? '生成试读章节以验证钩子。' :
                                                                getMissingItems().includes('世界观') ? '构建独特的力量体系。' : '生成大纲以规划剧情走向。'}
                                                </span>
                                            </>
                                        ) : (
                                            <span className="text-emerald-400">
                                                基础设定已全部完成！您可以随时开始写作，或者继续与我对话打磨细节。
                                            </span>
                                        )}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Chat Area (Green Box) - Only on 'unified' tab */}
                    {activeTab === 'unified' ? (
                        <div className="flex-1 flex flex-col min-h-0">
                            <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
                                {chatHistory.length === 0 && (
                                    <div className="text-center py-12 text-slate-500">
                                        <p>我是小创，您的全能创作助手。</p>
                                        <p className="text-xs mt-2">您可以直接告诉我想法，或者问我任何创作问题。</p>
                                    </div>
                                )}
                                {chatHistory.map((msg, idx) => (
                                    <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : msg.role === 'system' ? 'justify-center' : 'justify-start'}`}>
                                        {msg.role === 'system' ? (
                                            <div className="bg-slate-900/80 border border-indigo-500/30 text-indigo-300 px-3 py-1 rounded-full text-xs font-mono tracking-wide shadow-[0_0_10px_rgba(99,102,241,0.2)] animate-in fade-in zoom-in-95 duration-300">
                                                {msg.content}
                                            </div>
                                        ) : (
                                            <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${msg.role === 'user'
                                                ? 'bg-indigo-600 text-white rounded-br-none'
                                                : 'bg-slate-800 text-slate-200 rounded-bl-none border border-slate-700'
                                                }`}>
                                                {msg.content}
                                            </div>
                                        )}
                                    </div>
                                ))}
                                {loadingStates.unified && (
                                    <div className="flex justify-start">
                                        <div className="bg-slate-800 rounded-2xl rounded-bl-none px-4 py-3 border border-slate-700 flex items-center gap-2">
                                            <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
                                            <span className="text-xs text-slate-400">{agentStatus || "思考中..."}</span>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Chat Input */}
                            <div className="p-4 border-t border-slate-800 bg-slate-900/30">
                                <div className="relative flex items-end gap-2 bg-slate-950 border border-slate-800 rounded-xl p-2 focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500 transition-all">
                                    <textarea
                                        value={input}
                                        onChange={(e) => setInput(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && !e.shiftKey) {
                                                e.preventDefault();
                                                handleGenerate('unified');
                                            }
                                        }}
                                        placeholder="输入想法或提问..."
                                        className="flex-1 bg-transparent border-none focus:ring-0 text-slate-200 placeholder-slate-600 resize-none min-h-[40px] max-h-[120px] py-2 px-2 text-sm"
                                        rows={1}
                                        style={{ height: 'auto' }}
                                    />
                                    <button
                                        onClick={() => handleGenerate('unified')}
                                        disabled={loadingStates.unified || !input.trim()}
                                        className="p-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:hover:bg-indigo-600 rounded-lg text-white transition-colors shrink-0 mb-0.5"
                                    >
                                        <Send className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        </div >
                    ) : (
                        /* Standard Interface for other tabs */
                        <>
                            <div className="flex-1 overflow-y-auto p-6">
                                {aiResponse && (
                                    <div className="mb-6 p-4 bg-slate-900 border border-slate-800 rounded-xl text-sm text-slate-300 leading-relaxed animate-in fade-in slide-in-from-bottom-2">
                                        <div className="flex items-center gap-2 mb-2 text-indigo-400">
                                            <Sparkles className="w-4 h-4" />
                                            <span className="font-semibold">AI 建议</span>
                                        </div>
                                        {aiResponse}
                                    </div>
                                )}
                                <div className="space-y-4">
                                    <h3 className="text-lg font-semibold text-white">
                                        {activeTab === 'concept' && '定义核心概念'}
                                        {activeTab === 'characters' && '塑造主要角色'}
                                        {activeTab === 'world' && '构建世界观'}
                                        {activeTab === 'outline' && '生成故事大纲'}
                                        {activeTab === 'first_chapter' && '撰写第一章'}
                                    </h3>
                                    <p className="text-sm text-slate-400">
                                        {activeTab === 'concept' && '输入你的小说核心概念、流派或创意灵感，AI 会帮你生成书名、流派定位和核心主题。'}
                                        {activeTab === 'characters' && '描述主角的背景、性格特点和目标，AI 会完善主角设定和成长弧线。'}
                                        {activeTab === 'world' && '说明世界观的力量体系、主要势力和规则，AI 会构建完整的世界架构。'}
                                        {activeTab === 'outline' && '基于已有设定，AI 会生成完整的卷-章结构大纲，包含伏笔、暗线和情绪节奏设计。'}
                                        {activeTab === 'first_chapter' && '基于所有设定和大纲，AI 将为你撰写开篇第一章。请确保大纲已生成。'}
                                    </p>
                                </div>
                            </div>
                            <div className="p-4 border-t border-slate-800 bg-slate-900/50">
                                <div className="relative">
                                    <textarea
                                        value={input}
                                        onChange={(e) => setInput(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && !e.shiftKey) {
                                                e.preventDefault();
                                                handleGenerate(activeTab);
                                            }
                                        }}
                                        placeholder={tabConfig.find(t => t.key === activeTab)?.prompt}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-xl py-4 pl-5 pr-14 text-slate-200 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all shadow-inner resize-none min-h-[60px]"
                                        rows={3}
                                    />
                                    <button
                                        onClick={() => loadingStates[activeTab] ? handleStop() : handleGenerate(activeTab)}
                                        className="absolute right-3 bottom-3 aspect-square bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:hover:bg-indigo-600 rounded-lg p-2 flex items-center justify-center transition-all text-white shadow-lg shadow-indigo-900/20"
                                    >
                                        {loadingStates[activeTab] ? (
                                            <span className="text-xs font-bold">终止</span>
                                        ) : (
                                            <Sparkles className="w-5 h-5" />
                                        )}
                                    </button>
                                </div>
                            </div>
                        </>
                    )}
                </div >
            </div >

            {/* Right: Live Preview */}
            < div className="flex-1 bg-slate-900 border-l border-slate-800 p-6 flex flex-col min-w-[400px]" >
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-6">项目蓝图</h3>

                <div className="space-y-6 flex-1 overflow-y-auto">
                    {(activeTab === 'unified' || activeTab === 'skeleton') && (
                        <>
                            <div className="mb-6 pb-6 border-b border-slate-800">
                                <label className="text-xs text-slate-500 mb-1 block">项目名称 (书名)</label>
                                <EditableField
                                    value={previewData.title}
                                    onChange={(value) => setPreviewData((prev: any) => ({ ...prev, title: value }))}
                                    className="text-xl font-bold text-white"
                                    editClassName="text-xl font-bold"
                                />
                            </div>

                            <div>
                                <label className="text-xs text-slate-500 mb-1 block">故事公式</label>
                                <EditableField
                                    value={previewData.story_formula}
                                    onChange={(value) => setPreviewData((prev: any) => ({ ...prev, story_formula: value }))}
                                    multiline
                                    className="text-sm font-medium text-indigo-300"
                                    editClassName="text-sm"
                                />
                            </div>

                            <div>
                                <label className="text-xs text-slate-500 mb-1 block">第一卷目标</label>
                                <EditableField
                                    value={previewData.volume1_goal}
                                    onChange={(value) => setPreviewData((prev: any) => ({ ...prev, volume1_goal: value }))}
                                    multiline
                                    className="text-sm text-slate-300"
                                    editClassName="text-sm"
                                />
                            </div>

                            <div>
                                <label className="text-xs text-slate-500 mb-1 block">核心钩子</label>
                                <EditableField
                                    value={previewData.core_hook}
                                    onChange={(value) => setPreviewData((prev: any) => ({ ...prev, core_hook: value }))}
                                    className="text-sm text-amber-400"
                                    editClassName="text-sm"
                                />
                            </div>

                            <div>
                                <label className="text-xs text-slate-500 mb-1 block">情绪基调</label>
                                <EditableField
                                    value={previewData.emotional_tone}
                                    onChange={(value) => setPreviewData((prev: any) => ({ ...prev, emotional_tone: value }))}
                                    className="px-2 py-1 rounded bg-slate-800 text-xs text-slate-300 border border-slate-700 inline-block"
                                    editClassName="text-xs"
                                />
                            </div>

                            <div>
                                <label className="text-xs text-slate-500 mb-1 block">金手指规则</label>
                                <div className="space-y-1">
                                    {previewData.golden_finger_rules.length > 0 ? (
                                        previewData.golden_finger_rules.map((rule: string, idx: number) => (
                                            <div key={idx} className="text-xs text-slate-400 bg-slate-900/50 px-2 py-1 rounded border border-slate-800">
                                                {idx + 1}. {rule}
                                            </div>
                                        ))
                                    ) : (
                                        <div className="text-xs text-slate-600 italic">暂无规则</div>
                                    )}
                                </div>
                            </div>
                        </>
                    )}

                    {(activeTab === 'unified' || activeTab === 'characters') && (
                        <div>
                            <CharacterListEditor
                                characters={previewData.characters}
                                onChange={(chars) => setPreviewData((prev: any) => ({ ...prev, characters: chars }))}
                            />
                        </div>
                    )}

                    {(activeTab === 'unified' || activeTab === 'world') && (
                        <div className="space-y-6">
                            {/* Macro */}
                            <div>
                                <h4 className="text-xs font-bold text-slate-400 uppercase mb-2">宏观背景</h4>
                                <div className="space-y-2">
                                    <div>
                                        <label className="text-xs text-slate-500">时代</label>
                                        <EditableField
                                            value={previewData.world.macro.era}
                                            onChange={(value) => setPreviewData((prev: any) => ({ ...prev, world: { ...prev.world, macro: { ...prev.world.macro, era: value } } }))}
                                            className="text-sm text-slate-300"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs text-slate-500">空间结构</label>
                                        <EditableField
                                            value={previewData.world.macro.space_structure}
                                            onChange={(value) => setPreviewData((prev: any) => ({ ...prev, world: { ...prev.world, macro: { ...prev.world.macro, space_structure: value } } }))}
                                            className="text-sm text-slate-300"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Power System */}
                            <div>
                                <h4 className="text-xs font-bold text-slate-400 uppercase mb-2">力量体系</h4>
                                <div className="space-y-2">
                                    <div>
                                        <label className="text-xs text-slate-500">力量来源</label>
                                        <EditableField
                                            value={previewData.world.power_system.source}
                                            onChange={(value) => setPreviewData((prev: any) => ({ ...prev, world: { ...prev.world, power_system: { ...prev.world.power_system, source: value } } }))}
                                            className="text-sm text-amber-300"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs text-slate-500 mb-1 block">境界</label>
                                        {previewData.world.power_system.levels.length > 0 ? (
                                            <div className="space-y-1">
                                                {previewData.world.power_system.levels.map((lv: any, idx: number) => (
                                                    <div key={idx} className="text-xs text-slate-400 bg-slate-900/50 px-2 py-1 rounded border border-slate-800">
                                                        {lv.name}: {lv.description}
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="text-xs text-slate-600 italic">暂无境界</div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Factions */}
                            <div>
                                <h4 className="text-xs font-bold text-slate-400 uppercase mb-2">势力格局</h4>
                                {previewData.world.factions.length > 0 ? (
                                    <div className="space-y-2">
                                        {previewData.world.factions.map((faction: any, idx: number) => (
                                            <div key={idx} className="bg-slate-900/50 p-2 rounded border border-slate-800">
                                                <div className="text-sm font-medium text-indigo-300">{faction.name}</div>
                                                <div className="text-xs text-slate-500">{faction.stance} | {faction.relation_to_mc}</div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-xs text-slate-600 italic">暂无势力</div>
                                )}
                            </div>

                            {/* Economy */}
                            <div>
                                <h4 className="text-xs font-bold text-slate-400 uppercase mb-2">经济/资源</h4>
                                <div className="space-y-2">
                                    <div>
                                        <label className="text-xs text-slate-500">货币</label>
                                        <div className="text-sm text-slate-300">
                                            {previewData.world.economy.currencies.length > 0
                                                ? previewData.world.economy.currencies.join(', ')
                                                : '未设定'}
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-xs text-slate-500">获取方式</label>
                                        <EditableField
                                            value={previewData.world.economy.acquisition}
                                            onChange={(value) => setPreviewData((prev: any) => ({ ...prev, world: { ...prev.world, economy: { ...prev.world.economy, acquisition: value } } }))}
                                            className="text-sm text-slate-300"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Rules */}
                            <div>
                                <h4 className="text-xs font-bold text-slate-400 uppercase mb-2">规则 & 禁忌</h4>
                                <div>
                                    <label className="text-xs text-slate-500 mb-1 block">公开规则</label>
                                    {previewData.world.rules.public_rules.length > 0 ? (
                                        <div className="space-y-1">
                                            {previewData.world.rules.public_rules.map((rule: string, idx: number) => (
                                                <div key={idx} className="text-xs text-slate-400 bg-slate-900/50 px-2 py-1 rounded border border-slate-800">
                                                    {idx + 1}. {rule}
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-xs text-slate-600 italic">暂无规则</div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {(activeTab === 'unified' || activeTab === 'outline') && (
                        <div>
                            {previewData.outline.length > 0 ? (
                                <OutlineEditor
                                    outline={previewData.outline}
                                    onChange={(outline) => setPreviewData((prev: any) => ({ ...prev, outline }))}
                                />
                            ) : (
                                <div className="text-center py-8 text-slate-500 border-2 border-dashed border-slate-800 rounded-xl">
                                    <p>暂无大纲</p>
                                    <button
                                        onClick={() => handleGenerate('outline')}
                                        className="mt-2 text-indigo-400 hover:text-indigo-300 text-sm"
                                    >
                                        点击生成大纲
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {(activeTab === 'unified' || activeTab === 'first_chapter') && (
                        <div className="space-y-4">
                            <div>
                                <label className="text-xs text-slate-500 mb-1 block">章节标题</label>
                                <EditableField
                                    value={previewData.first_chapter_title || "第一章：未命名"}
                                    onChange={(value) => setPreviewData((prev: any) => ({ ...prev, first_chapter_title: value }))}
                                    className="text-lg font-bold text-slate-200"
                                />
                            </div>
                            <div>
                                <label className="text-xs text-slate-500 mb-1 block">正文内容</label>
                                <textarea
                                    value={previewData.first_chapter_content || ""}
                                    onChange={(e) => setPreviewData((prev: any) => ({ ...prev, first_chapter_content: e.target.value }))}
                                    className="w-full h-[400px] bg-slate-950 border border-slate-800 rounded-lg p-4 text-slate-300 leading-relaxed focus:outline-none focus:border-indigo-500 resize-none font-serif"
                                    placeholder="点击左侧生成按钮，AI 将为您撰写第一章..."
                                />
                            </div>
                        </div>
                    )}
                </div>

                {
                    canComplete && (
                        <button
                            onClick={async () => {
                                try {
                                    // Synthesize description from Genesis data
                                    const synthesizedDescription = `【故事公式】\n${previewData.story_formula || '未设定'}\n\n【核心钩子】\n${previewData.core_hook || '未设定'}\n\n【情感基调】\n${previewData.emotional_tone || '未设定'}\n\n【第一卷目标】\n${previewData.volume1_goal || '未设定'}`;

                                    const newProject = await api.createProject(
                                        previewData.title,
                                        synthesizedDescription,
                                        {
                                            genre: previewData.genre,
                                            theme: previewData.theme,
                                            story_formula: previewData.story_formula,
                                            volume1_goal: previewData.volume1_goal,
                                            core_hook: previewData.core_hook,
                                            emotional_tone: previewData.emotional_tone,
                                            golden_finger_rules: previewData.golden_finger_rules,

                                            characters: previewData.characters,

                                            // Pass the FULL world object
                                            world: previewData.world,

                                            // Legacy/Direct access fields (optional, but good for backward compat if needed)
                                            power_system: previewData.world.power_system,
                                            main_faction: previewData.world.factions?.[0]?.name,

                                            outline: previewData.outline,
                                            first_chapter_title: previewData.first_chapter_title,
                                            first_chapter_content: previewData.first_chapter_content
                                        }
                                    );
                                    onComplete(newProject.id);
                                } catch (e) {
                                    console.error("Failed to create project", e);
                                    alert("创建项目失败，请检查后端服务。");
                                }
                            }}
                            className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold shadow-lg shadow-emerald-900/20 flex items-center justify-center gap-2 animate-in fade-in slide-in-from-bottom-4 mt-6"
                        >
                            <Check className="w-5 h-5" />
                            开始写作
                        </button>
                    )
                }

                <div className="mt-8 pt-6 border-t border-slate-800">
                    <div className="flex justify-between items-center text-xs text-slate-500 mb-2">
                        <span>进度</span>
                        <span>{Math.round(getProgress())}%</span>
                    </div>
                    <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-indigo-500 transition-all duration-500 ease-out"
                            style={{ width: `${getProgress()}%` }}
                        />
                    </div>
                </div>
            </div >
        </div >
    );
};

export default GenesisWizard;
