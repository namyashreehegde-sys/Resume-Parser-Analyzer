'use client';

import { useState } from 'react';
import { sendAssistantMessage, extractErrorMessage } from '@/lib/api';
import type { AssistantMessage } from '@/types/resume';

interface Props {
  resumeId: number;
}

const SUGGESTIONS = [
  'What skills am I missing?',
  'What are my strongest areas?',
  'How can I improve my resume?',
  'Which projects should I highlight?',
  'What ATS keywords are important?',
];

export default function AssistantPanel({ resumeId }: Props) {
  const [messages, setMessages] = useState<AssistantMessage[]>([
    { role: 'assistant', message: 'Hi! I can answer questions about your resume. Try one of the prompts below or ask your own question.' },
  ]);
  const [input, setInput]     = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);
  const [provider, setProvider] = useState<string>('mock');

  async function sendMessage(text: string) {
    if (!text.trim()) return;
    setError(null);
    setMessages(prev => [...prev, { role: 'user', message: text }]);
    setInput('');
    setLoading(true);
    try {
      const data = await sendAssistantMessage(resumeId, text);
      setMessages(prev => [...prev, { role: 'assistant', message: data.reply }]);
      setProvider(data.provider);
    } catch (err) {
      setError(extractErrorMessage(err));
      setMessages(prev => prev.slice(0, -1)); // remove the user message on failure
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Provider badge */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-400">AI Provider:</span>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium
          ${provider === 'openai' ? 'bg-green-100 text-green-700'
          : provider === 'gemini' ? 'bg-blue-100 text-blue-700'
          : 'bg-gray-100 text-gray-500'}`}>
          {provider}
        </span>
        {provider === 'mock' && (
          <span className="text-xs text-gray-400">· Rule-based mode. Add an API key for AI responses.</span>
        )}
      </div>

      {/* Messages */}
      <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] px-4 py-2.5 rounded-xl text-sm leading-relaxed
              ${m.role === 'user'
                ? 'bg-blue-600 text-white rounded-br-sm'
                : 'bg-gray-100 text-gray-800 rounded-bl-sm'}`}>
              {m.message}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 text-gray-500 px-4 py-2.5 rounded-xl rounded-bl-sm text-sm">
              <span className="animate-pulse">Thinking…</span>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-2 text-red-600 text-xs">⚠️ {error}</div>
      )}

      {/* Quick prompts */}
      <div className="flex flex-wrap gap-1">
        {SUGGESTIONS.map(s => (
          <button
            key={s}
            onClick={() => sendMessage(s)}
            disabled={loading}
            className="text-xs bg-blue-50 hover:bg-blue-100 text-blue-600 px-2 py-1 rounded-full transition-colors disabled:opacity-40"
          >
            {s}
          </button>
        ))}
      </div>

      {/* Input */}
      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && sendMessage(input)}
          placeholder="Ask a question about your resume…"
          className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
          disabled={loading}
        />
        <button
          onClick={() => sendMessage(input)}
          disabled={loading || !input.trim()}
          className="bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          Send
        </button>
      </div>
    </div>
  );
}
