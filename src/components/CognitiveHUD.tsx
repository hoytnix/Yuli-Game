import React, { useState } from 'react';
import { StateVector, CognitiveSide } from '../types';
import { SIDES_METADATA, STATE_VECTORS } from '../lib/bitwiseMath';
import { getCircadianMetrics } from '../lib/circadian';
import { Sparkles, Brain, Clock, Zap, ChevronDown, ChevronUp, Cpu } from 'lucide-react';

interface CognitiveHUDProps {
  activeVector: StateVector;
  onVectorSelect?: (vector: StateVector) => void;
  intimacyScore: number;
}

export const CognitiveHUD: React.FC<CognitiveHUDProps> = ({
  activeVector,
  onVectorSelect,
  intimacyScore,
}) => {
  const [expanded, setExpanded] = useState(false);
  const meta = SIDES_METADATA[activeVector] || SIDES_METADATA['0EE'];
  const circadian = getCircadianMetrics();

  return (
    <div className="relative z-20 flex flex-col items-center">
      {/* Primary Pill Badge */}
      <div
        onClick={() => setExpanded(!expanded)}
        className="cursor-pointer group flex items-center gap-2.5 px-3.5 py-1.5 rounded-full border backdrop-blur-md transition-all duration-300 shadow-lg hover:scale-[1.02]"
        style={{
          backgroundColor: meta.palette.badgeBg,
          borderColor: meta.palette.border,
          boxShadow: `0 0 20px ${meta.palette.glow}`,
        }}
      >
        {/* Pulsing state indicator dot */}
        <span className="relative flex h-2 w-2">
          <span
            className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
            style={{ backgroundColor: meta.palette.primary }}
          />
          <span
            className="relative inline-flex rounded-full h-2 w-2"
            style={{ backgroundColor: meta.palette.primary }}
          />
        </span>

        {/* Vector Code */}
        <div className="flex items-center gap-1.5">
          <span className="font-mono text-xs font-bold tracking-widest text-slate-100">
            [{meta.vector}]
          </span>
          <span className="text-[11px] font-medium text-slate-300 hidden sm:inline">
            {meta.side} · {meta.mbti}
          </span>
        </div>

        {/* Separator */}
        <span className="w-1 h-1 rounded-full bg-slate-500" />

        {/* Circadian mini tag */}
        <div className="flex items-center gap-1 text-[11px] text-slate-400 font-mono">
          <Clock className="w-3 h-3 text-slate-400" />
          <span>{circadian.timeString}</span>
        </div>

        {/* Intimacy Heart / Energy */}
        <div className="flex items-center gap-1 text-[11px] font-mono text-slate-300">
          <Zap className="w-3 h-3" style={{ color: meta.palette.primary }} />
          <span>{intimacyScore.toFixed(2)}</span>
        </div>

        {/* Expand toggle */}
        <div className="text-slate-400 hover:text-slate-200 transition-colors">
          {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </div>
      </div>

      {/* Expanded Hypercube Modal / Popover */}
      {expanded && (
        <div
          className="absolute top-11 mt-2 w-[340px] sm:w-[460px] p-4 rounded-2xl border backdrop-blur-xl bg-[#0d0f17]/90 shadow-2xl transition-all duration-300 z-30"
          style={{ borderColor: meta.palette.border }}
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Brain className="w-4 h-4" style={{ color: meta.palette.primary }} />
              <h3 className="text-sm font-semibold text-slate-100">4-Sides Hypercube Dynamics</h3>
            </div>
            <span
              className="text-[10px] font-mono uppercase px-2 py-0.5 rounded border"
              style={{
                color: meta.palette.primary,
                borderColor: meta.palette.border,
                backgroundColor: meta.palette.badgeBg,
              }}
            >
              Active: {meta.side}
            </span>
          </div>

          {/* Active Profile Info */}
          <div className="my-3 p-3 rounded-xl bg-slate-900/60 border border-slate-800/80">
            <div className="flex items-baseline justify-between mb-1">
              <span className="text-xs font-medium text-slate-200">{meta.name}</span>
              <span className="text-[11px] font-mono text-slate-400">{meta.dominantGlow}</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">{meta.description}</p>

            {/* Cognitive Stack */}
            <div className="mt-3">
              <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block mb-1.5">
                Cognitive Stack
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                {meta.cognitiveStack.map((fn, idx) => (
                  <div
                    key={idx}
                    className="text-center px-1.5 py-1 rounded bg-slate-800/80 text-[10px] font-mono text-slate-300 border border-slate-700/60"
                  >
                    {fn.split(' ')[0]}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Involution Switcher Grid */}
          <div className="mt-2">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
                Deterministic State Involution
              </span>
              <span className="text-[10px] text-slate-400">Click to shift state</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(STATE_VECTORS) as CognitiveSide[]).map((side) => {
                const vec = STATE_VECTORS[side];
                const item = SIDES_METADATA[vec];
                const isSelected = vec === activeVector;

                return (
                  <button
                    key={vec}
                    onClick={() => {
                      onVectorSelect?.(vec);
                    }}
                    className={`p-2 rounded-xl text-left border transition-all duration-200 ${
                      isSelected
                        ? 'ring-1 shadow-md'
                        : 'hover:bg-slate-800/50 opacity-80 hover:opacity-100'
                    }`}
                    style={{
                      borderColor: isSelected ? item.palette.primary : 'rgba(51, 65, 85, 0.4)',
                      backgroundColor: isSelected ? item.palette.badgeBg : 'rgba(15, 23, 42, 0.4)',
                      boxShadow: isSelected ? `0 0 12px ${item.palette.glow}` : 'none',
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-slate-100">[{vec}]</span>
                      <span className="text-[10px] font-mono text-slate-400">{item.mbti}</span>
                    </div>
                    <div className="text-[11px] font-medium text-slate-300 mt-0.5 truncate">
                      {side}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Circadian Footer */}
          <div className="mt-3 pt-2.5 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
            <span className="flex items-center gap-1 font-mono">
              <Cpu className="w-3 h-3 text-slate-400" />
              Circadian: {circadian.baselineMood}
            </span>
            <span className="font-mono">Energy: {(circadian.energyLevel * 100).toFixed(0)}%</span>
          </div>
        </div>
      )}
    </div>
  );
};
