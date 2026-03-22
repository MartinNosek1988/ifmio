import { useState, useRef, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Bot, Plus, Star, Trash2, Send, Sparkles } from 'lucide-react'
import { Button, Badge, LoadingState } from '../../shared/components'
import { useToast } from '../../shared/components/toast/Toast'
import {
  useMioConversations,
  useMioConversation,
  useUpdateMioConversation,
  useDeleteMioConversation,
  useMioChat,
  useMioQuickActions,
} from './api/mio-chat.queries'
import type { MioConversation, MioMessage } from './api/mio-chat.api'

const TOOL_LABELS: Record<string, string> = {
  dashboard_summary: '📊 Provozní přehled',
  my_agenda: '📋 Agenda',
  helpdesk_list: '🎫 Helpdesk',
  helpdesk_stats: '📈 Statistiky',
  workorders_list: '🔧 Pracovní úkoly',
  recurring_plans_list: '🔄 Plány údržby',
  calendar_today: '📅 Kalendář',
  revisions_overdue: '⚠️ Revize',
  protocols_recent: '📝 Protokoly',
  assets_lookup: '🏗️ Zařízení',
}

export default function MioChatPage() {
  const { conversationId: urlConvId } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const [activeId, setActiveId] = useState<string | null>(urlConvId ?? null)
  const [input, setInput] = useState('')
  const [localMessages, setLocalMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string; toolsUsed?: string[] }>>([])
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const { data: convData, isLoading: loadingList } = useMioConversations()
  const { data: activeConv } = useMioConversation(activeId)
  const updateMut = useUpdateMioConversation()
  const deleteMut = useDeleteMioConversation()
  const chatMut = useMioChat()
  const { data: quickActions = [] } = useMioQuickActions()

  const conversations = convData?.data ?? []

  // Sync URL param
  useEffect(() => {
    if (urlConvId && urlConvId !== activeId) setActiveId(urlConvId)
  }, [urlConvId, activeId])

  // Load messages from active conversation
  useEffect(() => {
    if (activeConv?.messages) {
      setLocalMessages(activeConv.messages.map((m: MioMessage) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
        toolsUsed: m.toolCalls as string[] | undefined,
      })))
    }
  }, [activeConv])

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [localMessages, chatMut.isPending])

  const handleNewConversation = () => {
    setActiveId(null)
    setLocalMessages([])
    setInput('')
    navigate('/mio')
  }

  const handleSelectConversation = (id: string) => {
    setActiveId(id)
    navigate(`/mio/${id}`)
  }

  const handleSend = async (text?: string) => {
    const msg = (text ?? input).trim()
    if (!msg || chatMut.isPending) return

    const userMsg = { role: 'user' as const, content: msg }
    const updated = [...localMessages, userMsg]
    setLocalMessages(updated)
    setInput('')

    chatMut.mutate({
      messages: updated.map(m => ({ role: m.role, content: m.content })),
      conversationId: activeId ?? undefined,
    }, {
      onSuccess: (data) => {
        setLocalMessages(prev => [...prev, {
          role: 'assistant',
          content: data.response,
          toolsUsed: data.toolsUsed,
        }])
        if (!activeId && data.conversationId) {
          setActiveId(data.conversationId)
          navigate(`/mio/${data.conversationId}`, { replace: true })
        }
      },
      onError: () => {
        setLocalMessages(prev => [...prev, {
          role: 'assistant',
          content: 'Omlouvám se, došlo k chybě. Zkuste to znovu.',
        }])
      },
    })
  }

  const handleDelete = (id: string) => {
    deleteMut.mutate(id, {
      onSuccess: () => {
        toast.success('Konverzace smazána')
        if (activeId === id) handleNewConversation()
      },
    })
  }

  const handleToggleStar = (conv: MioConversation) => {
    updateMut.mutate({ id: conv.id, dto: { starred: !conv.starred } })
  }

  return (
    <div data-testid="mio-chat-page" style={{ display: 'flex', height: 'calc(100vh - 120px)', gap: 0 }}>
      {/* LEFT — Conversation List */}
      <div style={{
        width: 300, minWidth: 260, borderRight: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column', background: 'var(--surface)',
      }}>
        <div style={{ padding: '16px 16px 12px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Sparkles size={18} color="var(--primary)" />
              <span style={{ fontWeight: 700, fontSize: '.95rem' }}>Mio AI</span>
            </div>
            <Button size="sm" icon={<Plus size={14} />} onClick={handleNewConversation} data-testid="mio-new-conversation-btn">
              Nová
            </Button>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto' }}>
          {loadingList && <LoadingState />}
          {!loadingList && conversations.length === 0 && (
            <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)', fontSize: '.82rem' }}>
              <Bot size={32} style={{ opacity: 0.3, margin: '0 auto 8px' }} />
              <div>Žádné konverzace</div>
              <div style={{ marginTop: 4 }}>Začněte novou konverzací</div>
            </div>
          )}
          {conversations.map(conv => {
            const isActive = activeId === conv.id
            const lastMsg = (conv as any).messages?.[0]
            return (
              <div
                key={conv.id}
                onClick={() => handleSelectConversation(conv.id)}
                data-testid={`mio-conversation-${conv.id}`}
                style={{
                  padding: '10px 16px', cursor: 'pointer',
                  borderBottom: '1px solid var(--border)',
                  background: isActive ? 'rgba(99,102,241,.08)' : 'transparent',
                  borderLeft: isActive ? '3px solid var(--primary)' : '3px solid transparent',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontWeight: 600, fontSize: '.82rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                    {conv.starred && <Star size={12} fill="var(--warning, #f59e0b)" color="var(--warning, #f59e0b)" style={{ marginRight: 4 }} />}
                    {conv.title || 'Nová konverzace'}
                  </div>
                  <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
                    <button onClick={(e) => { e.stopPropagation(); handleToggleStar(conv) }}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, color: conv.starred ? 'var(--warning)' : 'var(--text-muted)' }}>
                      <Star size={12} />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); handleDelete(conv.id) }}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, color: 'var(--text-muted)' }}>
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
                {lastMsg && (
                  <div style={{ fontSize: '.72rem', color: 'var(--text-muted)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {lastMsg.content?.slice(0, 60)}
                  </div>
                )}
                <div style={{ fontSize: '.68rem', color: 'var(--text-muted)', marginTop: 2 }}>
                  {new Date(conv.updatedAt).toLocaleDateString('cs-CZ')}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* RIGHT — Chat Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Chat header */}
        <div style={{
          padding: '12px 20px', borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <Bot size={20} color="var(--primary)" />
          <span style={{ fontWeight: 600, fontSize: '.9rem' }}>
            {activeConv?.title || 'Nová konverzace'}
          </span>
          {activeConv?.starred && <Badge variant="yellow">★</Badge>}
        </div>

        {/* Messages */}
        <div ref={scrollRef} style={{
          flex: 1, padding: 20, overflowY: 'auto',
          display: 'flex', flexDirection: 'column', gap: 12,
        }}>
          {localMessages.length === 0 && !chatMut.isPending && (
            <div style={{ textAlign: 'center', marginTop: 60 }}>
              <Sparkles size={48} color="var(--text-muted)" style={{ opacity: 0.2, margin: '0 auto 12px' }} />
              <div style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: 4 }}>Jak vám mohu pomoci?</div>
              <div style={{ fontSize: '.85rem', color: 'var(--text-muted)', marginBottom: 24 }}>
                Zeptejte se mě na provoz, finance, revize nebo cokoli o správě nemovitostí.
              </div>
              {/* Quick actions */}
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
                {quickActions.map(qa => (
                  <button
                    key={qa.id}
                    onClick={() => handleSend(qa.prompt)}
                    data-testid={`mio-quick-action-${qa.id}`}
                    style={{
                      padding: '6px 14px', borderRadius: 20, fontSize: '.82rem', cursor: 'pointer',
                      border: '1px solid var(--border)', background: 'var(--surface)',
                      color: 'var(--text)', fontWeight: 500,
                    }}
                  >
                    {qa.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {localMessages.map((msg, i) => (
            <div key={i} style={{
              alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
              maxWidth: '75%',
            }}>
              <div style={{
                padding: '10px 14px', borderRadius: 12,
                background: msg.role === 'user' ? 'var(--primary, #6366f1)' : 'var(--surface-2, var(--surface))',
                color: msg.role === 'user' ? '#fff' : 'var(--text)',
                fontSize: '.85rem', lineHeight: 1.6, whiteSpace: 'pre-wrap',
                border: msg.role === 'assistant' ? '1px solid var(--border)' : 'none',
              }}>
                {msg.content}
              </div>
              {msg.toolsUsed && msg.toolsUsed.length > 0 && (
                <div style={{ display: 'flex', gap: 4, marginTop: 4, flexWrap: 'wrap' }}>
                  {msg.toolsUsed.map((t, j) => (
                    <span key={j} style={{
                      fontSize: '.68rem', padding: '1px 6px', borderRadius: 8,
                      background: 'rgba(99,102,241,.08)', color: 'var(--primary)',
                    }}>
                      {TOOL_LABELS[t] ?? t}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}

          {chatMut.isPending && (
            <div style={{
              alignSelf: 'flex-start', padding: '10px 14px', borderRadius: 12,
              background: 'var(--surface-2)', border: '1px solid var(--border)',
              fontSize: '.82rem', color: 'var(--text-muted)',
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <span className="mio-typing-dots">Mio přemýšlí</span>
              <span style={{ animation: 'pulse 1.5s ease-in-out infinite' }}>...</span>
            </div>
          )}
        </div>

        {/* Quick actions above input (when conversation has messages) */}
        {localMessages.length > 0 && quickActions.length > 0 && (
          <div style={{ padding: '4px 20px', display: 'flex', gap: 6, flexWrap: 'wrap', borderTop: '1px solid var(--border)' }}>
            {quickActions.slice(0, 3).map(qa => (
              <button
                key={qa.id}
                onClick={() => handleSend(qa.prompt)}
                style={{
                  padding: '2px 10px', borderRadius: 12, fontSize: '.72rem', cursor: 'pointer',
                  border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-muted)',
                }}
              >
                {qa.label}
              </button>
            ))}
          </div>
        )}

        {/* Input area */}
        <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border)', display: 'flex', gap: 8, alignItems: 'flex-end' }}>
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
            }}
            placeholder="Napište zprávu pro Mia..."
            disabled={chatMut.isPending}
            rows={1}
            data-testid="mio-chat-input"
            style={{
              flex: 1, border: '1px solid var(--border)', borderRadius: 10,
              padding: '10px 14px', fontSize: '.85rem', resize: 'none',
              background: 'var(--surface)', color: 'var(--text)',
              maxHeight: 120, overflow: 'auto',
            }}
          />
          <Button
            variant="primary"
            onClick={() => handleSend()}
            disabled={chatMut.isPending || !input.trim()}
            data-testid="mio-chat-send-btn"
          >
            <Send size={16} />
          </Button>
        </div>
      </div>
    </div>
  )
}
