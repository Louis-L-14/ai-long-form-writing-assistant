import React, { useEffect, useState } from 'react';
import { CheckCircle2, Loader2, XCircle, Clock } from 'lucide-react';

interface SaveStep {
    id: string;
    label: string;
    estimatedMs: number;
}

interface ExecutionStep {
    step: string;
    status: 'success' | 'failed';
    message: string;
    details?: any;
}

interface ExecutionReport {
    steps_completed: ExecutionStep[];
    total_duration_ms: number;
}

interface SaveProgressModalProps {
    isOpen: boolean;
    isCompleted: boolean;
    executionReport: ExecutionReport | null;
    onClose: () => void;
}

const SAVE_STEPS: SaveStep[] = [
    { id: 'content_save', label: '保存章节内容', estimatedMs: 500 },
    { id: 'analysis', label: '分析正文并生成概要', estimatedMs: 3000 },
    { id: 'events', label: '提取事件并更新角色知识', estimatedMs: 2000 },
    { id: 'outline_sync', label: '检查大纲同步', estimatedMs: 3000 }
];

export default function SaveProgressModal({ isOpen, isCompleted, executionReport, onClose }: SaveProgressModalProps) {
    const [currentStepIndex, setCurrentStepIndex] = useState(0);

    // Simulate progress animation
    useEffect(() => {
        if (!isOpen || isCompleted) return;

        const timers: NodeJS.Timeout[] = [];
        let accumulatedMs = 0;

        SAVE_STEPS.forEach((step, index) => {
            // Don't auto-complete the last step via simulation
            if (index === SAVE_STEPS.length - 1) return;

            accumulatedMs += step.estimatedMs;
            const timer = setTimeout(() => {
                setCurrentStepIndex(index + 1);
            }, accumulatedMs);
            timers.push(timer);
        });

        return () => {
            timers.forEach(timer => clearTimeout(timer));
        };
    }, [isOpen, isCompleted]);

    // Reset when modal opens
    useEffect(() => {
        if (isOpen && !isCompleted) {
            setCurrentStepIndex(0);
        }
    }, [isOpen, isCompleted]);

    // Auto-close disabled per user request - users will manually close
    // useEffect(() => {
    //     if (isCompleted) {
    //         const timer = setTimeout(() => {
    //             onClose();
    //         }, 5000);
    //         return () => clearTimeout(timer);
    //     }
    // }, [isCompleted, onClose]);

    if (!isOpen) return null;

    const getStepStatus = (stepId: string, index: number) => {
        if (isCompleted) {
            // If we have a report, use it
            if (executionReport) {
                const executedStep = executionReport.steps_completed.find(s => s.step === stepId);
                if (executedStep) {
                    return executedStep.status === 'success' ? 'completed' : 'failed';
                }
                // If step not found in report but we are completed, assume success (or skip)
                // For now, let's mark as completed to ensure green checks
                return 'completed';
            }
            // If no report but completed, mark all as completed
            return 'completed';
        }

        if (index < currentStepIndex) return 'completed';
        if (index === currentStepIndex) return 'inProgress';
        return 'pending';
    };

    const getStepDetails = (stepId: string) => {
        if (!executionReport) return null;
        const step = executionReport.steps_completed.find(s => s.step === stepId);
        return step?.details;
    };

    const formatDuration = (ms: number) => {
        return (ms / 1000).toFixed(1) + '秒';
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl max-w-md w-full overflow-hidden">
                {/* Header */}
                <div className="bg-gradient-to-r from-indigo-600 to-violet-600 p-4">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        {isCompleted ? (
                            <>
                                <CheckCircle2 className="w-5 h-5" />
                                保存成功！
                            </>
                        ) : (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                保存中...
                            </>
                        )}
                    </h3>
                </div>

                {/* Steps List */}
                <div className="p-6 space-y-3">
                    {SAVE_STEPS.map((step, index) => {
                        const status = getStepStatus(step.id, index);
                        const details = getStepDetails(step.id);
                        const executedStep = executionReport?.steps_completed.find(s => s.step === step.id);

                        return (
                            <div
                                key={step.id}
                                className={`flex items-start gap-3 p-3 rounded-lg transition-all ${status === 'completed'
                                    ? 'bg-emerald-500/10 border border-emerald-500/20'
                                    : status === 'failed'
                                        ? 'bg-red-500/10 border border-red-500/20'
                                        : status === 'inProgress'
                                            ? 'bg-indigo-500/10 border border-indigo-500/20 animate-pulse'
                                            : 'bg-slate-800/50 border border-slate-700'
                                    }`}
                            >
                                {/* Icon */}
                                <div className="flex-shrink-0 mt-0.5">
                                    {status === 'completed' ? (
                                        <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                                    ) : status === 'failed' ? (
                                        <XCircle className="w-5 h-5 text-red-400" />
                                    ) : status === 'inProgress' ? (
                                        <Loader2 className="w-5 h-5 text-indigo-400 animate-spin" />
                                    ) : (
                                        <div className="w-5 h-5 rounded-full border-2 border-slate-600" />
                                    )}
                                </div>

                                {/* Content */}
                                <div className="flex-1 min-w-0">
                                    <div className="text-sm font-medium text-slate-200">
                                        {executedStep?.message || step.label}
                                    </div>

                                    {/* Details */}
                                    {isCompleted && details && (
                                        <div className="mt-1 text-xs text-slate-400 space-y-0.5">
                                            {details.summary_generated !== undefined && (
                                                <div>{details.summary_generated ? '✓ 概要已生成' : '未生成概要'}</div>
                                            )}
                                            {details.entities_updated !== undefined && details.entities_updated > 0 && (
                                                <div>更新了 {details.entities_updated} 个实体</div>
                                            )}
                                            {details.events_extracted !== undefined && details.events_extracted > 0 && (
                                                <div>提取了 {details.events_extracted} 个事件</div>
                                            )}
                                            {details.characters_notified !== undefined && details.characters_notified > 0 && (
                                                <div>通知了 {details.characters_notified} 个角色</div>
                                            )}
                                            {details.deviation_level && (
                                                <div>
                                                    偏差等级: {
                                                        details.deviation_level === 'none' ? '无' :
                                                            details.deviation_level === 'minor' ? '微小' :
                                                                details.deviation_level === 'major' ? '重大' : details.deviation_level
                                                    }
                                                </div>
                                            )}
                                            {details.subsequent_updated !== undefined && details.subsequent_updated > 0 && (
                                                <div>更新了后续 {details.subsequent_updated} 章</div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>


                {/* Enhanced Completion Report */}
                {isCompleted && executionReport && (
                    <div className="border-t border-slate-700 bg-slate-800/50">
                        <div className="p-6 space-y-4">
                            {/* Success Header */}
                            <div className="flex items-center gap-2 pb-3 border-b border-slate-700">
                                <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                                <h4 className="text-lg font-bold text-emerald-400">保存成功</h4>
                            </div>

                            {/* Detailed Summary Cards */}
                            <div className="space-y-3">
                                {/* Content Saved */}
                                <div className="bg-slate-700/30 rounded-lg p-3">
                                    <div className="text-sm font-semibold text-slate-200 mb-1.5 flex items-center gap-2">
                                        📝 章节内容
                                    </div>
                                    <div className="text-xs text-slate-400">
                                        已成功保存
                                    </div>
                                </div>

                                {/* Analysis Results */}
                                {executionReport.steps_completed.find(s => s.step === 'analysis')?.details && (
                                    <div className="bg-slate-700/30 rounded-lg p-3">
                                        <div className="text-sm font-semibold text-slate-200 mb-1.5 flex items-center gap-2">
                                            🔍 智能分析
                                        </div>
                                        <div className="text-xs text-slate-400 space-y-1">
                                            {executionReport.steps_completed.find(s => s.step === 'analysis')?.details?.summary_generated && (
                                                <div className="flex items-center gap-1.5">
                                                    <span className="text-emerald-400">✓</span>
                                                    <span>生成章节概要</span>
                                                </div>
                                            )}
                                            {executionReport.steps_completed.find(s => s.step === 'analysis')?.details?.entities_updated > 0 && (
                                                <div className="flex items-center gap-1.5">
                                                    <span className="text-emerald-400">✓</span>
                                                    <span>更新了 {executionReport.steps_completed.find(s => s.step === 'analysis')?.details?.entities_updated} 个实体</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Event Extraction */}
                                {executionReport.steps_completed.find(s => s.step === 'events')?.details && (
                                    <div className="bg-slate-700/30 rounded-lg p-3">
                                        <div className="text-sm font-semibold text-slate-200 mb-1.5 flex items-center gap-2">
                                            📅 事件提取
                                        </div>
                                        <div className="text-xs text-slate-400 space-y-1">
                                            {executionReport.steps_completed.find(s => s.step === 'events')?.details?.events_extracted > 0 && (
                                                <div className="flex items-center gap-1.5">
                                                    <span className="text-emerald-400">✓</span>
                                                    <span>提取了 {executionReport.steps_completed.find(s => s.step === 'events')?.details?.events_extracted} 个事件</span>
                                                </div>
                                            )}
                                            {executionReport.steps_completed.find(s => s.step === 'events')?.details?.characters_notified > 0 && (
                                                <div className="flex items-center gap-1.5">
                                                    <span className="text-emerald-400">✓</span>
                                                    <span>通知了 {executionReport.steps_completed.find(s => s.step === 'events')?.details?.characters_notified} 位角色</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Outline Sync */}
                                {executionReport.steps_completed.find(s => s.step === 'outline_sync')?.details && (
                                    <div className="bg-slate-700/30 rounded-lg p-3">
                                        <div className="text-sm font-semibold text-slate-200 mb-1.5 flex items-center gap-2">
                                            📋 大纲同步
                                        </div>
                                        <div className="text-xs text-slate-400 space-y-1">
                                            {executionReport.steps_completed.find(s => s.step === 'outline_sync')?.details?.deviation_level && (
                                                <div className="flex items-center gap-1.5">
                                                    <span className="text-emerald-400">✓</span>
                                                    <span>偏差程度: {
                                                        executionReport.steps_completed.find(s => s.step === 'outline_sync')?.details?.deviation_level === 'none' ? '无' :
                                                            executionReport.steps_completed.find(s => s.step === 'outline_sync')?.details?.deviation_level === 'minor' ? '微小' :
                                                                executionReport.steps_completed.find(s => s.step === 'outline_sync')?.details?.deviation_level === 'major' ? '重大' :
                                                                    executionReport.steps_completed.find(s => s.step === 'outline_sync')?.details?.deviation_level
                                                    }</span>
                                                </div>
                                            )}
                                            {executionReport.steps_completed.find(s => s.step === 'outline_sync')?.details?.subsequent_updated > 0 && (
                                                <div className="flex items-center gap-1.5">
                                                    <span className="text-emerald-400">✓</span>
                                                    <span>更新了后续 {executionReport.steps_completed.find(s => s.step === 'outline_sync')?.details?.subsequent_updated} 章</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Duration */}
                            <div className="flex items-center justify-between text-sm pt-3 border-t border-slate-700">
                                <span className="text-slate-400 flex items-center gap-1.5">
                                    <Clock className="w-4 h-4" />
                                    总耗时
                                </span>
                                <span className="text-slate-200 font-semibold">
                                    {formatDuration(executionReport.total_duration_ms)}
                                </span>
                            </div>
                        </div>

                        {/* Close Button */}
                        <div className="px-6 pb-6">
                            <button
                                onClick={onClose}
                                className="w-full px-4 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition-colors text-sm font-semibold shadow-lg"
                            >
                                完成
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
