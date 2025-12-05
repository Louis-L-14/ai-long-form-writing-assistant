import React, { useState, useMemo, useEffect } from 'react';
import { Clock, MapPin, User, Box, History, AlertTriangle, Globe, Book, Edit2, Trash2, Save, X, Plus } from 'lucide-react';
import { api } from '../api';

interface WikiProps {
    project: any;
}

// Helper component for individual entity card
const EntityCard = ({ entity, projectId, currentChapter, onUpdate, onDelete }: any) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editData, setEditData] = useState(JSON.stringify(entity.data, null, 2));
    const [isSaving, setIsSaving] = useState(false);

    const handleSave = async () => {
        try {
            setIsSaving(true);
            let parsedData;
            try {
                parsedData = JSON.parse(editData);
            } catch (e) {
                alert("JSON 格式错误，请检查");
                setIsSaving(false);
                return;
            }

            await api.updateEntity(projectId, entity.type, entity.entityId, parsedData, currentChapter);
            setIsEditing(false);
            onUpdate(); // Trigger refresh
        } catch (e) {
            console.error("Failed to update entity", e);
            alert("更新失败");
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async () => {
        if (confirm(`确定要删除 "${entity.entityId}" 吗？这将删除该实体的所有版本。`)) {
            try {
                await api.deleteEntity(projectId, entity.type, entity.entityId);
                onUpdate(); // Trigger refresh
            } catch (e) {
                console.error("Failed to delete entity", e);
                alert("删除失败");
            }
        }
    };

    // Render structured content based on type
    const renderContent = () => {
        const data = entity.data;
        if (typeof data !== 'object') return <p className="text-sm text-slate-400">{String(data)}</p>;

        return (
            <div className="space-y-2 text-sm">
                {Object.entries(data).map(([key, value]) => {
                    if (key === 'name' || key === 'id') return null; // Skip redundant fields

                    // Special handling for known_events
                    if (key === 'known_events' && Array.isArray(value)) {
                        return (
                            <div key={key} className="flex flex-col gap-1">
                                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">已知事件</span>
                                <div className="text-slate-300 bg-slate-950/50 p-2 rounded border border-slate-800/50 flex flex-wrap gap-1">
                                    {value.length > 0 ? value.map((eventId: string) => (
                                        <span key={eventId} className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                                            {/* Ideally we would look up the event title here, but we might not have access to all entities easily in this scope without passing them down. 
                                                For now, let's just show ID or a placeholder. 
                                                Actually, we can try to pass entities map if needed, but for MVP let's just show ID. 
                                                Better yet, let's just show count or list IDs.
                                            */}
                                            {eventId}
                                        </span>
                                    )) : <span className="text-slate-500 italic">暂无记录</span>}
                                </div>
                            </div>
                        );
                    }

                    return (
                        <div key={key} className="flex flex-col gap-1">
                            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{key.replace(/_/g, ' ')}</span>
                            <div className="text-slate-300 bg-slate-950/50 p-2 rounded border border-slate-800/50">
                                {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                            </div>
                        </div>
                    );
                })}
            </div>
        );
    };

    return (
        <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden hover:border-indigo-500/30 transition-all group relative flex flex-col h-full">
            {/* Header */}
            <div className="p-4 border-b border-slate-800 bg-slate-800/30 flex justify-between items-start">
                <div className="flex-1">
                    <h3 className="font-bold text-slate-100 text-lg">{entity.data.name || entity.entityId}</h3>
                    <div className="flex flex-wrap gap-2 mt-1">
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-500 border border-slate-700 uppercase">
                            {entity.type}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                            v{entity.version}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            第{entity.validFrom}章起{entity.validTo ? ` → 第${entity.validTo}章止` : ''}
                        </span>
                    </div>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {!isEditing && (
                        <>
                            <button onClick={() => setIsEditing(true)} className="p-1.5 hover:bg-slate-700 rounded text-slate-400 hover:text-indigo-400 transition-colors">
                                <Edit2 className="w-4 h-4" />
                            </button>
                            <button onClick={handleDelete} className="p-1.5 hover:bg-slate-700 rounded text-slate-400 hover:text-red-400 transition-colors">
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* Content */}
            <div className="p-4 flex-1 overflow-y-auto max-h-[400px]">
                {isEditing ? (
                    <div className="h-full flex flex-col gap-2">
                        <textarea
                            value={editData}
                            onChange={(e) => setEditData(e.target.value)}
                            className="w-full h-64 bg-slate-950 border border-slate-700 rounded p-2 text-xs font-mono text-slate-300 focus:outline-none focus:border-indigo-500 resize-none"
                        />
                        <div className="flex justify-end gap-2 mt-auto">
                            <button
                                onClick={() => setIsEditing(false)}
                                className="px-3 py-1.5 rounded text-xs text-slate-400 hover:bg-slate-800 transition-colors"
                            >
                                取消
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={isSaving}
                                className="px-3 py-1.5 rounded text-xs bg-indigo-600 text-white hover:bg-indigo-500 transition-colors flex items-center gap-1"
                            >
                                <Save className="w-3 h-3" /> 保存
                            </button>
                        </div>
                    </div>
                ) : (
                    renderContent()
                )}
            </div>
        </div>
    );
};

const Wiki: React.FC<WikiProps> = ({ project: initialProject }) => {
    const [project, setProject] = useState(initialProject);
    const [timelineChapter, setTimelineChapter] = useState(1);
    const [activeTab, setActiveTab] = useState<'all' | 'character' | 'world_setting' | 'faction'>('all');
    const maxChapter = project.chapters?.length || 1;

    // Refresh project data when needed
    const refreshProject = async () => {
        try {
            const data = await api.getProject(project.id);
            setProject(data);
        } catch (e) {
            console.error("Failed to refresh project", e);
        }
    };

    // Group entities logic (same as before but using state project)
    const entities = useMemo(() => {
        if (!project.entity_versions) return [];
        const groupedById: Record<string, any[]> = {};
        project.entity_versions.forEach((ev: any) => {
            if (!groupedById[ev.entity_id]) groupedById[ev.entity_id] = [];
            groupedById[ev.entity_id].push(ev);
        });

        return Object.keys(groupedById).map(entityId => {
            const versions = groupedById[entityId];
            versions.sort((a, b) => b.version - a.version);
            const activeVersion = versions.find(v => v.valid_from_chapter <= timelineChapter);
            if (!activeVersion) return null;
            return {
                id: activeVersion.id,
                entityId: activeVersion.entity_id,
                type: activeVersion.entity_type,
                data: activeVersion.payload_json,
                version: activeVersion.version,
                validFrom: activeVersion.valid_from_chapter,
                validTo: activeVersion.valid_to_chapter
            };
        }).filter(Boolean) as any[];
    }, [project, timelineChapter]);

    const filteredEntities = useMemo(() => {
        if (activeTab === 'all') return entities;
        return entities.filter(e => e.type === activeTab);
    }, [entities, activeTab]);

    const tabs = [
        { id: 'all', label: '全部', icon: Box },
        { id: 'character', label: '角色', icon: User },
        { id: 'world_setting', label: '世界观', icon: Globe },
        { id: 'faction', label: '势力', icon: MapPin },
        { id: 'event', label: '大事记', icon: History },
    ];

    return (
        <div className="flex flex-col h-full w-full bg-slate-950 text-slate-200 animate-in fade-in zoom-in-95 duration-300">
            {/* Header & Controls */}
            <div className="border-b border-slate-800 bg-slate-900 px-6 py-4 shadow-xl z-10 space-y-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-600 rounded-lg">
                            <History className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h2 className="font-bold text-lg leading-tight">时空百科</h2>
                            <p className="text-xs text-slate-400">项目知识库</p>
                        </div>
                    </div>

                    {/* Timeline Slider */}
                    <div className="w-64">
                        <div className="flex justify-between text-[10px] text-slate-500 mb-1 font-mono uppercase tracking-wider">
                            <span>CH 1</span>
                            <span className="text-indigo-400 font-bold">当前: 第 {timelineChapter} 章</span>
                            <span>CH {maxChapter}</span>
                        </div>
                        <input
                            type="range"
                            min="1"
                            max={Math.max(maxChapter, 1)}
                            value={timelineChapter}
                            onChange={(e) => setTimelineChapter(parseInt(e.target.value))}
                            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500 hover:accent-indigo-400"
                        />
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-2">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-2 transition-all ${activeTab === tab.id
                                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20'
                                : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200'
                                }`}
                        >
                            <tab.icon className="w-3 h-3" />
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Main Grid */}
            <div className="flex-1 overflow-y-auto p-6 bg-slate-950">
                {activeTab === 'event' ? (
                    <div className="space-y-6 max-w-4xl mx-auto">
                        {filteredEntities.sort((a, b) => (a.data.occurred_at_chapter || 0) - (b.data.occurred_at_chapter || 0)).map((entity) => (
                            <div key={entity.id} className="relative pl-8 border-l-2 border-slate-800 hover:border-indigo-500/50 transition-colors group">
                                <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-slate-900 border-2 border-slate-700 group-hover:border-indigo-500 transition-colors" />
                                <div className="bg-slate-900/50 rounded-xl border border-slate-800 p-4 hover:bg-slate-900 transition-colors">
                                    <div className="flex justify-between items-start mb-2">
                                        <div>
                                            <h3 className="font-bold text-slate-100 text-lg">{entity.data.title || "未命名事件"}</h3>
                                            <div className="flex gap-2 mt-1">
                                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                                                    第 {entity.data.occurred_at_chapter} 章
                                                </span>
                                                {entity.data.significance && (
                                                    <span className={`text-[10px] px-1.5 py-0.5 rounded border ${entity.data.significance === 'high' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                                                        entity.data.significance === 'medium' ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' :
                                                            'bg-slate-800 text-slate-400 border-slate-700'
                                                        }`}>
                                                        {entity.data.significance === 'high' ? '关键事件' : entity.data.significance === 'medium' ? '重要事件' : '普通事件'}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <p className="text-sm text-slate-300 leading-relaxed mb-3">{entity.data.description}</p>

                                    <div className="flex flex-wrap gap-4 text-xs text-slate-500">
                                        {entity.data.participants && (
                                            <div className="flex items-center gap-1">
                                                <User className="w-3 h-3" />
                                                <span>参与者: {entity.data.participants.map((id: string) =>
                                                    // Try to find name if possible, otherwise ID
                                                    entities.find(e => e.entityId === id)?.data.name || id
                                                ).join(', ')}</span>
                                            </div>
                                        )}
                                        {entity.data.location_id && (
                                            <div className="flex items-center gap-1">
                                                <MapPin className="w-3 h-3" />
                                                <span>地点: {entities.find(e => e.entityId === entity.data.location_id)?.data.name || entity.data.location_id}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                        {filteredEntities.length === 0 && (
                            <div className="flex flex-col items-center justify-center h-64 text-slate-500">
                                <History className="w-12 h-12 mb-4 opacity-20" />
                                <p>暂无事件记录</p>
                            </div>
                        )}
                    </div>
                ) : (
                    filteredEntities.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            {filteredEntities.map((entity) => (
                                <EntityCard
                                    key={entity.id}
                                    entity={entity}
                                    projectId={project.id}
                                    currentChapter={timelineChapter}
                                    onUpdate={refreshProject}
                                    onDelete={refreshProject}
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-64 text-slate-500">
                            <Box className="w-12 h-12 mb-4 opacity-20" />
                            <p>暂无数据</p>
                            <p className="text-xs mt-2">该分类下没有找到相关条目</p>
                        </div>
                    )
                )}
            </div>
        </div>
    );
};

export default Wiki;