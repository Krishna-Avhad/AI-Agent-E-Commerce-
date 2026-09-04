import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  X, 
  Send, 
  Sparkles, 
  Bot, 
  ShoppingBag, 
  ArrowRight, 
  Layers, 
  ArrowRightLeft,
  CheckCircle2,
  Cpu
} from 'lucide-react';

export const AIChatDrawer: React.FC = () => {
  const {
    isChatOpen,
    setIsChatOpen,
    chatMessages,
    sendChatMessage,
    setSelectedProduct,
    setShopperRoute,
    addToCart,
    addToCompare,
    setPortalMode
  } = useApp();

  const [inputPrompt, setInputPrompt] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, isChatOpen]);

  if (!isChatOpen) return null;

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputPrompt.trim()) return;
    sendChatMessage(inputPrompt.trim());
    setInputPrompt('');
  };

  const samplePrompts = [
    "Recommend the best headphones under ₹350 for deep focus",
    "Create an ergonomic desk bundle for developer posture",
    "Compare Kinesis Keyboard vs Vertical Mouse",
    "What are current agent-to-agent order volume trends?"
  ];

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div 
        onClick={() => setIsChatOpen(false)}
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" 
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col border-l border-slate-200">
          {/* Header */}
          <div className="p-4 bg-gradient-to-r from-slate-900 to-slate-800 text-white flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-xl bg-teal-500/20 border border-teal-500/40 flex items-center justify-center text-teal-300">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-heading font-semibold text-sm">RazorFlow Commerce Copilot</h3>
                <p className="text-[10px] text-teal-300 flex items-center">
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-400 inline-block mr-1.5 animate-pulse" />
                  Intent Vector Engine Active
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsChatOpen(false)}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-700 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Messages Feed */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
            {chatMessages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div className="flex items-center space-x-1.5 mb-1 text-[11px] text-slate-400">
                  {msg.sender === 'ai' ? (
                    <>
                      <Bot className="w-3.5 h-3.5 text-teal-600" />
                      <span className="font-semibold text-slate-700">RazorFlow AI</span>
                    </>
                  ) : (
                    <span>You</span>
                  )}
                  <span>• {msg.timestamp}</span>
                </div>

                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-xs leading-relaxed ${
                    msg.sender === 'user'
                      ? 'bg-slate-900 text-white rounded-br-none shadow-sm'
                      : 'bg-white text-slate-800 border border-slate-200 rounded-bl-none shadow-sm'
                  }`}
                >
                  <p className="whitespace-pre-line">{msg.text}</p>
                </div>

                {/* Suggestions / Embedded Cards */}
                {msg.productSuggestions && msg.productSuggestions.length > 0 && (
                  <div className="mt-2.5 w-full space-y-2">
                    {msg.productSuggestions.map((prod) => (
                      <div
                        key={prod.id}
                        className="bg-white border border-teal-200/70 rounded-xl p-2.5 flex items-center justify-between shadow-sm hover:border-teal-500 transition cursor-pointer"
                        onClick={() => {
                          setSelectedProduct(prod);
                          setPortalMode('shopper');
                          setShopperRoute('product-detail');
                          setIsChatOpen(false);
                        }}
                      >
                        <div className="flex items-center space-x-2.5">
                          <img
                            src={prod.image}
                            alt={prod.name}
                            className="w-10 h-10 object-cover rounded-lg border border-slate-100"
                          />
                          <div>
                            <h5 className="font-semibold text-slate-900 text-xs line-clamp-1">{prod.name}</h5>
                            <div className="flex items-center space-x-2 text-[11px]">
                              <span className="font-bold text-slate-900">₹{prod.price}</span>
                              <span className="text-teal-600 font-semibold">{prod.aiMatchScore}% Match</span>
                            </div>
                          </div>
                        </div>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            addToCart(prod);
                          }}
                          className="p-1.5 bg-slate-900 hover:bg-teal-600 text-white rounded-lg transition"
                          title="Add to Cart"
                        >
                          <ShoppingBag className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Interactive Action Buttons */}
                {msg.actions && msg.actions.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {msg.actions.map((act, aIdx) => (
                      <button
                        key={aIdx}
                        onClick={() => {
                          if (act.actionType === 'view_product') {
                            setSelectedProduct(act.payload);
                            setPortalMode('shopper');
                            setShopperRoute('product-detail');
                            setIsChatOpen(false);
                          } else if (act.actionType === 'view_bundle') {
                            setPortalMode('shopper');
                            setShopperRoute('bundles');
                            setIsChatOpen(false);
                          } else if (act.actionType === 'add_to_cart') {
                            addToCart(act.payload);
                          } else if (act.actionType === 'compare_products') {
                            setPortalMode('shopper');
                            setShopperRoute('compare');
                            setIsChatOpen(false);
                          }
                        }}
                        className="inline-flex items-center px-2.5 py-1 bg-white hover:bg-teal-50 border border-teal-200 text-teal-700 rounded-full text-[11px] font-semibold shadow-2xl transition"
                      >
                        <Sparkles className="w-3 h-3 mr-1 text-teal-600" />
                        {act.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Prompts */}
          <div className="p-2.5 bg-white border-t border-slate-100 flex items-center space-x-1.5 overflow-x-auto text-[11px]">
            <span className="text-slate-400 font-medium whitespace-nowrap pl-1">Ask:</span>
            {samplePrompts.slice(0, 2).map((prompt, pIdx) => (
              <button
                key={pIdx}
                onClick={() => sendChatMessage(prompt)}
                className="px-2.5 py-1 bg-slate-100 hover:bg-teal-50 text-slate-600 hover:text-teal-700 rounded-full border border-slate-200/60 whitespace-nowrap transition"
              >
                {prompt}
              </button>
            ))}
          </div>

          {/* Prompt Input Form */}
          <form onSubmit={handleSend} className="p-3 bg-white border-t border-slate-200 flex items-center space-x-2">
            <div className="relative flex-1">
              <input
                type="text"
                value={inputPrompt}
                onChange={(e) => setInputPrompt(e.target.value)}
                placeholder="Type your commerce intent or requirement..."
                className="w-full pl-3 pr-8 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500"
              />
              <Sparkles className="w-3.5 h-3.5 text-teal-500 absolute right-2.5 top-3 pointer-events-none" />
            </div>
            <button
              type="submit"
              disabled={!inputPrompt.trim()}
              className="p-2.5 bg-slate-900 hover:bg-teal-600 disabled:opacity-40 text-white rounded-xl transition shadow-sm"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
