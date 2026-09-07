import React, { useState } from 'react';
import { ModelLoadProgress } from '../types';
import { MODEL_OPTIONS, DEFAULT_MODEL_NAME } from '../lib/constants';
import {
  Cpu,
  DownloadCloud,
  CheckCircle2,
  AlertTriangle,
  FileCode,
  Zap,
  Layers,
  X,
  RefreshCw,
  Upload,
} from 'lucide-react';

interface ModelProgressModalProps {
  isOpen: boolean;
  onClose: () => void;
  progress: ModelLoadProgress;
  onLoadModel: (url?: string, customBlob?: Blob, modelPath?: string) => void;
}

export const ModelProgressModal: React.FC<ModelProgressModalProps> = ({
  isOpen,
  onClose,
  progress,
  onLoadModel,
}) => {
  const [selectedModelUrl, setSelectedModelUrl] = useState<string>(MODEL_OPTIONS[0].url);
  const [customUrl, setCustomUrl] = useState<string>('');

  if (!isOpen) return null;

  const handleFileDrop = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.name.endsWith('.gguf')) {
      onLoadModel(undefined, file, file.name);
    } else {
      alert('Please select a valid .gguf model file.');
    }
  };

  const formatBytes = (bytes: number): string => {
    if (!bytes || bytes === 0) return '0 MB';
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl flex flex-col rounded-3xl border border-slate-800 bg-[#0d0f17]/95 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/40">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-100 flex items-center gap-2">
                Neural Inference Engine
              </h2>
              <p className="text-xs text-slate-400">
                Wllama GGUF runtime · WebGPU & WASM Multi-threading
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 overflow-y-auto max-h-[75vh] scrollbar-thin">
          {/* Hardware & Acceleration Status */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-2xl border border-slate-800 bg-slate-900/40 flex items-center gap-3">
              <div
                className={`p-2 rounded-xl ${
                  progress.webGpuSupported
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                <Zap className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] font-mono uppercase text-slate-500 block">
                  WebGPU Engine
                </span>
                <span className="text-xs font-medium text-slate-200">
                  {progress.webGpuSupported ? 'Accelerated GPU' : 'WASM JIT Fallback'}
                </span>
              </div>
            </div>

            <div className="p-3 rounded-2xl border border-slate-800 bg-slate-900/40 flex items-center gap-3">
              <div
                className={`p-2 rounded-xl ${
                  progress.multiThreadSupported
                    ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                <Layers className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] font-mono uppercase text-slate-500 block">
                  Threading
                </span>
                <span className="text-xs font-medium text-slate-200">
                  {progress.multiThreadSupported ? 'Multi-threaded (SharedBuffer)' : 'Single-thread'}
                </span>
              </div>
            </div>
          </div>

          {/* Current Model Status Banner */}
          <div className="p-4 rounded-2xl border border-slate-800 bg-slate-900/50 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-300 flex items-center gap-2">
                <FileCode className="w-4 h-4 text-indigo-400" />
                Active Model:{' '}
                <span className="font-mono text-slate-100">
                  {progress.activeModelName || DEFAULT_MODEL_NAME}
                </span>
              </span>
              <span
                className={`text-[10px] font-mono px-2 py-0.5 rounded border capitalize ${
                  progress.status === 'ready'
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                    : progress.status === 'downloading'
                    ? 'bg-amber-500/10 text-amber-400 border-amber-500/30 animate-pulse'
                    : 'bg-slate-800 text-slate-400 border-slate-700'
                }`}
              >
                {progress.status}
              </span>
            </div>

            {/* Progress bar during download */}
            {progress.status === 'downloading' && (
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                  <span>
                    {formatBytes(progress.loadedBytes)} / {formatBytes(progress.totalBytes)}
                  </span>
                  <span>{progress.percentage}%</span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-indigo-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${progress.percentage}%` }}
                  />
                </div>
              </div>
            )}

            {progress.error && (
              <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{progress.error}</span>
              </div>
            )}
          </div>

          {/* Model Selection Menu */}
          <div className="space-y-2.5">
            <span className="text-xs font-medium text-slate-300 block">
              Select Neural Quantization Source:
            </span>

            <div className="space-y-2">
              {MODEL_OPTIONS.map((opt) => {
                const isSelected = selectedModelUrl === opt.url;
                return (
                  <div
                    key={opt.id}
                    onClick={() => setSelectedModelUrl(opt.url)}
                    className={`p-3 rounded-2xl border cursor-pointer transition-all duration-200 ${
                      isSelected
                        ? 'border-indigo-500/60 bg-indigo-500/10 ring-1 ring-indigo-500/30'
                        : 'border-slate-800 bg-slate-900/30 hover:bg-slate-900/60'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-100">{opt.name}</span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                        {opt.sizeLabel}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">{opt.description}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Direct GGUF File Loader */}
          <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
            <span className="text-xs text-slate-400">Load local GGUF file from disk:</span>
            <label className="cursor-pointer px-3 py-1.5 rounded-xl border border-slate-700 hover:border-slate-500 bg-slate-900 text-xs text-slate-200 flex items-center gap-1.5 transition-all">
              <Upload className="w-3.5 h-3.5 text-indigo-400" />
              <span>Choose .gguf</span>
              <input type="file" accept=".gguf" onChange={handleFileDrop} className="hidden" />
            </label>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition-colors"
          >
            Dismiss
          </button>

          <button
            onClick={() => {
              const matched = MODEL_OPTIONS.find((m) => m.url === selectedModelUrl);
              const path = matched?.fileName || selectedModelUrl.split('/').pop()?.split('?')[0] || DEFAULT_MODEL_NAME;
              onLoadModel(selectedModelUrl, undefined, path);
            }}
            disabled={progress.status === 'downloading'}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs flex items-center gap-2 transition-all shadow-lg shadow-indigo-600/20 disabled:opacity-50"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${progress.status === 'downloading' ? 'animate-spin' : ''}`}
            />
            {progress.status === 'downloading' ? 'Loading Weights...' : 'Mount Model'}
          </button>
        </div>
      </div>
    </div>
  );
};
