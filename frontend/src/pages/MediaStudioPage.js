import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Image, Video, Loader2, Download, Sparkles } from 'lucide-react';

const SIZES = [
  { value: '1280x720', label: 'HD Landscape (1280x720)' },
  { value: '1024x1024', label: 'Square (1024x1024)' },
  { value: '1024x1792', label: 'Portrait (1024x1792)' },
  { value: '1792x1024', label: 'Widescreen (1792x1024)' },
];

export default function MediaStudioPage() {
  const { api } = useAuth();
  const [activeTab, setActiveTab] = useState('image');

  // Image state
  const [imgPrompt, setImgPrompt] = useState('');
  const [shlokaText, setShlokaText] = useState('');
  const [imgLoading, setImgLoading] = useState(false);
  const [generatedImage, setGeneratedImage] = useState(null);
  const [imgError, setImgError] = useState('');

  // Video state
  const [vidPrompt, setVidPrompt] = useState('');
  const [vidSize, setVidSize] = useState('1280x720');
  const [vidDuration, setVidDuration] = useState(4);
  const [vidModel, setVidModel] = useState('sora-2');
  const [vidLoading, setVidLoading] = useState(false);
  const [generatedVideo, setGeneratedVideo] = useState(null);
  const [vidError, setVidError] = useState('');

  const generateImage = async () => {
    setImgLoading(true);
    setImgError('');
    setGeneratedImage(null);
    try {
      const { data } = await api.post('/media/generate-image', {
        prompt: imgPrompt,
        shloka_text: shlokaText,
      });
      if (data.image_base64) {
        setGeneratedImage({ base64: data.image_base64, mime: data.mime_type || 'image/png' });
      } else {
        setImgError(data.error || 'No image generated');
      }
    } catch (err) {
      setImgError(err.response?.data?.detail || 'Image generation failed');
    } finally {
      setImgLoading(false);
    }
  };

  const generateVideo = async () => {
    setVidLoading(true);
    setVidError('');
    setGeneratedVideo(null);
    try {
      const { data } = await api.post('/media/generate-video', {
        prompt: vidPrompt,
        size: vidSize,
        duration: vidDuration,
        model: vidModel,
      }, { timeout: 660000 });
      if (data.video_base64) {
        setGeneratedVideo(data.video_base64);
      }
    } catch (err) {
      setVidError(err.response?.data?.detail || 'Video generation failed. This may take several minutes.');
    } finally {
      setVidLoading(false);
    }
  };

  return (
    <div className="space-y-6" data-testid="media-studio-page">
      <div className="animate-fade-in">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#E95A34] mb-1">Create</p>
        <h1 className="text-3xl font-bold tracking-tight" style={{ fontFamily: 'Manrope' }}>Media Studio</h1>
        <p className="text-sm text-[#7A8690] mt-1">Generate shloka cards & video reels with AI</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-[#F3EDEA] rounded-lg p-1 w-fit animate-fade-in">
        {[
          { key: 'image', label: 'Shloka Card', icon: Image },
          { key: 'video', label: 'Video Reel', icon: Video },
        ].map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === tab.key ? 'bg-white text-[#374652] shadow-sm' : 'text-[#7A8690]'}`}
            data-testid={`media-tab-${tab.key}`}
          >
            <tab.icon size={16} /> {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'image' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-in">
          <div className="bg-white rounded-xl border border-[#E8E4E1] p-6 space-y-4">
            <h3 className="text-lg font-semibold" style={{ fontFamily: 'Manrope' }}>Shloka Card Generator</h3>
            <p className="text-xs text-[#7A8690]">Powered by Gemini Nano Banana</p>
            <div>
              <label className="block text-sm font-medium mb-1">Shloka Text (Optional)</label>
              <textarea value={shlokaText} onChange={(e) => setShlokaText(e.target.value)} rows={3} placeholder="Enter shloka text for card..." className="w-full px-3 py-2 bg-[#F8F3F1] border border-[#E8E4E1] rounded-lg text-sm focus:ring-2 focus:ring-[#E95A34]" data-testid="shloka-text-input" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Custom Prompt (Optional)</label>
              <textarea value={imgPrompt} onChange={(e) => setImgPrompt(e.target.value)} rows={3} placeholder="Describe the image you want... e.g., 'Lord Krishna playing flute by the river with peacocks'" className="w-full px-3 py-2 bg-[#F8F3F1] border border-[#E8E4E1] rounded-lg text-sm focus:ring-2 focus:ring-[#E95A34]" data-testid="img-prompt-input" />
            </div>
            <button onClick={generateImage} disabled={imgLoading || (!imgPrompt && !shlokaText)} className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[#E95A34] hover:bg-[#D04A28] text-white rounded-lg font-medium disabled:opacity-50 transition-colors" data-testid="generate-image-btn">
              {imgLoading ? <><Loader2 size={18} className="animate-spin" /> Generating...</> : <><Sparkles size={18} /> Generate Shloka Card</>}
            </button>
            {imgError && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{imgError}</div>}
          </div>

          <div className="bg-white rounded-xl border border-[#E8E4E1] p-6 flex items-center justify-center min-h-[400px]">
            {generatedImage ? (
              <div className="text-center w-full">
                <img src={`data:${generatedImage.mime};base64,${generatedImage.base64}`} alt="Generated Shloka Card" className="max-w-full max-h-[350px] mx-auto rounded-lg shadow-md" data-testid="generated-image" />
                <a href={`data:${generatedImage.mime};base64,${generatedImage.base64}`} download="shloka_card.png" className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-[#E95A34] text-white rounded-lg text-sm font-medium">
                  <Download size={16} /> Download
                </a>
              </div>
            ) : imgLoading ? (
              <div className="text-center">
                <Loader2 size={32} className="animate-spin text-[#E95A34] mx-auto mb-3" />
                <p className="text-sm text-[#7A8690]">Creating your shloka card...</p>
              </div>
            ) : (
              <div className="text-center text-[#989EA4]">
                <Image size={48} className="mx-auto mb-3 opacity-40" />
                <p className="text-sm">Your generated image will appear here</p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'video' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-in">
          <div className="bg-white rounded-xl border border-[#E8E4E1] p-6 space-y-4">
            <h3 className="text-lg font-semibold" style={{ fontFamily: 'Manrope' }}>Video Reel Generator</h3>
            <p className="text-xs text-[#7A8690]">Powered by Sora 2 — Text to Video</p>
            <div>
              <label className="block text-sm font-medium mb-1">Video Prompt</label>
              <textarea value={vidPrompt} onChange={(e) => setVidPrompt(e.target.value)} rows={4} placeholder="Describe the video... e.g., 'Sunrise over a Hindu temple with flowers falling, golden light, cinematic'" className="w-full px-3 py-2 bg-[#F8F3F1] border border-[#E8E4E1] rounded-lg text-sm focus:ring-2 focus:ring-[#E95A34]" data-testid="vid-prompt-input" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1">Size</label>
                <select value={vidSize} onChange={(e) => setVidSize(e.target.value)} className="w-full px-2 py-2 bg-[#F8F3F1] border border-[#E8E4E1] rounded-lg text-xs focus:ring-2 focus:ring-[#E95A34]" data-testid="vid-size-select">
                  {SIZES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Duration</label>
                <select value={vidDuration} onChange={(e) => setVidDuration(Number(e.target.value))} className="w-full px-2 py-2 bg-[#F8F3F1] border border-[#E8E4E1] rounded-lg text-xs focus:ring-2 focus:ring-[#E95A34]">
                  <option value={4}>4 seconds</option>
                  <option value={8}>8 seconds</option>
                  <option value={12}>12 seconds</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Model</label>
                <select value={vidModel} onChange={(e) => setVidModel(e.target.value)} className="w-full px-2 py-2 bg-[#F8F3F1] border border-[#E8E4E1] rounded-lg text-xs focus:ring-2 focus:ring-[#E95A34]">
                  <option value="sora-2">Sora 2</option>
                  <option value="sora-2-pro">Sora 2 Pro</option>
                </select>
              </div>
            </div>
            <button onClick={generateVideo} disabled={vidLoading || !vidPrompt.trim()} className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[#E95A34] hover:bg-[#D04A28] text-white rounded-lg font-medium disabled:opacity-50 transition-colors" data-testid="generate-video-btn">
              {vidLoading ? <><Loader2 size={18} className="animate-spin" /> Generating (may take 2-5 min)...</> : <><Video size={18} /> Generate Video Reel</>}
            </button>
            {vidError && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{vidError}</div>}
            <div className="p-3 bg-[#FEF0EC] rounded-lg text-xs text-[#D08465]">
              Video generation typically takes 2-5 minutes. Please be patient.
            </div>
          </div>

          <div className="bg-white rounded-xl border border-[#E8E4E1] p-6 flex items-center justify-center min-h-[400px]">
            {generatedVideo ? (
              <div className="text-center w-full">
                <video controls src={`data:video/mp4;base64,${generatedVideo}`} className="max-w-full max-h-[350px] mx-auto rounded-lg shadow-md" data-testid="generated-video" />
                <a href={`data:video/mp4;base64,${generatedVideo}`} download="shloka_reel.mp4" className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-[#E95A34] text-white rounded-lg text-sm font-medium">
                  <Download size={16} /> Download
                </a>
              </div>
            ) : vidLoading ? (
              <div className="text-center">
                <Loader2 size={32} className="animate-spin text-[#E95A34] mx-auto mb-3" />
                <p className="text-sm text-[#7A8690]">Generating video with Sora 2...</p>
                <p className="text-xs text-[#989EA4] mt-1">This may take 2-5 minutes</p>
              </div>
            ) : (
              <div className="text-center text-[#989EA4]">
                <Video size={48} className="mx-auto mb-3 opacity-40" />
                <p className="text-sm">Your generated video will appear here</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
