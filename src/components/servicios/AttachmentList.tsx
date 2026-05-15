"use client"

import { useRef } from "react"
import { Paperclip, X, FileText, Image, File } from "lucide-react"
import type { Attachment } from "@/lib/stores/serviciosStore"

interface AttachmentListProps {
  attachments: Attachment[]
  onChange: (attachments: Attachment[]) => void
  readonly?: boolean
}

function fileIcon(type: Attachment["type"]) {
  if (type === "image") return <Image size={14} className="text-blue-400" />
  if (type === "pdf") return <FileText size={14} className="text-red-400" />
  return <File size={14} className="text-zinc-400" />
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes}B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)}KB`
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`
}

export function AttachmentList({ attachments, onChange, readonly = false }: AttachmentListProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFiles = (files: FileList | null) => {
    if (!files) return
    Array.from(files).forEach((file) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string
        const type: Attachment["type"] =
          file.type.startsWith("image/") ? "image" :
          file.type === "application/pdf" ? "pdf" : "doc"
        const att: Attachment = {
          id: crypto.randomUUID(),
          name: file.name,
          type,
          dataUrl,
          size: file.size,
          uploadedAt: new Date().toISOString(),
        }
        onChange([...attachments, att])
      }
      reader.readAsDataURL(file)
    })
  }

  const remove = (id: string) => onChange(attachments.filter((a) => a.id !== id))

  return (
    <div className="space-y-2">
      {attachments.map((att) => (
        <div key={att.id} className="flex items-center gap-2 p-2 rounded-xl bg-white/[0.03] border border-white/[0.06] group">
          <div className="shrink-0">{fileIcon(att.type)}</div>
          {att.type === "image" ? (
            <a href={att.dataUrl} target="_blank" rel="noreferrer" className="flex-1 min-w-0">
              <img src={att.dataUrl} alt={att.name} className="h-8 w-auto rounded object-cover max-w-[80px]" />
            </a>
          ) : (
            <a href={att.dataUrl} target="_blank" rel="noreferrer" className="flex-1 min-w-0 text-xs text-zinc-300 hover:text-zinc-100 truncate">
              {att.name}
            </a>
          )}
          <span className="text-xs text-zinc-600 shrink-0">{formatSize(att.size)}</span>
          {!readonly && (
            <button
              type="button"
              onClick={() => remove(att.id)}
              className="text-zinc-600 hover:text-zinc-400 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X size={12} />
            </button>
          )}
        </div>
      ))}

      {!readonly && (
        <>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="flex items-center gap-2 text-xs text-zinc-500 hover:text-zinc-300 transition-colors py-1"
          >
            <Paperclip size={12} />
            Adjuntar archivo
          </button>
          <input
            ref={inputRef}
            type="file"
            multiple
            accept="image/*,.pdf,.doc,.docx"
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />
        </>
      )}
    </div>
  )
}
