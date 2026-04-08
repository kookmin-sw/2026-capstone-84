import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { ChatRoom, ChatRoomSummary } from '@shared/types';
import { fetchRooms } from '../utils/api';
import RoomCreateForm from '../components/RoomCreateForm';
import RoomList from '../components/RoomList';

interface RoomListPageProps {
  userId: string;
  userName: string;
}

export default function RoomListPage({ userId, userName }: RoomListPageProps) {
  const [rooms, setRooms] = useState<ChatRoomSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const loadRooms = async () => {
    try {
      const data = await fetchRooms();
      setRooms(data);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : '대화방 목록을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRooms();
  }, []);

  const handleRoomCreated = async (room: ChatRoom) => {
    await loadRooms();
    navigate(`/rooms/${room.id}`);
  };

  return (
    <div style={{ maxWidth: '720px', margin: '0 auto', padding: '24px 16px' }}>
      <h1 style={{ marginBottom: '24px' }}>대화방 목록</h1>
      <RoomCreateForm userId={userId} userName={userName} onRoomCreated={handleRoomCreated} />
      {loading && <p>불러오는 중...</p>}
      {error && <p style={{ color: '#d9534f' }}>{error}</p>}
      {!loading && !error && <RoomList rooms={rooms} />}
    </div>
  );
}
