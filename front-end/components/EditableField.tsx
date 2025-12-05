import React, { useState, useRef, useEffect } from 'react';
import { Edit2, Check, X } from 'lucide-react';

interface EditableFieldProps {
    value: string;
    onChange: (value: string) => void;
    multiline?: boolean;
    className?: string;
    editClassName?: string;
    placeholder?: string;
}

const EditableField: React.FC<EditableFieldProps> = ({
    value,
    onChange,
    multiline = false,
    className = '',
    editClassName = '',
    placeholder = '点击编辑...'
}) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editValue, setEditValue] = useState(value);
    const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

    useEffect(() => {
        setEditValue(value);
    }, [value]);

    useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus();
            if (multiline && inputRef.current instanceof HTMLTextAreaElement) {
                inputRef.current.selectionStart = inputRef.current.value.length;
            }
        }
    }, [isEditing, multiline]);

    const handleSave = () => {
        onChange(editValue);
        setIsEditing(false);
    };

    const handleCancel = () => {
        setEditValue(value);
        setIsEditing(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !multiline) {
            e.preventDefault();
            handleSave();
        } else if (e.key === 'Escape') {
            handleCancel();
        }
    };

    if (isEditing) {
        return (
            <div className="relative">
                {multiline ? (
                    <textarea
                        ref={inputRef as React.RefObject<HTMLTextAreaElement>}
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onKeyDown={handleKeyDown}
                        className={`w-full bg-slate-800 border border-indigo-500 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none ${editClassName}`}
                        rows={3}
                    />
                ) : (
                    <input
                        ref={inputRef as React.RefObject<HTMLInputElement>}
                        type="text"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onKeyDown={handleKeyDown}
                        className={`w-full bg-slate-800 border border-indigo-500 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 ${editClassName}`}
                    />
                )}
                <div className="flex gap-2 mt-2">
                    <button
                        onClick={handleSave}
                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-md text-sm flex items-center gap-1 transition-colors"
                    >
                        <Check className="w-3 h-3" />
                        保存
                    </button>
                    <button
                        onClick={handleCancel}
                        className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-md text-sm flex items-center gap-1 transition-colors"
                    >
                        <X className="w-3 h-3" />
                        取消
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div
            onClick={() => setIsEditing(true)}
            className={`cursor-pointer group relative ${className}`}
        >
            <div className="flex items-center gap-2">
                <div className="flex-1">{value || placeholder}</div>
                <Edit2 className="w-3 h-3 text-slate-600 group-hover:text-indigo-400 transition-colors opacity-0 group-hover:opacity-100" />
            </div>
        </div>
    );
};

export default EditableField;
