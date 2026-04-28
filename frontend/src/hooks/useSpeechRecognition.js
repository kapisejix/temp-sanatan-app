import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Hook for browser SpeechRecognition (Web Speech API).
 * Works on Chrome/Edge (webkitSpeechRecognition) — falls back gracefully.
 */
export default function useSpeechRecognition({ language = 'hi-IN' } = {}) {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interim, setInterim] = useState('');
  const [error, setError] = useState('');
  const recognitionRef = useRef(null);

  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      setSupported(false);
      return;
    }
    setSupported(true);
    const recognition = new SR();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = language;

    recognition.onresult = (event) => {
      let final = '';
      let inter = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const txt = event.results[i][0].transcript;
        if (event.results[i].isFinal) final += txt;
        else inter += txt;
      }
      if (final) setTranscript(prev => (prev + ' ' + final).trim());
      setInterim(inter);
    };
    recognition.onerror = (e) => {
      setError(e.error || 'Recognition error');
      setListening(false);
    };
    recognition.onend = () => {
      setListening(false);
      setInterim('');
    };

    recognitionRef.current = recognition;
    return () => {
      try { recognition.stop(); } catch (e) { /* noop */ }
    };
  }, [language]);

  const start = useCallback(() => {
    if (!recognitionRef.current) return;
    setError('');
    setTranscript('');
    setInterim('');
    try {
      recognitionRef.current.start();
      setListening(true);
    } catch (e) {
      setError('Could not start recognition');
    }
  }, []);

  const stop = useCallback(() => {
    if (!recognitionRef.current) return;
    try { recognitionRef.current.stop(); } catch (e) { /* noop */ }
    setListening(false);
  }, []);

  const reset = useCallback(() => {
    setTranscript('');
    setInterim('');
    setError('');
  }, []);

  return { supported, listening, transcript, interim, error, start, stop, reset };
}
