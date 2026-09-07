import React, { useState } from 'react';
import { useCognitiveEngine } from './hooks/useCognitiveEngine';
import { useRelationalDB } from './hooks/useRelationalDB';
import { AmbientBackdrop } from './components/AmbientBackdrop';
import { CognitiveHUD } from './components/CognitiveHUD';
import { ChatViewport } from './components/ChatViewport';
import { MemoryVaultModal } from './components/MemoryVaultModal';
import { StorageHealth } from './components/StorageHealth';
import { ModelProgressModal } from './components/ModelProgressModal';
import { SIDES_METADATA } from './lib/bitwiseMath';
import {
  Brain,
  Database,
  Cpu,
  Sparkles,
  Shield,
  Layers,
} from 'lucide-react';

export function App() {
  const [isMemoryVaultOpen, setIsMemoryVaultOpen] = useState(false);
  const [isModelModalOpen, setIsModelModalOpen] = useState(false);

  // Persistence Ledger Hook (wa-sqlite over OPFS)
  const {
    isReady: isDbReady,
    isOpfs,
    storageStats,
    facts,
    relationalState,
    intimacyScore,
    addFact,
    updateFact,
    deleteFact,
    setRelationalItem,
    recordInteraction,
    resetDatabase,
  } = useRelationalDB();

  // Wllama Inference & Cognitive Stream Hook
  const {
    messages,
    activeVector,
    isGenerating,
    streamingThoughts,
    streamingContent,
    isThinking,
    generationStats,
    modelProgress,
    loadModel,
    sendMessage,
    abortGeneration,
    setManualVector,
  } = useCognitiveEngine();

  const activeMeta = SIDES_METADATA[activeVector] || SIDES_METADATA['0EE'];

  const handleSendMessage = (text: string) => {
    sendMessage(text, {
      intimacyScore,
      partnerFacts: facts.map((f) => `[${f.category}] ${f.fact}`),
      onInteractionRecorded: (userInput, yuliResponse, stateVector, newScore) => {
        recordInteraction(userInput, yuliResponse, stateVector, newScore);
      },
    });
  };

  return (
    <div className="relative w-screen h-screen flex flex-col bg-[#06070a] text-slate-100 font-sans select-none overflow-hidden">
      {/* Dynamic 4-Sides Ambient Glow Backdrop */}
      <AmbientBackdrop activeVector={activeVector} />

      {/* Sovereign App Navigation Header */}
      <header className="relative z-30 h-16 shrink-0 border-b border-slate-800/80 backdrop-blur-xl bg-slate-950/60 px-4 md:px-6 flex items-center justify-between">
        {/* Left: Brand Identity */}
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-2xl flex items-center justify-center border shadow-lg transition-all duration-500"
            style={{
              backgroundColor: activeMeta.palette.badgeBg,
              borderColor: activeMeta.palette.border,
              boxShadow: `0 0 16px ${activeMeta.palette.glow}`,
            }}
          >
            <Brain className="w-5 h-5" style={{ color: activeMeta.palette.primary }} />
          </div>

          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm tracking-tight text-slate-100">Project Yuli</span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded border border-slate-800 bg-slate-900/90 text-slate-400 hidden sm:inline">
                Sovereign Companion
              </span>
            </div>
            <span className="text-[11px] font-mono text-slate-400 truncate max-w-[170px] sm:max-w-none">
              Client-side Edge AI · OPFS Memory
            </span>
          </div>
        </div>

        {/* Center: Cognitive State Badge & Hypercube Dynamics */}
        <div className="flex items-center justify-center">
          <CognitiveHUD
            activeVector={activeVector}
            onVectorSelect={setManualVector}
            intimacyScore={intimacyScore}
          />
        </div>

        {/* Right: Actions (Storage Health, Memory Vault, Model Loader) */}
        <div className="flex items-center gap-2">
          {/* Storage Quota & Persistence Indicator */}
          <StorageHealth
            isOpfs={isOpfs}
            workerUsageBytes={storageStats.usage}
            workerQuotaBytes={storageStats.quota}
          />

          {/* Memory Vault Button */}
          <button
            onClick={() => setIsMemoryVaultOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-slate-800 bg-slate-900/60 hover:bg-slate-800/80 text-slate-300 hover:text-slate-100 text-xs font-medium backdrop-blur-md transition-all duration-200 hover:scale-105"
            title="Open Relational Memory Vault"
          >
            <Database className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden md:inline">Memory</span>
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
              {facts.length}
            </span>
          </button>

          {/* Model Engine Configuration Button */}
          <button
            onClick={() => setIsModelModalOpen(true)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium backdrop-blur-md transition-all duration-200 hover:scale-105 ${
              modelProgress.status === 'ready'
                ? 'border-indigo-500/40 bg-indigo-500/15 text-indigo-300'
                : modelProgress.status === 'downloading'
                ? 'border-amber-500/50 bg-amber-500/15 text-amber-300 animate-pulse'
                : 'border-slate-800 bg-slate-900/60 text-slate-300'
            }`}
            title="Configure Neural Model Weights"
          >
            <Cpu className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Weights</span>
            {modelProgress.status === 'downloading' && (
              <span className="text-[10px] font-mono">{modelProgress.percentage}%</span>
            )}
          </button>
        </div>
      </header>

      {/* Main Chat Interface */}
      <main className="flex-1 flex flex-col min-h-0 relative z-10">
        <ChatViewport
          messages={messages}
          activeVector={activeVector}
          isGenerating={isGenerating}
          streamingThoughts={streamingThoughts}
          streamingContent={streamingContent}
          isThinking={isThinking}
          generationStats={generationStats}
          onSendMessage={handleSendMessage}
          onAbort={abortGeneration}
        />
      </main>

      {/* Memory Vault Modal (CRUD for SQLite facts & state) */}
      <MemoryVaultModal
        isOpen={isMemoryVaultOpen}
        onClose={() => setIsMemoryVaultOpen(false)}
        facts={facts}
        relationalState={relationalState}
        isOpfs={isOpfs}
        onAddFact={addFact}
        onUpdateFact={updateFact}
        onDeleteFact={deleteFact}
        onSetRelationalItem={setRelationalItem}
        onResetDB={resetDatabase}
      />

      {/* Model Progress & WebGPU Settings Modal */}
      <ModelProgressModal
        isOpen={isModelModalOpen}
        onClose={() => setIsModelModalOpen(false)}
        progress={modelProgress}
        onLoadModel={loadModel}
      />
    </div>
  );
}

export default App;
