import React, { useState, useEffect } from 'react';
import { StorageHealthInfo } from '../types';
import { HardDrive, ShieldCheck, ShieldAlert, CheckCircle2, AlertCircle } from 'lucide-react';

interface StorageHealthProps {
  isOpfs: boolean;
  workerUsageBytes?: number;
  workerQuotaBytes?: number;
}

export const StorageHealth: React.FC<StorageHealthProps> = ({
  isOpfs,
  workerUsageBytes = 0,
  workerQuotaBytes = 0,
}) => {
  const [health, setHealth] = useState<StorageHealthInfo>({
    persisted: false,
    quotaBytes: workerQuotaBytes,
    usageBytes: workerUsageBytes,
    percentage: 0,
    supported: false,
  });
  const [showPopover, setShowPopover] = useState(false);
  const [isRequesting, setIsRequesting] = useState(false);

  const checkStorageHealth = async () => {
    if (typeof navigator !== 'undefined' && navigator.storage) {
      try {
        const persisted = typeof navigator.storage.persisted === 'function'
          ? await navigator.storage.persisted()
          : false;

        let quota = workerQuotaBytes;
        let usage = workerUsageBytes;

        if (typeof navigator.storage.estimate === 'function') {
          const estimate = await navigator.storage.estimate();
          quota = estimate.quota || workerQuotaBytes || 1;
          usage = estimate.usage || workerUsageBytes || 0;
        }

        const pct = quota > 0 ? (usage / quota) * 100 : 0;

        setHealth({
          persisted,
          quotaBytes: quota,
          usageBytes: usage,
          percentage: parseFloat(pct.toFixed(2)),
          supported: true,
        });
      } catch (err) {
        console.warn('[StorageHealth] Storage estimate check error:', err);
      }
    }
  };

  useEffect(() => {
    checkStorageHealth();
  }, [workerUsageBytes, workerQuotaBytes]);

  const requestPersistence = async () => {
    if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.persist) {
      setIsRequesting(true);
      try {
        const granted = await navigator.storage.persist();
        setHealth((prev) => ({ ...prev, persisted: granted }));
      } catch (e) {
        console.error('[StorageHealth] Persistence request failed:', e);
      } finally {
        setIsRequesting(false);
      }
    }
  };

  const formatBytes = (bytes: number): string => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  return (
    <div className="relative">
      {/* Indicator Pill */}
      <button
        onClick={() => setShowPopover(!showPopover)}
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono border backdrop-blur-md transition-all duration-200 hover:scale-105 bg-slate-900/60 border-slate-800 text-slate-300 hover:text-slate-100"
      >
        <HardDrive className="w-3.5 h-3.5 text-cyan-400" />
        <span className="hidden sm:inline">
          {health.persisted ? 'OPFS Persisted' : 'Storage'}
        </span>
        <span
          className={`w-1.5 h-1.5 rounded-full ${
            health.persisted ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
          }`}
        />
      </button>

      {/* Popover */}
      {showPopover && (
        <div className="absolute right-0 top-9 w-64 p-3.5 rounded-2xl border border-slate-800 bg-[#0d0f17]/95 shadow-2xl backdrop-blur-xl z-40 text-xs">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
            <span className="font-semibold text-slate-200 flex items-center gap-1.5">
              <HardDrive className="w-4 h-4 text-cyan-400" />
              Storage Integrity
            </span>
            <span
              className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${
                isOpfs
                  ? 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10'
                  : 'border-amber-500/30 text-amber-400 bg-amber-500/10'
              }`}
            >
              {isOpfs ? 'OPFS Active' : 'Memory Async'}
            </span>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-slate-400">
              <span>Persistence status:</span>
              <span className="flex items-center gap-1 text-slate-200">
                {health.persisted ? (
                  <>
                    <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                    Persisted
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-3 h-3 text-amber-400" />
                    Best-effort
                  </>
                )}
              </span>
            </div>

            <div className="flex items-center justify-between text-slate-400">
              <span>Disk Usage:</span>
              <span className="font-mono text-slate-200">{formatBytes(health.usageBytes)}</span>
            </div>

            <div className="flex items-center justify-between text-slate-400">
              <span>Quota:</span>
              <span className="font-mono text-slate-200">{formatBytes(health.quotaBytes)}</span>
            </div>

            {/* Quota Progress Bar */}
            <div className="w-full bg-slate-800/80 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-cyan-400 h-1.5 rounded-full transition-all duration-300"
                style={{ width: `${Math.max(health.percentage, 2)}%` }}
              />
            </div>

            {!health.persisted && (
              <button
                onClick={requestPersistence}
                disabled={isRequesting}
                className="w-full mt-2 py-1.5 px-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-medium text-xs flex items-center justify-center gap-1.5 transition-all shadow-sm"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                {isRequesting ? 'Requesting...' : 'Request Persistent Storage'}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
