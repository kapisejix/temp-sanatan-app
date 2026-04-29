import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  Music, Upload, Trash2, Loader2, CheckCircle2, AlertCircle, FileAudio, FileText,
} from 'lucide-react';

/**
 * Audio-Text Synchronization Manager.
 *
 * Admin uploads:
 *   - MP3 (or other audio) for a content item
 *   - Optional LRC / JSON sync file mapping verse start/end times
 *
 * The mobile player consumes /api/content/items/{id}/audio and
 * highlights the active verse in real time during playback.
 */
export default function AudioSyncManagerPage() {
  const { api } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState(null);
  const [audioMeta, setAudioMeta] = useState(null);
  const [audioFile, setAudioFile] = useState(null);
  const [syncFile, setSyncFile] = useState(null);
  const [duration, setDuration] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const audioFileRef = useRef(null);
  const syncFileRef = useRef(null);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get('/content/items?limit=100');
        setItems(data.items || []);
      } catch {
        setError('Failed to load items');
      } finally {
        setLoading(false);
      }
    })();
  }, [api]);

  const loadAudio = async (id) => {
    setSelectedId(id);
    setAudioMeta(null);
    setAudioFile(null);
    setSyncFile(null);
    setDuration('');
    setStatus('');
    setError('');
    if (!id) return;
    try {
      const { data } = await api.get(`/content/items/${id}/audio`);
      if (data?.audio_url) setAudioMeta(data);
    } catch {
      // 404 is fine — no audio yet
    }
  };

  const handleUpload = async () => {
    if (!selectedId || !audioFile) {
      setError('Select an item and choose an audio file');
      return;
    }
    setError('');
    setStatus('');
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('audio', audioFile);
      if (syncFile) fd.append('sync_file', syncFile);
      if (duration) fd.append('duration_ms', String(parseInt(duration, 10) * 1000));
      const { data } = await api.post(
        `/content/items/${selectedId}/audio`,
        fd,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );
      setStatus(`✓ Uploaded. ${data.sync_verses || 0} verse timestamps saved.`);
      // Refresh
      await loadAudio(selectedId);
      setAudioFile(null);
      setSyncFile(null);
      if (audioFileRef.current) audioFileRef.current.value = '';
      if (syncFileRef.current) syncFileRef.current.value = '';
    } catch (e) {
      setError(e?.response?.data?.detail || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedId) return;
    if (!window.confirm('Delete this item\'s audio + sync map? This cannot be undone.')) return;
    try {
      await api.delete(`/content/items/${selectedId}/audio`);
      setAudioMeta(null);
      setStatus('Audio deleted.');
    } catch (e) {
      setError('Delete failed');
    }
  };

  const itemsWithAudio = useMemo(() => {
    // Just show count, the API call per item would be expensive; this is informational
    return items.length;
  }, [items]);

  const formatTime = (ms) => {
    if (ms == null) return '-';
    const total = Math.floor(ms / 1000);
    const m = Math.floor(total / 60);
    const s = total % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  return (
    <div className="space-y-5" data-testid="audio-sync-page">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Music size={26} className="text-[#E95A34]" />
          Audio-Text Sync Manager
        </h1>
        <p className="text-sm text-gray-600 mt-1">
          Upload MP3 + LRC/JSON sync file. Mobile players highlight the active verse during playback.
        </p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <label className="block text-xs font-semibold text-gray-700 mb-2">Content Item ({itemsWithAudio} total)</label>
        <select
          data-testid="audio-item-select"
          className="w-full md:w-1/2 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#E95A34] focus:border-transparent"
          value={selectedId || ''}
          onChange={(e) => loadAudio(e.target.value || null)}
          disabled={loading}
        >
          <option value="">{loading ? 'Loading…' : '-- Select content item --'}</option>
          {items.map((it) => (
            <option key={it._id} value={it._id}>
              [{it.category}] {it.title_hi || it.title_en || it.slug}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg px-4 py-2 flex items-center gap-2 text-sm" data-testid="audio-error">
          <AlertCircle size={16} /> {error}
          <button className="ml-auto text-red-600" onClick={() => setError('')}>×</button>
        </div>
      )}
      {status && (
        <div className="bg-green-50 border border-green-200 text-green-800 rounded-lg px-4 py-2 flex items-center gap-2 text-sm" data-testid="audio-status">
          <CheckCircle2 size={16} /> {status}
          <button className="ml-auto text-green-600" onClick={() => setStatus('')}>×</button>
        </div>
      )}

      {selectedId && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Existing audio panel */}
          <div className="bg-white rounded-xl border border-gray-200 p-5" data-testid="audio-existing-panel">
            <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
              <FileAudio size={16} /> Current Audio
            </h3>
            {audioMeta?.audio_url ? (
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Format:</span>
                  <span className="font-medium uppercase">{audioMeta.format}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Duration:</span>
                  <span className="font-medium">{audioMeta.duration_ms ? formatTime(audioMeta.duration_ms) : '-'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Sync verses:</span>
                  <span className="font-medium">{audioMeta.sync_map?.length || 0}</span>
                </div>
                <audio
                  controls
                  src={audioMeta.audio_url}
                  className="w-full mt-2"
                  data-testid="audio-preview"
                />
                {audioMeta.sync_map?.length > 0 && (
                  <div className="mt-3 max-h-64 overflow-y-auto border border-gray-100 rounded-lg" data-testid="audio-sync-list">
                    <table className="w-full text-xs">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr>
                          <th className="text-left px-2 py-1">#</th>
                          <th className="text-left px-2 py-1">Start</th>
                          <th className="text-left px-2 py-1">End</th>
                          <th className="text-left px-2 py-1">Verse</th>
                        </tr>
                      </thead>
                      <tbody>
                        {audioMeta.sync_map.map((v) => (
                          <tr key={v.verse_num} className="border-t border-gray-100">
                            <td className="px-2 py-1 font-bold">{v.verse_num}</td>
                            <td className="px-2 py-1">{formatTime(v.start_ms)}</td>
                            <td className="px-2 py-1">{formatTime(v.end_ms)}</td>
                            <td className="px-2 py-1 truncate max-w-[260px]" lang="hi">{v.text}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                <button
                  onClick={handleDelete}
                  className="w-full bg-white border border-red-300 text-red-600 px-3 py-2 rounded-lg text-sm font-medium hover:bg-red-50 flex items-center justify-center gap-2 mt-3"
                  data-testid="audio-delete-btn"
                >
                  <Trash2 size={14} /> Remove Audio
                </button>
              </div>
            ) : (
              <p className="text-sm text-gray-500 italic">No audio uploaded for this item yet.</p>
            )}
          </div>

          {/* Upload panel */}
          <div className="bg-white rounded-xl border border-gray-200 p-5" data-testid="audio-upload-panel">
            <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
              <Upload size={16} /> {audioMeta?.audio_url ? 'Replace' : 'Upload'} Audio
            </h3>

            <label className="block text-xs font-semibold text-gray-700 mb-1">Audio file (MP3 / M4A / WAV)</label>
            <input
              ref={audioFileRef}
              type="file"
              accept="audio/mpeg,audio/mp4,audio/wav,audio/ogg,audio/aac,.mp3,.m4a,.wav,.ogg,.aac"
              onChange={(e) => setAudioFile(e.target.files?.[0] || null)}
              className="block w-full text-sm text-gray-700 file:mr-3 file:py-2 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-[#E95A34] file:text-white hover:file:bg-[#d24e2c] mb-3"
              data-testid="audio-file-input"
            />

            <label className="block text-xs font-semibold text-gray-700 mb-1 flex items-center gap-1">
              <FileText size={12} /> Sync file (LRC or JSON, optional)
            </label>
            <input
              ref={syncFileRef}
              type="file"
              accept=".lrc,.json,.txt,text/plain,application/json"
              onChange={(e) => setSyncFile(e.target.files?.[0] || null)}
              className="block w-full text-sm text-gray-700 file:mr-3 file:py-2 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-gray-200 file:text-gray-700 hover:file:bg-gray-300 mb-3"
              data-testid="sync-file-input"
            />

            <label className="block text-xs font-semibold text-gray-700 mb-1">Duration (seconds, optional)</label>
            <input
              type="number"
              min="0"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              placeholder="e.g. 240"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mb-4"
              data-testid="audio-duration-input"
            />

            <button
              onClick={handleUpload}
              disabled={uploading || !audioFile}
              className="w-full bg-[#E95A34] text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-[#d24e2c] disabled:opacity-50 flex items-center justify-center gap-2"
              data-testid="audio-upload-btn"
            >
              {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
              {uploading ? 'Uploading…' : 'Upload Audio + Sync'}
            </button>

            <div className="mt-4 bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-900">
              <strong>LRC format example:</strong>
              <pre className="mt-1 font-mono text-[10px] whitespace-pre-wrap">
{`[00:00.50]Verse one text
[00:05.20]Verse two text
[00:09.80]Verse three text`}
              </pre>
              <strong className="block mt-2">JSON format example:</strong>
              <pre className="mt-1 font-mono text-[10px] whitespace-pre-wrap">
{`[
  {"verse_num":1,"start_ms":500,"text":"..."},
  {"verse_num":2,"start_ms":5200,"text":"..."}
]`}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
