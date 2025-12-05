import React, { useState } from 'react';
import { Plus, Trash2, ChevronDown, ChevronUp, User } from 'lucide-react';
import { CharacterDetail } from '../types';
import EditableField from './EditableField';

interface CharacterEditorProps {
    characters: CharacterDetail[];
    onChange: (characters: CharacterDetail[]) => void;
}

const CharacterEditor: React.FC<CharacterEditorProps> = ({ characters, onChange }) => {
    const [expandedId, setExpandedId] = useState<string | null>(characters[0]?.id || null);

    const addCharacter = () => {
        const newChar: CharacterDetail = {
            id: `char_${Date.now()}`,
            name: '新角色',
            role: 'supporting',
        };
        onChange([...characters, newChar]);
        setExpandedId(newChar.id);
    };

    const removeCharacter = (id: string) => {
        onChange(characters.filter(c => c.id !== id));
        if (expandedId === id) {
            setExpandedId(characters[0]?.id || null);
        }
    };

    const updateCharacter = (id: string, field: keyof CharacterDetail, value: any) => {
        onChange(
            characters.map(c =>
                c.id === id ? { ...c, [field]: value } : c
            )
        );
    };

    const getRoleBadgeColor = (role: string) => {
        switch (role) {
            case 'protagonist': return 'bg-emerald-600 text-white';
            case 'antagonist': return 'bg-red-600 text-white';
            case 'supporting': return 'bg-blue-600 text-white';
            default: return 'bg-slate-600 text-white';
        }
    };

    const getRoleLabel = (role: string) => {
        switch (role) {
            case 'protagonist': return '主角';
            case 'antagonist': return '反派';
            case 'supporting': return '配角';
            default: return role;
        }
    };

    return (
        <div className="space-y-3">
            {characters.map((char) => (
                <div
                    key={char.id}
                    className="bg-slate-800/50 border border-slate-700 rounded-lg overflow-hidden"
                >
                    {/* Header */}
                    <div className="flex items-center justify-between p-3 cursor-pointer hover:bg-slate-800/70 transition-colors"
                        onClick={() => setExpandedId(expandedId === char.id ? null : char.id)}
                    >
                        <div className="flex items-center gap-3 flex-1">
                            <User className="w-4 h-4 text-slate-400" />
                            <EditableField
                                value={char.name}
                                onChange={(value) => updateCharacter(char.id, 'name', value)}
                                className="font-medium text-slate-200"
                                onClick={(e) => e.stopPropagation()}
                            />
                            <select
                                value={char.role}
                                onChange={(e) => updateCharacter(char.id, 'role', e.target.value)}
                                onClick={(e) => e.stopPropagation()}
                                className={`px-2 py-1 rounded text-xs font-medium ${getRoleBadgeColor(char.role)} border-none cursor-pointer`}
                            >
                                <option value="protagonist">主角</option>
                                <option value="antagonist">反派</option>
                                <option value="supporting">配角</option>
                            </select>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    removeCharacter(char.id);
                                }}
                                className="p-1 hover:bg-red-900/20 rounded text-red-400 hover:text-red-300 transition-colors"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                            {expandedId === char.id ? (
                                <ChevronUp className="w-4 h-4 text-slate-400" />
                            ) : (
                                <ChevronDown className="w-4 h-4 text-slate-400" />
                            )}
                        </div>
                    </div>

                    {/* Expanded Details */}
                    {expandedId === char.id && (
                        <div className="p-3 pt-0 space-y-3 border-t border-slate-700">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs text-slate-500 mb-1 block">年龄</label>
                                    <EditableField
                                        value={char.age || '未知'}
                                        onChange={(value) => updateCharacter(char.id, 'age', value)}
                                        className="text-sm text-slate-300"
                                        editClassName="text-sm w-full"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs text-slate-500 mb-1 block">目标</label>
                                    <EditableField
                                        value={char.goal || '未设定'}
                                        onChange={(value) => updateCharacter(char.id, 'goal', value)}
                                        className="text-sm text-slate-300"
                                        editClassName="text-sm w-full"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="text-xs text-slate-500 mb-1 block">性格特征</label>
                                <EditableField
                                    value={char.personality || '待补充'}
                                    onChange={(value) => updateCharacter(char.id, 'personality', value)}
                                    multiline
                                    className="text-sm text-slate-300"
                                    editClassName="text-sm w-full"
                                />
                            </div>

                            <div>
                                <label className="text-xs text-slate-500 mb-1 block">外貌特征</label>
                                <EditableField
                                    value={char.appearance || '待补充'}
                                    onChange={(value) => updateCharacter(char.id, 'appearance', value)}
                                    multiline
                                    className="text-sm text-slate-300"
                                    editClassName="text-sm w-full"
                                />
                            </div>

                            <div>
                                <label className="text-xs text-slate-500 mb-1 block">背景故事</label>
                                <EditableField
                                    value={char.background || '待补充'}
                                    onChange={(value) => updateCharacter(char.id, 'background', value)}
                                    multiline
                                    className="text-sm text-slate-300"
                                    editClassName="text-sm w-full"
                                />
                            </div>

                            <div>
                                <label className="text-xs text-slate-500 mb-1 block">人物关系</label>
                                <EditableField
                                    value={char.relationships || '待补充'}
                                    onChange={(value) => updateCharacter(char.id, 'relationships', value)}
                                    multiline
                                    className="text-sm text-slate-300"
                                    editClassName="text-sm w-full"
                                />
                            </div>

                            <div>
                                <label className="text-xs text-slate-500 mb-1 block">独特优势</label>
                                <EditableField
                                    value={char.advantage || '待补充'}
                                    onChange={(value) => updateCharacter(char.id, 'advantage', value)}
                                    multiline
                                    className="text-sm text-slate-300"
                                    editClassName="text-sm w-full"
                                />
                            </div>
                        </div>
                    )}
                </div>
            ))}

            <button
                onClick={addCharacter}
                className="w-full py-2 border-2 border-dashed border-slate-700 hover:border-indigo-500 rounded-lg text-slate-400 hover:text-indigo-400 transition-colors flex items-center justify-center gap-2 text-sm font-medium"
            >
                <Plus className="w-4 h-4" />
                添加角色
            </button>
        </div>
    );
};

export default CharacterEditor;
