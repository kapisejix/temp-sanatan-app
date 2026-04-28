import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Send, Plus, Trash2, MessageCircle, Loader2, Bot, User, Upload, FileText, BookOpen, X, Database, Check } from 'lucide-react';

export default function VedaChatPage() {
  const { api } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [activeConv, setActiveConv] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [convLoading, setConvLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [uploadFile, setUploadFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const [knowledgeStats, setKnowledgeStats] = useState(null);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });

  useEffect(() => {
    fetchConversations();
    fetchKnowledgeStats();
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages]);

  const fetchConversations = async () => {
    try {
      const { data } = await api.get('/vedachat/conversations');
      setConversations(data);
    } catch (err) { console.error(err); }
    finally { setConvLoading(false); }
  };

  const fetchKnowledgeStats = async () => {
    try {
      const { data } = await api.get('/vedachat/knowledge-stats');
      setKnowledgeStats(data);
    } catch (err) { console.error(err); }
  };

  const loadConversation = async (convId) => {
    try {
      const { data } = await api.get(`/vedachat/conversations/${convId}`);
      setActiveConv(convId);
      setMessages(data.messages || []);
    } catch (err) { console.error(err); }
  };

  const startNewChat = () => { setActiveConv(null); setMessages([]); };

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
      if (!activeConv && data.conversation_id) setActiveConv(data.conversation_id);
      setMessages(prev => [...prev, data.response]);
      fetchConversations();
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I encountered an error. Please try again.', timestamp: new Date().toISOString() }]);
    } finally { setLoading(false); }
  };

  const deleteConversation = async (convId) => {
    try {
      await api.delete(`/vedachat/conversations/${convId}`);
      if (activeConv === convId) startNewChat();
      fetchConversations();
    } catch (err) { console.error(err); }
  };

  const handleUploadKnowledge = async () => {
    if (!uploadFile) return;
    setUploading(true);
    setUploadResult(null);
    try {
      const formData = new FormData();
      formData.append('file', uploadFile);
      const { data } = await api.post('/vedachat/upload-knowledge', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 180000,
      });
      setUploadResult(data);
      fetchKnowledgeStats();
    } catch (err) {
      setUploadResult({ error: err.response?.data?.detail || 'Upload failed' });
    } finally { setUploading(false); }
  };

  // Render message with scripture references
  const renderMessage = (msg) => {
    const content = msg.content || '';
    const references = msg.references || [];

    return (
      <div>
        <div className="whitespace-pre-wrap">{content}</div>
        {references.length > 0 && (
          <div className="mt-3 space-y-2">
            {references.map((ref, i) => (
              <div key={i} className="bg-white/60 border border-[#E8E4E1] rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <BookOpen size={12} className="text-[#E95A34]" />
                  <span className="text-xs font-bold text-[#E95A34]">
                    {ref.book} {ref.chapter ? `| Ch. ${ref.chapter}` : ''} {ref.verse ? `| V. ${ref.verse}` : ''}
                  </span>
                </div>
                {ref.sanskrit && <p className="text-sm font-medium text-[#374652] mb-1">{ref.sanskrit}</p>}
                {ref.meaning && <p className="text-xs text-[#7A8690] italic">{ref.meaning}</p>}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="h-[calc(100vh-96px)] flex gap-4" data-testid="vedachat-page">
      {/* Sidebar - Conversations */}
      <div className="w-72 bg-white rounded-xl border border-[#E8E4E1] flex flex-col flex-shrink-0 animate-fade-in">
        <div className="p-4 border-b border-[#E8E4E1] space-y-2">
          <button onClick={startNewChat} className="w-full flex items-center justify-center gap-2 px-3 py-2.5 bg-[#E95A34] hover:bg-[#D04A28] text-white rounded-lg text-sm font-medium transition-colors" data-testid="new-chat-btn">
            <Plus size={16} /> New Conversation
          </button>
          <button onClick={() => setShowUpload(true)} className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-[#F8F3F1] border border-[#E8E4E1] hover:border-[#E95A34] text-[#374652] rounded-lg text-sm font-medium transition-colors" data-testid="upload-knowledge-btn">
            <Database size={14} /> Upload Knowledge
          </button>
        </div>

        {/* Knowledge Stats */}
        {knowledgeStats && (
          <div className="px-4 py-3 border-b border-[#E8E4E1] bg-[#F8F3F1]">
            <p className="text-xs font-bold text-[#7A8690] uppercase tracking-wider mb-1">Knowledge Base</p>
            <div className="grid grid-cols-2 gap-1">
              <div className="text-xs"><span className="font-bold text-[#E95A34]">{knowledgeStats.total_documents}</span> docs</div>
              <div className="text-xs"><span className="font-bold text-[#E95A34]">{knowledgeStats.total_verses}</span> verses</div>
              <div className="text-xs"><span className="font-bold text-[#E95A34]">{knowledgeStats.total_books}</span> books</div>
              <div className="text-xs"><span className="font-bold text-[#E95A34]">{knowledgeStats.total_content}</span> items</div>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto py-2">
          {convLoading ? (
            <div className="flex justify-center py-8"><Loader2 size={20} className="animate-spin text-[#E95A34]" /></div>
          ) : conversations.length === 0 ? (
            <p className="text-center text-sm text-[#989EA4] py-8">No conversations yet</p>
          ) : conversations.map(conv => (
            <div key={conv._id}
              className={`flex items-center gap-2 mx-2 px-3 py-2.5 rounded-md cursor-pointer transition-colors group ${activeConv === conv._id ? 'bg-[#FEF0EC] text-[#D08465]' : 'hover:bg-[#F3EDEA] text-[#7A8690]'}`}
              onClick={() => loadConversation(conv._id)} data-testid={`conv-${conv._id}`}>
              <MessageCircle size={14} className="flex-shrink-0" />
              <span className="text-sm truncate flex-1">{conv.preview || 'New conversation'}</span>
              <button onClick={(e) => { e.stopPropagation(); deleteConversation(conv._id); }}
                className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-50 rounded text-[#989EA4] hover:text-red-500 transition-all">
                <Trash2 size={12} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 bg-white rounded-xl border border-[#E8E4E1] flex flex-col animate-fade-in">
        <div className="px-6 py-4 border-b border-[#E8E4E1]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-[#FEF0EC] rounded-lg flex items-center justify-center">
              <Bot size={18} className="text-[#E95A34]" />
            </div>
            <div>
              <h3 className="text-sm font-semibold" style={{ fontFamily: 'Manrope' }}>VedaChat AI</h3>
              <p className="text-xs text-[#7A8690]">Answers with Shloka references — Book, Chapter, Verse</p>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="w-16 h-16 bg-[#FEF0EC] rounded-2xl flex items-center justify-center mb-4">
                <Bot size={28} className="text-[#E95A34]" />
              </div>
              <h3 className="text-lg font-semibold mb-2" style={{ fontFamily: 'Manrope' }}>Welcome to VedaChat</h3>
              <p className="text-sm text-[#7A8690] max-w-md mb-2">Ask questions about Hindu scriptures. I answer with exact Shloka references including Book name, Chapter and Verse numbers.</p>
              <p className="text-xs text-[#989EA4] max-w-md mb-6">Upload PDFs/DOCX files via "Upload Knowledge" to expand my scripture database.</p>
              <div className="flex flex-wrap gap-2 justify-center">
                {['What does Krishna say about duty in Gita?', 'Explain Gayatri Mantra with meaning', 'What is the significance of Hanuman Chalisa?', 'Tell me about Karma Yoga from Bhagavad Gita'].map(q => (
                  <button key={q} onClick={() => setInput(q)} className="px-3 py-2 bg-[#F8F3F1] border border-[#E8E4E1] rounded-lg text-sm text-[#7A8690] hover:border-[#E95A34] hover:text-[#E95A34] transition-colors" data-testid={`suggestion-btn`}>
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
                msg.role === 'user' ? 'bg-[#E95A34] text-white rounded-br-sm' : 'bg-[#F8F3F1] border border-[#E8E4E1] text-[#374652] rounded-bl-sm'
              }`}>
                {renderMessage(msg)}
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
              <div className="w-8 h-8 bg-[#FEF0EC] rounded-lg flex items-center justify-center flex-shrink-0"><Bot size={14} className="text-[#E95A34]" /></div>
              <div className="bg-[#F8F3F1] border border-[#E8E4E1] rounded-xl px-4 py-3 rounded-bl-sm">
                <div className="flex items-center gap-2 text-sm text-[#7A8690]"><Loader2 size={14} className="animate-spin" /> Searching scriptures...</div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="px-6 py-4 border-t border-[#E8E4E1]">
          <div className="flex gap-3">
            <input value={input} onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
              placeholder="Ask about scriptures, rituals, mantras..."
              className="flex-1 px-4 py-2.5 bg-[#F8F3F1] border border-[#E8E4E1] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#E95A34]"
              disabled={loading} data-testid="chat-input" />
            <button onClick={sendMessage} disabled={loading || !input.trim()}
              className="px-4 py-2.5 bg-[#E95A34] hover:bg-[#D04A28] text-white rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
              data-testid="send-message-btn">
              <Send size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Upload Knowledge Modal */}
      {showUpload && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm">
          <div className="bg-white rounded-xl border border-[#E8E4E1] w-full max-w-xl shadow-xl m-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#E8E4E1]">
              <div>
                <h3 className="text-lg font-semibold" style={{ fontFamily: 'Manrope' }}>Upload Knowledge Base</h3>
                <p className="text-xs text-[#7A8690] mt-0.5">Upload PDF or DOCX files — content gets parsed and saved to the database for accurate answers</p>
              </div>
              <button onClick={() => { setShowUpload(false); setUploadResult(null); setUploadFile(null); }} className="p-1 hover:bg-[#F3EDEA] rounded-md"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="border-2 border-dashed border-[#E8E4E1] rounded-xl p-8 text-center cursor-pointer hover:border-[#E95A34] transition-colors"
                onClick={() => document.getElementById('knowledge-file-input').click()}>
                <Upload size={32} className="mx-auto text-[#989EA4] mb-3" />
                <p className="text-sm font-medium text-[#374652]">{uploadFile ? uploadFile.name : 'Click to select file'}</p>
                <p className="text-xs text-[#7A8690] mt-1">Supports: PDF, DOCX, DOC</p>
                {uploadFile && <p className="text-xs text-green-600 mt-2">{(uploadFile.size / 1024).toFixed(1)} KB ready</p>}
                <input id="knowledge-file-input" type="file" accept=".pdf,.docx,.doc" className="hidden" onChange={(e) => { setUploadFile(e.target.files[0]); setUploadResult(null); }} />
              </div>

              <div className="bg-[#F8F3F1] rounded-lg p-4">
                <p className="text-xs font-bold text-[#7A8690] uppercase tracking-wider mb-2">How it works</p>
                <ol className="text-xs text-[#374652] space-y-1 list-decimal list-inside">
                  <li>Upload a PDF/DOCX containing scripture text</li>
                  <li>AI parses and extracts: Book name, Chapters, Verses, Meanings</li>
                  <li>Extracted content is saved to the database</li>
                  <li>VedaChat uses this data to answer questions with exact references</li>
                </ol>
              </div>

              {uploadResult && !uploadResult.error && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Check size={16} className="text-green-600" />
                    <span className="text-sm font-medium text-green-800">Upload Successful!</span>
                  </div>
                  <p className="text-xs text-green-700">{uploadResult.message}</p>
                  {uploadResult.stats && (
                    <div className="flex gap-4 mt-2">
                      <span className="text-xs text-green-600">{uploadResult.stats.chapters} chapters</span>
                      <span className="text-xs text-green-600">{uploadResult.stats.verses} verses</span>
                    </div>
                  )}
                </div>
              )}

              {uploadResult?.error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">{uploadResult.error}</div>
              )}
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-[#E8E4E1]">
              <button onClick={() => { setShowUpload(false); setUploadResult(null); setUploadFile(null); }} className="px-4 py-2 text-sm text-[#7A8690] hover:bg-[#F3EDEA] rounded-lg">Close</button>
              <button onClick={handleUploadKnowledge} disabled={uploading || !uploadFile}
                className="px-4 py-2 bg-[#E95A34] text-white text-sm font-medium rounded-lg disabled:opacity-50 flex items-center gap-2" data-testid="upload-parse-btn">
                {uploading ? <><Loader2 size={14} className="animate-spin" /> Parsing & Saving...</> : <><Database size={14} /> Parse & Save to DB</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
