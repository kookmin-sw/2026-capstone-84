import { useState, type CSSProperties } from 'react';
import { communityApi } from '../../api/community';

interface ReportModalProps {
  postId: string;
  onClose: () => void;
  onSuccess?: () => void;
}

const REPORT_REASONS = [
  '스팸/광고',
  '혐오 발언',
  '부적절한 내용',
  '저작권 침해',
  '기타',
];

const styles: Record<string, CSSProperties> = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modal: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    width: '90%',
    maxWidth: 400,
    boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: 700,
    color: '#1a202c',
  },
  closeButton: {
    background: 'none',
    border: 'none',
    fontSize: 22,
    cursor: 'pointer',
    color: '#a0aec0',
    padding: 4,
  },
  reasonList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    marginBottom: 20,
  },
  reasonItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '10px 14px',
    border: '1px solid #e2e8f0',
    borderRadius: 8,
    cursor: 'pointer',
    transition: 'all 0.15s',
    fontSize: 14,
    color: '#4a5568',
  },
  reasonItemSelected: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '10px 14px',
    border: '1px solid #667eea',
    borderRadius: 8,
    cursor: 'pointer',
    transition: 'all 0.15s',
    fontSize: 14,
    color: '#667eea',
    backgroundColor: '#ebf4ff',
    fontWeight: 600,
  },
  radio: {
    width: 16,
    height: 16,
    borderRadius: '50%',
    border: '2px solid #e2e8f0',
    flexShrink: 0,
  },
  radioSelected: {
    width: 16,
    height: 16,
    borderRadius: '50%',
    border: '5px solid #667eea',
    flexShrink: 0,
  },
  submitButton: {
    width: '100%',
    padding: '12px',
    backgroundColor: '#e53e3e',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
  },
  submitButtonDisabled: {
    width: '100%',
    padding: '12px',
    backgroundColor: '#e2e8f0',
    color: '#a0aec0',
    border: 'none',
    borderRadius: 8,
    fontSize: 14,
    fontWeight: 600,
    cursor: 'not-allowed',
  },
};

function ReportModal({ postId, onClose, onSuccess }: ReportModalProps) {
  const [selectedReason, setSelectedReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!selectedReason || submitting) return;

    setSubmitting(true);
    try {
      await communityApi.reportPost(postId, { reason: selectedReason });
      alert('신고가 접수되었습니다.');
      onSuccess?.();
      onClose();
    } catch (err: any) {
      const code = err?.response?.data?.error?.code;
      if (code === 'ALREADY_REPORTED') {
        alert('이미 신고한 게시글입니다.');
      } else {
        alert('신고 접수에 실패했습니다.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={styles.overlay} onClick={onClose} role="dialog" aria-modal="true" aria-label="게시글 신고">
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <h2 style={styles.title}>🚨 신고하기</h2>
          <button style={styles.closeButton} onClick={onClose} aria-label="닫기">
            ✕
          </button>
        </div>

        <div style={styles.reasonList}>
          {REPORT_REASONS.map((reason) => (
            <div
              key={reason}
              style={selectedReason === reason ? styles.reasonItemSelected : styles.reasonItem}
              onClick={() => setSelectedReason(reason)}
              role="radio"
              aria-checked={selectedReason === reason}
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && setSelectedReason(reason)}
            >
              <div style={selectedReason === reason ? styles.radioSelected : styles.radio} />
              {reason}
            </div>
          ))}
        </div>

        <button
          style={!selectedReason || submitting ? styles.submitButtonDisabled : styles.submitButton}
          onClick={handleSubmit}
          disabled={!selectedReason || submitting}
        >
          {submitting ? '신고 중...' : '신고 제출'}
        </button>
      </div>
    </div>
  );
}

export default ReportModal;
