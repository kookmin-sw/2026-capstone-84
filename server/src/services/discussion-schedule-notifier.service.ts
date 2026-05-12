import { readerPrisma } from '../lib/prisma';
import { notificationService } from './notification.service';

/**
 * 독서토론 일정 알림 서비스
 *
 * D-1 (내일) 토론 일정이 있는 그룹의 모든 멤버에게 알림을 전송한다.
 * - 그룹명, 토론 날짜, 책 제목을 포함
 * - POST /api/admin/send-schedule-notifications 엔드포인트로 cron job에서 호출 가능
 */

/**
 * 내일 날짜 범위를 계산한다 (KST 기준 00:00:00 ~ 23:59:59)
 */
function getTomorrowDateRange(): { start: Date; end: Date } {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const start = new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate(), 0, 0, 0, 0);
  const end = new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate(), 23, 59, 59, 999);

  return { start, end };
}

/**
 * 날짜를 YYYY-MM-DD 형식으로 포맷한다.
 */
function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export interface ScheduleNotificationResult {
  groupsProcessed: number;
  notificationsSent: number;
}

/**
 * D-1 토론 일정 알림을 전송한다.
 *
 * 1. discussionDate가 내일인 모든 그룹을 조회
 * 2. 각 그룹의 모든 멤버에게 알림 생성
 * 3. 알림 내용: '{그룹명} - {책 제목} 토론이 내일({날짜})에 예정되어 있습니다'
 */
export async function sendScheduleNotifications(): Promise<ScheduleNotificationResult> {
  const { start, end } = getTomorrowDateRange();

  // 내일 토론 일정이 있는 그룹 조회 (책 정보 + 멤버 포함)
  const groups = await readerPrisma.group.findMany({
    where: {
      discussionDate: {
        gte: start,
        lte: end,
      },
    },
    select: {
      id: true,
      name: true,
      discussionDate: true,
      book: {
        select: {
          title: true,
        },
      },
      members: {
        select: {
          userId: true,
        },
      },
    },
  });

  let notificationsSent = 0;

  for (const group of groups) {
    const dateStr = formatDate(group.discussionDate);
    const message = `${group.name} - ${group.book.title} 토론이 내일(${dateStr})에 예정되어 있습니다`;

    for (const member of group.members) {
      await notificationService.create({
        recipientId: member.userId,
        type: 'discussion_schedule',
        title: '토론 일정 알림',
        message,
        linkUrl: `/groups/${group.id}`,
      });
      notificationsSent++;
    }
  }

  return {
    groupsProcessed: groups.length,
    notificationsSent,
  };
}

export const discussionScheduleNotifierService = {
  sendScheduleNotifications,
};
