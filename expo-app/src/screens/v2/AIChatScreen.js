import React, { useState, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { COLORS } from '../../config/api';
import api from '../../api/client';

const SUGGESTED = [
  'आज का शुभ समय क्या है?',
  'हनुमान चालीसा का महत्व',
  'मेरे लिए कौन सा मंत्र अनुकूल है?',
  'साढ़े साती क्या है?',
];

export default function AIChatScreen({ navigation }) {
  const [messages, setMessages] = useState([{ role: 'assistant', text: 'नमस्ते 🙏 मैं वेदचैट AI हूँ। पूछिए — मैं उत्तर देने का प्रयास करूँगा।' }]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState(null);
  const scrollRef = useRef(null);

  const send = async (text) => {
    const t = (text || input).trim();
    if (!t) return;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: t }]);
    setLoading(true);
    try {
      const res = await api.vedaChat(t, conversationId);
      if (res.conversation_id) setConversationId(res.conversation_id);
      const reply = res.response?.content || 'क्षमा करें — उत्तर नहीं मिला।';
      setMessages(prev => [...prev, { role: 'assistant', text: reply }]);
    } catch (e) {
      // Fallback offline reply
      const fallback = (
        t.includes('हनुमान') ? 'हनुमान चालीसा मंगलवार को 1 बार पाठ करना अत्यंत शुभ माना जाता है।'
        : t.includes('शनि') || t.includes('साढ़े') ? 'साढ़े साती शनि के द्वारा जन्म चन्द्र राशि से 12वें, 1वें, 2रे भाव से गुजरने का साढ़े सात वर्ष का काल है।'
        : 'मैं आपकी सहायता के लिए यहाँ हूँ। (ऑफ़लाइन — सर्वर से कनेक्ट नहीं)'
      );
      setMessages(prev => [...prev, { role: 'assistant', text: fallback }]);
    } finally {
      setLoading(false);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    }
  };

  const playReply = async (text) => {
    try {
      const tts = await api.ttsSynthesize(text, 'hi');
      // For brevity in mobile, native audio playback omitted here — Web handles it.
      // (Expo AV could decode base64 mp3 too via FileSystem.writeAsStringAsync)
    } catch (e) { /* TTS optional */ }
  };

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}><Text style={styles.back}>‹</Text></TouchableOpacity>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={styles.title}>VedaChat AI</Text>
          <Text style={styles.subtitle}>शास्त्र · मंत्र · ज्योतिष</Text>
        </View>
        <View style={{ width: 30 }} />
      </View>

      <ScrollView ref={scrollRef} style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
        {messages.map((m, i) => (
          <View key={i} style={[styles.bubbleRow, m.role === 'user' ? styles.bubbleRowRight : null]}>
            {m.role === 'assistant' && <View style={styles.aiAvatar}><Text style={{ color: COLORS.primary, fontSize: 13 }}>🤖</Text></View>}
            <View style={[styles.bubble, m.role === 'user' ? styles.bubbleUser : styles.bubbleAi]}>
              <Text style={[styles.bubbleText, m.role === 'user' ? { color: '#FFF' } : null]}>{m.text}</Text>
            </View>
          </View>
        ))}
        {loading && (
          <View style={styles.bubbleRow}>
            <View style={styles.aiAvatar}><Text style={{ color: COLORS.primary, fontSize: 13 }}>🤖</Text></View>
            <View style={[styles.bubble, styles.bubbleAi]}>
              <Text style={[styles.bubbleText, { color: COLORS.textSecondary }]}>लिख रहा हूँ…</Text>
            </View>
          </View>
        )}

        {messages.length <= 1 && (
          <View style={styles.suggestionsBox}>
            <Text style={styles.suggestionsLabel}>सुझाव</Text>
            {SUGGESTED.map((s, i) => (
              <TouchableOpacity key={i} style={styles.suggestionPill} onPress={() => send(s)}>
                <Text style={styles.suggestionText}>{s}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>

      <View style={styles.inputBar}>
        <TextInput
          value={input}
          onChangeText={setInput}
          onSubmitEditing={() => send()}
          placeholder="पूछिए…"
          placeholderTextColor={COLORS.textMuted}
          style={styles.input}
        />
        <TouchableOpacity style={styles.sendBtn} onPress={() => send()}>
          <Text style={{ color: '#FFF', fontWeight: '700' }}>➤</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  back: { fontSize: 30, color: COLORS.text, width: 30 },
  title: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  subtitle: { fontSize: 11, color: COLORS.textSecondary, marginTop: 1 },
  bubbleRow: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 10 },
  bubbleRowRight: { justifyContent: 'flex-end' },
  aiAvatar: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#FEF0EC', alignItems: 'center', justifyContent: 'center', marginRight: 8 },
  bubble: { maxWidth: '78%', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 14 },
  bubbleAi: { backgroundColor: COLORS.surface, borderColor: COLORS.border, borderWidth: 1, borderBottomLeftRadius: 4 },
  bubbleUser: { backgroundColor: COLORS.primary, borderBottomRightRadius: 4 },
  bubbleText: { fontSize: 14, color: COLORS.text, lineHeight: 20 },
  suggestionsBox: { marginTop: 18 },
  suggestionsLabel: { fontSize: 11, color: COLORS.textSecondary, textTransform: 'uppercase', marginBottom: 8 },
  suggestionPill: { backgroundColor: COLORS.surface, borderColor: COLORS.border, borderWidth: 1, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8, marginBottom: 6, alignSelf: 'flex-start' },
  suggestionText: { fontSize: 13, color: COLORS.primary },
  inputBar: { flexDirection: 'row', padding: 12, gap: 8, backgroundColor: COLORS.surface, borderTopWidth: 1, borderTopColor: COLORS.border },
  input: { flex: 1, backgroundColor: COLORS.background, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: COLORS.text },
  sendBtn: { backgroundColor: COLORS.primary, width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
});
