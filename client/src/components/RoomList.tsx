import type { ChatRoomSummary } from '@shared/types';
import RoomCard from './RoomCard';

interface RoomListProps {
  rooms: ChatRoomSummary[];
}

export default function RoomList({ rooms }: RoomListProps) {
  if (rooms.length === 0) {
    return (
      <p style={{ textAlign: 'center', color: '#888', padding: '32px 0' }}>
        아직 대화방이 없습니다. 새로운 대화방을 만들어보세요!
      </p>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {rooms.map((room) => (
        <RoomCard key={room.id} room={room} />
      ))}
    </div>
  );
}
