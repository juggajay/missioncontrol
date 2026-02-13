import { useEffect, useRef, useCallback } from 'react';
import { EditorView, keymap, lineNumbers, highlightActiveLine, highlightSpecialChars, drawSelection, dropCursor, rectangularSelection, crosshairCursor } from '@codemirror/view';
import { EditorState, type Extension } from '@codemirror/state';
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import { json } from '@codemirror/lang-json';
import { markdown } from '@codemirror/lang-markdown';
import { yaml } from '@codemirror/lang-yaml';
import { bracketMatching, indentOnInput, syntaxHighlighting, HighlightStyle, foldGutter, foldKeymap } from '@codemirror/language';
import { searchKeymap, highlightSelectionMatches } from '@codemirror/search';
import { autocompletion, completionKeymap, closeBrackets, closeBracketsKeymap } from '@codemirror/autocomplete';
import { lintKeymap } from '@codemirror/lint';
import { tags } from '@lezer/highlight';

// Cyberpunk theme for CodeMirror
const cyberpunkTheme = EditorView.theme({
  '&': {
    backgroundColor: '#0a0a0f',
    color: '#e6edf3',
    fontSize: '13px',
    fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
  },
  '.cm-content': {
    caretColor: '#00f0ff',
    padding: '8px 0',
  },
  '.cm-cursor, .cm-dropCursor': {
    borderLeftColor: '#00f0ff',
    borderLeftWidth: '2px',
  },
  '&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection': {
    backgroundColor: 'rgba(0, 240, 255, 0.15)',
  },
  '.cm-activeLine': {
    backgroundColor: 'rgba(0, 240, 255, 0.05)',
  },
  '.cm-gutters': {
    backgroundColor: '#0d1117',
    color: '#484f58',
    border: 'none',
    borderRight: '1px solid #21262d',
  },
  '.cm-activeLineGutter': {
    backgroundColor: 'rgba(0, 240, 255, 0.08)',
    color: '#8b949e',
  },
  '.cm-lineNumbers .cm-gutterElement': {
    padding: '0 8px 0 12px',
    minWidth: '40px',
  },
  '&.cm-focused .cm-matchingBracket': {
    backgroundColor: 'rgba(0, 240, 255, 0.15)',
    outline: '1px solid rgba(0, 240, 255, 0.3)',
  },
  '.cm-foldGutter .cm-gutterElement': {
    color: '#484f58',
  },
  '.cm-foldGutter .cm-gutterElement:hover': {
    color: '#00f0ff',
  },
  '.cm-searchMatch': {
    backgroundColor: 'rgba(255, 204, 0, 0.2)',
    outline: '1px solid rgba(255, 204, 0, 0.4)',
  },
  '.cm-searchMatch.cm-searchMatch-selected': {
    backgroundColor: 'rgba(0, 240, 255, 0.25)',
  },
  '.cm-panels': {
    backgroundColor: '#0d1117',
    color: '#e6edf3',
  },
  '.cm-panels.cm-panels-top': {
    borderBottom: '1px solid #21262d',
  },
  '.cm-panels.cm-panels-bottom': {
    borderTop: '1px solid #21262d',
  },
  '.cm-panel.cm-search': {
    padding: '4px 8px',
  },
  '.cm-panel.cm-search input, .cm-panel.cm-search button': {
    backgroundColor: '#161b22',
    border: '1px solid #21262d',
    color: '#e6edf3',
    borderRadius: '4px',
    padding: '2px 6px',
    fontSize: '12px',
  },
  '.cm-panel.cm-search button:hover': {
    backgroundColor: '#1c2333',
  },
  '.cm-panel.cm-search label': {
    color: '#8b949e',
    fontSize: '12px',
  },
  '.cm-tooltip': {
    backgroundColor: '#161b22',
    border: '1px solid #21262d',
    borderRadius: '4px',
  },
  '.cm-tooltip-autocomplete': {
    '& > ul > li[aria-selected]': {
      backgroundColor: 'rgba(0, 240, 255, 0.15)',
    },
  },
  '.cm-scroller': {
    overflow: 'auto',
  },
}, { dark: true });

