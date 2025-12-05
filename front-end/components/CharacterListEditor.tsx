import React, { useState } from 'react';
import { Plus, Trash2, ChevronDown, ChevronRight, User } from 'lucide-react';
import EditableField from './EditableField';

export interface Character {
    id: string;
    name: string;
    age: string;
    personality: string;
    appearance: string;
    background: string;
    relationships: string;
    role: 'protagonist' | 'antagonist' | 'supporting';
    goal: string;
    advantage: string;
}

interface CharacterListEditorProps {
    characters: Character[];
    onChange: (characters: Character[]) => void;
}

const CharacterListEditor: React.FC<CharacterListEditorProps> = ({ characters, onChange }) => {
    const [expandedId, setExpandedId] = useState<string | null>(null);

    const handleUpdate = (id: string, field: keyof Character, value: string) => {
        const newCharacters = characters.map(char =>
            char.id === id ? { ...char, [field]: value } : char
        );
        onChange(newCharacters);
    };

    const handleDelete = (id: string) => {
        onChange(characters.filter(char => char.id !== id));
    };

    const handleAdd = () => {
        const newChar: Character = {
            id: `char_${Date.now()}`,
            name: "新角色",
            age: "未知",
            personality: "",
            appearance: "",
            background: "",
            relationships: "",
            role: "supporting",
            goal: "",
            advantage: ""
        };
        onChange([...characters, newChar]);
        setExpandedId(newChar.id);
    };

    const toggleExpand = (id: string) => {
        setExpandedId(expandedId === id ? null : id);
    };

    const getRoleLabel = (role: string) => {
        switch (role) {
            case 'protagonist': return '主角';
            case 'antagonist': return '反派';
            case 'supporting': return '配角';
            default: return role;
        }
    };

    const getRoleColor = (role: string) => {
        switch (role) {
            case 'protagonist': return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
            case 'antagonist': return 'bg-red-500/20 text-red-300 border-red-500/30';
            default: return 'bg-slate-700 text-slate-300 border-slate-600';
        }
    };

    return (
        <div className="space-y-3">
            <div className="flex justify-between items-center mb-2">
                <label className="text-xs text-slate-500">主要角色 ({characters.length})</label>
                <button
                    onClick={handleAdd}
                    className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-indigo-400 transition-colors"
                >
                    <Plus className="w-4 h-4" />
                </button>
            </div>

            {characters.map(char => (
                <div key={char.id} className="bg-slate-800/50 border border-slate-800 rounded-lg overflow-hidden">
                    <div
                        className="flex items-center p-3 cursor-pointer hover:bg-slate-800 transition-colors"
                        onClick={() => toggleExpand(char.id)}
                    >
                        {expandedId === char.id ? (
                            <ChevronDown className="w-4 h-4 text-slate-500 mr-2" />
                        ) : (
                            <ChevronRight className="w-4 h-4 text-slate-500 mr-2" />
                        )}

                        <div className="flex-1 flex items-center gap-2">
                            <span className="font-medium text-slate-200">{char.name}</span>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded border ${getRoleColor(char.role)}`}>
                                {getRoleLabel(char.role)}
                            </span>
                        </div>

                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(char.id);
                            }}
                            className="p-1 text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                            <Trash2 className="w-3.5 h-3.5" />
                        </button>
                    </div>

                    {expandedId === char.id && (
                        <div className="p-3 border-t border-slate-800 bg-slate-900/30 space-y-3 text-sm">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-[10px] text-slate-500 block mb-1">姓名</label>
                                    <EditableField
                                        value={char.name}
                                        onChange={(v) => handleUpdate(char.id, 'name', v)}
                                        className="text-slate-200 font-medium"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] text-slate-500 block mb-1">年龄</label>
                                    <EditableField
                                        value={char.age}
                                        onChange={(v) => handleUpdate(char.id, 'age', v)}
                                        className="text-slate-300"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="text-[10px] text-slate-500 block mb-1">角色定位</label>
                                <select
                                    value={char.role}
                                    onChange={(e) => handleUpdate(char.id, 'role', e.target.value as any)}
                                    className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-slate-300 text-xs focus:outline-none focus:border-indigo-500"
                                >
                                    <option value="protagonist">主角</option>
                                    <option value="antagonist">反派</option>
                                    <option value="supporting">配角</option>
                                </select>
                            </div>

                            <div>
                                <label className="text-[10px] text-slate-500 block mb-1">性格特征</label>
                                <EditableField
                                    value={char.personality}
                                    onChange={(v) => handleUpdate(char.id, 'personality', v)}
                                    multiline
                                    className="text-slate-300 leading-relaxed"
                                />
                            </div>

                            <div>
                                <label className="text-[10px] text-slate-500 block mb-1">外貌特征</label>
                                <EditableField
                                    value={char.appearance}
                                    onChange={(v) => handleUpdate(char.id, 'appearance', v)}
                                    multiline
                                    className="text-slate-300 leading-relaxed"
                                />
                            </div>

                            <div>
                                <label className="text-[10px] text-slate-500 block mb-1">背景故事</label>
                                <EditableField
                                    value={char.background}
                                    onChange={(v) => handleUpdate(char.id, 'background', v)}
                                    multiline
                                    className="text-slate-300 leading-relaxed"
                                />
                            </div>

                            <div>
                                <label className="text-[10px] text-slate-500 block mb-1">人物关系</label>
                                <EditableField
                                    value={char.relationships}
                                    onChange={(v) => handleUpdate(char.id, 'relationships', v)}
                                    multiline
                                    className="text-slate-300 leading-relaxed"
                                />
                            </div>

                            <div>
                                <label className="text-[10px] text-slate-500 block mb-1">目标</label>
                                <EditableField
                                    value={char.goal}
                                    onChange={(v) => handleUpdate(char.id, 'goal', v)}
                                    multiline
                                    className="text-slate-300 leading-relaxed"
                                />
                            </div>

                            <div>
                                <label className="text-[10px] text-slate-500 block mb-1">优势/金手指</label>
                                <EditableField
                                    value={char.advantage}
                                    onChange={(v) => handleUpdate(char.id, 'advantage', v)}
                                    multiline
                                    className="text-slate-300 leading-relaxed"
                                />
                            </div>
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
};

export default CharacterListEditor;
