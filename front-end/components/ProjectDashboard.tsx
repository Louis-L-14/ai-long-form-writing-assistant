import React, { useState, useEffect } from 'react';
import {
    BookOpen, Users, Globe, FileText, ChevronLeft, Edit3,
    Save, Plus, MoreHorizontal, Layout, Tag, Clock, MapPin, Sparkles
} from 'lucide-react';
import { api } from '../api';

interface ProjectDashboardProps {
    projectId: string;
    onBack: () => void;
    onOpenStudio: (chapterId: string) => void;
}

import OutlineEditor from './OutlineEditor';
import Wiki from './Wiki';
import EditableField from './EditableField';
import TitleSuggestionModal from './TitleSuggestionModal';
import { OutlineVolume } from '../types';

// ... (imports)

const ProjectDashboard: React.FC<ProjectDashboardProps> = ({ projectId, onBack, onOpenStudio }) => {
    const [project, setProject] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'overview' | 'wiki'>('overview');
    const [outlineData, setOutlineData] = useState<OutlineVolume[]>([]);
    const [showTitleModal, setShowTitleModal] = useState(false);

    useEffect(() => {
        loadProject();
    }, [projectId]);

    const loadProject = async () => {
        try {
            const data = await api.getProject(projectId);
            setProject(data);
            // Initialize outline data from meta_info
            if (data.meta_info?.outline && Array.isArray(data.meta_info.outline)) {
                setOutlineData(data.meta_info.outline);
            }
        } catch (e) {
            console.error("Failed to load project", e);
        } finally {
            setLoading(false);
        }
    };

    const handleProjectNameChange = async (newName: string) => {
        try {
            await api.updateProject(projectId, { name: newName });
            setProject((prev: any) => ({ ...prev, name: newName }));
        } catch (e) {
            console.error("Failed to update project name", e);
            alert("项目名称更新失败");
        }
    };

    const handleTitleSelect = async (title: string) => {
        await handleProjectNameChange(title);
    };

    if (loading) return <div className="flex h-full items-center justify-center text-slate-500">加载中...</div>;
    if (!project) return <div className="flex h-full items-center justify-center text-red-400">项目加载失败</div>;

    const meta = project.meta_info || {};

    return (
        <div className="flex flex-col h-full w-full bg-slate-950 text-slate-200 overflow-y-auto animate-in fade-in zoom-in-95 duration-300">
            {/* Header */}
            <div className="bg-slate-900 border-b border-slate-800 sticky top-0 z-10">
                <div className="max-w-6xl mx-auto px-6 py-4">
                    <div className="flex items-center gap-4 mb-4">
                        <button onClick={onBack} className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 transition-colors">
                            <ChevronLeft className="w-5 h-5" />
                        </button>
                        <EditableField
                            value={project.name}
                            onChange={handleProjectNameChange}
                            className="text-2xl font-bold text-white"
                            editClassName="text-2xl font-bold"
                        />
                        <button
                            onClick={() => setShowTitleModal(true)}
                            className="p-1.5 rounded-md transition-all bg-gradient-to-r from-purple-500/10 to-indigo-500/10 border border-purple-500/20 text-purple-400 hover:from-purple-500/20 hover:to-indigo-500/20 hover:border-purple-500/40 hover:text-purple-300 hover:shadow-lg hover:shadow-purple-500/20 active:scale-95"
                            title="AI生成书名建议"
                        >
                            <Sparkles className="w-4 h-4" />
                        </button>
                        <span className="px-2 py-1 bg-indigo-500/10 text-indigo-400 text-xs rounded border border-indigo-500/20">
                            {meta.genre || '未分类'}
                        </span>
                    </div>

                    <div className="flex gap-6 text-sm text-slate-400 pl-11">
                        <button
                            onClick={() => setActiveTab('overview')}
                            className={`pb-2 border-b-2 transition-colors ${activeTab === 'overview' ? 'text-indigo-400 border-indigo-500' : 'border-transparent hover:text-slate-200'}`}
                        >
                            概览 & 大纲
                        </button>
                        <button
                            onClick={() => setActiveTab('wiki')}
                            className={`pb-2 border-b-2 transition-colors ${activeTab === 'wiki' ? 'text-indigo-400 border-indigo-500' : 'border-transparent hover:text-slate-200'}`}
                        >
                            时空百科 (Wiki)
                        </button>
                    </div>
                </div>
            </div>

            <div className="max-w-6xl mx-auto w-full p-6 space-y-6">

                {activeTab === 'overview' && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Left Column: Info & Outline */}
                        <div className="lg:col-span-2 space-y-6">
                            {/* Basic Info Card */}
                            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                                <div className="flex justify-between items-start mb-4">
                                    <h3 className="font-bold text-lg text-slate-100 flex items-center gap-2">
                                        <FileText className="w-5 h-5 text-indigo-500" />
                                        简介
                                    </h3>
                                    <button className="text-slate-500 hover:text-indigo-400"><Edit3 className="w-4 h-4" /></button>
                                </div>
                                <p className="text-slate-400 leading-relaxed">
                                    {project.description || meta.theme || "暂无简介..."}
                                </p>
                                <div className="mt-4 flex flex-wrap gap-2">
                                    {meta.theme && (
                                        <span className="flex items-center gap-1 px-2 py-1 bg-slate-800 rounded text-xs text-slate-300">
                                            <Tag className="w-3 h-3" /> {meta.theme}
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Outline Card */}
                            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="font-bold text-lg text-slate-100 flex items-center gap-2">
                                        <Layout className="w-5 h-5 text-indigo-500" />
                                        大纲
                                    </h3>
                                    <button
                                        onClick={async () => {
                                            try {
                                                await api.updateProject(projectId, {
                                                    meta_info: { outline: outlineData }
                                                });
                                                alert("大纲已保存");
                                            } catch (e) {
                                                console.error("Failed to save outline", e);
                                                alert("保存失败");
                                            }
                                        }}
                                        className="text-indigo-400 hover:text-indigo-300 flex items-center gap-1 text-sm"
                                    >
                                        <Save className="w-4 h-4" /> 保存
                                    </button>
                                </div>
                                <div className="max-h-[600px] overflow-y-auto pr-2">
                                    <OutlineEditor
                                        outline={outlineData}
                                        onChange={setOutlineData}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Right Column: Chapters & Stats */}
                        <div className="space-y-6">
                            {/* Chapters Card */}
                            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="font-bold text-lg text-slate-100 flex items-center gap-2">
                                        <BookOpen className="w-5 h-5 text-indigo-500" />
                                        章节
                                    </h3>
                                    <button className="p-1 hover:bg-slate-800 rounded text-indigo-400">
                                        <Plus className="w-5 h-5" />
                                    </button>
                                </div>
                                <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2">
                                    {project.chapters?.map((chapter: any) => (
                                        <div
                                            key={chapter.id}
                                            onClick={() => onOpenStudio(chapter.id)}
                                            className="group p-3 rounded-lg bg-slate-950 border border-slate-800 hover:border-indigo-500/50 cursor-pointer transition-all"
                                        >
                                            <div className="flex justify-between items-center mb-1">
                                                <span className="font-medium text-slate-200 group-hover:text-indigo-400 transition-colors">
                                                    第{chapter.chapter_number}章: {chapter.title}
                                                </span>
                                                <span className="text-[10px] text-slate-600 bg-slate-900 px-1.5 py-0.5 rounded">
                                                    {chapter.content?.length || 0} 字
                                                </span>
                                            </div>
                                            <p className="text-xs text-slate-500 line-clamp-1">
                                                {chapter.summary || "暂无摘要..."}
                                            </p>
                                        </div>
                                    ))}
                                    {(!project.chapters || project.chapters.length === 0) && (
                                        <div className="text-center py-8 text-slate-500 text-sm">
                                            暂无章节，点击右上角添加
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'wiki' && (
                    <div className="h-[calc(100vh-200px)]">
                        <Wiki project={project} />
                    </div>
                )}

            </div>

            <TitleSuggestionModal
                isOpen={showTitleModal}
                onClose={() => setShowTitleModal(false)}
                onSelect={handleTitleSelect}
                projectData={{
                    genre: meta.genre,
                    theme: meta.theme,
                    description: project.description,
                    story_formula: meta.story_formula,
                    core_hook: meta.core_hook,
                    // Pass rich data for deep analysis
                    outline: outlineData,
                    characters: meta.characters,
                    world_details: meta.world_details,
                    power_system: meta.power_system,
                    main_faction: meta.main_faction
                }}
            />
        </div>
    );
};

export default ProjectDashboard;
