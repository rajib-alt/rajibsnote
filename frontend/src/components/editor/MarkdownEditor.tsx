import { useCallback, useMemo, useRef, useEffect } from 'react';
import CodeMirror, { EditorView, keymap } from '@uiw/react-codemirror';
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { languages } from '@codemirror/language-data';
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import { EditorSelection } from '@codemirror/state';
import { Decoration, DecorationSet, ViewPlugin, ViewUpdate } from '@codemirror/view';
import { RangeSetBuilder } from '@codemirror/state';
import { autocompletion, CompletionContext, CompletionResult } from '@codemirror/autocomplete';
import { useTheme } from 'next-themes';
import { createTheme } from '@uiw/codemirror-themes';
import { tags as t } from '@lezer/highlight';

// ─── Parchment light theme ────────────────────────────────────────────────────
const parchmentTheme = createTheme({
  theme: 'light',
  settings: {
    background: 'transparent',
    foreground: 'hsl(24 10% 10%)',
    caret: 'hsl(215 25% 27%)',
    selection: 'hsl(215 25% 27% / 0.15)',
    selectionMatch: 'hsl(215 25% 27% / 0.10)',
    lineHighlight: 'transparent',
    gutterBackground: 'transparent',
    gutterForeground: 'hsl(24 10% 60%)',
  },
  styles: [
    { tag: t.heading1, color: 'hsl(24 10% 8%)', fontWeight: '700', fontSize: '1.6em', fontFamily: 'var(--font-serif)' },
    { tag: t.heading2, color: 'hsl(24 10% 10%)', fontWeight: '600', fontSize: '1.35em', fontFamily: 'var(--font-serif)' },
    { tag: t.heading3, color: 'hsl(24 10% 12%)', fontWeight: '600', fontSize: '1.15em', fontFamily: 'var(--font-serif)' },
    { tag: t.heading4, color: 'hsl(24 10% 14%)', fontWeight: '600' },
    { tag: t.heading5, color: 'hsl(24 10% 14%)', fontWeight: '600' },
    { tag: t.heading6, color: 'hsl(24 10% 14%)', fontWeight: '600' },
    { tag: t.strong, color: 'hsl(24 10% 8%)', fontWeight: '700' },
    { tag: t.emphasis, color: 'hsl(24 10% 12%)', fontStyle: 'italic' },
    { tag: t.strikethrough, color: 'hsl(24 10% 50%)', textDecoration: 'line-through' },
    { tag: t.link, color: 'hsl(215 25% 35%)', textDecoration: 'underline' },
    { tag: t.url, color: 'hsl(215 25% 40%)' },
    { tag: t.monospace, color: 'hsl(15 40% 35%)', background: 'hsl(36 30% 92%)', borderRadius: '3px', padding: '0 2px' },
    { tag: t.comment, color: 'hsl(24 10% 50%)' },
    { tag: t.meta, color: 'hsl(24 10% 55%)' },
    { tag: t.processingInstruction, color: 'hsl(215 25% 45%)' },
    { tag: t.content, color: 'hsl(24 10% 10%)' },
    { tag: t.quote, color: 'hsl(24 10% 40%)', fontStyle: 'italic' },
    { tag: t.list, color: 'hsl(215 25% 35%)' },
    { tag: t.punctuation, color: 'hsl(24 10% 50%)' },
    { tag: t.special(t.variableName), color: 'hsl(280 25% 45%)' },
  ],
});

