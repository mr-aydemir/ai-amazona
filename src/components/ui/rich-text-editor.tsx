"use client"

import dynamic from 'next/dynamic'
import { useTheme } from 'next-themes'
import 'react-quill-new/dist/quill.snow.css'
import { Skeleton } from './skeleton'

const ReactQuill = dynamic(() => import('react-quill-new'), {
  ssr: false,
  loading: () => <Skeleton className="h-[200px] w-full" />,
})

interface RichTextEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}

const modules = {
  toolbar: [
    [{ header: [1, 2, 3, 4, 5, 6, false] }],
    ['bold', 'italic', 'underline', 'strike', 'blockquote'],
    [{ list: 'ordered' }, { list: 'bullet' }, { indent: '-1' }, { indent: '+1' }],
    ['link'],
    ['clean'],
  ],
}

const formats = [
  'header',
  'bold',
  'italic',
  'underline',
  'strike',
  'blockquote',
  'list',
  'bullet',
  'indent',
  'link',
]

export function RichTextEditor({ value, onChange, placeholder, className }: RichTextEditorProps) {
  const { theme } = useTheme()

  return (
    <div className={`rich-text-editor-wrapper ${className} ${theme === 'dark' ? 'dark-mode' : ''}`}>
      <ReactQuill
        theme="snow"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        modules={modules}
        formats={formats}
      />
      <style jsx global>{`
        .rich-text-editor-wrapper .ql-toolbar {
          border-top-left-radius: 0.5rem;
          border-top-right-radius: 0.5rem;
          background: hsl(var(--background));
          border-color: hsl(var(--input));
        }
        .rich-text-editor-wrapper .ql-container {
          border-bottom-left-radius: 0.5rem;
          border-bottom-right-radius: 0.5rem;
          background: hsl(var(--background));
          border-color: hsl(var(--input));
          min-height: 150px;
          font-family: inherit;
        }
        .rich-text-editor-wrapper .ql-editor {
          min-height: 150px;
          color: hsl(var(--foreground));
        }
        .rich-text-editor-wrapper.dark-mode .ql-toolbar .ql-stroke {
          stroke: hsl(var(--foreground));
        }
        .rich-text-editor-wrapper.dark-mode .ql-toolbar .ql-fill {
          fill: hsl(var(--foreground));
        }
        .rich-text-editor-wrapper.dark-mode .ql-toolbar .ql-picker {
          color: hsl(var(--foreground));
        }
      `}</style>
    </div>
  )
}
