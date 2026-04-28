import React, { useState, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Upload, FileJson, FileText, Globe, ArrowRight, ArrowLeft, Check, AlertCircle, Eye, X, Loader2 } from 'lucide-react';

const LANGUAGES = [
  { code: 'hi', label: 'Hindi', native: 'हिन्दी' },
  { code: 'en', label: 'English', native: 'English' },
  { code: 'sa', label: 'Sanskrit', native: 'संस्कृत' },
  { code: 'mr', label: 'Marathi', native: 'मराठी' },
  { code: 'gu', label: 'Gujarati', native: 'ગુજરાતી' },
  { code: 'ta', label: 'Tamil', native: 'தமிழ்' },
  { code: 'te', label: 'Telugu', native: 'తెలుగు' },
  { code: 'bn', label: 'Bengali', native: 'বাংলা' },
  { code: 'kn', label: 'Kannada', native: 'ಕನ್ನಡ' },
  { code: 'ml', label: 'Malayalam', native: 'മലയാളം' },
  { code: 'pa', label: 'Punjabi', native: 'ਪੰਜਾਬੀ' },
  { code: 'od', label: 'Odia', native: 'ଓଡ଼ିଆ' },
];

const CATEGORIES = [
  { value: 'chalisa', label: 'Chalisa' },
  { value: 'aarti', label: 'Aarti' },
  { value: 'stuti', label: 'Stuti' },
  { value: 'vedic_mantra', label: 'Vedic Mantra' },
  { value: 'ashtakam', label: 'Ashtakam' },
  { value: 'namavali', label: 'Namavali' },
  { value: 'sahasranama', label: 'Sahasranama' },
  { value: 'stotram', label: 'Stotram' },
  { value: 'suktam', label: 'Suktam' },
  { value: 'kavacham', label: 'Kavacham' },
  { value: 'katha', label: 'Katha' },
  { value: 'nam_ramayanam', label: 'Nam Ramayanam' },
];

const STEPS = [
  { id: 1, title: 'Upload File', icon: Upload },
  { id: 2, title: 'Language & Category', icon: Globe },
  { id: 3, title: 'Preview Data', icon: Eye },
  { id: 4, title: 'Publish', icon: Check },
];

