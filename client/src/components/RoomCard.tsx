import type { ChatRoomSummary } from '@shared/types';
import { useNavigate } from 'react-router-dom';

interface RoomCardProps {
  room: ChatRoomSummary;
  role?: 'admin' | 'user' | 'guest';
  onDelete?: (roomId: string) => void;
}

const cardStyle: React.CSSProperties = {
  border: '1px solid #ddd',
  borderRadius: '8px',
  padding: '16px',
  cursor: 'pointer',
  transition: 'box-shadow 0.2s',
  backgroundColor: '#fff',
  position: 'relative',
};

const deleteButtonStyle: React.CSSProperties = {
  position: 'absolute',
  top: '8px',
  right: '8px',
  backgroundColor: '#d9534f',
  color: '#fff',
  border: 'none',
  borderRadius: '4px',
  padding: '4px 8px',
  fontSize: '0.75rem',
  cursor: 'pointer',
};

export default function RoomCard({ room, role, onDelete }: RoomCardProps) {
  const navigate = useNavigate();

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('이 대화방을 삭제하시겠습니까?')) {
      onDelete?.(room.id);
    }
  };

  return (
    <article
      role="link"
      tabIndex={0}
      aria-label={`대화방: ${room.title}`}
      style={cardStyle}
      onClick={() => navigate(`/rooms/${room.id}`)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          navigate(`/rooms/${room.id}`);
        }
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.boxShadow = 'none';
      }}
    >
      {role === 'admin' && (
        <button
          style={deleteButtonStyle}
          onClick={handleDelete}
          aria-label={`대화방 삭제: ${room.title}`}
        >
          삭제
        </button>
      )}
      <h3 style={{ margin: '0 0 8px 0' }}>{room.title}</h3>
      <p style={{ margin: '0 0 8px 0', color: '#666' }}>{room.topic}</p>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#888' }}>
        <span>만든이: {room.creatorName}</span>
        <span>참여자: {room.participantCount}명</span>
      </div>
    </article>
  );
}
