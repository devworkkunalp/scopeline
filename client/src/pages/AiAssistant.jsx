import { useState, useRef, useEffect } from 'react';
import { api } from '../api.js';
import TitleBlock from '../components/TitleBlock.jsx';

const ASSIST_QUESTIONS = [
  'Show all potential unbilled work.',
  'Why was this change detected?',
  'Which projects have revenue at risk?',
  'Show approved changes that haven\'t been invoiced.',
  'What SOW clause applies to this opportunity?',
];

export default function AiAssistant({ activeProject }) {
  const [messages, setMessages] = useState([
    {
      role: 'ai',
      text: `I'm ready to answer questions about ${activeProject?.name || 'this project'} using the uploaded SOW and project activity. Try a suggestion below, or ask your own.`,
      ev: null,
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const chatLogRef = useRef(null);

  useEffect(() => {
    if (chatLogRef.current) {
      chatLogRef.current.scrollTop = chatLogRef.current.scrollHeight;
    }
  }, [messages, loading]);

  useEffect(() => {
    if (activeProject) {
      setMessages([
        {
          role: 'ai',
          text: `I'm ready to answer questions about ${activeProject.name} using the uploaded SOW and project activity. Try a suggestion below, or ask your own.`,
          ev: null,
        },
      ]);
    }
  }, [activeProject?.id]);

  async function handleSend(queryText) {
    const q = (queryText || input).trim();
    if (!q || !activeProject || loading) return;

    setInput('');
    const newMessages = [...messages, { role: 'user', text: q }];
    setMessages(newMessages);
    setLoading(true);

    try {
      const res = await api.ask(activeProject.id, q);
      setMessages([...newMessages, { role: 'ai', text: res.text, ev: res.ev }]);
    } catch (err) {
      setMessages([
        ...newMessages,
        {
          role: 'ai',
          text: `Error: ${err.message || 'Unable to connect to assistant.'}`,
          ev: null,
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  if (!activeProject) {
    return (
      <div className="content">
        <div className="empty">Select a project to use the AI Assistant.</div>
      </div>
    );
  }

  return (
    <>
      <TitleBlock
        title="AI Assistant"
        sub="Ask about scope, evidence, exposure and billing status"
        project={activeProject}
      />
      <div className="content">
        <div className="chat-window">
          <div className="chat-log" ref={chatLogRef}>
            {messages.map((m, idx) => (
              <div key={idx} className={`msg ${m.role}`}>
                <div>{m.text}</div>
                {m.ev && (
                  <div className="ev">
                    SOURCE: {m.ev}
                  </div>
                )}
              </div>
            ))}
            {loading && (
              <div className="msg ai">
                <span className="typing-dot"></span>
                <span className="typing-dot" style={{ marginLeft: 4 }}></span>
                <span className="typing-dot" style={{ marginLeft: 4 }}></span>
              </div>
            )}
          </div>

          <div className="chat-suggest">
            {ASSIST_QUESTIONS.map((q, i) => (
              <button
                key={i}
                type="button"
                onClick={() => handleSend(q)}
                disabled={loading}
              >
                {q}
              </button>
            ))}
          </div>

          <form
            className="chat-input-row"
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
          >
            <input
              type="text"
              placeholder="Ask about scope, evidence, exposure or billing status…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={loading}
              id="chatInput"
            />
            <button
              type="submit"
              className="btn"
              disabled={loading || !input.trim()}
              data-action="send-chat"
            >
              Ask
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
