import * as monaco from 'monaco-editor';

export const defineMonacoThemes = () => {
  monaco.editor.defineTheme('notevault-dark', {
    base: 'vs-dark',
    inherit: true,
    rules: [],
    colors: {
      'editor.background': '#00000000',       // Transparent — Mica shows through
      'editor.foreground': '#E8E8E8',
      'editor.selectionBackground': '#0078D440',
      'editor.lineHighlightBackground': '#FFFFFF08',
      'editorCursor.foreground': '#0078D4',   // Windows accent color
      'editorLineNumber.foreground': '#555555',
    },
  });

  monaco.editor.defineTheme('notevault-light', {
    base: 'vs',
    inherit: true,
    rules: [],
    colors: {
      'editor.background': '#00000000',
      'editor.foreground': '#1A1A1A',
      'editor.selectionBackground': '#0078D430',
      'editor.lineHighlightBackground': '#00000008',
      'editorCursor.foreground': '#0078D4',
    },
  });
};