export default function ImportWizardPage() {
  const { api } = useAuth();
  const [step, setStep] = useState(1);
  const [file, setFile] = useState(null);
  const [category, setCategory] = useState('chalisa');
  const [language, setLanguage] = useState('hi');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [parsedData, setParsedData] = useState(null);
  const [uploadId, setUploadId] = useState('');
  const [publishResult, setPublishResult] = useState(null);
  const [previewItem, setPreviewItem] = useState(null);

  const handleFileDrop = useCallback((e) => {
    e.preventDefault();
    const f = e.dataTransfer?.files?.[0] || e.target?.files?.[0];
    if (f) {
      const ext = f.name.split('.').pop().toLowerCase();
      if (!['csv', 'json', 'docx', 'doc'].includes(ext)) {
        setError('Unsupported format. Use .csv, .json, or .docx');
        return;
      }
      setFile(f);
      setError('');
    }
  }, []);

  const handleParse = async () => {
    if (!file) return;
    setLoading(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('category', category);
      formData.append('language', language);
      const { data } = await api.post('/admin/import-wizard', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 120000,
      });
      setParsedData(data.parsed_data);
      setUploadId(data.upload_id);
      setStep(3);
    } catch (err) {
      setError(err.response?.data?.detail || 'Parsing failed. Check file format.');
    } finally {
      setLoading(false);
    }
  };

  const handlePublish = async () => {
    if (!uploadId) return;
    setLoading(true);
    setError('');
    try {
      const { data } = await api.post(`/admin/import-wizard/publish/${uploadId}`);
      setPublishResult(data);
      setStep(4);
    } catch (err) {
      setError(err.response?.data?.detail || 'Publish failed');
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setStep(1);
    setFile(null);
    setParsedData(null);
    setUploadId('');
    setPublishResult(null);
    setError('');
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto" data-testid="import-wizard-page">
      {/* Header */}
      <div className="animate-fade-in">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#E95A34] mb-1">Content Tools</p>
        <h1 className="text-3xl font-bold tracking-tight" style={{ fontFamily: 'Manrope' }}>Import Wizard</h1>
        <p className="text-sm text-[#7A8690] mt-1">Bulk upload content from CSV, JSON, or DOCX files with language mapping</p>
      </div>

      {/* Steps Indicator */}
      <div className="flex items-center gap-2 bg-white rounded-xl border border-[#E8E4E1] p-4">
        {STEPS.map((s, i) => (
          <React.Fragment key={s.id}>
            <div className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${step === s.id ? 'bg-[#E95A34] text-white' : step > s.id ? 'bg-green-50 text-green-700' : 'bg-[#F3EDEA] text-[#989EA4]'}`}>
              <s.icon size={16} />
              <span className="text-sm font-medium">{s.title}</span>
            </div>
            {i < STEPS.length - 1 && <ArrowRight size={16} className="text-[#989EA4]" />}
          </React.Fragment>
        ))}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2">
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {/* Step 1: File Upload */}
      {step === 1 && (
        <div className="bg-white rounded-xl border border-[#E8E4E1] p-8 animate-fade-in">
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleFileDrop}
            className="border-2 border-dashed border-[#E8E4E1] rounded-xl p-12 text-center hover:border-[#E95A34] transition-colors cursor-pointer"
            onClick={() => document.getElementById('import-file-input').click()}
            data-testid="import-dropzone"
          >
            <Upload size={48} className="mx-auto text-[#989EA4] mb-4" />
            <p className="text-lg font-medium text-[#374652] mb-2">
              {file ? file.name : 'Drop your file here or click to browse'}
            </p>
            <p className="text-sm text-[#7A8690]">Supports: CSV, JSON, DOCX</p>
            {file && (
              <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-green-50 text-green-700 rounded-lg">
                <FileJson size={16} /> {file.name} ({(file.size / 1024).toFixed(1)} KB)
              </div>
            )}
            <input id="import-file-input" type="file" accept=".csv,.json,.docx,.doc" onChange={handleFileDrop} className="hidden" />
          </div>

          <div className="mt-6 grid grid-cols-3 gap-4">
            <div className="bg-[#F8F3F1] rounded-lg p-4">
              <FileJson size={24} className="text-[#E95A34] mb-2" />
              <p className="text-sm font-medium">JSON Format</p>
              <p className="text-xs text-[#7A8690] mt-1">Array of objects with title, verses, meanings</p>
            </div>
            <div className="bg-[#F8F3F1] rounded-lg p-4">
              <FileText size={24} className="text-[#E95A34] mb-2" />
              <p className="text-sm font-medium">CSV Format</p>
              <p className="text-xs text-[#7A8690] mt-1">Columns: title, sanskrit_text, transliteration, meaning, verse_type</p>
            </div>
            <div className="bg-[#F8F3F1] rounded-lg p-4">
              <FileText size={24} className="text-[#E95A34] mb-2" />
              <p className="text-sm font-medium">DOCX Format</p>
              <p className="text-xs text-[#7A8690] mt-1">Headings for structure, bold for Sanskrit, italic for transliteration</p>
            </div>
          </div>

          <div className="flex justify-end mt-6">
            <button disabled={!file} onClick={() => setStep(2)} className="flex items-center gap-2 px-6 py-2.5 bg-[#E95A34] text-white rounded-lg font-medium disabled:opacity-40" data-testid="import-next-step1">
              Next <ArrowRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Language & Category */}
      {step === 2 && (
        <div className="bg-white rounded-xl border border-[#E8E4E1] p-8 animate-fade-in">
          <h3 className="text-lg font-semibold mb-6" style={{ fontFamily: 'Manrope' }}>Which language are you importing for?</h3>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium mb-3">Target Language</label>
              <div className="grid grid-cols-4 gap-2">
                {LANGUAGES.map(lang => (
                  <button
                    key={lang.code}
                    onClick={() => setLanguage(lang.code)}
                    data-testid={`import-lang-${lang.code}`}
                    className={`px-4 py-3 rounded-lg text-left transition-all ${language === lang.code ? 'bg-[#E95A34] text-white ring-2 ring-[#E95A34] ring-offset-2' : 'bg-[#F8F3F1] border border-[#E8E4E1] hover:border-[#E95A34]'}`}
                  >
                    <p className="text-sm font-medium">{lang.label}</p>
                    <p className={`text-xs ${language === lang.code ? 'text-white/80' : 'text-[#7A8690]'}`}>{lang.native}</p>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-3">Content Category</label>
              <div className="grid grid-cols-4 gap-2">
                {CATEGORIES.map(cat => (
                  <button
                    key={cat.value}
                    onClick={() => setCategory(cat.value)}
                    data-testid={`import-cat-${cat.value}`}
                    className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${category === cat.value ? 'bg-[#E95A34] text-white' : 'bg-[#F8F3F1] border border-[#E8E4E1] hover:border-[#E95A34]'}`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex justify-between mt-8">
            <button onClick={() => setStep(1)} className="flex items-center gap-2 px-4 py-2 text-[#7A8690] hover:bg-[#F3EDEA] rounded-lg">
              <ArrowLeft size={16} /> Back
            </button>
            <button onClick={handleParse} disabled={loading} className="flex items-center gap-2 px-6 py-2.5 bg-[#E95A34] text-white rounded-lg font-medium disabled:opacity-60" data-testid="import-parse-btn">
              {loading ? <><Loader2 size={16} className="animate-spin" /> Parsing with AI...</> : <>Parse & Preview <ArrowRight size={16} /></>}
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Preview */}
      {step === 3 && parsedData && (
        <div className="space-y-4 animate-fade-in">
          <div className="bg-white rounded-xl border border-[#E8E4E1] p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold" style={{ fontFamily: 'Manrope' }}>Parsed Content Preview</h3>
                <p className="text-sm text-[#7A8690]">{parsedData.length} item(s) found — Language: {LANGUAGES.find(l => l.code === language)?.label}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs px-2 py-1 bg-green-50 text-green-700 rounded-full font-medium">Ready to Publish</span>
              </div>
            </div>

            <div className="space-y-3 max-h-[500px] overflow-y-auto">
              {parsedData.map((item, idx) => (
                <div key={idx} className="bg-[#F8F3F1] rounded-lg border border-[#E8E4E1] overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 cursor-pointer" onClick={() => setPreviewItem(previewItem === idx ? null : idx)}>
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-bold text-[#E95A34] bg-[#FEF0EC] px-2 py-1 rounded">#{idx + 1}</span>
                      <div>
                        <p className="text-sm font-medium text-[#374652]">{item.title}</p>
                        <p className="text-xs text-[#7A8690]">{item.deity ? `Deity: ${item.deity} • ` : ''}{item.verses?.length || 0} verses</p>
                      </div>
                    </div>
                    <Eye size={16} className="text-[#7A8690]" />
                  </div>

                  {previewItem === idx && (
                    <div className="px-4 pb-4 border-t border-[#E8E4E1] pt-3 space-y-2">
                      {item.verses?.slice(0, 10).map((v, vi) => (
                        <div key={vi} className="bg-white rounded-lg p-3">
                          <span className="text-xs text-[#E95A34] font-bold">Verse {v.verse_num || vi + 1} • {v.verse_type || 'shloka'}</span>
                          <p className="text-sm font-medium mt-1 whitespace-pre-wrap">{v.sanskrit_text}</p>
                          {v.transliteration && <p className="text-xs text-[#7A8690] italic mt-1">{v.transliteration}</p>}
                          {v.meaning && <p className="text-xs text-[#374652] mt-1 border-t border-[#E8E4E1] pt-1">{v.meaning}</p>}
                        </div>
                      ))}
                      {item.verses?.length > 10 && (
                        <p className="text-xs text-center text-[#7A8690] py-2">+ {item.verses.length - 10} more verses</p>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-between">
            <button onClick={() => setStep(2)} className="flex items-center gap-2 px-4 py-2 text-[#7A8690] hover:bg-[#F3EDEA] rounded-lg">
              <ArrowLeft size={16} /> Back
            </button>
            <button onClick={handlePublish} disabled={loading} className="flex items-center gap-2 px-6 py-2.5 bg-[#E95A34] text-white rounded-lg font-medium disabled:opacity-60" data-testid="import-publish-btn">
              {loading ? <><Loader2 size={16} className="animate-spin" /> Publishing...</> : <>Publish {parsedData.length} Item(s) <Check size={16} /></>}
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Complete */}
      {step === 4 && publishResult && (
        <div className="bg-white rounded-xl border border-[#E8E4E1] p-12 text-center animate-fade-in">
          <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check size={32} className="text-green-600" />
          </div>
          <h3 className="text-xl font-semibold mb-2" style={{ fontFamily: 'Manrope' }}>Import Complete!</h3>
          <p className="text-sm text-[#7A8690] mb-6">{publishResult.message}</p>
          <p className="text-sm text-[#374652] mb-8">
            {publishResult.count} item(s) saved as <span className="font-medium text-[#E95A34]">Draft</span> in {LANGUAGES.find(l => l.code === language)?.label}
          </p>
          <button onClick={reset} className="px-6 py-2.5 bg-[#E95A34] text-white rounded-lg font-medium" data-testid="import-another-btn">Import Another File</button>
        </div>
      )}
    </div>
  );
}
