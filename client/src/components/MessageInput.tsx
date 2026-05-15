import { useState } from 'react';

interface MessageInputProps {
  onSend: (content: string) => void;
}

export default function MessageInput({ onSend }: MessageInputProps) {
  const [text, setText] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setText('');
  };

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        display: 'flex',
        gap: '8px',
        padding: '12px',
        borderTop: '1px solid #ddd',
      }}
    >
      <input
        type="text"
        placeholder="메시지를 입력하세요"
        aria-label="메시지 입력"
        value={text}
        onChange={(e) => setText(e.target.value)}
        style={{
          flex: 1,
          padding: '8px 12px',
          borderRadius: '4px',
          border: '1px solid #ccc',
          fontSize: '0.95rem',
        }}
      />
      <button
        type="submit"
        style={{
          padding: '8px 16px',
          borderRadius: '4px',
          border: 'none',
          backgroundColor: '#4a90d9',
          color: '#fff',
          cursor: 'pointer',
        }}
      >
        전송
      </button>
    </form>
  );
}
