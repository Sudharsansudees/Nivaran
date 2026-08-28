import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { GREETING, handleAssistantMessage, initialAssistantState } from '../lib/mockAssistant'

const SpeechRecognitionCtor =
  typeof window !== 'undefined' ? window.SpeechRecognition || window.webkitSpeechRecognition : null
const speechSynthesisAvailable = typeof window !== 'undefined' && 'speechSynthesis' in window

export default function ChatWidget() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState([{ from: 'bot', text: GREETING }])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [listening, setListening] = useState(false)
  const [voiceReplies, setVoiceReplies] = useState(false)
  const [assistantState, setAssistantState] = useState(initialAssistantState)

  const scrollRef = useRef(null)
  const recognitionRef = useRef(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, open])

  function speak(text) {
    if (!voiceReplies || !speechSynthesisAvailable) return
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.rate = 1.02
    window.speechSynthesis.speak(utterance)
  }

  async function send(text) {
    const trimmed = text.trim()
    if (!trimmed || sending) return
    setMessages((m) => [...m, { from: 'user', text: trimmed }])
    setInput('')
    setSending(true)
    try {
      const result = await handleAssistantMessage(trimmed, assistantState, user.id)
      setAssistantState(result.state)
      setMessages((m) => [...m, { from: 'bot', text: result.reply, grievanceId: result.grievanceId }])
      speak(result.reply)
    } catch (e) {
      const errorText = `Something went wrong: ${e.message}`
      setMessages((m) => [...m, { from: 'bot', text: errorText }])
      speak(errorText)
    } finally {
      setSending(false)
    }
  }

  function handleSubmit(e) {
    e.preventDefault()
    send(input)
  }

  function toggleListening() {
    if (!SpeechRecognitionCtor) return

    if (listening) {
      recognitionRef.current?.stop()
      return
    }

    const recognition = new SpeechRecognitionCtor()
    recognition.lang = 'en-IN'
    recognition.interimResults = false
    recognition.maxAlternatives = 1

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript
      send(transcript)
    }
    recognition.onerror = () => setListening(false)
    recognition.onend = () => setListening(false)

    recognitionRef.current = recognition
    setListening(true)
    recognition.start()
  }

  // Only citizens filing/tracking grievances need this — keeps it out of
  // the officer queue and unauthenticated pages.
  if (!user || user.role !== 'citizen') return null

  return (
    <div className="chat-widget">
      {open && (
        <div className="chat-panel">
          <div className="chat-header">
            <span>Nivaran Assistant</span>
            <div className="chat-header-actions">
              {speechSynthesisAvailable && (
                <button
                  type="button"
                  className={`chat-icon-btn ${voiceReplies ? 'active' : ''}`}
                  title={voiceReplies ? 'Voice replies on' : 'Voice replies off'}
                  onClick={() => setVoiceReplies((v) => !v)}
                >
                  {voiceReplies ? '🔊' : '🔈'}
                </button>
              )}
              <button type="button" className="chat-icon-btn" title="Close" onClick={() => setOpen(false)}>
                ✕
              </button>
            </div>
          </div>

          <div className="chat-messages" ref={scrollRef}>
            {messages.map((m, i) => (
              <div key={i} className={`chat-bubble chat-bubble-${m.from}`}>
                <span style={{ whiteSpace: 'pre-wrap' }}>{m.text}</span>
                {m.grievanceId && (
                  <button
                    type="button"
                    className="btn btn-small btn-gold"
                    style={{ marginTop: '0.5rem' }}
                    onClick={() => {
                      setOpen(false)
                      navigate(`/grievances/${m.grievanceId}`)
                    }}
                  >
                    View grievance
                  </button>
                )}
              </div>
            ))}
            {sending && (
              <div className="chat-bubble chat-bubble-bot">
                <span className="spinner" />
              </div>
            )}
          </div>

          <form className="chat-input-row" onSubmit={handleSubmit}>
            {SpeechRecognitionCtor && (
              <button
                type="button"
                className={`chat-mic-btn ${listening ? 'listening' : ''}`}
                onClick={toggleListening}
                title={listening ? 'Stop listening' : 'Speak instead of typing'}
              >
                🎤
              </button>
            )}
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={listening ? 'Listening…' : 'Describe the issue, or ask about a grievance…'}
              disabled={sending}
            />
            <button type="submit" className="btn btn-small" disabled={sending || !input.trim()}>
              Send
            </button>
          </form>
        </div>
      )}

      <button
        type="button"
        className="chat-fab"
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? 'Close assistant' : 'Open assistant'}
      >
        {open ? '✕' : '💬'}
      </button>
    </div>
  )
}
