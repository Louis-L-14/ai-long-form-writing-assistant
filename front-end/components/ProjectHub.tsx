import React, { useState, useEffect } from 'react';
import { Plus, BookOpen, Clock, MoreHorizontal, Trash2, AlertTriangle, X } from 'lucide-react';
import { api } from '../api';

interface ProjectHubProps {
    onCreateProject: () => void;
    onSelectProject: (projectId: string) => void;
}

const ProjectHub: React.FC<ProjectHubProps> = ({ onCreateProject, onSelectProject }) => {
    // State to manage the list of projects
    const [projects, setProjects] = useState<any[]>([]);

    // State for dropdown menu
    const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

    // State for delete confirmation modal
    const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

    useEffect(() => {
        loadProjects();
    }, []);

    const loadProjects = async () => {
        try {
            const data = await api.getProjects();
            // Defensive check: ensure data is an array
            if (Array.isArray(data)) {
                setProjects(data);
            } else {
                console.error("Received invalid projects data:", data);
                setProjects([]);
            }
        } catch (e) {
            console.error("Failed to load projects", e);
            setProjects([]);
        }
    };

    const handleDeleteClick = (e: React.MouseEvent, projectId: string) => {
        e.stopPropagation();
        setDeleteTargetId(projectId);
        setActiveMenuId(null);
    };

    const confirmDelete = async () => {
        if (deleteTargetId) {
            try {
                await api.deleteProject(deleteTargetId);
                setProjects(prev => prev.filter(p => p.id !== deleteTargetId));
                setDeleteTargetId(null);
            } catch (e) {
                console.error("Failed to delete project", e);
                alert("删除失败，请重试");
            }
        }
    };

    return (
        <div className="flex flex-col h-full w-full bg-slate-950 text-slate-200 p-8 animate-in fade-in zoom-in-95 duration-300" onClick={() => setActiveMenuId(null)}>
            <div className="max-w-6xl mx-auto w-full">
                {/* Header */}
                <div className="mb-10">
                    <h1 className="text-3xl font-bold text-white mb-2">项目中心</h1>
                    <p className="text-slate-400">管理你的小说项目，或者开启一个新的传奇。</p>
                </div>

                {/* Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* Create New Card */}
                    <div
                        onClick={onCreateProject}
                        className="group relative bg-slate-900/50 border-2 border-dashed border-slate-800 rounded-2xl p-8 flex flex-col items-center justify-center gap-4 cursor-pointer hover:border-indigo-500/50 hover:bg-slate-900 transition-all duration-300"
                    >
                        <div className="w-16 h-16 rounded-full bg-indigo-600/10 flex items-center justify-center group-hover:bg-indigo-600 group-hover:scale-110 transition-all duration-300">
                            <Plus className="w-8 h-8 text-indigo-500 group-hover:text-white" />
                        </div>
                        <div className="text-center">
                            <h3 className="font-bold text-lg text-slate-200 group-hover:text-white">创建新项目</h3>
                            <p className="text-sm text-slate-500 mt-1">使用 AI 向导从零开始构建世界</p>
                        </div>
                    </div>

                    {/* Existing Projects */}
                    {Array.isArray(projects) && projects.map((project) => (
                        <div
                            key={project.id}
                            onClick={() => onSelectProject(project.id)}
                            className="group bg-slate-900 border border-slate-800 rounded-2xl p-6 cursor-pointer hover:border-indigo-500/30 hover:shadow-xl hover:shadow-indigo-500/10 transition-all duration-300 relative overflow-visible"
                        >
                            {/* Hover Gradient */}
                            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl pointer-events-none" />

                            <div className="relative z-10">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center text-white font-bold text-lg shadow-lg">
                                        {project.name.charAt(0)}
                                    </div>

                                    {/* Menu Button */}
                                    <div className="relative">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setActiveMenuId(activeMenuId === project.id ? null : project.id);
                                            }}
                                            className={`p-1 rounded hover:bg-slate-800 transition-colors ${activeMenuId === project.id ? 'text-white bg-slate-800' : 'text-slate-500 hover:text-slate-300'}`}
                                        >
                                            <MoreHorizontal className="w-5 h-5" />
                                        </button>

                                        {/* Dropdown Menu */}
                                        {activeMenuId === project.id && (
                                            <div className="absolute right-0 top-8 w-48 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                                                <button
                                                    onClick={(e) => handleDeleteClick(e, project.id)}
                                                    className="w-full text-left px-4 py-3 text-sm text-red-400 hover:bg-red-500/10 hover:text-red-300 flex items-center gap-2 transition-colors"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                    删除项目
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <h3 className="font-bold text-lg text-slate-100 mb-1 line-clamp-1 group-hover:text-indigo-400 transition-colors">
                                    {project.name}
                                </h3>
                                <p className="text-xs text-slate-500 mb-4">{project.genre}</p>

                                <p className="text-sm text-slate-400 line-clamp-2 mb-6 h-10">
                                    {project.description}
                                </p>

                                <div className="flex items-center justify-between text-xs text-slate-500 pt-4 border-t border-slate-800">
                                    <div className="flex items-center gap-1.5">
                                        <BookOpen className="w-3.5 h-3.5" />
                                        <span>{project.currentChapter} 章节</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <Clock className="w-3.5 h-3.5" />
                                        <span>刚刚更新</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Delete Confirmation Modal */}
            {deleteTargetId && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-slate-900 border border-red-500/30 rounded-2xl w-full max-w-md shadow-2xl shadow-red-900/20 overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-6">
                            <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mb-4 mx-auto">
                                <AlertTriangle className="w-6 h-6 text-red-500" />
                            </div>

                            <h3 className="text-xl font-bold text-white text-center mb-2">确认删除项目？</h3>
                            <p className="text-slate-400 text-center text-sm leading-relaxed">
                                此操作将永久删除该项目及其所有章节、角色和设定数据。
                                <br />
                                <span className="text-red-400 font-medium">此操作无法撤销。</span>
                            </p>
                        </div>

                        <div className="flex border-t border-slate-800">
                            <button
                                onClick={() => setDeleteTargetId(null)}
                                className="flex-1 py-4 text-sm font-medium text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
                            >
                                取消
                            </button>
                            <div className="w-px bg-slate-800" />
                            <button
                                onClick={confirmDelete}
                                className="flex-1 py-4 text-sm font-bold text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors"
                            >
                                确认删除
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProjectHub;
