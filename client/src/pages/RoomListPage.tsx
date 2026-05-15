import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { ChatRoom, ChatRoomSummary } from '@shared/types';
import { fetchRooms, fetchMyRooms, deleteRoom } from '../utils/api';
import RoomCreateForm from '../components/RoomCreateForm';
import RoomList from '../components/RoomList';

interface RoomListPageProps {
  userId: string;
  userName: string;
  role?: 'admin' | 'user' | 'guest';
}

export default function RoomListPage({ userId, userName, role }: RoomListPageProps) {
  const [rooms, setRooms] = useState<ChatRoomSummary[]>([]);
  const [myRooms, setMyRooms] = useState<ChatRoomSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const loadRooms = async () => {
    try {
      const allRooms = await fetchRooms();
      setRooms(allRooms);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : '대화방 목록을 불러오지 못했습니다.');
    }
    try {
      const participating = await fetchMyRooms(userId);
      setMyRooms(participating);
    } catch {
      setMyRooms([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadRooms();
  }, []);

  const handleRoomCreated = async (room: ChatRoom) => {
    await loadRooms();
    navigate(`/rooms/${room.id}`);
  };

  const handleDeleteRoom = async (roomId: string) => {
    try {
      await deleteRoom(roomId);
      await loadRooms();
    } catch (err) {
      setError(err instanceof Error ? err.message : '대화방 삭제에 실패했습니다.');
    }
  };

  return (
    <div style={{ maxWidth: '720px', margin: '0 auto', padding: '24px 16px' }}>
      <h1 style={{ marginBottom: '24px' }}>대화방 목록</h1>
      <RoomCreateForm userId={userId} userName={userName} onRoomCreated={handleRoomCreated} />
      {loading && <p>불러오는 중...</p>}
      {error && <p style={{ color: '#d9534f' }}>{error}</p>}
      {!loading && !error && myRooms.length > 0 && (
        <>
          <h2 style={{ fontSize: '1.1rem', margin: '24px 0 12px 0', color: '#333' }}>참여 중인 대화방</h2>
          <RoomList rooms={myRooms} role={role} onDelete={handleDeleteRoom} />
        </>
      )}
      {!loading && !error && (
        <>
          <h2 style={{ fontSize: '1.1rem', margin: '24px 0 12px 0', color: '#333' }}>전체 대화방</h2>
          <RoomList rooms={rooms} role={role} onDelete={handleDeleteRoom} />
        </>
      )}
    </div>
  );
}
