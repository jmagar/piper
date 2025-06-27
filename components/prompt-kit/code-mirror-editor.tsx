"use client"

import { useEffect, useRef } from 'react'
import { EditorView, basicSetup } from 'codemirror'
import { EditorState } from '@codemirror/state'
import { keymap } from '@codemirror/view'
import { oneDark } from '@codemirror/theme-one-dark'
import { markdown } from '@codemirror/lang-markdown'
import { javascript } from '@codemirror/lang-javascript'
import { python } from '@codemirror/lang-python'
import { json } from '@codemirror/lang-json'
import { useTheme } from 'next-themes'

interface CodeMirrorEditorProps {
  value: string
  onChange: (value: string) => void
  onSave?: () => void
  onCancel?: () => void
  language?: string
  className?: string
}

const getLanguageExtension = (language: string) => {
  switch (language.toLowerCase()) {
    case 'markdown':
    case 'md':
      return [markdown()]
    case 'javascript':
    case 'js':
    case 'jsx':
      return [javascript({ jsx: true })]
    case 'typescript':
    case 'ts':
    case 'tsx':
      return [javascript({ typescript: true, jsx: true })]
    case 'python':
    case 'py':
      return [python()]
    case 'json':
      return [json()]
    default:
      return []
  }
}

export function CodeMirrorEditor({ value, onChange, onSave, onCancel, language = 'markdown', className }: CodeMirrorEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<EditorView | null>(null)
  const { theme } = useTheme()

  useEffect(() => {
    if (!editorRef.current) return

    // Clear the editor container
    editorRef.current.innerHTML = ''

    const languageExtensions = getLanguageExtension(language)
    
    const extensions = [
      basicSetup,
      ...languageExtensions,
      EditorView.updateListener.of((update) => {
        if (update.docChanged) {
          onChange(update.state.doc.toString())
        }
      }),
      keymap.of([
        {
          key: 'Escape',
          run: () => {
            onCancel?.()
            return true
          }
        },
        {
          key: 'Ctrl-s',
          run: () => {
            onSave?.()
            return true
          }
        },
        {
          key: 'Cmd-s',
          run: () => {
            onSave?.()
            return true
          }
        }
      ]),
      EditorView.theme({
        '&': {
          fontSize: '0.9rem',
          fontFamily: 'var(--font-geist-mono), "JetBrains Mono", "Fira Code", monospace',
        },
        '.cm-content': {
          padding: '1.25rem 1.5rem',
          lineHeight: '1.7',
          minHeight: '200px',
        },
        '.cm-focused': {
          outline: 'none',
        },
        '.cm-editor': {
          borderRadius: '0.5rem',
        },
        '.cm-scroller': {
          fontFamily: 'inherit',
        },
      }),
      ...(theme === 'dark' ? [oneDark] : [])
    ]

    const state = EditorState.create({
      doc: value,
      extensions,
    })

    const view = new EditorView({
      state,
      parent: editorRef.current,
    })

    viewRef.current = view

    return () => {
      if (viewRef.current) {
        viewRef.current.destroy()
        viewRef.current = null
      }
    }
  }, [theme, language, onSave, onCancel])

  useEffect(() => {
    if (viewRef.current && viewRef.current.state.doc.toString() !== value) {
      viewRef.current.dispatch({
        changes: {
          from: 0,
          to: viewRef.current.state.doc.length,
          insert: value,
        },
      })
    }
  }, [value, onChange])

  return <div ref={editorRef} className={className} />
} 