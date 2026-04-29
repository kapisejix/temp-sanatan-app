import React from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';

/**
 * Unicode-safe rich-text editor wrapper around TipTap.
 * - Keeps Sanskrit/Hindi/Tamil/Telugu/Bengali/etc. clean (no font munging)
 * - Stores content as plain text (Markdown-free) so it round-trips safely
 *   through the Gemini translation pipeline and MongoDB.
 *
 * Props:
 *   value       — string (plain text, newlines preserved)
 *   onChange    — (newValue: string) => void
 *   lang        — ISO language code (used as `lang` attribute for IME hints)
 *   placeholder — string
 *   minHeight   — CSS string e.g. '120px'
 *   testId      — data-testid prefix
 */
export default function UnicodeRichEditor({
  value = '',
  onChange,
  lang = 'hi',
  placeholder = '',
  minHeight = '110px',
  testId = 'unicode-editor',
  readOnly = false,
}) {
  const editor = useEditor({
    extensions: [StarterKit.configure({ heading: false, codeBlock: false, blockquote: false, horizontalRule: false })],
    content: value ? value.split('\n').map((l) => `<p>${escapeHtml(l) || '<br>'}</p>`).join('') : '',
    editable: !readOnly,
    editorProps: {
      attributes: {
        lang,
        spellcheck: 'false',
        class: 'tiptap-editor px-3 py-2 outline-none',
        style: `min-height: ${minHeight}; font-family: 'Noto Sans', 'Noto Sans Devanagari', 'Noto Sans Tamil', 'Noto Sans Bengali', 'Noto Sans Gujarati', 'Noto Sans Telugu', 'Noto Sans Kannada', 'Noto Sans Malayalam', 'Noto Sans Gurmukhi', 'Noto Sans Oriya', system-ui, sans-serif; font-size: 15px; line-height: 1.7;`,
        'data-testid': testId,
      },
    },
    onUpdate: ({ editor }) => {
      if (!onChange) return;
      // Convert to plain text (preserving paragraph breaks)
      const text = editor
        .getJSON()
        .content?.map((node) => {
          if (node.type === 'paragraph') {
            return (node.content || []).map((n) => n.text || '').join('');
          }
          return '';
        })
        .join('\n') || '';
      onChange(text);
    },
  }, [lang, readOnly]);

  // Sync external value changes (e.g. AI-fill)
  React.useEffect(() => {
    if (!editor) return;
    const current = editorToText(editor);
    if (current !== (value || '')) {
      const html = (value || '').split('\n').map((l) => `<p>${escapeHtml(l) || '<br>'}</p>`).join('');
      editor.commands.setContent(html, { emitUpdate: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, editor]);

  return (
    <div
      className="rounded-lg border border-gray-200 bg-white focus-within:border-[#E95A34] transition-colors"
      data-testid={`${testId}-wrapper`}
    >
      {placeholder && !value && (
        <div className="px-3 pt-2 text-xs text-gray-400 select-none pointer-events-none -mb-7 relative z-0">
          {placeholder}
        </div>
      )}
      <EditorContent editor={editor} />
    </div>
  );
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function editorToText(editor) {
  return editor
    .getJSON()
    .content?.map((node) => {
      if (node.type === 'paragraph') {
        return (node.content || []).map((n) => n.text || '').join('');
      }
      return '';
    })
    .join('\n') || '';
}
