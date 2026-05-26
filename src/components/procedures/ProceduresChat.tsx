"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { Send, Loader2, ThumbsUp, ThumbsDown, RotateCcw, Sparkles, ChevronDown } from "lucide-react"

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  sources?: string[]
  feedback?: "up" | "down" | null
  isLoading?: boolean
}

const SUGGESTED_QUESTIONS = [
  "¿Qué es el framework NURC y cómo se aplica?",
  "¿Cómo defender la comisión del 3%?",
  "¿Cuál es el plan semanal 40-5-5-1?",
  "¿Cómo preparar un muestreo profesional?",
  "¿Qué es home staging y cuáles son sus 4 pasos?",
  "¿Cómo hacer una tasación con la Tabla del Tres?",
  "¿Qué es la base de relaciones 5-50-100?",
  "¿Cómo manejar un cliente sin urgencia?",
]

function formatMarkdown(text: string): string {
  // Convert markdown to basic HTML safely
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/^### (.*?)$/gm, '<h3 class="text-sm font-bold text-text-primary mt-3 mb-1">$1</h3>')
    .replace(/^## (.*?)$/gm, '<h2 class="text-sm font-bold text-text-primary mt-4 mb-1.5">$1</h2>')
    .replace(/^- (.*?)$/gm, '<li class="ml-4 list-disc text-text-secondary">$1</li>')
    .replace(/^(\d+)\. (.*?)$/gm, '<li class="ml-4 list-decimal text-text-secondary">$2</li>')
    .replace(/📖.*?$/gm, '') // Strip any source lines
    .replace(/\n\n/g, '</p><p class="mt-2">')
    .replace(/\n/g, '<br/>')
}

export function ProceduresChat() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  const sendMessage = useCallback(async (question: string) => {
    if (!question.trim() || isLoading) return

    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: question.trim(),
    }

    const loadingMsg: Message = {
      id: (Date.now() + 1).toString(),
      role: "assistant",
      content: "",
      isLoading: true,
    }

    setMessages(prev => [...prev, userMsg, loadingMsg])
    setInput("")
    setShowSuggestions(false)
    setIsLoading(true)

    try {
      // Build history for context (last 8 messages, excluding loading)
      const history = messages
        .filter(m => !m.isLoading)
        .slice(-8)
        .map(m => ({ role: m.role, content: m.content }))

      const res = await fetch("/api/procedures/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: question.trim(), history }),
      })

      const data = await res.json()

      if (!res.ok) throw new Error(data.error || "Error desconocido")

      setMessages(prev =>
        prev.map(m =>
          m.id === loadingMsg.id
            ? { ...m, content: data.answer, sources: data.sources, isLoading: false, feedback: null }
            : m
        )
      )
    } catch (err: any) {
      setMessages(prev =>
        prev.map(m =>
          m.id === loadingMsg.id
            ? {
                ...m,
                content: `⚠️ Error al procesar tu consulta: ${err.message}. Intentá de nuevo.`,
                isLoading: false,
              }
            : m
        )
      )
    } finally {
      setIsLoading(false)
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [isLoading, messages])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    sendMessage(input)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      sendMessage(input)
    }
  }

  const handleFeedback = (msgId: string, feedback: "up" | "down") => {
    setMessages(prev =>
      prev.map(m => m.id === msgId ? { ...m, feedback } : m)
    )
  }

  const handleReset = () => {
    setMessages([])
    setShowSuggestions(true)
    setTimeout(() => inputRef.current?.focus(), 100)
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border-subtle shrink-0 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]" />
            <h1 className="text-xl font-bold text-text-primary">Asistente de Procedimientos</h1>
          </div>
          <p className="text-xs text-text-muted">
            Base documental interna · Freire Propiedades · Responde con procedimientos oficiales
          </p>
        </div>
        {messages.length > 0 && (
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs text-text-muted hover:text-text-primary hover:bg-surface-overlay transition-colors cursor-pointer"
          >
            <RotateCcw size={13} />
            Nueva consulta
          </button>
        )}
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-4 min-h-0">

        {/* Empty state + suggestions */}
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center min-h-[40vh] text-center px-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500/20 to-violet-500/20 border border-border-default flex items-center justify-center mb-4">
              <Sparkles size={28} className="text-blue-400" strokeWidth={1.5} />
            </div>
            <h2 className="text-lg font-bold text-text-primary mb-2">¿Qué querés consultar?</h2>
            <p className="text-sm text-text-muted max-w-md mb-8">
              Preguntá sobre prospección, captación, tasación, negociación, objeciones y cualquier procedimiento de la empresa.
            </p>

            {showSuggestions && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-2xl">
                {SUGGESTED_QUESTIONS.map((q, i) => (
                  <button
                    key={i}
                    onClick={() => sendMessage(q)}
                    className="text-left px-4 py-3 rounded-xl border border-border-default bg-surface-overlay hover:bg-surface-overlay hover:border-blue-500/30 text-sm text-text-secondary hover:text-text-primary transition-all duration-200 cursor-pointer group"
                  >
                    <span className="text-blue-500 mr-2 group-hover:text-blue-400">→</span>
                    {q}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Messages */}
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            {msg.role === "assistant" && (
              <div className="mr-2 mt-1 shrink-0">
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500/30 to-violet-500/30 border border-border-default flex items-center justify-center">
                  <Sparkles size={13} className="text-blue-400" />
                </div>
              </div>
            )}

            <div className={`max-w-[85%] sm:max-w-[75%] ${msg.role === "user" ? "order-1" : ""}`}>
              {/* Bubble */}
              <div className={`rounded-2xl px-4 py-3 ${
                msg.role === "user"
                  ? "bg-blue-600 text-white rounded-tr-sm"
                  : "bg-surface-overlay border border-border-default text-text-primary rounded-tl-sm"
              }`}>
                {msg.isLoading ? (
                  <div className="flex items-center gap-2 py-1">
                    <Loader2 size={14} className="animate-spin text-text-muted" />
                    <span className="text-xs text-text-muted">Buscando en procedimientos...</span>
                  </div>
                ) : msg.role === "user" ? (
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                ) : (
                  <div
                    className="text-sm leading-relaxed prose-invert max-w-none"
                    dangerouslySetInnerHTML={{ __html: formatMarkdown(msg.content) }}
                  />
                )}
              </div>

              {/* Feedback (assistant only, not loading) */}
              {msg.role === "assistant" && !msg.isLoading && (
                <div className="flex items-center justify-end gap-1 mt-1.5 px-1">
                  <button
                    onClick={() => handleFeedback(msg.id, "up")}
                    className={`p-1 rounded-lg transition-colors cursor-pointer ${
                      msg.feedback === "up"
                        ? "text-emerald-400 bg-emerald-500/10"
                        : "text-zinc-700 hover:text-text-secondary hover:bg-surface-overlay"
                    }`}
                    title="Respuesta útil"
                  >
                    <ThumbsUp size={12} />
                  </button>
                  <button
                    onClick={() => handleFeedback(msg.id, "down")}
                    className={`p-1 rounded-lg transition-colors cursor-pointer ${
                      msg.feedback === "down"
                        ? "text-red-400 bg-red-500/10"
                        : "text-zinc-700 hover:text-text-secondary hover:bg-surface-overlay"
                    }`}
                    title="Respuesta incorrecta"
                  >
                    <ThumbsDown size={12} />
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggestions pill when there are messages */}
      {messages.length > 0 && !isLoading && (
        <div className="px-6 pb-2 shrink-0">
          <button
            onClick={() => setShowSuggestions(prev => !prev)}
            className="flex items-center gap-1 text-xs md:text-[11px] text-text-muted hover:text-text-secondary transition-colors cursor-pointer"
          >
            <ChevronDown size={12} className={`transition-transform ${showSuggestions ? "rotate-180" : ""}`} />
            Preguntas sugeridas
          </button>
          {showSuggestions && (
            <div className="flex gap-2 flex-wrap mt-2">
              {SUGGESTED_QUESTIONS.slice(0, 4).map((q, i) => (
                <button
                  key={i}
                  onClick={() => { sendMessage(q); setShowSuggestions(false) }}
                  className="text-xs md:text-[11px] text-text-muted hover:text-text-primary border border-border-subtle hover:border-blue-500/30 px-2.5 py-1 rounded-full transition-all cursor-pointer hover:bg-blue-500/5"
                >
                  {q.slice(0, 40)}...
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Input */}
      <div className="px-4 sm:px-6 pb-4 pt-2 border-t border-border-subtle shrink-0">
        <form onSubmit={handleSubmit} className="relative">
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Preguntá sobre prospección, captación, negociación, objeciones..."
            rows={1}
            disabled={isLoading}
            className="w-full bg-surface-overlay border border-border-default rounded-2xl pl-4 pr-14 py-3.5 text-sm text-text-primary placeholder-zinc-600 focus:outline-none focus:border-blue-500/50 focus:bg-surface-overlay transition-all resize-none disabled:opacity-50 leading-relaxed"
            style={{ minHeight: "52px", maxHeight: "140px" }}
            onInput={e => {
              const el = e.currentTarget
              el.style.height = "auto"
              el.style.height = Math.min(el.scrollHeight, 140) + "px"
            }}
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-all cursor-pointer active:scale-95"
          >
            {isLoading
              ? <Loader2 size={14} className="animate-spin text-white" />
              : <Send size={14} className="text-white" />
            }
          </button>
        </form>
        <p className="text-xs md:text-[10px] text-zinc-700 mt-2 text-center">
          Respuestas basadas exclusivamente en la documentación interna · Enter para enviar · Shift+Enter para nueva línea
        </p>
      </div>
    </div>
  )
}
