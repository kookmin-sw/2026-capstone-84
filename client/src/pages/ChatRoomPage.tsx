import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import type { ChatRoom, Message, Participant } from '@shared/types';
import { fetchRoom, fetchMessages, ApiError } from '../utils/api';
import { useSocket } from '../hooks/useSocket';
import MessageList from '../components/MessageList';
import MessageInput from '../components/MessageInput';
import ParticipantList from '../components/ParticipantList';

interface SystemNotification {
  id: string;
  text: string;
}

interface ChatRoomPageProps {
  userId: string;
  userName: string;
}

export default function ChatRoomPage({ userId, userName }: ChatRoomPageProps) {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const socket = useSocket();

  const [room, setRoom] = useState<ChatRoom | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [notifications, setNotifications] = useState<SystemNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const joinedRef = useRef(false);
  const notifIdRef = useRef(0);

  // Load room info and message history; redirect on 404
  useEffect(() => {
    if (!roomId) return;
    let cancelled = false;

    (async () => {
      try {
        const [roomData, messagesData] = await Promise.all([
          fetchRoom(roomId),
          fetchMessages(roomId),
        ]);
        if (cancelled) return;
        setRoom(roomData);
        setMessages(messagesData);
      } catch (err) {
        if (cancelled) return;
        // Redirect to room list if room not found (404)
        if (err instanceof ApiError && err.status === 404) {
          navigate('/', { replace: true });
          return;
        }
        setError('대화방을 불러올 수 없습니다.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [roomId, navigate]);

  // Socket.IO: join room and listen for events
  useEffect(() => {
    if (!socket || !roomId || loading || error) return;
    if (joinedRef.current) return;
    joinedRef.current = true;

    socket.emit('room:join', { roomId, userId, userName });

    const handleNewMessage = (message: Message) => {
      setMessages((prev) => [...prev, message]);
    };

    const handleUserJoined = (payload: { userId: string; userName: string; participantCount: number }) => {
      setParticipants((prev) => {
        if (prev.some((p) => p.userId === payload.userId)) return prev;
        return [...prev, { roomId: roomId!, userId: payload.userId, userName: payload.userName, joinedAt: new Date() }];
      });
      const id = String(++notifIdRef.current);
      setNotifications((prev) => [...prev, { id, text: `${payload.userName}님이 입장했습니다.` }]);
    };

    const handleUserLeft = (payload: { userId: string; userName: string; participantCount: number }) => {
      setParticipants((prev) => prev.filter((p) => p.userId !== payload.userId));
      const id = String(++notifIdRef.current);
      setNotifications((prev) => [...prev, { id, text: `${payload.userName}님이 퇴장했습니다.` }]);
    };

    socket.on('message:new', handleNewMessage);
    socket.on('room:user-joined', handleUserJoined);
    socket.on('room:user-left', handleUserLeft);

    return () => {
      socket.off('message:new', handleNewMessage);
      socket.off('room:user-joined', handleUserJoined);
      socket.off('room:user-left', handleUserLeft);
    };
  }, [socket, roomId, loading, error, userId, userName]);

  // WebSocket reconnection: auto-rejoin room
  useEffect(() => {
    if (!socket || !roomId) return;

    const handleReconnect = () => {
      socket.emit('room:join', { roomId, userId, userName });
    };

    socket.on('connect', handleReconnect);

    return () => {
      socket.off('connect', handleReconnect);
    };
  }, [socket, roomId, userId, userName]);

  const handleSendMessage = useCallback(
    (content: string) => {
      if (!socket || !roomId) return;
      socket.emit('message:send', { roomId, userId, userName, content });
    },
    [socket, roomId, userId, userName],
  );

  const handleLeave = useCallback(() => {
    if (socket && roomId) {
      socket.emit('room:leave', { roomId, userId });
    }
    navigate('/');
  }, [socket, roomId, userId, navigate]);

  if (loading) {
    return (
      <div style={{ maxWidth: '960px', margin: '0 auto', padding: '24px 16px' }}>
        <p>불러오는 중...</p>
      </div>
    );
  }

  if (error || !room) {
    return (
      <div style={{ maxWidth: '960px', margin: '0 auto', padding: '24px 16px' }}>
        <p style={{ color: '#d9534f' }}>{error || '대화방을 찾을 수 없습니다.'}</p>
        <button
          onClick={() => navigate('/')}
          style={{
            padding: '8px 16px',
            borderRadius: '4px',
            border: '1px solid #ccc',
            backgroundColor: '#fff',
            cursor: 'pointer',
          }}
        >
          목록으로 돌아가기
        </button>
      </div>
    );
  }

  return (
    <div
      style={{
        maxWidth: '960px',
        margin: '0 auto',
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 16px',
          borderBottom: '1px solid #ddd',
        }}
      >
        <div>
          <h2 style={{ margin: 0 }}>{room.title}</h2>
          <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#666' }}>{room.topic}</p>
        </div>
        <button
          onClick={handleLeave}
          style={{
            padding: '8px 16px',
            borderRadius: '4px',
            border: '1px solid #d9534f',
            backgroundColor: '#fff',
            color: '#d9534f',
            cursor: 'pointer',
            fontSize: '0.9rem',
          }}
        >
          퇴장
        </button>
      </div>

      {/* Body */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <MessageList
            messages={messages}
            notifications={notifications}
            currentUserId={userId}
          />
          <MessageInput onSend={handleSendMessage} />
        </div>
        <ParticipantList participants={participants} />
      </div>
    </div>
  );
}