// ─── Midnight dark theme ──────────────────────────────────────────────────────
const midnightTheme = createTheme({
  theme: 'dark',
  settings: {
    background: 'transparent',
    foreground: 'hsl(45 30% 85%)',
    caret: 'hsl(215 25% 70%)',
    selection: 'hsl(215 25% 60% / 0.25)',
    selectionMatch: 'hsl(215 25% 60% / 0.15)',
    lineHighlight: 'transparent',
    gutterBackground: 'transparent',
    gutterForeground: 'hsl(45 20% 45%)',
  },
  styles: [
    { tag: t.heading1, color: 'hsl(45 30% 92%)', fontWeight: '700', fontSize: '1.6em', fontFamily: 'var(--font-serif)' },
    { tag: t.heading2, color: 'hsl(45 30% 88%)', fontWeight: '600', fontSize: '1.35em', fontFamily: 'var(--font-serif)' },
    { tag: t.heading3, color: 'hsl(45 30% 85%)', fontWeight: '600', fontSize: '1.15em', fontFamily: 'var(--font-serif)' },
    { tag: t.heading4, color: 'hsl(45 30% 82%)', fontWeight: '600' },
    { tag: t.heading5, color: 'hsl(45 30% 82%)', fontWeight: '600' },
    { tag: t.heading6, color: 'hsl(45 30% 82%)', fontWeight: '600' },
    { tag: t.strong, color: 'hsl(45 30% 92%)', fontWeight: '700' },
    { tag: t.emphasis, color: 'hsl(45 30% 80%)', fontStyle: 'italic' },
    { tag: t.strikethrough, color: 'hsl(45 20% 50%)', textDecoration: 'line-through' },
    { tag: t.link, color: 'hsl(215 30% 70%)', textDecoration: 'underline' },
    { tag: t.url, color: 'hsl(215 30% 65%)' },
    { tag: t.monospace, color: 'hsl(15 40% 70%)', background: 'hsl(24 10% 18%)', borderRadius: '3px', padding: '0 2px' },
    { tag: t.comment, color: 'hsl(45 20% 50%)' },
    { tag: t.meta, color: 'hsl(45 20% 45%)' },
    { tag: t.processingInstruction, color: 'hsl(215 25% 60%)' },
    { tag: t.content, color: 'hsl(45 30% 82%)' },
    { tag: t.quote, color: 'hsl(45 20% 55%)', fontStyle: 'italic' },
    { tag: t.list, color: 'hsl(215 25% 60%)' },
    { tag: t.punctuation, color: 'hsl(45 20% 50%)' },
    { tag: t.special(t.variableName), color: 'hsl(280 30% 70%)' },
  ],
});

// ─── [[wikilink]] highlight extension ────────────────────────────────────────
const wikilinkMark = Decoration.mark({ class: 'cm-wikilink' });

const wikilinkPlugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;
    constructor(view: EditorView) {
      this.decorations = this.buildDecorations(view);
    }
    update(update: ViewUpdate) {
      if (update.docChanged || update.viewportChanged) {
        this.decorations = this.buildDecorations(update.view);
      }
    }
    buildDecorations(view: EditorView): DecorationSet {
      const builder = new RangeSetBuilder<Decoration>();
      const regex = /\[\[([^\]]+)\]\]/g;
      for (const { from, to } of view.visibleRanges) {
        const text = view.state.doc.sliceString(from, to);
        let match;
        while ((match = regex.exec(text)) !== null) {
          const start = from + match.index;
          const end = start + match[0].length;
          builder.add(start, end, wikilinkMark);
        }
      }
      return builder.finish();
    }
  },
  { decorations: (v) => v.decorations }
);

// ─── Formatting helpers ───────────────────────────────────────────────────────
function wrapSelection(view: EditorView, before: string, after: string = before) {
  const { state } = view;
  const changes = state.changeByRange((range) => {
    const text = state.doc.sliceString(range.from, range.to);
    const isWrapped = text.startsWith(before) && text.endsWith(after);
    if (isWrapped) {
      const newText = text.slice(before.length, text.length - after.length);
      return {
        changes: { from: range.from, to: range.to, insert: newText },
        range: EditorSelection.range(range.from, range.from + newText.length),
      };
    }
    const newText = `${before}${text}${after}`;
    return {
      changes: { from: range.from, to: range.to, insert: newText },
      range: EditorSelection.range(
        range.from + before.length,
        range.from + before.length + text.length
      ),
    };
  });
  view.dispatch(changes);
  return true;
}

