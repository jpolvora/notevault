import Editor, { OnMount } from "@monaco-editor/react";
import { useRef, useEffect } from "react";
import * as monaco from "monaco-editor";
import { v4 as uuidv4 } from "uuid";
import { Tab } from "../../../../shared/types";
import { useTabStore } from "../../store/tabs";
import { useUIStore } from "../../store/ui";

interface MonacoInstanceProps {
  tab: Tab;
  isActive: boolean;
}

export const MonacoInstance = ({ tab, isActive }: MonacoInstanceProps) => {
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const { updateTab, setCursorPosition } = useTabStore();
  const { settings, systemTheme } = useUIStore();

  const handleEditorDidMount: OnMount = (editor) => {
    editorRef.current = editor;

    editor.onDidChangeCursorPosition((e) => {
      if (isActive) {
        setCursorPosition({
          lineNumber: e.position.lineNumber,
          column: e.position.column,
        });
      }
    });

    if (tab.viewState) {
      editor.restoreViewState(tab.viewState as any);
    }

    if (isActive) {
      editor.focus();
    }

    // Add Utilities
    editor.addAction({
      id: "utility-md5",
      label: "Utility: MD5 Hash",
      contextMenuGroupId: "utility",
      run: async (ed) => {
        const selection = ed.getSelection();
        if (!selection) return;
        const text = ed.getModel()?.getValueInRange(selection);
        if (text) {
          const hash = await window.api.getHash(text, "md5");
          ed.executeEdits("utility", [{ range: selection, text: hash }]);
        }
      },
    });

    editor.addAction({
      id: "utility-sha256",
      label: "Utility: SHA-256 Hash",
      contextMenuGroupId: "utility",
      run: async (ed) => {
        const selection = ed.getSelection();
        if (!selection) return;
        const text = ed.getModel()?.getValueInRange(selection);
        if (text) {
          const hash = await window.api.getHash(text, "sha256");
          ed.executeEdits("utility", [{ range: selection, text: hash }]);
        }
      },
    });

    editor.addAction({
      id: "utility-uuid",
      label: "Utility: Insert UUID",
      contextMenuGroupId: "utility",
      run: (ed) => {
        const selection = ed.getSelection();
        if (!selection) return;
        ed.executeEdits("utility", [{ range: selection, text: uuidv4() }]);
      },
    });

    editor.addAction({
      id: "utility-random",
      label: "Utility: Insert Random Number",
      contextMenuGroupId: "utility",
      run: async (ed) => {
        const selection = ed.getSelection();
        if (!selection) return;
        const num = await window.api.getRandom(0, 1000000);
        ed.executeEdits("utility", [
          { range: selection, text: num.toString() },
        ]);
      },
    });
  };

  useEffect(() => {
    if (isActive && editorRef.current) {
      editorRef.current.focus();
    } else if (!isActive && editorRef.current) {
      const state = editorRef.current.saveViewState();
      if (state) {
        updateTab(tab.id, { viewState: state as any });
      }
    }

    const handleFormat = () => {
      if (isActive && editorRef.current) {
        editorRef.current.getAction("editor.action.formatDocument")?.run();
      }
    };

    window.addEventListener("monaco:format", handleFormat);
    return () => {
      window.removeEventListener("monaco:format", handleFormat);
    };
  }, [isActive]);

  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const handleChange = (value: string | undefined) => {
    const newContent = value || "";

    // Immediate local update for UI
    updateTab(tab.id, { content: newContent }, false);

    // Debounced IPC update
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      window.api.updateTab(tab.id, {
        content: newContent,
        updatedAt: Date.now(),
      });
    }, 300);
  };

  const currentTheme =
    settings?.theme === "system" ? systemTheme : settings?.theme || "dark";
  const monacoTheme =
    currentTheme === "light" ? "notevault-light" : "notevault-dark";

  return (
    <Editor
      theme={monacoTheme}
      language={tab.language || "plaintext"}
      value={tab.content}
      onChange={handleChange}
      onMount={handleEditorDidMount}
      options={{
        fontFamily:
          settings?.editorFontFamily || "'Cascadia Mono', Consolas, monospace",
        fontSize: settings?.editorFontSize || 14,
        mouseWheelZoom: true,
        wordWrap: settings?.wordWrap ? "on" : "off",
        lineNumbers: settings?.lineNumbers || "off",
        minimap: { enabled: settings?.minimap || false },
        smoothScrolling: true,
        cursorBlinking: settings?.cursorBlinking || "smooth",
        padding: { top: 16, bottom: 16 },
        scrollBeyondLastLine: false,
        automaticLayout: true,
        fontLigatures: settings?.fontLigatures ?? true,
        renderWhitespace: settings?.renderWhitespace || "none",
        contextmenu: true,
        scrollbar: {
          verticalScrollbarSize: 8,
          horizontalScrollbarSize: 8,
          useShadows: false,
        },
      }}
    />
  );
};

export default MonacoInstance;
