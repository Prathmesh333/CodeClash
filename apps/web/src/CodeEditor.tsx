import { useEffect } from 'react';
import { useTheme, type Theme } from './themes';
import Editor, { loader } from '@monaco-editor/react';
import * as monaco from 'monaco-editor/editor/editor.api';
import 'monaco-editor/languages/definitions/python/register';
import EditorWorker from 'monaco-editor/editor/editor.worker?worker';
globalThis.MonacoEnvironment = { getWorker: () => new EditorWorker() };
loader.config({ monaco });
export default function CodeEditor({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
}) {
  const theme = useTheme();
  useEffect(() => {
    applyEditorTheme(theme);
  }, [theme]);
  return (
    <Editor
      height="100%"
      language="python"
      theme="arena"
      value={value}
      onChange={(v) => onChange(v ?? '')}
      loading={<div className="editor-loading">Loading Python editor…</div>}
      beforeMount={() => applyEditorTheme(theme)}
      onMount={(editor) => {
        applyEditorTheme(theme);
        editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {});
      }}
      options={{
        readOnly: disabled,
        minimap: { enabled: false },
        fontSize: 14,
        fontFamily: 'Consolas, "Liberation Mono", monospace',
        padding: { top: 22 },
        scrollBeyondLastLine: false,
        automaticLayout: true,
        tabSize: 4,
        wordWrap: 'on',
        ariaLabel: 'Python solution editor',
        accessibilitySupport: 'on',
        renderLineHighlight: 'line',
        overviewRulerLanes: 0,
        lineNumbersMinChars: 3,
      }}
    />
  );
}

function applyEditorTheme(theme: Theme) {
  const dark = theme.mode === 'dark';
  monaco.editor.defineTheme('arena', {
    base: dark ? 'vs-dark' : 'vs',
    inherit: true,
    rules: [
      { token: 'comment', foreground: theme.muted.slice(1) },
      { token: 'keyword', foreground: theme.secondary.slice(1) },
      { token: 'string', foreground: dark ? '79DFB3' : '15803D' },
    ],
    colors: {
      'editor.background': theme.surface,
      'editor.foreground': theme.text,
      'editorLineNumber.foreground': theme.muted,
      'editor.lineHighlightBackground': theme.alt,
      'editorCursor.foreground': theme.secondary,
      'editor.selectionBackground': dark ? '#354559' : '#DBEAFE',
    },
  });
  monaco.editor.setTheme('arena');
}