function insertAtLineStart(view: EditorView, prefix: string) {
  const { state } = view;
  const changes = state.changeByRange((range) => {
    const line = state.doc.lineAt(range.from);
    const lineText = line.text;
    if (lineText.startsWith(prefix)) {
      return {
        changes: { from: line.from, to: line.from + prefix.length, insert: '' },
        range: EditorSelection.range(
          range.from - prefix.length,
          range.to - prefix.length
        ),
      };
    }
    return {
      changes: { from: line.from, insert: prefix },
      range: EditorSelection.range(range.from + prefix.length, range.to + prefix.length),
    };
  });
  view.dispatch(changes);
  return true;
}

// ─── Toolbar button definitions ───────────────────────────────────────────────
export interface ToolbarAction {
  label: string;
  title: string;
  action: (view: EditorView) => void;
}

export const toolbarActions: ToolbarAction[] = [
  { label: 'H1', title: 'Heading 1', action: (v) => insertAtLineStart(v, '# ') },
  { label: 'H2', title: 'Heading 2', action: (v) => insertAtLineStart(v, '## ') },
  { label: 'H3', title: 'Heading 3', action: (v) => insertAtLineStart(v, '### ') },
  { label: 'B', title: 'Bold (⌘B)', action: (v) => wrapSelection(v, '**') },
  { label: 'I', title: 'Italic (⌘I)', action: (v) => wrapSelection(v, '*') },
  { label: 'S', title: 'Strikethrough', action: (v) => wrapSelection(v, '~~') },
  { label: '`', title: 'Inline code', action: (v) => wrapSelection(v, '`') },
  { label: '```', title: 'Code block', action: (v) => wrapSelection(v, '\n```\n', '\n```\n') },
  { label: '—', title: 'Horizontal rule', action: (v) => { v.dispatch(v.state.replaceSelection('\n---\n')); } },
  { label: '"', title: 'Blockquote', action: (v) => insertAtLineStart(v, '> ') },
  { label: '•', title: 'Bullet list', action: (v) => insertAtLineStart(v, '- ') },
  { label: '1.', title: 'Numbered list', action: (v) => insertAtLineStart(v, '1. ') },
  { label: '[[]]', title: 'Wikilink', action: (v) => wrapSelection(v, '[[', ']]') },
];

// ─── Editor component ─────────────────────────────────────────────────────────
interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  editorRef?: React.MutableRefObject<EditorView | null>;
  noteTitles?: string[];
}

