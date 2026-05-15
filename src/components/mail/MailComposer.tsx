"use client"

import { useState, useRef } from "react"
import { X, Send, Paperclip, ChevronDown, Loader2, AlertCircle } from "lucide-react"
import { useMail } from "@/lib/mail/MailContext"

interface MailComposerProps {
  onClose: () => void
  replyTo?: {
    subject: string
    from: string
    messageId?: string
  }
}

function EmailInput({ value, onChange, placeholder }: { value: string, onChange: (v: string) => void, placeholder: string }) {
  const [input, setInput] = useState("")
  const emails = value ? value.split(',').map(e => e.trim()).filter(Boolean) : []

  const addEmail = (e: string) => {
    const newEmail = e.trim()
    if (!newEmail || emails.includes(newEmail)) return
    onChange([...emails, newEmail].join(', '))
    setInput("")
  }

  const removeEmail = (index: number) => {
    const newEmails = [...emails]
    newEmails.splice(index, 1)
    onChange(newEmails.join(', '))
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ' ' || e.key === ',') {
      e.preventDefault()
      addEmail(input)
    } else if (e.key === 'Backspace' && !input && emails.length > 0) {
      removeEmail(emails.length - 1)
    }
  }

  return (
    <div className="flex-1 flex flex-wrap gap-1.5 items-center py-1">
      {emails.map((email, i) => (
        <span key={i} className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-400 border border-blue-500/20 text-xs">
          {email}
          <button type="button" onClick={() => removeEmail(i)} className="hover:text-blue-300">
            <X size={10} />
          </button>
        </span>
      ))}
      <input
        type="text"
        value={input}
        onChange={e => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => addEmail(input)}
        placeholder={emails.length === 0 ? placeholder : ""}
        className="flex-1 min-w-[120px] bg-transparent text-sm text-shell-text placeholder-zinc-600 outline-none"
      />
    </div>
  )
}

