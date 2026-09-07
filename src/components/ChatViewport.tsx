import React, { useState, useRef, useEffect } from 'react';
import { Message, StateVector } from '../types';
import { SIDES_METADATA } from '../lib/bitwiseMath';
import {
  Send,
  Square,
  Sparkles,
  ChevronDown,
  ChevronUp,
  BrainCircuit,
  CornerDownLeft,
  Bot,
  User,
} from 'lucide-react';

interface ChatViewportProps {
  messages: Message[];
  activeVector: StateVector;
  isGenerating: boolean;
  streamingThoughts: string;
  streamingContent: string;
  isThinking: boolean;
  generationStats: { tps: number; totalTokens: number };
  onSendMessage: (text: string) => void;
  onAbort: () => void;
}

export const ChatViewport: React.FC<ChatViewportProps> = ({
  messages,
  activeVector,
  isGenerating,
  streamingThoughts,
  streamingContent,
  isThinking,
  generationStats,
  onSendMessage,
  onAbort,
}) => {
  const [input, setInput] = useState('');
  const [openThoughtIds, setOpenThoughtIds] = useState<Record<string, boolean>>({});
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const meta = SIDES_METADATA[activeVector] || SIDES_METADATA['0EE'];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingContent, streamingThoughts]);

  const toggleThought = (id: string) => {
    setOpenThoughtIds((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSend = () => {
    if (!input.trim() || isGenerating) return;
    onSendMessage(input.trim());
    setInput('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleTextareaInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = `${Math.min(e.target.scrollHeight, 140)}px`;
  };

  const quickPrompts = [
    "What are your 4 cognitive sides?",
    "How does our memory ledger work in OPFS?",
    "Shift your cognition to Subconscious [2E7].",
    "What's your current circadian mood?",
  ];

  return (
    <div className="flex-1 flex flex-col min-h-0 relative z-10 max-w-4xl w-full mx-auto px-4 md:px-6">
      {/* Message Feed */}
      <div className="flex-1 overflow-y-auto pt-4 pb-6 space-y-5 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
        {messages.map((msg) => {
          const isAssistant = msg.role === 'assistant';
          const msgMeta = msg.stateVector ? SIDES_METADATA[msg.stateVector] : meta;
          const isThoughtOpen = !!openThoughtIds[msg.id];

          return (
            <div
              key={msg.id}
              className={`flex flex-col ${isAssistant ? 'items-start' : 'items-end'} transition-all`}
            >
              {/* Message Container */}
              <div
                className={`flex gap-3 max-w-[92%] sm:max-w-[85%] ${
                  isAssistant ? 'flex-row' : 'flex-row-reverse'
                }`}
              >
                {/* Avatar Icon */}
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 border shadow-sm ${
                    isAssistant
                      ? 'bg-slate-900 border-slate-700'
                      : 'bg-amber-950/40 border-amber-600/40'
                  }`}
                  style={{
                    borderColor: isAssistant && msgMeta ? msgMeta.palette.border : undefined,
                  }}
                >
                  {isAssistant ? (
                    <Bot className="w-4 h-4" style={{ color: msgMeta.palette.primary }} />
                  ) : (
                    <User className="w-4 h-4 text-amber-300" />
                  )}
                </div>

                {/* Message Bubble Wrapper */}
                <div className="flex flex-col space-y-1.5 flex-1 min-w-0">
                  {/* Assistant Collapsible Thought Drawer */}
                  {isAssistant && msg.thoughts && (
                    <div
                      className="rounded-xl border overflow-hidden transition-all duration-200"
                      style={{
                        borderColor: msgMeta.palette.border,
                        backgroundColor: 'rgba(15, 23, 42, 0.45)',
                      }}
                    >
                      <button
                        onClick={() => toggleThought(msg.id)}
                        className="w-full px-3 py-1.5 flex items-center justify-between text-left hover:bg-slate-800/40 transition-colors"
                      >
                        <div className="flex items-center gap-1.5 text-xs font-mono text-slate-300">
                          <BrainCircuit
                            className="w-3.5 h-3.5"
                            style={{ color: msgMeta.palette.primary }}
                          />
                          <span>Internal Cognitive Deductions</span>
                          {msg.stateVector && (
                            <span
                              className="px-1.5 py-0.2 rounded text-[10px] border"
                              style={{
                                color: msgMeta.palette.primary,
                                borderColor: msgMeta.palette.border,
                                backgroundColor: msgMeta.palette.badgeBg,
                              }}
                            >
                              [{msg.stateVector}]
                            </span>
                          )}
                        </div>
                        <div className="text-slate-400">
                          {isThoughtOpen ? (
                            <ChevronUp className="w-3.5 h-3.5" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5" />
                          )}
                        </div>
                      </button>

                      {isThoughtOpen && (
                        <div className="px-3.5 py-2.5 text-xs font-mono text-slate-300 leading-relaxed border-t border-slate-800/70 bg-slate-950/50 whitespace-pre-wrap">
                          {msg.thoughts}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Main Bubble Content */}
                  <div
                    className={`px-4 py-3 rounded-2xl text-sm leading-relaxed backdrop-blur-md shadow-md ${
                      isAssistant
                        ? 'bg-slate-900/75 border border-slate-800/90 text-slate-100 rounded-tl-sm'
                        : 'bg-gradient-to-br from-amber-600/90 to-amber-700 text-white rounded-tr-sm shadow-amber-900/20'
                    }`}
                    style={{
                      borderColor: isAssistant && msgMeta ? msgMeta.palette.border : undefined,
                    }}
                  >
                    <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                  </div>

                  {/* Message Telemetry Footer */}
                  {isAssistant && (msg.tokensGenerated || msg.latencyMs) && (
                    <div className="flex items-center gap-2 px-1 text-[10px] font-mono text-slate-400">
                      {msg.tokensPerSec && <span>{msg.tokensPerSec} tps</span>}
                      {msg.tokensGenerated && <span>· {msg.tokensGenerated} tokens</span>}
                      {msg.latencyMs && <span>· {(msg.latencyMs / 1000).toFixed(2)}s</span>}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {/* Streaming In-Flight Bubble */}
        {isGenerating && (
          <div className="flex flex-col items-start space-y-1.5 transition-all">
            <div className="flex gap-3 max-w-[92%] sm:max-w-[85%]">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 border shadow-sm bg-slate-900"
                style={{ borderColor: meta.palette.border }}
              >
                <Bot className="w-4 h-4 animate-pulse" style={{ color: meta.palette.primary }} />
              </div>

              <div className="flex flex-col space-y-1.5 flex-1 min-w-0">
                {/* Streaming Thought Accordion */}
                {(streamingThoughts || isThinking) && (
                  <div
                    className="rounded-xl border overflow-hidden transition-all duration-200"
                    style={{
                      borderColor: meta.palette.border,
                      backgroundColor: 'rgba(15, 23, 42, 0.45)',
                    }}
                  >
                    <div className="px-3 py-1.5 flex items-center justify-between bg-slate-800/40">
                      <div className="flex items-center gap-2 text-xs font-mono text-slate-300">
                        <BrainCircuit
                          className="w-3.5 h-3.5 animate-spin"
                          style={{ color: meta.palette.primary }}
                        />
                        <span>Reasoning Stream in Progress...</span>
                        <span
                          className="px-1.5 py-0.2 rounded text-[10px] border"
                          style={{
                            color: meta.palette.primary,
                            borderColor: meta.palette.border,
                            backgroundColor: meta.palette.badgeBg,
                          }}
                        >
                          [{meta.vector}]
                        </span>
                      </div>
                    </div>

                    <div className="px-3.5 py-2.5 text-xs font-mono text-slate-300 leading-relaxed border-t border-slate-800/70 bg-slate-950/50 whitespace-pre-wrap">
                      {streamingThoughts || "Synthesizing neural weights and state vector..."}
                    </div>
                  </div>
                )}

                {/* Streaming Response */}
                <div
                  className="px-4 py-3 rounded-2xl text-sm leading-relaxed backdrop-blur-md shadow-md bg-slate-900/75 border rounded-tl-sm text-slate-100"
                  style={{ borderColor: meta.palette.border }}
                >
                  <p className="whitespace-pre-wrap break-words">
                    {streamingContent || (
                      <span className="inline-flex items-center gap-1 text-slate-400">
                        <Sparkles className="w-3.5 h-3.5 animate-pulse" />
                        Awakening response tokens...
                      </span>
                    )}
                  </p>
                </div>

                {/* Streaming TPS metric */}
                {generationStats.totalTokens > 0 && (
                  <div className="px-1 text-[10px] font-mono text-slate-400">
                    Generating: {generationStats.tps} tps ({generationStats.totalTokens} tokens)
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Prompts Chips */}
      {messages.length <= 2 && !isGenerating && (
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          {quickPrompts.map((qp, idx) => (
            <button
              key={idx}
              onClick={() => onSendMessage(qp)}
              className="shrink-0 text-xs px-3 py-1.5 rounded-full border border-slate-800 bg-slate-900/60 hover:bg-slate-800 text-slate-300 hover:text-slate-100 transition-all"
            >
              {qp}
            </button>
          ))}
        </div>
      )}

      {/* Input Composer Bar */}
      <div className="py-3">
        <div
          className="relative flex items-end gap-2 p-2 rounded-2xl border backdrop-blur-xl bg-slate-950/80 shadow-2xl transition-all duration-300"
          style={{
            borderColor: meta.palette.border,
            boxShadow: `0 0 25px ${meta.palette.glow}`,
          }}
        >
          <textarea
            ref={textareaRef}
            rows={1}
            value={input}
            onChange={handleTextareaInput}
            onKeyDown={handleKeyDown}
            placeholder={`Message Yuli [${meta.vector}] (Shift+Enter for newline)...`}
            className="flex-1 bg-transparent border-0 resize-none text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-0 px-2 py-1 max-h-[140px] scrollbar-thin"
          />

          {/* Action Button: Send or Abort */}
          {isGenerating ? (
            <button
              onClick={onAbort}
              className="p-2.5 rounded-xl bg-rose-500/20 text-rose-300 border border-rose-500/40 hover:bg-rose-500/30 transition-all flex items-center justify-center shrink-0"
              title="Abort generation"
            >
              <Square className="w-4 h-4 fill-current" />
            </button>
          ) : (
            <button
              onClick={handleSend}
              disabled={!input.trim()}
              className={`p-2.5 rounded-xl transition-all flex items-center justify-center shrink-0 ${
                input.trim()
                  ? 'text-slate-950 hover:scale-105 active:scale-95 shadow-md'
                  : 'bg-slate-800/40 text-slate-600 cursor-not-allowed'
              }`}
              style={{
                backgroundColor: input.trim() ? meta.palette.primary : undefined,
              }}
              title="Send message"
            >
              <Send className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
