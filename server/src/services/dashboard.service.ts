import { writerPrisma, readerPrisma } from '../lib/prisma';
import { AppError } from './auth.service';
import crypto from 'crypto';

export const dashboardService = {
  // ===== 초대 링크 =====
  async generateInviteCode(groupId: string, userId: string) {
    const group = await readerPrisma.group.findUnique({ where: { id: groupId } });
    if (!group) throw new AppError(404, 'NOT_FOUND', '모임을 찾을 수 없습니다');
    if (group.ownerId !== userId) throw new AppError(403, 'FORBIDDEN', '방장만 초대 링크를 생성할 수 있습니다');

    const inviteCode = crypto.randomBytes(8).toString('hex');
    const inviteCodeExpiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30분 후 만료
    await writerPrisma.group.update({ where: { id: groupId }, data: { inviteCode, inviteCodeExpiresAt } });
    return { inviteCode, expiresAt: inviteCodeExpiresAt };
  },

  async getInviteCode(groupId: string, userId: string) {
    const group = await readerPrisma.group.findUnique({ where: { id: groupId } });
    if (!group) throw new AppError(404, 'NOT_FOUND', '모임을 찾을 수 없습니다');
    if (group.ownerId !== userId) throw new AppError(403, 'FORBIDDEN', '방장만 초대 링크를 조회할 수 있습니다');

    // 만료된 코드는 null로 반환
    if (group.inviteCode && group.inviteCodeExpiresAt && new Date() > group.inviteCodeExpiresAt) {
      return { inviteCode: null, expiresAt: null };
    }
    return { inviteCode: group.inviteCode, expiresAt: group.inviteCodeExpiresAt };
  },

  async joinByInviteCode(inviteCode: string, userId: string) {
    const group = await readerPrisma.group.findUnique({
      where: { inviteCode },
      include: { _count: { select: { members: true } } },
    });
    if (!group) throw new AppError(404, 'NOT_FOUND', '유효하지 않은 초대 링크입니다');

    // 만료 확인
    if (group.inviteCodeExpiresAt && new Date() > group.inviteCodeExpiresAt) {
      throw new AppError(410, 'INVITE_EXPIRED', '초대 링크가 만료되었습니다. 방장에게 새 링크를 요청하세요.');
    }

    // 차단 여부 확인
    const banned = await readerPrisma.groupBan.findUnique({
      where: { groupId_userId: { groupId: group.id, userId } },
    });
    if (banned) throw new AppError(403, 'BANNED', '이 모임에서 강제 퇴장되어 참여할 수 없습니다');

    const existing = await readerPrisma.groupMember.findUnique({
      where: { groupId_userId: { groupId: group.id, userId } },
    });
    if (existing) throw new AppError(409, 'ALREADY_JOINED', '이미 참여 중인 모임입니다');

    if (group._count.members >= group.maxMembers) {
      throw new AppError(409, 'GROUP_FULL', '모집 인원이 마감되었습니다');
    }

    await writerPrisma.groupMember.create({
      data: { groupId: group.id, userId, role: 'member' },
    });

    return { groupId: group.id, groupName: group.name };
  },

  // ===== 멤버 삭제 =====
  async removeMember(groupId: string, ownerId: string, targetUserId: string) {
    const group = await readerPrisma.group.findUnique({ where: { id: groupId } });
    if (!group) throw new AppError(404, 'NOT_FOUND', '모임을 찾을 수 없습니다');
    if (group.ownerId !== ownerId) throw new AppError(403, 'FORBIDDEN', '방장만 멤버를 삭제할 수 있습니다');
    if (group.ownerId === targetUserId) throw new AppError(400, 'VALIDATION_ERROR', '방장은 삭제할 수 없습니다');

    const member = await readerPrisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId: targetUserId } },
    });
    if (!member) throw new AppError(404, 'NOT_FOUND', '해당 멤버를 찾을 수 없습니다');

    // 멤버 삭제 + 차단 목록에 추가
    await writerPrisma.groupMember.delete({
      where: { groupId_userId: { groupId, userId: targetUserId } },
    });
    await writerPrisma.groupBan.upsert({
      where: { groupId_userId: { groupId, userId: targetUserId } },
      update: {},
      create: { groupId, userId: targetUserId },
    });
  },

  // ===== 공지사항 =====
  async createAnnouncement(groupId: string, userId: string, data: { title: string; content: string }) {
    const group = await readerPrisma.group.findUnique({ where: { id: groupId } });
    if (!group) throw new AppError(404, 'NOT_FOUND', '모임을 찾을 수 없습니다');
    if (group.ownerId !== userId) throw new AppError(403, 'FORBIDDEN', '방장만 공지사항을 작성할 수 있습니다');

    return writerPrisma.announcement.create({
      data: { groupId, authorId: userId, title: data.title, content: data.content },
    });
  },

  async listAnnouncements(groupId: string) {
    return readerPrisma.announcement.findMany({
      where: { groupId },
      orderBy: { createdAt: 'desc' },
    });
  },

  async updateAnnouncement(announcementId: string, userId: string, data: { title?: string; content?: string }) {
    const ann = await readerPrisma.announcement.findUnique({ where: { id: announcementId } });
    if (!ann) throw new AppError(404, 'NOT_FOUND', '공지사항을 찾을 수 없습니다');

    const group = await readerPrisma.group.findUnique({ where: { id: ann.groupId } });
    if (!group || group.ownerId !== userId) throw new AppError(403, 'FORBIDDEN', '방장만 공지사항을 수정할 수 있습니다');

    const updateData: any = {};
    if (data.title !== undefined) updateData.title = data.title;
    if (data.content !== undefined) updateData.content = data.content;

    return writerPrisma.announcement.update({ where: { id: announcementId }, data: updateData });
  },

  async deleteAnnouncement(announcementId: string, userId: string) {
    const ann = await readerPrisma.announcement.findUnique({ where: { id: announcementId } });
    if (!ann) throw new AppError(404, 'NOT_FOUND', '공지사항을 찾을 수 없습니다');

    const group = await readerPrisma.group.findUnique({ where: { id: ann.groupId } });
    if (!group || group.ownerId !== userId) throw new AppError(403, 'FORBIDDEN', '방장만 공지사항을 삭제할 수 있습니다');

    await writerPrisma.announcement.delete({ where: { id: announcementId } });
  },

  // ===== 토론 일정 =====
  async listSchedules(groupId: string) {
    return readerPrisma.discussionSchedule.findMany({
      where: { groupId },
      orderBy: { startDate: 'asc' },
    });
  },

  async createSchedule(groupId: string, userId: string, data: { title: string; description?: string; startDate: string; endDate: string }) {
    const group = await readerPrisma.group.findUnique({ where: { id: groupId } });
    if (!group) throw new AppError(404, 'NOT_FOUND', '모임을 찾을 수 없습니다');
    if (group.ownerId !== userId) throw new AppError(403, 'FORBIDDEN', '방장만 일정을 추가할 수 있습니다');

    return writerPrisma.discussionSchedule.create({
      data: {
        groupId,
        title: data.title,
        description: data.description ?? null,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
      },
    });
  },

  async updateSchedule(scheduleId: string, userId: string, data: { title?: string; description?: string; startDate?: string; endDate?: string }) {
    const schedule = await readerPrisma.discussionSchedule.findUnique({ where: { id: scheduleId } });
    if (!schedule) throw new AppError(404, 'NOT_FOUND', '일정을 찾을 수 없습니다');

    const group = await readerPrisma.group.findUnique({ where: { id: schedule.groupId } });
    if (!group || group.ownerId !== userId) throw new AppError(403, 'FORBIDDEN', '방장만 일정을 수정할 수 있습니다');

    const updateData: any = {};
    if (data.title !== undefined) updateData.title = data.title;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.startDate !== undefined) updateData.startDate = new Date(data.startDate);
    if (data.endDate !== undefined) updateData.endDate = new Date(data.endDate);

    return writerPrisma.discussionSchedule.update({ where: { id: scheduleId }, data: updateData });
  },

  async deleteSchedule(scheduleId: string, userId: string) {
    const schedule = await readerPrisma.discussionSchedule.findUnique({ where: { id: scheduleId } });
    if (!schedule) throw new AppError(404, 'NOT_FOUND', '일정을 찾을 수 없습니다');

    const group = await readerPrisma.group.findUnique({ where: { id: schedule.groupId } });
    if (!group || group.ownerId !== userId) throw new AppError(403, 'FORBIDDEN', '방장만 일정을 삭제할 수 있습니다');

    await writerPrisma.discussionSchedule.delete({ where: { id: scheduleId } });
  },

  // ===== 댓글/답글 삭제 (방장 권한) =====
  async deleteComment(commentId: string, userId: string) {
    const comment = await readerPrisma.comment.findUnique({
      where: { id: commentId },
      include: { discussion: true },
    });
    if (!comment) throw new AppError(404, 'NOT_FOUND', '의견을 찾을 수 없습니다');

    const group = await readerPrisma.group.findUnique({ where: { id: comment.discussion.groupId } });
    if (!group) throw new AppError(404, 'NOT_FOUND', '모임을 찾을 수 없습니다');

    // 작성자 본인이거나 방장만 삭제 가능
    if (comment.authorId !== userId && group.ownerId !== userId) {
      throw new AppError(403, 'FORBIDDEN', '본인의 의견이거나 방장만 삭제할 수 있습니다');
    }

    // 답글 먼저 삭제 후 댓글 삭제
    await writerPrisma.reply.deleteMany({ where: { commentId } });
    await writerPrisma.comment.delete({ where: { id: commentId } });
  },

  async deleteReply(replyId: string, userId: string) {
    const reply = await readerPrisma.reply.findUnique({
      where: { id: replyId },
      include: { comment: { include: { discussion: true } } },
    });
    if (!reply) throw new AppError(404, 'NOT_FOUND', '답글을 찾을 수 없습니다');

    const group = await readerPrisma.group.findUnique({ where: { id: reply.comment.discussion.groupId } });
    if (!group) throw new AppError(404, 'NOT_FOUND', '모임을 찾을 수 없습니다');

    if (reply.authorId !== userId && group.ownerId !== userId) {
      throw new AppError(403, 'FORBIDDEN', '본인의 답글이거나 방장만 삭제할 수 있습니다');
    }

    await writerPrisma.reply.delete({ where: { id: replyId } });
  },
};
