"use client"

import { useState, useEffect, useCallback } from "react"
import {
  Inbox, Send, Trash2, Star, File, RefreshCw, Pencil,
  LogOut, Loader2, AlertCircle, Paperclip, Reply, ArrowLeft, Mail,
  Archive, ShieldAlert, MailOpen, MailCheck, FolderInput, MoreHorizontal, CheckSquare, Square,
  Menu, Search, X, ChevronDown, ChevronUp, UserCircle, Edit2
} from "lucide-react"
import { useMail } from "@/lib/mail/MailContext"
import { MailComposer } from "./MailComposer"
import { format, isToday, isYesterday, isThisYear } from "date-fns"
import { es } from "date-fns/locale"

// ── Types ──────────────────────────────────────────────────────────────
interface MailMessage {
  uid: number
  seq: number
  flags: string[]
  date: string
  subject: string
  from: { name?: string; address?: string }[]
  to: { name?: string; address?: string }[]
  messageId?: string
}

interface FullMessage extends MailMessage {
  html?: string
  text?: string
  cc?: { name?: string; address?: string }[]
  attachments: { filename: string; contentType: string; size: number; content: string }[]
}

const FOLDERS = [
  { id: "INBOX", label: "Entrada", icon: Inbox },
  { id: "Sent", label: "Enviados", icon: Send },
  { id: "Trash", label: "Papelera", icon: Trash2 },
  { id: "Drafts", label: "Borradores", icon: File },
  { id: "Junk", label: "Spam", icon: Star },
]

// ── Helpers ─────────────────────────────────────────────────────────────
function formatDate(dateStr: string) {
  try {
    const d = new Date(dateStr)
    if (isToday(d)) return format(d, "HH:mm")
    if (isYesterday(d)) return "Ayer"
    if (isThisYear(d)) return format(d, "d MMM", { locale: es })
    return format(d, "d/M/yy")
  } catch {
    return ""
  }
}

function getSenderName(from: MailMessage["from"]) {
  if (!from || from.length === 0) return "Desconocido"
  const f = from[0]
  return f.name || f.address || "Desconocido"
}

function isUnread(flags: string[]) {
  return !flags.includes("\\Seen")
}