const cyberpunkHighlightStyle = HighlightStyle.define([
  { tag: tags.keyword, color: '#b44dff' },
  { tag: tags.operator, color: '#b44dff' },
  { tag: tags.special(tags.variableName), color: '#00f0ff' },
  { tag: tags.typeName, color: '#00f0ff' },
  { tag: tags.atom, color: '#00f0ff' },
  { tag: tags.number, color: '#ffcc00' },
  { tag: tags.bool, color: '#ffcc00' },
  { tag: tags.string, color: '#00ff88' },
  { tag: tags.regexp, color: '#ff6b2b' },
  { tag: tags.escape, color: '#ff6b2b' },
  { tag: tags.definition(tags.variableName), color: '#e6edf3' },
  { tag: tags.propertyName, color: '#00f0ff' },
  { tag: tags.function(tags.variableName), color: '#4d7cff' },
  { tag: tags.labelName, color: '#ff00aa' },
  { tag: tags.comment, color: '#484f58', fontStyle: 'italic' },
  { tag: tags.lineComment, color: '#484f58', fontStyle: 'italic' },
  { tag: tags.blockComment, color: '#484f58', fontStyle: 'italic' },
  { tag: tags.meta, color: '#8b949e' },
  { tag: tags.link, color: '#4d7cff', textDecoration: 'underline' },
  { tag: tags.heading, color: '#00f0ff', fontWeight: 'bold' },
  { tag: tags.emphasis, fontStyle: 'italic' },
  { tag: tags.strong, fontWeight: 'bold' },
  { tag: tags.strikethrough, textDecoration: 'line-through' },
  { tag: tags.invalid, color: '#ff3366' },
  { tag: tags.punctuation, color: '#8b949e' },
  { tag: tags.null, color: '#ffcc00' },
]);

function getLanguageExtension(language: string): Extension[] {
  switch (language) {
    case 'json':
      return [json()];
    case 'markdown':
      return [markdown()];
    case 'yaml':
      return [yaml()];
    default:
      return [];
  }
}

interface FileEditorProps {
  value: string;
  onChange?: (value: string) => void;
  language?: 'json' | 'markdown' | 'yaml' | 'text';
  readOnly?: boolean;
  onSave?: () => void;
}

export function FileEditor({ value, onChange, language = 'text', readOnly = false, onSave }: FileEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const onChangeRef = useRef(onChange);
  const onSaveRef = useRef(onSave);

  // Keep refs up to date
  onChangeRef.current = onChange;
  onSaveRef.current = onSave;

  const createState = useCallback((doc: string) => {
    const extensions: Extension[] = [
      lineNumbers(),
      highlightActiveLine(),
      highlightSpecialChars(),
      history(),
      foldGutter(),
      drawSelection(),
      dropCursor(),
      EditorState.allowMultipleSelections.of(true),
      indentOnInput(),
      bracketMatching(),
      closeBrackets(),
      autocompletion(),
      rectangularSelection(),
      crosshairCursor(),
      highlightSelectionMatches(),
      cyberpunkTheme,
      syntaxHighlighting(cyberpunkHighlightStyle),
      ...getLanguageExtension(language),
      keymap.of([
        ...closeBracketsKeymap,
        ...defaultKeymap,
        ...searchKeymap,
        ...historyKeymap,
        ...foldKeymap,
        ...completionKeymap,
        ...lintKeymap,
        indentWithTab,
        {
          key: 'Mod-s',
          run: () => {
            onSaveRef.current?.();
            return true;
          },
        },
      ]),
      EditorView.updateListener.of((update) => {
        if (update.docChanged) {
          onChangeRef.current?.(update.state.doc.toString());
        }
      }),
    ];

    if (readOnly) {
      extensions.push(EditorState.readOnly.of(true));
      extensions.push(EditorView.editable.of(false));
    }

    return EditorState.create({ doc, extensions });
  }, [language, readOnly]);

  // Initialize editor
  useEffect(() => {
    if (!containerRef.current) return;

    const view = new EditorView({
      state: createState(value),
      parent: containerRef.current,
    });
    viewRef.current = view;

    return () => {
      view.destroy();
      viewRef.current = null;
    };
  }, [language, readOnly]); // Recreate on language/readOnly change

  // Sync external value changes
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    const currentDoc = view.state.doc.toString();
    if (currentDoc !== value) {
      view.dispatch({
        changes: { from: 0, to: currentDoc.length, insert: value },
      });
    }
  }, [value]);

  return (
    <div
      ref={containerRef}
      className="h-full w-full overflow-hidden rounded border border-cyber-border [&_.cm-editor]:h-full [&_.cm-editor.cm-focused]:outline-none [&_.cm-scroller]:h-full"
    />
  );
}
