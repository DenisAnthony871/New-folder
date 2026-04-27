import PropTypes from 'prop-types';

const PROVIDER_LABELS = {
  'llama3.2:3b': 'Local',
  'claude-haiku-4-5-20251001': 'Claude',
  'claude-sonnet-4-6': 'Claude',
  'gpt-4o-mini': 'GPT',
  'gpt-4o': 'GPT',
  'gemini-2.0-flash': 'Gemini',
  'gemini-1.5-pro': 'Gemini',
};

export default function MessageBubble({ role, content, model }) {
  const safeContent = content ?? '';
  let mainContent = safeContent;
  let sourcesContent = null;

  if (role === 'ai') {
    const separatorIdx = safeContent.indexOf('\n\n---\n');
    if (separatorIdx !== -1) {
      mainContent = safeContent.slice(0, separatorIdx);
      sourcesContent = safeContent.slice(separatorIdx + 6);
    }
  }

  const aiLabel = model
    ? `Jio AI · ${PROVIDER_LABELS[model] ?? model}`
    : 'Jio AI';

  return (
    <div className={`message-row ${role}`}>
      <div className={`message-bubble ${role}`}>
        <div className={`message-label ${role}`}>
          {role === 'human' ? 'You' : aiLabel}
        </div>
        <div className="message-content">{mainContent}</div>
        {sourcesContent && (
          <div className="message-sources">{sourcesContent}</div>
        )}
      </div>
    </div>
  );
}

MessageBubble.propTypes = {
  role: PropTypes.oneOf(['human', 'ai']).isRequired,
  content: PropTypes.string.isRequired,
  model: PropTypes.string,
};
