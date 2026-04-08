import { Routes, Route } from 'react-router-dom';
import { useUserInfo } from './hooks/useUserInfo';
import UserNamePrompt from './components/UserNamePrompt';
import RoomListPage from './pages/RoomListPage';
import ChatRoomPage from './pages/ChatRoomPage';

export default function App() {
  const { userId, userName, setUserName } = useUserInfo();

  if (!userName) {
    return <UserNamePrompt onSubmit={setUserName} />;
  }

  return (
    <Routes>
      <Route path="/" element={<RoomListPage userId={userId} userName={userName} />} />
      <Route path="/rooms/:roomId" element={<ChatRoomPage userId={userId} userName={userName} />} />
    </Routes>
  );
}