export function MarkdownEditor({ value, onChange, placeholder, editorRef, noteTitles }: MarkdownEditorProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  // Use a ref so the completion source always reads fresh titles
  // without causing the extensions array to rebuild on every keystroke
  const noteTitlesRef = useRef<string[]>(noteTitles ?? []);
  useEffect(() => {
    noteTitlesRef.current = noteTitles ?? [];
  }, [noteTitles]);

  const wikilinkCompletionSource = useCallback(
    (context: CompletionContext): CompletionResult | null => {
      const textBefore = context.state.doc.sliceString(0, context.pos);
      const match = textBefore.match(/\[\[([^\]\n]*)$/);
      if (!match) return null;

      const query = match[1];
      const from = context.pos - query.length;

      const options = noteTitlesRef.current
        .filter((title) => title.toLowerCase().includes(query.toLowerCase()))
        .map((title) => ({
          label: title,
          apply: title + ']]',
          type: 'text',
          boost: 1,
        }));

      if (!context.explicit && options.length === 0) return null;

      return {
        from,
        options,
        validFor: /^[^\]\n]*$/,
      };
    },
    []
  );

  const extensions = useMemo(
    () => [
      markdown({ base: markdownLanguage, codeLanguages: languages }),
      history(),
      wikilinkPlugin,
      EditorView.lineWrapping,
      autocompletion({
        override: [wikilinkCompletionSource],
        defaultKeymap: true,
        activateOnTyping: true,
        maxRenderedOptions: 12,
      }),
      keymap.of([
        ...defaultKeymap,
        ...historyKeymap,
        indentWithTab,
        {
          key: 'Mod-b',
          run: (view) => wrapSelection(view, '**'),
        },
        {
          key: 'Mod-i',
          run: (view) => wrapSelection(view, '*'),
        },
        {
          key: 'Mod-`',
          run: (view) => wrapSelection(view, '`'),
        },
        {
          key: 'Mod-shift-s',
          run: (view) => wrapSelection(view, '~~'),
        },
      ]),
      EditorView.theme({
        '&': {
          fontSize: '14px',
          fontFamily: 'var(--font-mono)',
          height: '100%',
          outline: 'none',
        },
        '.cm-content': {
          padding: '0 0 8rem 0',
          caretColor: isDark ? 'hsl(215 25% 70%)' : 'hsl(215 25% 27%)',
          lineHeight: '1.8',
        },
        '.cm-line': { padding: '0' },
        '.cm-scroller': { overflow: 'auto', fontFamily: 'inherit' },
        '.cm-cursor': { borderLeftWidth: '2px' },
        '.cm-focused': { outline: 'none !important' },
        '&.cm-focused': { outline: 'none !important' },
        '.cm-wikilink': {
          color: isDark ? 'hsl(280 30% 72%)' : 'hsl(280 25% 45%)',
          background: isDark ? 'hsl(280 25% 20%)' : 'hsl(280 40% 95%)',
          borderRadius: '3px',
          padding: '0 3px',
          cursor: 'pointer',
          textDecoration: 'none',
        },
        '.cm-selectionBackground': {
          background: isDark
            ? 'hsl(215 25% 60% / 0.25) !important'
            : 'hsl(215 25% 27% / 0.15) !important',
        },
        '&.cm-focused .cm-selectionBackground': {
          background: isDark
            ? 'hsl(215 25% 60% / 0.3) !important'
            : 'hsl(215 25% 27% / 0.2) !important',
        },
        '.cm-placeholder': {
          color: isDark ? 'hsl(45 20% 40%)' : 'hsl(24 10% 60%)',
          fontStyle: 'italic',
        },
        // Autocomplete dropdown styling
        '.cm-tooltip.cm-tooltip-autocomplete': {
          border: `1px solid ${isDark ? 'hsl(45 15% 25%)' : 'hsl(36 20% 80%)'}`,
          borderRadius: '6px',
          background: isDark ? 'hsl(24 10% 12%)' : 'hsl(36 30% 97%)',
          boxShadow: isDark
            ? '0 4px 20px hsl(0 0% 0% / 0.4)'
            : '0 4px 20px hsl(24 10% 20% / 0.12)',
          padding: '4px',
          fontFamily: 'var(--font-sans)',
          fontSize: '13px',
          maxHeight: '200px',
          overflow: 'auto',
        },
        '.cm-tooltip-autocomplete ul li': {
          borderRadius: '4px',
          padding: '4px 10px',
          color: isDark ? 'hsl(45 30% 80%)' : 'hsl(24 10% 15%)',
          cursor: 'pointer',
        },
        '.cm-tooltip-autocomplete ul li[aria-selected]': {
          background: isDark ? 'hsl(280 25% 25%)' : 'hsl(280 40% 93%)',
          color: isDark ? 'hsl(280 30% 85%)' : 'hsl(280 25% 30%)',
        },
        '.cm-completionLabel': {
          flex: '1',
        },
        '.cm-completionMatchedText': {
          fontWeight: '600',
          textDecoration: 'none',
        },
      }),
    ],
    [isDark, wikilinkCompletionSource]
  );

  const handleCreate = useCallback(
    (view: EditorView) => {
      if (editorRef) editorRef.current = view;
    },
    [editorRef]
  );

  return (
    <CodeMirror
      value={value}
      onChange={onChange}
      extensions={extensions}
      theme={isDark ? midnightTheme : parchmentTheme}
      basicSetup={{
        lineNumbers: false,
        foldGutter: false,
        dropCursor: true,
        allowMultipleSelections: true,
        indentOnInput: true,
        syntaxHighlighting: true,
        bracketMatching: true,
        autocompletion: false,
        rectangularSelection: true,
        crosshairCursor: false,
        highlightActiveLine: false,
        highlightActiveLineGutter: false,
        highlightSelectionMatches: true,
        closeBrackets: false,
        searchKeymap: true,
      }}
      placeholder={placeholder}
      onCreateEditor={handleCreate}
      style={{ height: '100%', minHeight: '60vh' }}
    />
  );
}
