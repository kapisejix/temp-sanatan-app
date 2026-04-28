import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Upload, FileText, AlertCircle, Check, X, Loader2, Eye, Trash2 } from 'lucide-react';

export default function ContentUploadPage() {
  const { api } = useAuth();
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [category, setCategory] = useState('chalisa');
  const [parsedData, setParsedData] = useState(null);
  const [uploadId, setUploadId] = useState(null);
  const [error, setError] = useState('');
  const [publishing, setPublishing] = useState(false);
  const [uploads, setUploads] = useState([]);
  const [showHistory, setShowHistory] = useState(false);

  const CATEGORIES = [
    { value: 'chalisa', label: 'Chalisa' },
    { value: 'vedic_mantra', label: 'Vedic Mantras' },
    { value: 'ashtakam', label: 'Ashtakam' },
    { value: 'sahasranama', label: 'Sahasranama' },
    { value: 'nama_ramayanam', label: 'Nama Ramayanam' },
    { value: 'katha', label: 'Katha & Puja' },
    { value: 'arti', label: 'Arti Sangrah' },
  ];

  const PDF_TYPES = [
    { value: 'veda', label: 'Veda' },
    { value: 'purana', label: 'Purana' },
    { value: 'granth', label: 'Granth' },
  ];

  const [uploadMode, setUploadMode] = useState('docx');
  const [pdfType, setPdfType] = useState('veda');

  const fetchUploads = async () => {
    try {
      const { data } = await api.get('/admin/uploads');
      setUploads(data);
    } catch (err) { console.error(err); }
  };

  useEffect(() => { fetchUploads(); }, []);

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');
    setParsedData(null);
    setUploading(true);

    const formData = new FormData();
    formData.append('file', file);

    try {
      let endpoint, params;
      if (uploadMode === 'pdf') {
        endpoint = '/admin/upload/pdf';
        formData.append('book_type', pdfType);
      } else if (uploadMode === 'panchang') {
        endpoint = '/admin/panchang/import-pdf';
      } else {
        endpoint = '/admin/upload/docx';
        formData.append('category', category);
      }

      const { data } = await api.post(endpoint, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      if (data.status === 'parsed') {
        setParsedData(data.parsed_data);
        setUploadId(data.upload_id);
      } else {
        setError(data.error || 'Parsing failed');
      }
      fetchUploads();
    } catch (err) {
      setError(err.response?.data?.detail || 'Upload failed');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handlePublish = async () => {
    if (!uploadId) return;
    setPublishing(true);
    try {
      const endpoint = uploadMode === 'pdf' ? `/admin/upload/pdf/publish/${uploadId}` : `/admin/upload/publish/${uploadId}`;
      const { data } = await api.post(endpoint);
      alert(`Published ${data.count} items successfully!`);
      setParsedData(null);
      setUploadId(null);
      fetchUploads();
    } catch (err) {
      setError(err.response?.data?.detail || 'Publishing failed');
    } finally {
      setPublishing(false);
    }
  };

  return (
    <div className="space-y-6" data-testid="content-upload-page">
      <div className="flex items-center justify-between animate-fade-in">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#E95A34] mb-1">Upload</p>
          <h1 className="text-3xl font-bold tracking-tight" style={{ fontFamily: 'Manrope' }}>Content Upload</h1>
          <p className="text-sm text-[#7A8690] mt-1">Upload DOCX files for AI-powered parsing with Claude</p>
        </div>
        <button onClick={() => setShowHistory(!showHistory)} className="px-4 py-2 bg-white border border-[#E8E4E1] rounded-lg text-sm font-medium hover:bg-[#F3EDEA] transition-colors" data-testid="toggle-history-btn">
          {showHistory ? 'Upload New' : `History (${uploads.length})`}
        </button>
      </div>

      {!showHistory ? (
        <>
          {/* Upload Mode Tabs */}
          <div className="bg-white rounded-xl border border-[#E8E4E1] p-6 animate-fade-in">
            <div className="flex gap-1 bg-[#F3EDEA] rounded-lg p-1 w-fit mb-4">
              {[
                { key: 'docx', label: 'DOCX Upload' },
                { key: 'pdf', label: 'PDF (Vedas)' },
                { key: 'panchang', label: 'Panchang PDF' },
              ].map(tab => (
                <button key={tab.key} onClick={() => setUploadMode(tab.key)}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${uploadMode === tab.key ? 'bg-white text-[#374652] shadow-sm' : 'text-[#7A8690]'}`}
                  data-testid={`upload-tab-${tab.key}`}
                >{tab.label}</button>
              ))}
            </div>

            {uploadMode === 'docx' && (
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Category</label>
                <select value={category} onChange={(e) => setCategory(e.target.value)} className="px-3 py-2.5 bg-[#F8F3F1] border border-[#E8E4E1] rounded-lg text-sm focus:ring-2 focus:ring-[#E95A34] w-full max-w-xs" data-testid="upload-category-select">
                  {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>
            )}
            {uploadMode === 'pdf' && (
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Book Type</label>
                <select value={pdfType} onChange={(e) => setPdfType(e.target.value)} className="px-3 py-2.5 bg-[#F8F3F1] border border-[#E8E4E1] rounded-lg text-sm focus:ring-2 focus:ring-[#E95A34] w-full max-w-xs" data-testid="upload-pdf-type">
                  {PDF_TYPES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                </select>
              </div>
            )}

            <div
              className={`border-2 border-dashed rounded-xl p-12 text-center transition-colors cursor-pointer ${uploading ? 'border-[#E95A34] bg-[#FEF0EC]' : 'border-[#E8E4E1] hover:border-[#E95A34] hover:bg-[#FEF0EC]'}`}
              onClick={() => !uploading && fileInputRef.current?.click()}
              data-testid="upload-dropzone"
            >
              {uploading ? (
                <div>
                  <Loader2 size={40} className="mx-auto mb-4 text-[#E95A34] animate-spin" />
                  <h3 className="text-lg font-semibold mb-2" style={{ fontFamily: 'Manrope' }}>Parsing with AI...</h3>
                  <p className="text-sm text-[#7A8690]">Claude is extracting structured content from your DOCX</p>
                </div>
              ) : (
                <div>
                  <Upload size={40} className="mx-auto mb-4 text-[#989EA4]" />
                  <h3 className="text-lg font-semibold mb-2" style={{ fontFamily: 'Manrope' }}>Drop your DOCX file here</h3>
                  <p className="text-sm text-[#7A8690] mb-4">Claude AI will automatically parse and structure the content</p>
                  <span className="inline-block px-6 py-2.5 bg-[#E95A34] hover:bg-[#D04A28] text-white rounded-lg text-sm font-medium">Browse Files</span>
                </div>
              )}
              <input ref={fileInputRef} type="file" accept={uploadMode === 'docx' ? '.docx' : '.pdf'} onChange={handleUpload} className="hidden" data-testid="file-input" />
            </div>
          </div>

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
              <AlertCircle size={18} className="text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-red-700">Parsing Error</p>
                <p className="text-xs text-red-600 mt-1">{error}</p>
              </div>
            </div>
          )}

          {/* Parsed Preview */}
          {parsedData && (
            <div className="bg-white rounded-xl border border-[#E8E4E1] overflow-hidden animate-fade-in" data-testid="parsed-preview">
              <div className="px-6 py-4 border-b border-[#E8E4E1] flex items-center justify-between bg-green-50">
                <div className="flex items-center gap-2">
                  <Check size={18} className="text-green-600" />
                  <h3 className="text-base font-semibold" style={{ fontFamily: 'Manrope' }}>Parsed Successfully — {parsedData.length} item(s)</h3>
                </div>
                <button onClick={handlePublish} disabled={publishing} className="px-4 py-2 bg-[#E95A34] hover:bg-[#D04A28] text-white rounded-lg text-sm font-medium disabled:opacity-50 flex items-center gap-2" data-testid="publish-btn">
                  {publishing && <Loader2 size={14} className="animate-spin" />}
                  Publish All
                </button>
              </div>
              <div className="p-6 space-y-4 max-h-[500px] overflow-y-auto">
                {parsedData.map((item, i) => (
                  <div key={i} className="border border-[#E8E4E1] rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-semibold">{item.title_en || item.title_hi}</h4>
                      <span className="text-xs text-[#7A8690]">{item.verses?.length || 0} verses</span>
                    </div>
                    {item.title_hi && <p className="text-sm text-[#E95A34]">{item.title_hi}</p>}
                    {item.deity && <p className="text-xs text-[#7A8690] mt-1">Deity: {item.deity}</p>}
                    {item.verses && item.verses.length > 0 && (
                      <div className="mt-3 space-y-2">
                        {item.verses.slice(0, 3).map((v, j) => (
                          <div key={j} className="p-2 bg-[#F8F3F1] rounded-md text-xs">
                            <span className="font-medium text-[#E95A34] mr-2">V{v.verse_num} ({v.verse_type})</span>
                            <span className="text-[#374652]">{v.sanskrit_text?.substring(0, 80)}...</span>
                          </div>
                        ))}
                        {item.verses.length > 3 && <p className="text-xs text-[#989EA4]">... and {item.verses.length - 3} more verses</p>}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Format Guide */}
          <div className="bg-white rounded-xl border border-[#E8E4E1] p-6 animate-fade-in">
            <h3 className="text-lg font-semibold mb-4" style={{ fontFamily: 'Manrope' }}>DOCX Format Guide</h3>
            <div className="space-y-2 text-sm">
              {[
                ['H1 (Heading 1)', 'Category name (e.g., Chalisa, Vedic Mantras)'],
                ['H2 (Heading 2)', 'Item name (e.g., Hanuman Chalisa)'],
                ['H3 (Heading 3)', 'Section type (Doha, Chaupai, Shloka)'],
                ['Bold text', 'Sanskrit/Hindi verse text'],
                ['Normal text', 'Hindi meaning/arth'],
                ['Italic text', 'Transliteration'],
              ].map(([label, desc]) => (
                <div key={label} className="flex items-start gap-3">
                  <FileText size={14} className="text-[#E95A34] mt-1 flex-shrink-0" />
                  <div><strong>{label}</strong> — {desc}</div>
                </div>
              ))}
            </div>
          </div>
        </>
      ) : (
        /* Upload History */
        <div className="bg-white rounded-xl border border-[#E8E4E1] overflow-hidden animate-fade-in">
          <table className="w-full">
            <thead>
              <tr className="bg-[#F3EDEA]">
                <th className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wider text-[#7A8690]">File</th>
                <th className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wider text-[#7A8690]">Category</th>
                <th className="text-center px-4 py-3 text-xs font-bold uppercase tracking-wider text-[#7A8690]">Items</th>
                <th className="text-center px-4 py-3 text-xs font-bold uppercase tracking-wider text-[#7A8690]">Status</th>
                <th className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wider text-[#7A8690]">Date</th>
              </tr>
            </thead>
            <tbody>
              {uploads.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-12 text-[#989EA4]">No uploads yet</td></tr>
              ) : uploads.map(u => (
                <tr key={u._id} className="border-b border-[#E8E4E1] hover:bg-[#F8F3F1]">
                  <td className="px-4 py-3 text-sm font-medium">{u.file_name}</td>
                  <td className="px-4 py-3 text-sm capitalize">{u.category?.replace(/_/g, ' ')}</td>
                  <td className="px-4 py-3 text-center text-sm">{u.parsed_items_count}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${u.status === 'published' ? 'bg-green-50 text-green-700' : u.status === 'parsed' ? 'bg-blue-50 text-blue-700' : u.status === 'error' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'}`}>
                      {u.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-[#7A8690]">{u.created_at?.split('T')[0]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
