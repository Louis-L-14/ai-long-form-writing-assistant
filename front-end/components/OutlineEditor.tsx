import React, { useState } from 'react';
import { Plus, Trash2, GripVertical, ChevronDown, ChevronRight } from 'lucide-react';
import { OutlineVolume, OutlineChapter } from '../types';

interface OutlineEditorProps {
    outline: OutlineVolume[];
    onChange: (outline: OutlineVolume[]) => void;
}

const OutlineEditor: React.FC<OutlineEditorProps> = ({ outline, onChange }) => {
    const [expandedVolumes, setExpandedVolumes] = useState<Set<string>>(
        new Set(outline.map(v => v.id))
    );
    const [expandedChapters, setExpandedChapters] = useState<Set<string>>(new Set());

    const toggleVolume = (volumeId: string) => {
        const newExpanded = new Set(expandedVolumes);
        if (newExpanded.has(volumeId)) {
            newExpanded.delete(volumeId);
        } else {
            newExpanded.add(volumeId);
        }
        setExpandedVolumes(newExpanded);
    };

    const toggleChapter = (chapterId: string) => {
        const newExpanded = new Set(expandedChapters);
        if (newExpanded.has(chapterId)) {
            newExpanded.delete(chapterId);
        } else {
            newExpanded.add(chapterId);
        }
        setExpandedChapters(newExpanded);
    };

    const addVolume = () => {
        const newVolume: OutlineVolume = {
            id: `volume_${Date.now()}`,
            title: `第${outline.length + 1}卷`,
            summary: '',
            detailed_outline: '',
            chapters: []
        };
        onChange([...outline, newVolume]);
        setExpandedVolumes(new Set([...expandedVolumes, newVolume.id]));
    };

    const removeVolume = (volumeId: string) => {
        onChange(outline.filter(v => v.id !== volumeId));
        const newExpanded = new Set(expandedVolumes);
        newExpanded.delete(volumeId);
        setExpandedVolumes(newExpanded);
    };

    const updateVolume = (volumeId: string, field: keyof OutlineVolume, value: string) => {
        onChange(outline.map(v => v.id === volumeId ? { ...v, [field]: value } : v));
    };

    const addChapter = (volumeId: string) => {
        onChange(outline.map(v => {
            if (v.id === volumeId) {
                const newChapter: OutlineChapter = {
                    id: `chapter_${Date.now()}`,
                    title: `第${v.chapters.length + 1}章`,
                    summary: '',
                    detailed_outline: ''
                };
                return { ...v, chapters: [...v.chapters, newChapter] };
            }
            return v;
        }));
    };

    const removeChapter = (volumeId: string, chapterId: string) => {
        onChange(outline.map(v => {
            if (v.id === volumeId) {
                return { ...v, chapters: v.chapters.filter(c => c.id !== chapterId) };
            }
            return v;
        }));
    };

    const updateChapter = (volumeId: string, chapterId: string, field: keyof OutlineChapter, value: string) => {
        onChange(outline.map(v => {
            if (v.id === volumeId) {
                return {
                    ...v,
                    chapters: v.chapters.map(c => c.id === chapterId ? { ...c, [field]: value } : c)
                };
            }
            return v;
        }));
    };

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between mb-4">
                <h4 className="text-sm font-medium text-slate-300">故事大纲</h4>
                <button
                    onClick={addVolume}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-md text-xs flex items-center gap-1 transition-colors"
                >
                    <Plus className="w-3 h-3" />
                    添加卷
                </button>
            </div>

            {outline.length === 0 && (
                <div className="text-center py-8 text-slate-500 text-sm">
                    暂无大纲，点击上方"添加卷"开始创建
                </div>
            )}

            {outline.map((volume, volumeIndex) => (
                <div key={volume.id} className="bg-slate-800/30 rounded-lg border border-slate-700">
                    {/* Volume Header */}
                    <div className="flex items-center gap-2 p-3 border-b border-slate-700">
                        <button
                            onClick={() => toggleVolume(volume.id)}
                            className="text-slate-400 hover:text-slate-200 transition-colors"
                        >
                            {expandedVolumes.has(volume.id) ? (
                                <ChevronDown className="w-4 h-4" />
                            ) : (
                                <ChevronRight className="w-4 h-4" />
                            )}
                        </button>
                        <GripVertical className="w-4 h-4 text-slate-600" />
                        <input
                            type="text"
                            value={volume.title}
                            onChange={(e) => updateVolume(volume.id, 'title', e.target.value)}
                            className="flex-1 bg-transparent border-none text-slate-200 font-medium focus:outline-none focus:text-indigo-400 px-2 py-1"
                            placeholder="卷标题"
                        />
                        <span className="text-xs text-slate-500">{volume.chapters.length} 章</span>
                        <button
                            onClick={() => removeVolume(volume.id)}
                            className="text-slate-500 hover:text-red-400 transition-colors"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Volume Content */}
                    {expandedVolumes.has(volume.id) && (
                        <div className="p-3 space-y-4">
                            {/* Volume Details */}
                            <div className="space-y-2 px-2">
                                <div>
                                    <label className="text-[10px] text-slate-500 uppercase tracking-wider">卷简介</label>
                                    <textarea
                                        value={volume.summary || ''}
                                        onChange={(e) => updateVolume(volume.id, 'summary', e.target.value)}
                                        className="w-full bg-slate-900/50 border border-slate-700 rounded p-2 text-sm text-slate-300 focus:outline-none focus:border-indigo-500 resize-none"
                                        rows={2}
                                        placeholder="本卷的主要剧情概要..."
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] text-slate-500 uppercase tracking-wider">卷细纲</label>
                                    <textarea
                                        value={volume.detailed_outline || ''}
                                        onChange={(e) => updateVolume(volume.id, 'detailed_outline', e.target.value)}
                                        className="w-full bg-slate-900/50 border border-slate-700 rounded p-2 text-sm text-slate-300 focus:outline-none focus:border-indigo-500 resize-none"
                                        rows={3}
                                        placeholder="详细的卷大纲规划..."
                                    />
                                </div>
                            </div>

                            {/* Chapters List */}
                            <div className="space-y-2">
                                {volume.chapters.map((chapter, chapterIndex) => (
                                    <div
                                        key={chapter.id}
                                        className="bg-slate-900/50 rounded border border-slate-700/50 overflow-hidden"
                                    >
                                        <div className="flex items-center gap-2 px-3 py-2">
                                            <button
                                                onClick={() => toggleChapter(chapter.id)}
                                                className="text-slate-500 hover:text-slate-300 transition-colors"
                                            >
                                                {expandedChapters.has(chapter.id) ? (
                                                    <ChevronDown className="w-3 h-3" />
                                                ) : (
                                                    <ChevronRight className="w-3 h-3" />
                                                )}
                                            </button>
                                            <GripVertical className="w-3 h-3 text-slate-600" />
                                            <input
                                                type="text"
                                                value={chapter.title}
                                                onChange={(e) => updateChapter(volume.id, chapter.id, 'title', e.target.value)}
                                                className="flex-1 bg-transparent border-none text-slate-300 text-sm focus:outline-none focus:text-indigo-300 px-2 py-1"
                                                placeholder="章节标题"
                                            />
                                            <button
                                                onClick={() => removeChapter(volume.id, chapter.id)}
                                                className="text-slate-600 hover:text-red-400 transition-colors"
                                            >
                                                <Trash2 className="w-3 h-3" />
                                            </button>
                                        </div>

                                        {expandedChapters.has(chapter.id) && (
                                            <div className="px-4 pb-3 pt-1 space-y-2 border-t border-slate-800/50">
                                                <div>
                                                    <label className="text-[10px] text-slate-500 uppercase tracking-wider">章节简介</label>
                                                    <textarea
                                                        value={chapter.summary || ''}
                                                        onChange={(e) => updateChapter(volume.id, chapter.id, 'summary', e.target.value)}
                                                        className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-xs text-slate-300 focus:outline-none focus:border-indigo-500 resize-none"
                                                        rows={2}
                                                        placeholder="本章核心事件..."
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-[10px] text-slate-500 uppercase tracking-wider">章细纲</label>
                                                    <textarea
                                                        value={chapter.detailed_outline || ''}
                                                        onChange={(e) => updateChapter(volume.id, chapter.id, 'detailed_outline', e.target.value)}
                                                        className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-xs text-slate-300 focus:outline-none focus:border-indigo-500 resize-none"
                                                        rows={3}
                                                        placeholder="详细的章节剧情设计..."
                                                    />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}

                                <button
                                    onClick={() => addChapter(volume.id)}
                                    className="w-full py-2 border border-dashed border-slate-600 hover:border-indigo-500 rounded text-xs text-slate-500 hover:text-indigo-400 transition-colors flex items-center justify-center gap-1"
                                >
                                    <Plus className="w-3 h-3" />
                                    添加章节
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
};

export default OutlineEditor;
