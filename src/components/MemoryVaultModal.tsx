import React, { useState } from 'react';
import { PartnerFact } from '../types';
import confetti from 'canvas-confetti';
import {
  Database,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  RotateCcw,
  Sparkles,
  BookOpen,
  Sliders,
  ShieldCheck,
} from 'lucide-react';

interface MemoryVaultModalProps {
  isOpen: boolean;
  onClose: () => void;
  facts: PartnerFact[];
  relationalState: Record<string, string>;
  isOpfs: boolean;
  onAddFact: (category: string, fact: string) => void;
  onUpdateFact: (id: number, category: string, fact: string) => void;
  onDeleteFact: (id: number) => void;
  onSetRelationalItem: (key: string, value: string) => void;
  onResetDB: () => void;
}

export const MemoryVaultModal: React.FC<MemoryVaultModalProps> = ({
  isOpen,
  onClose,
  facts,
  relationalState,
  isOpfs,
  onAddFact,
  onUpdateFact,
  onDeleteFact,
  onSetRelationalItem,
  onResetDB,
}) => {
  const [activeTab, setActiveTab] = useState<'facts' | 'relational'>('facts');
  const [newCategory, setNewCategory] = useState('Preference');
  const [newFact, setNewFact] = useState('');
  const [editingFactId, setEditingFactId] = useState<number | null>(null);
  const [editCategory, setEditCategory] = useState('');
  const [editFactText, setEditFactText] = useState('');
  const [editingRelKey, setEditingRelKey] = useState<string | null>(null);
  const [relValueInput, setRelValueInput] = useState('');

  if (!isOpen) return null;

  const handleAddFactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFact.trim()) return;
    onAddFact(newCategory, newFact.trim());
    setNewFact('');

    // Trigger celebratory confetti
    confetti({
      particleCount: 35,
      spread: 60,
      origin: { y: 0.7 },
      colors: ['#F59E0B', '#6366F1', '#E879F9'],
    });
  };

  const startEditFact = (fact: PartnerFact) => {
    setEditingFactId(fact.id);
    setEditCategory(fact.category);
    setEditFactText(fact.fact);
  };

  const saveEditFact = (id: number) => {
    if (!editFactText.trim()) return;
    onUpdateFact(id, editCategory, editFactText.trim());
    setEditingFactId(null);
  };

  const handleSaveRelItem = (key: string) => {
    if (!relValueInput.trim()) return;
    onSetRelationalItem(key, relValueInput.trim());
    setEditingRelKey(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl max-h-[85vh] flex flex-col rounded-3xl border border-slate-800 bg-[#0b0d14]/95 shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/40">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-100 flex items-center gap-2">
                Relational Memory Vault
                <span className="text-[10px] font-mono px-2 py-0.5 rounded border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" />
                  {isOpfs ? 'OPFS Ledger' : 'Memory Async'}
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Persistent SQLite memory stored client-side in your browser
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

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 px-6 pt-3 border-b border-slate-800/80 bg-slate-950/40">
          <button
            onClick={() => setActiveTab('facts')}
            className={`pb-2.5 px-2 text-xs font-medium border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'facts'
                ? 'border-amber-500 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            Partner Facts ({facts.length})
          </button>
          <button
            onClick={() => setActiveTab('relational')}
            className={`pb-2.5 px-2 text-xs font-medium border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'relational'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            Relational State ({Object.keys(relationalState).length})
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 scrollbar-thin scrollbar-thumb-slate-800">
          {activeTab === 'facts' ? (
            <>
              {/* Add Fact Form */}
              <form
                onSubmit={handleAddFactSubmit}
                className="p-3.5 rounded-2xl border border-slate-800 bg-slate-900/50 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                    <Plus className="w-3.5 h-3.5 text-amber-400" />
                    Record New Partner Insight
                  </span>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="text-xs bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1 text-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  >
                    <option value="Identity">Identity</option>
                    <option value="Preference">Preference</option>
                    <option value="Aesthetic">Aesthetic</option>
                    <option value="Value">Value</option>
                    <option value="Memory">Memory</option>
                  </select>
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newFact}
                    onChange={(e) => setNewFact(e.target.value)}
                    placeholder="e.g., Prefers late-night architectural design sessions..."
                    className="flex-1 text-xs bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-amber-500"
                  />
                  <button
                    type="submit"
                    disabled={!newFact.trim()}
                    className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-medium text-xs transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Log
                  </button>
                </div>
              </form>

              {/* Facts List */}
              <div className="space-y-2.5">
                {facts.length === 0 ? (
                  <div className="text-center py-8 text-slate-500 text-xs font-mono">
                    No partner facts recorded yet. Add one above!
                  </div>
                ) : (
                  facts.map((f) => (
                    <div
                      key={f.id}
                      className="p-3 rounded-xl border border-slate-800/80 bg-slate-900/30 hover:bg-slate-900/60 transition-all flex flex-col gap-1.5"
                    >
                      {editingFactId === f.id ? (
                        <div className="space-y-2">
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={editCategory}
                              onChange={(e) => setEditCategory(e.target.value)}
                              className="w-28 text-xs bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-slate-200"
                            />
                            <input
                              type="text"
                              value={editFactText}
                              onChange={(e) => setEditFactText(e.target.value)}
                              className="flex-1 text-xs bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-slate-200"
                            />
                          </div>
                          <div className="flex justify-end gap-1.5">
                            <button
                              onClick={() => setEditingFactId(null)}
                              className="px-2.5 py-1 rounded text-[11px] bg-slate-800 hover:bg-slate-700 text-slate-300"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() => saveEditFact(f.id)}
                              className="px-2.5 py-1 rounded text-[11px] bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1"
                            >
                              <Check className="w-3 h-3" /> Save
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                                {f.category}
                              </span>
                              <span className="text-[10px] font-mono text-slate-500">
                                {new Date(f.discovered_at).toLocaleDateString()}
                              </span>
                            </div>
                            <p className="text-xs text-slate-200 leading-relaxed">{f.fact}</p>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              onClick={() => startEditFact(f)}
                              className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
                              title="Edit fact"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => onDeleteFact(f.id)}
                              className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                              title="Delete fact"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </>
          ) : (
            /* Relational State Tab */
            <div className="space-y-3">
              <p className="text-xs text-slate-400 leading-relaxed">
                Relational state tracks continuous emotional intimacy, humor, and shared frequency.
              </p>

              <div className="space-y-2">
                {Object.entries(relationalState).map(([k, v]) => (
                  <div
                    key={k}
                    className="p-3 rounded-xl border border-slate-800 bg-slate-900/40 flex items-center justify-between gap-3"
                  >
                    <div className="flex-1 min-w-0">
                      <span className="text-[11px] font-mono uppercase tracking-wider text-indigo-400 block">
                        {k.replace(/_/g, ' ')}
                      </span>
                      {editingRelKey === k ? (
                        <div className="flex items-center gap-2 mt-1">
                          <input
                            type="text"
                            value={relValueInput}
                            onChange={(e) => setRelValueInput(e.target.value)}
                            className="flex-1 text-xs bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-slate-100 focus:outline-none focus:border-indigo-500"
                          />
                          <button
                            onClick={() => handleSaveRelItem(k)}
                            className="p-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setEditingRelKey(null)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <p className="text-xs text-slate-200 mt-0.5">{v}</p>
                      )}
                    </div>

                    {editingRelKey !== k && (
                      <button
                        onClick={() => {
                          setEditingRelKey(k);
                          setRelValueInput(v);
                        }}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors shrink-0"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 border-t border-slate-800/80 bg-slate-950/60 flex items-center justify-between">
          <button
            onClick={() => {
              if (window.confirm('Reset SQLite relational ledger to initial seed state?')) {
                onResetDB();
              }
            }}
            className="flex items-center gap-1 text-xs text-rose-400/80 hover:text-rose-400 hover:underline transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset Database
          </button>

          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors"
          >
            Close Vault
          </button>
        </div>
      </div>
    </div>
  );
};
