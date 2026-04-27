import { useState, useRef, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import { api } from '../api';
import MessageBubble from './MessageBubble';

const isAuthError = (err) => {
  if (!err) return false;
  return err.status === 401 ||
    err.response?.status === 401 ||
    (err.message && /\b401\b/i.test(err.message)) ||
    (err.message && err.message.toLowerCase().includes('unauthorized'));
};

export default function ChatWindow({
  apiKey,
  conversationId,
  messages,
  onNewMessage,
  onToggleSidebar = () => {},
  onToggleStats = () => {},
  sidebarOpen = false,
  statsOpen = false
}) {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [optimisticMsgs, setOptimisticMsgs] = useState([]);
  const [selectedModel, setSelectedModel] = useState('llama3.2:3b');
  const [availableModels, setAvailableModels] = useState([]);
  const messagesEndRef = useRef(null);

  // Fetch available models on mount — no auth required
  const fetchModels = useCallback(async () => {
    try {
      const data = await api.models();
      const available = data.models.filter(m => m.available);
      setAvailableModels(available);
      // Keep selectedModel if still valid, otherwise reset to first available
      setSelectedModel(prev => available.length > 0 ? (available.find(m => m.id === prev) ? prev : available[0].id) : prev);
    } catch {
      // Non-fatal — fall back to default model silently
    }
  }, []);

  useEffect(() => {
    fetchModels();
  }, [fetchModels]);

  // Auto-scroll to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, optimisticMsgs]);

  // Reset optimistic msgs when conversation changes
  useEffect(() => {
    setOptimisticMsgs([]);
    setError(null);
    setInput('');
  }, [conversationId]);

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || loading) return;

    setLoading(true);
    setError(null);
    setInput('');

    const humanMsg = { role: 'human', content: trimmed, id: 'opt_' + Date.now() };
    setOptimisticMsgs([humanMsg]);

    try {
      const data = await api.chat(apiKey, trimmed, conversationId, selectedModel);
      const aiMsg = {
        role: 'ai',
        content: data.answer,
        id: 'ai_' + Date.now(),
        model: data.model,
      };
      setOptimisticMsgs([]);
      onNewMessage(humanMsg, aiMsg, data.conversation_id);
    } catch (err) {
      setOptimisticMsgs([]);
      if (isAuthError(err)) {
        setError('Invalid API key');
      } else {
        setError('Something went wrong. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const allMessages = [...messages, ...optimisticMsgs];

  // Provider badge colours
  const providerColour = {
    ollama: '#6366f1',
    anthropic: '#d97706',
    openai: '#16a34a',
    google: '#2563eb',
  };

  const selectedModelInfo = availableModels.find(m => m.id === selectedModel);

  return (
    <div className="chat-panel">
      <div className="chat-header">
        <button
          className="mobile-toggle-btn"
          aria-label="Toggle Sidebar"
          aria-expanded={sidebarOpen}
          onClick={onToggleSidebar}
        >
          <span aria-hidden="true">☰</span>
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="chat-header-title">
            {conversationId ? 'Active Conversation' : 'Jio Support Chat'}
          </div>
          <div className="chat-header-subtitle">
            {conversationId
              ? `Session: ${conversationId.slice(0, 8)}…`
              : 'Ask anything about Jio services'}
          </div>
        </div>
        <button
          className="mobile-toggle-btn"
          aria-label="Toggle Stats"
          aria-expanded={statsOpen}
          onClick={onToggleStats}
        >
          <svg aria-hidden="true" width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="4" y1="14" x2="4" y2="8" />
            <line x1="9" y1="14" x2="9" y2="4" />
            <line x1="14" y1="14" x2="14" y2="10" />
          </svg>
        </button>
      </div>

      <div className="chat-messages custom-scrollbar">
        {allMessages.length === 0 ? (
          <div className="chat-empty">
            <div className="chat-empty-icon" style={{ fontSize: '48px', opacity: 0.25, color: 'var(--jio-navy)' }}>?</div>
            <div className="chat-empty-text">Welcome to Jio Support</div>
            <div className="chat-empty-hint">
              Ask about Jio Fiber plans, SIM activation, recharge options, network issues, and more.
            </div>
          </div>
        ) : (
          allMessages.map((msg, idx) => (
            <MessageBubble
              key={msg.id || idx}
              role={msg.role}
              content={msg.content}
              model={msg.model}
            />
          ))
        )}

        {loading && (
          <div className="message-row ai" aria-live="polite" aria-atomic="true">
            <div className="message-bubble ai">
              <div className="message-label ai">
                {selectedModelInfo ? selectedModelInfo.display_name : 'Jio AI'}
              </div>
              <span className="sr-only">AI is generating a response...</span>
              <div className="loading-dots" aria-hidden="true">
                <span></span><span></span><span></span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className="chat-input-area">
        {error && <div className="chat-error" role="alert">{error}</div>}

        {/* Model selector — only shown when more than one model is available */}
        {availableModels.length > 1 && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            marginBottom: '10px',
          }}>
            <span style={{
              fontSize: '12px',
              fontWeight: 600,
              color: 'var(--text-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              whiteSpace: 'nowrap',
            }}>
              Model
            </span>
            <select
              value={selectedModel}
              onChange={e => setSelectedModel(e.target.value)}
              disabled={loading}
              aria-label="Select AI model"
              style={{
                flex: 1,
                padding: '7px 12px',
                borderRadius: 'var(--radius-sm)',
                border: '1.5px solid var(--border)',
                background: 'var(--bg-page)',
                color: 'var(--text-primary)',
                fontSize: '13px',
                fontFamily: 'inherit',
                cursor: loading ? 'not-allowed' : 'pointer',
                outline: 'none',
                transition: 'border var(--transition-fast)',
              }}
            >
              {availableModels.map(m => (
                <option key={m.id} value={m.id}>
                  {m.display_name}
                </option>
              ))}
            </select>
            {selectedModelInfo && selectedModelInfo.provider && (() => {
              const badgeColor = providerColour[selectedModelInfo.provider] || '#6b7280';
              return (
                <span style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  padding: '3px 8px',
                  borderRadius: 'var(--radius-pill)',
                  background: badgeColor + '18',
                  color: badgeColor,
                  border: `1px solid ${badgeColor}30`,
                  whiteSpace: 'nowrap',
                }}>
                  {selectedModelInfo.provider}
                </span>
              );
            })()}
          </div>
        )}

        <div className="chat-input-row">
          <input
            id="chat-input"
            className="chat-input"
            type="text"
            aria-label="Message input"
            placeholder="Type your question…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={loading}
          />
          <button
            id="chat-send-btn"
            className="chat-send-btn"
            onClick={handleSend}
            disabled={loading || !input.trim()}
            title="Send message"
            aria-label="Send message"
          >
            <span aria-hidden="true">➤</span>
          </button>
        </div>
      </div>
    </div>
  );
}

ChatWindow.propTypes = {
  apiKey: PropTypes.string.isRequired,
  conversationId: PropTypes.string,
  messages: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      role: PropTypes.oneOf(['human', 'ai']).isRequired,
      content: PropTypes.string.isRequired,
      model: PropTypes.string,
    })
  ).isRequired,
  onNewMessage: PropTypes.func.isRequired,
  onToggleSidebar: PropTypes.func,
  onToggleStats: PropTypes.func,
  sidebarOpen: PropTypes.bool,
  statsOpen: PropTypes.bool,
};
