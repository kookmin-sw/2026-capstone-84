import { useState } from 'react';
import { createRoom } from '../utils/api';
import type { ChatRoom } from '@shared/types';

interface RoomCreateFormProps {
  userId: string;
  userName: string;
  onRoomCreated: (room: ChatRoom) => void;
}

export default function RoomCreateForm({ userId, userName, onRoomCreated }: RoomCreateFormProps) {
  const [title, setTitle] = useState('');
  const [topic, setTopic] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const trimmedTitle = title.trim();
    const trimmedTopic = topic.trim();

    if (!trimmedTitle || !trimmedTopic) {
      setError('제목과 주제를 모두 입력해주세요.');
      return;
    }

    setSubmitting(true);
    try {
      const room = await createRoom(trimmedTitle, trimmedTopic, userId, userName);
      setTitle('');
      setTopic('');
      onRoomCreated(room);
    } catch (err) {
      setError(err instanceof Error ? err.message : '대화방 생성에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ marginBottom: '24px' }}>
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        <input
          type="text"
          placeholder="대화방 제목"
          aria-label="대화방 제목"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          style={{ flex: '1', minWidth: '120px', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
        />
        <input
          type="text"
          placeholder="주제"
          aria-label="대화방 주제"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          style={{ flex: '1', minWidth: '120px', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
        />
        <button
          type="submit"
          disabled={submitting}
          style={{
            padding: '8px 16px',
            borderRadius: '4px',
            border: 'none',
            backgroundColor: '#4a90d9',
            color: '#fff',
            cursor: submitting ? 'not-allowed' : 'pointer',
            opacity: submitting ? 0.6 : 1,
          }}
        >
          {submitting ? '생성 중...' : '만들기'}
        </button>
      </div>
      {error && (
        <p role="alert" style={{ color: '#d9534f', margin: '8px 0 0 0', fontSize: '0.9rem' }}>
          {error}
        </p>
      )}
    </form>
  );
}
