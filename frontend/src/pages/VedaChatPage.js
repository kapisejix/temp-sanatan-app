import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Send, Plus, Trash2, MessageCircle, Loader2, Bot, User } from 'lucide-react';

export default function VedaChatPage() {
  const { api } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [activeConv, setActiveConv] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [convLoading, setConvLoading] = useState(true);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });

  useEffect(() => {
    fetchConversations();
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages]);

  const fetchConversations = async () => {
    try {
      const { data } = await api.get('/vedachat/conversations');
      setConversations(data);
    } catch (err) {
      console.error(err);
    } finally {
      setConvLoading(false);
    }
  };

  const loadConversation = async (convId) => {
    try {
      const { data } = await api.get(`/vedachat/conversations/${convId}`);
      setActiveConv(convId);
      setMessages(data.messages || []);
    } catch (err) {
      console.error(err);
    }
  };

  const startNewChat = () => {
    setActiveConv(null);
    setMessages([]);
  };

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    const text = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: text, timestamp: new Date().toISOString() }]);
    setLoading(true);
    try {
      const { data } = await api.post('/vedachat/message', {
        message: text,
        conversation_id: activeConv,
      });
      if (!activeConv && data.conversation_id) {
        setActiveConv(data.conversation_id);
      }
      setMessages(prev => [...prev, data.response]);
      fetchConversations();
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I encountered an error. Please try again.', timestamp: new Date().toISOString() }]);
    } finally {
      setLoading(false);
    }
  };

  const deleteConversation = async (convId) => {
    try {
      await api.delete(`/vedachat/conversations/${convId}`);
      if (activeConv === convId) startNewChat();
      fetchConversations();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="h-[calc(100vh-96px)] flex gap-4" data-testid="vedachat-page">
      {/* Sidebar - Conversations */}
      <div className="w-72 bg-white rounded-xl border border-[#E8E4E1] flex flex-col flex-shrink-0 animate-fade-in">
        <div className="p-4 border-b border-[#E8E4E1]">
          <button onClick={startNewChat} className="w-full flex items-center justify-center gap-2 px-3 py-2.5 bg-[#E95A34] hover:bg-[#D04A28] text-white rounded-lg text-sm font-medium transition-colors" data-testid="new-chat-btn">
            <Plus size={16} /> New Conversation
          </button>
        </div>
        <div className="flex-1 overflow-y-auto py-2">
          {convLoading ? (
            <div className="flex justify-center py-8"><Loader2 size={20} className="animate-spin text-[#E95A34]" /></div>
          ) : conversations.length === 0 ? (
            <p className="text-center text-sm text-[#989EA4] py-8">No conversations yet</p>
          ) : conversations.map(conv => (
            <div
              key={conv._id}
              className={`flex items-center gap-2 mx-2 px-3 py-2.5 rounded-md cursor-pointer transition-colors group ${activeConv === conv._id ? 'bg-[#FEF0EC] text-[#D08465]' : 'hover:bg-[#F3EDEA] text-[#7A8690]'}`}
              onClick={() => loadConversation(conv._id)}
              data-testid={`conv-${conv._id}`}
            >
              <MessageCircle size={14} className="flex-shrink-0" />
              <span className="text-sm truncate flex-1">{conv.preview || 'New conversation'}</span>
              <button
                onClick={(e) => { e.stopPropagation(); deleteConversation(conv._id); }}
                className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-50 rounded text-[#989EA4] hover:text-red-500 transition-all"
              >
                <Trash2 size={12} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 bg-white rounded-xl border border-[#E8E4E1] flex flex-col animate-fade-in">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#E8E4E1]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-[#FEF0EC] rounded-lg flex items-center justify-center">
              <Bot size={18} className="text-[#E95A34]" />
            </div>
            <div>
              <h3 className="text-sm font-semibold" style={{ fontFamily: 'Manrope' }}>VedaChat AI</h3>
              <p className="text-xs text-[#7A8690]">Powered by Claude Sonnet 4.5 - Ask about scriptures, rituals, philosophy</p>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="w-16 h-16 bg-[#FEF0EC] rounded-2xl flex items-center justify-center mb-4">
                <Bot size={28} className="text-[#E95A34]" />
              </div>
              <h3 className="text-lg font-semibold mb-2" style={{ fontFamily: 'Manrope' }}>Welcome to VedaChat</h3>
              <p className="text-sm text-[#7A8690] max-w-md">
                Ask questions about Hindu scriptures, philosophy, rituals, and spiritual practices. I'll provide answers with scripture references.
              </p>
              <div className="flex flex-wrap gap-2 mt-6 justify-center">
                {['What does Krishna say about duty?', 'Explain Gayatri Mantra meaning', 'Significance of Hanuman Chalisa'].map(q => (
                  <button key={q} onClick={() => { setInput(q); }} className="px-3 py-2 bg-[#F8F3F1] border border-[#E8E4E1] rounded-lg text-sm text-[#7A8690] hover:border-[#E95A34] hover:text-[#E95A34] transition-colors">
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}
          {messages.map((msg, i) => (
            <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : ''}`}>
              {msg.role === 'assistant' && (
                <div className="w-8 h-8 bg-[#FEF0EC] rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Bot size={14} className="text-[#E95A34]" />
                </div>
              )}
              <div className={`max-w-[75%] px-4 py-3 rounded-xl text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-[#E95A34] text-white rounded-br-sm'
                  : 'bg-[#F8F3F1] border border-[#E8E4E1] text-[#374652] rounded-bl-sm'
              }`}>
                <div className="whitespace-pre-wrap">{msg.content}</div>
              </div>
              {msg.role === 'user' && (
                <div className="w-8 h-8 bg-[#FDDDD4] rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                  <User size={14} className="text-[#E95A34]" />
                </div>
              )}
            </div>
          ))}
          {loading && (
            <div className="flex gap-3">
              <div className="w-8 h-8 bg-[#FEF0EC] rounded-lg flex items-center justify-center flex-shrink-0">
                <Bot size={14} className="text-[#E95A34]" />
              </div>
              <div className="bg-[#F8F3F1] border border-[#E8E4E1] rounded-xl px-4 py-3 rounded-bl-sm">
                <div className="flex items-center gap-2 text-sm text-[#7A8690]">
                  <Loader2 size={14} className="animate-spin" />
                  <span>Thinking...</span>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="px-6 py-4 border-t border-[#E8E4E1]">
          <div className="flex gap-3">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
              placeholder="Ask about scriptures, rituals, mantras..."
              className="flex-1 px-4 py-2.5 bg-[#F8F3F1] border border-[#E8E4E1] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#E95A34] focus:border-[#E95A34]"
              disabled={loading}
              data-testid="chat-input"
            />
            <button
              onClick={sendMessage}
              disabled={loading || !input.trim()}
              className="px-4 py-2.5 bg-[#E95A34] hover:bg-[#D04A28] text-white rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
              data-testid="send-message-btn"
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
