import path, { resolve } from 'path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'
import monacoEditorPlugin from 'vite-plugin-monaco-editor'

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin({ exclude: ['electron-store'] })]
  },
  preload: {
    plugins: [externalizeDepsPlugin()]
  },
  renderer: {
    resolve: {
      alias: {
        '@renderer': resolve('src/renderer/src'),
        '@shared': resolve('src/shared')
      }
    },
    plugins: [
      react(),
      (typeof monacoEditorPlugin === 'function'
        ? monacoEditorPlugin
        : (monacoEditorPlugin as any).default)({
        languageWorkers: ['editorWorkerService', 'json', 'css', 'html', 'typescript'],
        customDistPath: (_root, outDir, _base) => {
          return path.join(outDir, 'monacoeditorwork')
        }
      })
    ]
  }
})