// ── MailApp Component ────────────────────────────────────────────────────
export function MailApp() {
  const { credentials, logoutMail } = useMail()

  const [activeFolder, setActiveFolder] = useState("INBOX")
  const [messages, setMessages] = useState<MailMessage[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [msgError, setMsgError] = useState<string | null>(null)

  const [selectedMsg, setSelectedMsg] = useState<FullMessage | null>(null)
  const [loadingMsg, setLoadingMsg] = useState(false)

  const [showComposer, setShowComposer] = useState(false)
  const [replyData, setReplyData] = useState<{ subject: string; from: string; messageId?: string } | undefined>()

  // Selection state for bulk actions
  const [selectedUids, setSelectedUids] = useState<Set<number>>(new Set())
  const [actionLoading, setActionLoading] = useState(false)
  const [showMoveMenu, setShowMoveMenu] = useState(false)

  // Profile & UI state
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [showProfileMenu, setShowProfileMenu] = useState(false)
  const [isEditingName, setIsEditingName] = useState(false)
  const [realName, setRealName] = useState("")
  const [tempName, setTempName] = useState("")

  // Resolve agent name
  useEffect(() => {
    if (!credentials) return
    const emailLower = credentials.user.toLowerCase()
    const custom = localStorage.getItem(`freire_sender_name_${emailLower}`)
    if (custom) {
      setRealName(custom)
      setTempName(custom)
      return
    }

    const fallback = emailLower.split("@")[0].split(".").map(p => p[0].toUpperCase() + p.slice(1)).join(" ")
    setRealName(fallback)
    setTempName(fallback)

    fetch("/api/mail/agents")
      .then(r => r.json())
      .then(d => {
        if (d.agents && d.agents[emailLower] && !localStorage.getItem(`freire_sender_name_${emailLower}`)) {
          setRealName(d.agents[emailLower])
          setTempName(d.agents[emailLower])
        }
      })
      .catch(console.error)
  }, [credentials])

  const saveSenderName = (e: React.FormEvent) => {
    e.preventDefault()
    if (!credentials || !tempName.trim()) return
    const emailLower = credentials.user.toLowerCase()
    localStorage.setItem(`freire_sender_name_${emailLower}`, tempName.trim())
    setRealName(tempName.trim())
    setIsEditingName(false)
  }

  const toggleSelect = (uid: number) => {
    setSelectedUids(prev => {
      const next = new Set(prev)
      if (next.has(uid)) next.delete(uid)
      else next.add(uid)
      return next
    })
  }

  const selectAll = () => {
    if (selectedUids.size === messages.length) setSelectedUids(new Set())
    else setSelectedUids(new Set(messages.map(m => m.uid)))
  }

  // ── Bulk action ──
  const runAction = async (action: string, target?: string) => {
    if (!credentials || selectedUids.size === 0) return
    setActionLoading(true)
    try {
      const res = await fetch("/api/mail/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user: credentials.user, pass: credentials.pass,
          folder: activeFolder, uids: Array.from(selectedUids), action, target,
        }),
      })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error) }
      setSelectedUids(new Set())
      setShowMoveMenu(false)
      await loadMessages(activeFolder, page)
    } catch (err: any) {
      console.error("Action error:", err)
    } finally {
      setActionLoading(false)
    }
  }

  // ── Load messages ──
  const loadMessages = useCallback(async (folder = activeFolder, p = 1) => {
    if (!credentials) return
    setLoadingMessages(true)
    setMsgError(null)
    setSelectedUids(new Set())
    try {
      const res = await fetch("/api/mail/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user: credentials.user, pass: credentials.pass, folder, page: p, limit: 25 }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setMessages(data.messages || [])
      setTotal(data.total || 0)
    } catch (err: any) {
      setMsgError(err.message || "Error cargando mensajes")
    } finally {
      setLoadingMessages(false)
    }
  }, [credentials, activeFolder])

  useEffect(() => { loadMessages(activeFolder, 1) }, [activeFolder])

  // ── Load full message ──
  const openMessage = async (msg: MailMessage) => {
    if (!credentials || selectedUids.size > 0) return
    setSelectedMsg(null)
    setLoadingMsg(true)
    try {
      const res = await fetch("/api/mail/read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user: credentials.user, pass: credentials.pass, folder: activeFolder, uid: msg.uid }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setSelectedMsg(data)
    } catch (err: any) {
      console.error("Error opening message:", err)
    } finally {
      setLoadingMsg(false)
    }
  }

  const handleReply = () => {
    if (!selectedMsg) return
    setReplyData({
      subject: selectedMsg.subject,
      from: selectedMsg.from?.[0]?.address || "",
      messageId: selectedMsg.messageId,
    })
    setShowComposer(true)
  }

  const handleCompose = () => {
    setReplyData(undefined)
    setShowComposer(true)
  }

  // Mobile FAB fab:new-email → open composer for fresh email.
  useEffect(() => {
    window.addEventListener("fab:new-email", handleCompose)
    return () => window.removeEventListener("fab:new-email", handleCompose)
  }, [])

  return (
    <div className="flex h-full min-h-0 overflow-hidden">
      {/* ── Sidebar ── */}
      <aside className="hidden lg:flex flex-col w-52 shrink-0 border-r border-white/[0.06] bg-white/[0.01] py-4">
        {/* Compose */}
        <div className="px-3 mb-4">
          <button
            onClick={handleCompose}
            className="w-full flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold transition-colors cursor-pointer"
          >
            <Pencil size={14} />
            Redactar
          </button>
        </div>

        {/* Folders */}
        <nav className="flex-1 px-2 space-y-0.5 overflow-y-auto">
          {FOLDERS.map(f => (
            <button
              key={f.id}
              onClick={() => { setActiveFolder(f.id); setPage(1); setSelectedMsg(null) }}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium transition-all cursor-pointer ${
                activeFolder === f.id
                  ? "bg-blue-500/10 text-blue-400"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04]"
              }`}
            >
              <f.icon size={15} strokeWidth={1.8} />
              {f.label}
            </button>
          ))}
        </nav>

        {/* Account + Profile Menu */}
        <div className="mt-auto shrink-0 border-t border-white/[0.06] relative">
          <button 
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="w-full flex items-center justify-between p-3 hover:bg-white/[0.03] transition-colors cursor-pointer group"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-sm shrink-0">
                {realName ? realName[0].toUpperCase() : <UserCircle size={18} />}
              </div>
              <div className="text-left min-w-0 flex-1">
                <p className="text-sm font-semibold text-zinc-200 truncate leading-tight mb-0.5">{realName}</p>
                <p className="text-xs md:text-[10px] text-zinc-500 truncate leading-tight">{credentials?.user}</p>
              </div>
            </div>
            {showProfileMenu ? <ChevronDown size={14} className="text-zinc-500" /> : <ChevronUp size={14} className="text-zinc-500" />}
          </button>

          {/* Profile Dropdown */}
          {showProfileMenu && (
            <div className="absolute bottom-full left-2 right-2 mb-2 bg-[#1c1c26] border border-white/[0.1] rounded-xl shadow-2xl overflow-hidden z-50">
              {isEditingName ? (
                <form onSubmit={saveSenderName} className="p-3 border-b border-white/[0.06]">
                  <label className="text-xs md:text-[10px] font-medium text-zinc-500 uppercase mb-1.5 block">Personalizar remitente</label>
                  <input 
                    type="text" 
                    value={tempName}
                    onChange={e => setTempName(e.target.value)}
                    className="w-full bg-black/20 border border-white/[0.08] rounded-lg px-2.5 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-blue-500"
                    placeholder="Tu nombre completo"
                    autoFocus
                  />
                  <div className="flex gap-2 mt-2">
                    <button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-500 text-white text-xs md:text-[10px] py-1 rounded cursor-pointer transition-colors">Guardar</button>
                    <button type="button" onClick={() => { setIsEditingName(false); setTempName(realName) }} className="flex-1 bg-white/[0.06] hover:bg-white/[0.1] text-zinc-300 text-xs md:text-[10px] py-1 rounded cursor-pointer transition-colors">Cancelar</button>
                  </div>
                </form>
              ) : (
                <button 
                  onClick={() => setIsEditingName(true)}
                  className="w-full flex items-center gap-2 px-3 py-2.5 text-xs text-zinc-300 hover:bg-white/[0.04] transition-colors cursor-pointer text-left"
                >
                  <Edit2 size={13} className="text-zinc-500" />
                  Personalizar remitente
                </button>
              )}
              
              {!isEditingName && (
                <button
                  onClick={logoutMail}
                  className="w-full flex items-center gap-2 px-3 py-2.5 text-xs text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer text-left border-t border-white/[0.06]"
                >
                  <LogOut size={13} />
                  Cerrar sesión de correo
                </button>
              )}
            </div>
          )}
        </div>
      </aside>

      {/* ── Mobile Drawer Overlay ── */}
      {isDrawerOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-[100] lg:hidden"
          onClick={() => setIsDrawerOpen(false)}
        />
      )}

      {/* ── Mobile Drawer ── */}
      <div className={`fixed inset-y-0 left-0 w-72 bg-[#12121a] border-r border-white/[0.06] z-[110] transform transition-transform duration-300 lg:hidden flex flex-col ${isDrawerOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="px-5 py-5 border-b border-white/[0.06] flex items-center justify-between shrink-0">
          <h2 className="text-lg font-bold text-shell-text">Freire Correo</h2>
          <button onClick={() => setIsDrawerOpen(false)} className="p-1 rounded-lg hover:bg-white/[0.06] text-zinc-400 cursor-pointer">
            <X size={18} />
          </button>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {FOLDERS.map(f => (
            <button
              key={f.id}
              onClick={() => { setActiveFolder(f.id); setPage(1); setSelectedMsg(null); setIsDrawerOpen(false) }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all cursor-pointer ${
                activeFolder === f.id
                  ? "bg-blue-500/10 text-blue-400"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04]"
              }`}
            >
              <f.icon size={18} strokeWidth={1.8} />
              {f.label}
            </button>
          ))}
        </nav>
        
        {/* Mobile Profile */}
        <div className="mt-auto shrink-0 border-t border-white/[0.06] relative">
          <button 
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="w-full flex items-center justify-between p-4 hover:bg-white/[0.03] transition-colors cursor-pointer group"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-lg shrink-0">
                {realName ? realName[0].toUpperCase() : <UserCircle size={20} />}
              </div>
              <div className="text-left min-w-0 flex-1">
                <p className="text-base font-semibold text-zinc-200 truncate leading-tight mb-0.5">{realName}</p>
                <p className="text-xs text-zinc-500 truncate leading-tight">{credentials?.user}</p>
              </div>
            </div>
            {showProfileMenu ? <ChevronDown size={18} className="text-zinc-500" /> : <ChevronUp size={18} className="text-zinc-500" />}
          </button>

          {/* Mobile Profile Dropdown */}
          {showProfileMenu && (
            <div className="absolute bottom-[calc(100%-10px)] left-3 right-3 mb-2 bg-[#1c1c26] border border-white/[0.1] rounded-2xl shadow-2xl overflow-hidden z-50">
              {isEditingName ? (
                <form onSubmit={saveSenderName} className="p-4 border-b border-white/[0.06]">
                  <label className="text-xs font-medium text-zinc-500 uppercase mb-2 block">Personalizar remitente</label>
                  <input 
                    type="text" 
                    value={tempName}
                    onChange={e => setTempName(e.target.value)}
                    className="w-full bg-black/20 border border-white/[0.08] rounded-xl px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-blue-500"
                    placeholder="Tu nombre completo"
                    autoFocus
                  />
                  <div className="flex gap-2 mt-3">
                    <button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-500 text-white text-xs py-2 rounded-lg cursor-pointer transition-colors font-medium">Guardar</button>
                    <button type="button" onClick={() => { setIsEditingName(false); setTempName(realName) }} className="flex-1 bg-white/[0.06] hover:bg-white/[0.1] text-zinc-300 text-xs py-2 rounded-lg cursor-pointer transition-colors font-medium">Cancelar</button>
                  </div>
                </form>
              ) : (
                <button 
                  onClick={() => setIsEditingName(true)}
                  className="w-full flex items-center gap-3 px-4 py-4 text-sm text-zinc-300 hover:bg-white/[0.04] transition-colors cursor-pointer text-left"
                >
                  <Edit2 size={16} className="text-zinc-500" />
                  Personalizar remitente
                </button>
              )}
              
              {!isEditingName && (
                <button
                  onClick={logoutMail}
                  className="w-full flex items-center gap-3 px-4 py-4 text-sm text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer text-left border-t border-white/[0.06]"
                >
                  <LogOut size={16} />
                  Cerrar sesión de correo
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Message List ── */}
      <div className={`flex flex-col shrink-0 min-h-0 w-full lg:flex-1 relative ${
        selectedMsg ? "hidden lg:flex lg:flex-1" : "flex flex-1"
      }`}>
        
        {/* List header + bulk toolbar */}
        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-white/[0.06] shrink-0 min-h-[48px]">
          <button onClick={() => setIsDrawerOpen(true)} className="lg:hidden p-1 -ml-1 mr-1 rounded-lg hover:bg-white/[0.06] text-zinc-400 cursor-pointer shrink-0">
            <Menu size={20} />
          </button>
          {/* Select all checkbox */}
          <button onClick={selectAll} className="p-1 rounded hover:bg-white/[0.06] text-zinc-500 hover:text-zinc-300 cursor-pointer shrink-0" title="Seleccionar todos">
            {selectedUids.size === messages.length && messages.length > 0
              ? <CheckSquare size={16} />
              : <Square size={16} />
            }
          </button>

          {selectedUids.size > 0 ? (
            /* ── Bulk Action Bar ── */
            <div className="flex items-center gap-1 flex-1 min-w-0">
              <span className="text-xs md:text-[11px] text-zinc-500 mr-1 shrink-0">{selectedUids.size} sel.</span>
              <button onClick={() => runAction("archive")} disabled={actionLoading} className="p-1.5 rounded-lg hover:bg-white/[0.06] text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer" title="Archivar">
                <Archive size={15} />
              </button>
              <button onClick={() => runAction("spam")} disabled={actionLoading} className="p-1.5 rounded-lg hover:bg-white/[0.06] text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer" title="Marcar como spam">
                <ShieldAlert size={15} />
              </button>
              <button onClick={() => runAction("delete")} disabled={actionLoading} className="p-1.5 rounded-lg hover:bg-white/[0.06] text-zinc-500 hover:text-red-400 transition-colors cursor-pointer" title="Eliminar">
                <Trash2 size={15} />
              </button>
              <div className="w-px h-5 bg-white/[0.08] mx-1" />
              <button onClick={() => {
                const anyUnread = messages.filter(m => selectedUids.has(m.uid)).some(m => isUnread(m.flags))
                runAction(anyUnread ? "markRead" : "markUnread")
              }} disabled={actionLoading} className="p-1.5 rounded-lg hover:bg-white/[0.06] text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer" title="Leído / No leído">
                {messages.filter(m => selectedUids.has(m.uid)).some(m => isUnread(m.flags))
                  ? <MailOpen size={15} />
                  : <MailCheck size={15} />
                }
              </button>
              {/* Move to folder */}
              <div className="relative">
                <button onClick={() => setShowMoveMenu(!showMoveMenu)} disabled={actionLoading} className="p-1.5 rounded-lg hover:bg-white/[0.06] text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer" title="Mover a...">
                  <FolderInput size={15} />
                </button>
                {showMoveMenu && (
                  <div className="absolute top-full left-0 mt-1 w-40 bg-[#181820] border border-white/[0.08] rounded-xl shadow-xl z-50 py-1 overflow-hidden">
                    {FOLDERS.filter(f => f.id !== activeFolder).map(f => (
                      <button key={f.id} onClick={() => runAction("move", f.id)} className="w-full text-left px-3 py-2 text-xs text-zinc-400 hover:bg-white/[0.06] hover:text-zinc-200 transition-colors flex items-center gap-2 cursor-pointer">
                        <f.icon size={13} /> {f.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {actionLoading && <Loader2 size={14} className="animate-spin text-zinc-500 ml-1" />}
            </div>
          ) : (
            /* ── Normal header ── */
            <div className="flex items-center justify-between flex-1 min-w-0">
              <h2 className="text-sm font-bold text-shell-text truncate">
                {FOLDERS.find(f => f.id === activeFolder)?.label || activeFolder}
                {total > 0 && <span className="ml-2 text-xs md:text-[11px] font-normal text-zinc-500">{total} mensajes</span>}
              </h2>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => loadMessages(activeFolder, page)}
                  disabled={loadingMessages}
                  className="p-1.5 rounded-lg hover:bg-white/[0.06] text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer"
                  title="Actualizar"
                >
                  <RefreshCw size={14} className={loadingMessages ? "animate-spin" : ""} />
                </button>
                <button
                  onClick={handleCompose}
                  className="lg:hidden p-1.5 rounded-lg hover:bg-white/[0.06] text-zinc-500 hover:text-blue-400 transition-colors cursor-pointer"
                >
                  <Pencil size={14} />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto">
          {loadingMessages ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 size={20} className="animate-spin text-zinc-500" />
            </div>
          ) : msgError ? (
            <div className="flex flex-col items-center gap-2 p-8 text-center">
              <AlertCircle size={20} className="text-red-400" />
              <p className="text-xs text-red-300">{msgError}</p>
              <button onClick={() => loadMessages()} className="text-xs text-blue-400 hover:underline cursor-pointer">Reintentar</button>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center gap-2 p-12 text-center">
              <Mail size={28} className="text-zinc-600" strokeWidth={1.2} />
              <p className="text-sm text-zinc-500">No hay mensajes</p>
            </div>
          ) : (
            messages.map(msg => (
              <div
                key={msg.uid}
                className={`flex items-center gap-3 px-4 py-3 border-b border-white/[0.04] hover:bg-white/[0.03] transition-colors cursor-pointer group ${
                  selectedUids.has(msg.uid) ? "bg-blue-500/5" : ""
                }`}
              >
                {/* Checkbox */}
                <button
                  onClick={(e) => { e.stopPropagation(); toggleSelect(msg.uid) }}
                  className="p-0.5 text-zinc-600 hover:text-zinc-300 shrink-0 cursor-pointer"
                >
                  {selectedUids.has(msg.uid)
                    ? <CheckSquare size={15} className="text-blue-400" />
                    : <Square size={15} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                  }
                </button>
                {/* Avatar (Mobile Gmail Style) */}
                <div className="w-9 h-9 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-sm shrink-0">
                  {getSenderName(msg.from)[0].toUpperCase()}
                </div>

                {/* Content */}
                <button onClick={() => openMessage(msg)} className="flex-1 text-left min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-0.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`text-[14px] truncate ${isUnread(msg.flags) ? "font-bold text-shell-text" : "font-normal text-zinc-400"}`}>
                        {getSenderName(msg.from)}
                      </span>
                    </div>
                    <span className={`text-xs md:text-[11px] shrink-0 ${isUnread(msg.flags) ? "font-semibold text-zinc-400" : "font-normal text-zinc-600"}`}>{formatDate(msg.date)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <p className={`text-[13px] truncate flex-1 ${isUnread(msg.flags) ? "font-bold text-zinc-200" : "font-normal text-zinc-400"}`}>
                      {msg.subject || "(Sin asunto)"}
                    </p>
                    {isUnread(msg.flags) && <div className="w-2.5 h-2.5 rounded-full bg-blue-500 shrink-0" />}
                  </div>
                </button>
              </div>
            ))
          )}
        </div>

        {/* ── Mobile FAB (Floating Action Button) ── */}
        <button
          onClick={handleCompose}
          className="absolute bottom-4 right-4 w-14 h-14 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl shadow-xl flex items-center justify-center lg:hidden transition-transform active:scale-95 z-40"
        >
          <Pencil size={24} />
        </button>
      </div>

      {/* ── Message Detail ── */}
      <div className={`flex-1 flex flex-col min-h-0 min-w-0 ${
        !selectedMsg ? "hidden" : "flex"
      }`}>
        {/* Back button */}
        <div className="flex items-center px-4 py-2 border-b border-white/[0.06] shrink-0">
          <button onClick={() => setSelectedMsg(null)} className="flex items-center gap-1.5 text-sm text-blue-400 cursor-pointer">
            <ArrowLeft size={15} /> Volver a {FOLDERS.find(f => f.id === activeFolder)?.label || "Bandeja"}
          </button>
        </div>

        {loadingMsg ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 size={24} className="animate-spin text-zinc-500" />
          </div>
        ) : !selectedMsg ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 gap-3">
            <div className="w-16 h-16 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center">
              <Mail size={24} className="text-zinc-600" strokeWidth={1.2} />
            </div>
            <p className="text-sm text-zinc-500">Seleccioná un mensaje para leerlo</p>
            <button onClick={handleCompose} className="text-xs text-blue-400 hover:underline cursor-pointer">
              O redactá uno nuevo
            </button>
          </div>
        ) : (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Message header */}
            <div className="px-6 py-4 border-b border-white/[0.06] shrink-0">
              <h2 className="text-lg font-bold text-shell-text mb-3 leading-tight">
                {selectedMsg.subject || "(Sin asunto)"}
              </h2>
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-0.5">
                  <p className="text-xs text-zinc-400">
                    <span className="text-zinc-600 mr-1.5">De:</span>
                    {getSenderName(selectedMsg.from)} {selectedMsg.from?.[0]?.address && (
                      <span className="text-zinc-600">({selectedMsg.from[0].address})</span>
                    )}
                  </p>
                  <p className="text-xs text-zinc-500">
                    <span className="text-zinc-600 mr-1.5">Fecha:</span>
                    {selectedMsg.date ? format(new Date(selectedMsg.date), "dd/MM/yyyy 'a las' HH:mm", { locale: es }) : ""}
                  </p>
                  {selectedMsg.attachments?.length > 0 && (
                    <div className="flex items-center gap-1 mt-2">
                      <Paperclip size={12} className="text-zinc-500" />
                      <span className="text-xs md:text-[11px] text-zinc-500">{selectedMsg.attachments.length} adjunto(s)</span>
                    </div>
                  )}
                </div>
                <button
                  onClick={handleReply}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.07] text-xs text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer shrink-0"
                >
                  <Reply size={12} />
                  Responder
                </button>
              </div>
            </div>

            {/* Message body */}
            <div className="flex-1 overflow-y-auto bg-neutral-100">
              <div className="mx-auto max-w-3xl bg-white shadow-sm my-4 mx-4 sm:mx-auto rounded-lg overflow-hidden">
                <div className="px-6 sm:px-10 py-6">
                  {selectedMsg.html ? (
                    <div
                      className="prose prose-sm max-w-none text-black prose-a:text-blue-600 prose-img:max-w-full prose-table:w-auto"
                      dangerouslySetInnerHTML={{ __html: selectedMsg.html }}
                      style={{ fontSize: "14px", lineHeight: "1.6", overflowWrap: "break-word", wordBreak: "break-word" }}
                    />
                  ) : (
                    <pre className="text-[14px] text-black whitespace-pre-wrap leading-relaxed font-sans">
                      {selectedMsg.text}
                    </pre>
                  )}
                </div>
              </div>
            </div>

            {/* Attachments */}
            {selectedMsg.attachments?.length > 0 && (
              <div className="px-6 py-3 border-t border-white/[0.06] shrink-0">
                <p className="text-xs md:text-[11px] font-medium text-zinc-500 uppercase tracking-wider mb-2">Adjuntos</p>
                <div className="flex flex-wrap gap-2">
                  {selectedMsg.attachments.map((att, i) => (
                    <a
                      key={i}
                      href={`data:${att.contentType};base64,${att.content}`}
                      download={att.filename}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.06] text-xs md:text-[11px] text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.07] transition-colors"
                    >
                      <Paperclip size={11} />
                      {att.filename}
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Composer Modal ── */}
      {showComposer && (
        <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-2xl h-[75vh] flex flex-col">
            <MailComposer
              onClose={() => setShowComposer(false)}
              replyTo={replyData}
            />
          </div>
        </div>
      )}
    </div>
  )
}