export function MailComposer({ onClose, replyTo }: MailComposerProps) {
  const { credentials } = useMail()
  const [to, setTo] = useState(replyTo?.from ?? "")
  const [cc, setCc] = useState("")
  const [bcc, setBcc] = useState("")
  const [subject, setSubject] = useState(replyTo ? `Re: ${replyTo.subject}` : "")
  const [body, setBody] = useState("")
  const [showCc, setShowCc] = useState(false)
  const [showBcc, setShowBcc] = useState(false)
  const [attachments, setAttachments] = useState<File[]>([])
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setAttachments(prev => [...prev, ...Array.from(e.target.files!)])
    }
  }

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index))
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const handleSend = async () => {
    if (!to || !subject || !body || !credentials) return
    setSending(true)
    setError(null)

    try {
      // Convert attachments to base64
      const attachmentData = await Promise.all(
        attachments.map(async (file) => {
          const buffer = await file.arrayBuffer()
          const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)))
          return {
            filename: file.name,
            content: base64,
            contentType: file.type,
          }
        })
      )

      const res = await fetch("/api/mail/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user: credentials.user,
          pass: credentials.pass,
          to,
          cc: cc || undefined,
          bcc: bcc || undefined,
          subject,
          html: `<div style="font-family: Arial, sans-serif; font-size: 14px; color: #333;">${body.replace(/\n/g, "<br/>")}</div>`,
          text: body,
          attachments: attachmentData,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Error al enviar")
      }

      setSent(true)
      setTimeout(onClose, 1500)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="flex flex-col h-full bg-[#0D0D14] rounded-2xl border border-white/[0.08] overflow-hidden shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-white/[0.03] border-b border-white/[0.06] shrink-0">
        <h3 className="text-sm font-semibold text-shell-text">
          {replyTo ? "Responder correo" : "Nuevo mensaje"}
        </h3>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg hover:bg-white/[0.06] text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer"
        >
          <X size={16} />
        </button>
      </div>

      {/* Fields */}
      <div className="divide-y divide-white/[0.04] shrink-0">
        {/* From */}
        <div className="flex items-center gap-3 px-4 py-2.5">
          <span className="text-[11px] font-medium text-zinc-500 w-14 shrink-0 uppercase tracking-wider mt-1.5">De</span>
          <span className="text-sm text-zinc-400 truncate py-1">{credentials?.user}</span>
        </div>

        {/* To */}
        <div className="flex items-start gap-3 px-4 py-1.5 min-h-[44px]">
          <span className="text-[11px] font-medium text-zinc-500 w-14 shrink-0 uppercase tracking-wider mt-2.5">Para</span>
          <EmailInput value={to} onChange={setTo} placeholder="destinatario@ejemplo.com" />
          <div className="flex gap-2 shrink-0 mt-2">
            <button onClick={() => setShowCc(!showCc)} className="text-[11px] text-zinc-600 hover:text-zinc-400 transition-colors">Cc</button>
            <button onClick={() => setShowBcc(!showBcc)} className="text-[11px] text-zinc-600 hover:text-zinc-400 transition-colors">Cco</button>
          </div>
        </div>

        {/* CC */}
        {showCc && (
          <div className="flex items-start gap-3 px-4 py-1.5 min-h-[44px]">
            <span className="text-[11px] font-medium text-zinc-500 w-14 shrink-0 uppercase tracking-wider mt-2.5">Cc</span>
            <EmailInput value={cc} onChange={setCc} placeholder="copia a..." />
          </div>
        )}

        {/* BCC */}
        {showBcc && (
          <div className="flex items-start gap-3 px-4 py-1.5 min-h-[44px]">
            <span className="text-[11px] font-medium text-zinc-500 w-14 shrink-0 uppercase tracking-wider mt-2.5">Cco</span>
            <EmailInput value={bcc} onChange={setBcc} placeholder="copia oculta a..." />
          </div>
        )}

        {/* Subject */}
        <div className="flex items-center gap-3 px-4 py-2.5">
          <span className="text-[11px] font-medium text-zinc-500 w-14 shrink-0 uppercase tracking-wider">Asunto</span>
          <input
            type="text"
            value={subject}
            onChange={e => setSubject(e.target.value)}
            placeholder="Asunto del correo"
            className="flex-1 bg-transparent text-sm text-shell-text placeholder-zinc-600 outline-none"
          />
        </div>
      </div>

      {/* Body */}
      <textarea
        value={body}
        onChange={e => setBody(e.target.value)}
        placeholder="Escribí tu mensaje..."
        className="flex-1 bg-transparent text-sm text-shell-text placeholder-zinc-600 outline-none resize-none px-4 py-4 leading-relaxed"
      />

      {/* Attachments */}
      {attachments.length > 0 && (
        <div className="px-4 py-2 flex flex-wrap gap-2 border-t border-white/[0.04] shrink-0">
          {attachments.map((file, i) => (
            <div key={i} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/[0.04] border border-white/[0.06] text-[11px] text-zinc-400">
              <Paperclip size={11} />
              <span className="max-w-[120px] truncate">{file.name}</span>
              <span className="text-zinc-600">({formatFileSize(file.size)})</span>
              <button onClick={() => removeAttachment(i)} className="text-zinc-600 hover:text-red-400 transition-colors cursor-pointer">
                <X size={11} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mx-4 mb-2 flex items-start gap-2 p-2.5 rounded-xl bg-red-500/10 border border-red-500/20 shrink-0">
          <AlertCircle size={13} className="text-red-400 shrink-0 mt-0.5" />
          <p className="text-[11px] text-red-300">{error}</p>
        </div>
      )}

      {/* Footer Toolbar */}
      <div className="flex items-center gap-2 px-4 py-3 border-t border-white/[0.06] bg-white/[0.02] shrink-0">
        <button
          onClick={handleSend}
          disabled={sending || sent || !to || !subject || !body}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-semibold transition-colors"
        >
          {sending ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
          {sent ? "¡Enviado!" : sending ? "Enviando..." : "Enviar"}
        </button>

        <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFileChange} />
        <button
          onClick={() => fileInputRef.current?.click()}
          className="p-2 rounded-xl hover:bg-white/[0.06] text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer"
          title="Adjuntar archivo"
        >
          <Paperclip size={15} />
        </button>
      </div>
    </div>
  )
}
