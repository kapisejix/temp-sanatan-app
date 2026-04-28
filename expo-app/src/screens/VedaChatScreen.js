// ==============================================================
// VedaChat Screen - AI Spiritual Guide
// ==============================================================
import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { api } from '../store/authStore';
import { COLORS } from '../config/api';

const SUGGESTIONS = [
  'What does Krishna say about duty?',
  'Explain Gayatri Mantra',
  'Significance of Hanuman Chalisa',
  'What is Karma Yoga?',
];

export default function VedaChatScreen() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState(null);
  const flatListRef = useRef(null);

  const sendMessage = async (text) => {
    const msg = text || input.trim();
    if (!msg || loading) return;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: msg }]);
    setLoading(true);

    try {
      const { data } = await api.post('/vedachat/message', {
        message: msg,
        conversation_id: conversationId,
      });
      if (data.conversation_id) setConversationId(data.conversation_id);
      setMessages(prev => [...prev, data.response]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I encountered an error. Please try again.' }]);
    } finally {
      setLoading(false);
    }
  };

  const renderMessage = ({ item }) => (
    <View style={[styles.msgRow, item.role === 'user' && styles.msgRowUser]}>
      {item.role === 'assistant' && (
        <View style={styles.botAvatar}><Text style={styles.botAvatarText}>V</Text></View>
      )}
      <View style={[styles.msgBubble, item.role === 'user' ? styles.userBubble : styles.botBubble]}>
        <Text style={[styles.msgText, item.role === 'user' && { color: '#fff' }]}>{item.content}</Text>
      </View>
    </View>
  );

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
      {messages.length === 0 ? (
        <View style={styles.emptyState}>
          <View style={styles.emptyIcon}><Text style={styles.emptyIconText}>V</Text></View>
          <Text style={styles.emptyTitle}>VedaChat</Text>
          <Text style={styles.emptySubtitle}>Ask about Hindu scriptures, philosophy, rituals, and spiritual practices</Text>
          <View style={styles.suggestions}>
            {SUGGESTIONS.map((s) => (
              <TouchableOpacity key={s} style={styles.suggestionBtn} onPress={() => sendMessage(s)}>
                <Text style={styles.suggestionText}>{s}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(_, i) => String(i)}
          contentContainerStyle={{ padding: 16 }}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
          ListFooterComponent={loading ? (
            <View style={styles.loadingRow}>
              <View style={styles.botAvatar}><Text style={styles.botAvatarText}>V</Text></View>
              <View style={styles.loadingBubble}>
                <ActivityIndicator size="small" color={COLORS.primary} />
                <Text style={styles.loadingText}>Thinking...</Text>
              </View>
            </View>
          ) : null}
        />
      )}

      {/* Input Bar */}
      <View style={styles.inputBar}>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder="Ask about scriptures, mantras..."
          placeholderTextColor={COLORS.textMuted}
          multiline
          maxLength={1000}
          editable={!loading}
        />
        <TouchableOpacity
          style={[styles.sendBtn, (!input.trim() || loading) && styles.sendBtnDisabled]}
          onPress={() => sendMessage()}
          disabled={!input.trim() || loading}
        >
          <Text style={styles.sendBtnText}>Send</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyIcon: { width: 64, height: 64, borderRadius: 20, backgroundColor: COLORS.accent, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  emptyIconText: { fontSize: 28, fontWeight: '700', color: COLORS.primary },
  emptyTitle: { fontSize: 24, fontWeight: '700', color: COLORS.text },
  emptySubtitle: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', marginTop: 8, lineHeight: 20 },
  suggestions: { marginTop: 24, width: '100%', gap: 8 },
  suggestionBtn: { backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12 },
  suggestionText: { fontSize: 14, color: COLORS.textSecondary },
  msgRow: { flexDirection: 'row', marginBottom: 12, alignItems: 'flex-start' },
  msgRowUser: { justifyContent: 'flex-end' },
  botAvatar: { width: 32, height: 32, borderRadius: 10, backgroundColor: COLORS.accent, alignItems: 'center', justifyContent: 'center', marginRight: 8 },
  botAvatarText: { fontSize: 14, fontWeight: '700', color: COLORS.primary },
  msgBubble: { maxWidth: '78%', padding: 14, borderRadius: 16 },
  userBubble: { backgroundColor: COLORS.primary, borderBottomRightRadius: 4 },
  botBubble: { backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderBottomLeftRadius: 4 },
  msgText: { fontSize: 14, lineHeight: 22, color: COLORS.text },
  loadingRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  loadingBubble: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, padding: 12, borderRadius: 14 },
  loadingText: { fontSize: 13, color: COLORS.textSecondary },
  inputBar: {
    flexDirection: 'row', alignItems: 'flex-end', padding: 12, gap: 10,
    backgroundColor: COLORS.surface, borderTopWidth: 1, borderTopColor: COLORS.border,
  },
  input: {
    flex: 1, backgroundColor: COLORS.background, borderWidth: 1, borderColor: COLORS.border,
    borderRadius: 14, paddingHorizontal: 16, paddingVertical: 10, fontSize: 14,
    maxHeight: 100, color: COLORS.text,
  },
  sendBtn: { backgroundColor: COLORS.primary, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 14 },
  sendBtnDisabled: { opacity: 0.4 },
  sendBtnText: { fontSize: 14, fontWeight: '600', color: '#fff' },
});
