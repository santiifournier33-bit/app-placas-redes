'use client'

import { useState, useEffect } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { getActiveUser } from '@/lib/supabase/active-user'
import { marked } from 'marked'
import DOMPurify from 'isomorphic-dompurify'

interface Note {
  id: string
  body: string
  created_at: string | null
  updated_at: string | null
}

const supabase = createClient()

export function ContactNotesTab({ contactId }: { contactId: string }) {
  const [notes, setNotes] = useState<Note[]>([])
  const [loading, setLoading] = useState(true)
  const [draft, setDraft] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchNotes()
  }, [contactId])

  const fetchNotes = async () => {
    // Asegura token vigente antes del select RLS (recupera sesión si murió).
    await getActiveUser(supabase)
    const { data } = await supabase
      .from('contact_notes')
      .select('id, body, created_at, updated_at')
      .eq('contact_id', contactId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })

    setNotes(data ?? [])
    setLoading(false)
  }

  const addNote = async () => {
    if (!draft.trim()) return
    setSaving(true)

    const { user } = await getActiveUser(supabase)
    if (!user) { setSaving(false); return }

    const { data } = await supabase
      .from('contact_notes')
      .insert({
        contact_id: contactId,
        owner_id: user.id,
        body: draft.trim(),
      })
      .select('id, body, created_at, updated_at')
      .single()

    if (data) {
      setNotes(prev => [data, ...prev])
      setDraft('')
    }
    setSaving(false)
  }

  const deleteNote = async (id: string) => {
    await supabase
      .from('contact_notes')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)

    setNotes(prev => prev.filter(n => n.id !== id))
  }

  const renderMd = (md: string) => {
    const html = marked.parse(md, { async: false }) as string
    return DOMPurify.sanitize(html)
  }

  return (
    <div className="p-5 space-y-4">
      {/* New note input */}
      <div className="space-y-2">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={3}
          placeholder="Escribí una nota... (soporta **markdown**)"
          className="w-full bg-surface-overlay rounded-xl px-3 py-2 text-xs text-text-secondary placeholder:text-zinc-700 outline-none resize-none border border-border-subtle focus:border-blue-500/30"
        />
        <button
          onClick={addNote}
          disabled={saving || !draft.trim()}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-500/15 text-blue-400 text-xs font-medium hover:bg-blue-500/25 disabled:opacity-40 cursor-pointer"
        >
          <Plus size={13} />
          {saving ? 'Guardando...' : 'Agregar nota'}
        </button>
      </div>

      {/* Notes timeline */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2].map(i => (
            <div key={i} className="animate-pulse h-16 bg-surface-overlay rounded-xl" />
          ))}
        </div>
      ) : notes.length === 0 ? (
        <p className="text-text-muted text-xs text-center py-6">Sin notas</p>
      ) : (
        <div className="space-y-3">
          {notes.map(note => (
            <div
              key={note.id}
              className="relative group rounded-xl border border-border-subtle bg-surface-overlay p-3"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs md:text-[10px] text-text-muted">
                  {note.created_at
                    ? new Date(note.created_at).toLocaleString('es-AR', {
                        day: '2-digit', month: 'short', year: 'numeric',
                        hour: '2-digit', minute: '2-digit',
                      })
                    : '—'}
                </span>
                <button
                  onClick={() => deleteNote(note.id)}
                  className="p-1 hover:bg-red-500/10 rounded opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                >
                  <Trash2 size={12} className="text-red-400" />
                </button>
              </div>
              <div
                className="prose prose-invert prose-xs max-w-none text-xs text-text-secondary [&_strong]:text-text-secondary [&_a]:text-blue-400 [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4 [&_p]:mb-1"
                dangerouslySetInnerHTML={{ __html: renderMd(note.body) }}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
