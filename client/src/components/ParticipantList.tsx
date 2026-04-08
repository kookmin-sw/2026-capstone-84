import type { Participant } from '@shared/types';

interface ParticipantListProps {
  participants: Participant[];
}

export default function ParticipantList({ participants }: ParticipantListProps) {
  return (
    <div
      style={{
        width: '180px',
        borderLeft: '1px solid #ddd',
        padding: '12px',
        overflowY: 'auto',
      }}
    >
      <h4 style={{ margin: '0 0 8px 0', fontSize: '0.85rem', color: '#666' }}>
        참여자 ({participants.length})
      </h4>
      <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
        {participants.map((p) => (
          <li
            key={p.userId}
            style={{
              padding: '4px 0',
              fontSize: '0.85rem',
              borderBottom: '1px solid #f0f0f0',
            }}
          >
            {p.userName}
          </li>
        ))}
      </ul>
    </div>
  );
}
