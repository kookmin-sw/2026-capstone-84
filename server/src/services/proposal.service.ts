import { PrismaClient } from '@prisma/client';
import { AppError } from './auth.service';

const prisma = new PrismaClient();

export const proposalService = {
  // 주제 제안 생성 (참여자)
  async create(groupId: string, userId: string, data: { title: string; content?: string; memoId?: string }) {
    const member = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId } },
    });
    if (!member) throw new AppError(403, 'FORBIDDEN', '모임 참여자만 주제를 제안할 수 있습니다');

    const proposal = await prisma.topicProposal.create({
      data: {
        groupId,
        authorId: userId,
        title: data.title,
        content: data.content ?? null,
        memoId: data.memoId ?? null,
        status: 'proposed',
      },
      include: {
        author: { select: { id: true, nickname: true } },
      },
    });

    return proposal;
  },

  // 주제 제안 목록 조회
  async listByGroup(groupId: string) {
    const proposals = await prisma.topicProposal.findMany({
      where: { groupId },
      orderBy: { createdAt: 'desc' },
      include: {
        author: { select: { id: true, nickname: true } },
        _count: { select: { comments: true } },
      },
    });

    return proposals.map(p => ({
      id: p.id,
      groupId: p.groupId,
      authorId: p.authorId,
      title: p.title,
      content: p.content,
      memoId: p.memoId,
      status: p.status,
      createdAt: p.createdAt,
      author: p.author,
      commentCount: p._count.comments,
    }));
  },

  // 토론 개최 (모임장이 제안을 선택하여 Discussion 생성)
  async openDiscussion(proposalId: string, userId: string) {
    const proposal = await prisma.topicProposal.findUnique({
      where: { id: proposalId },
    });
    if (!proposal) throw new AppError(404, 'NOT_FOUND', '제안을 찾을 수 없습니다');

    const group = await prisma.group.findUnique({ where: { id: proposal.groupId } });
    if (!group) throw new AppError(404, 'NOT_FOUND', '모임을 찾을 수 없습니다');
    if (group.ownerId !== userId) throw new AppError(403, 'FORBIDDEN', '방장만 토론을 개최할 수 있습니다');

    if (proposal.status === 'opened') {
      throw new AppError(409, 'ALREADY_OPENED', '이미 개최된 주제입니다');
    }

    // Discussion 생성 + proposal status 업데이트
    const discussion = await prisma.discussion.create({
      data: {
        groupId: proposal.groupId,
        authorId: userId,
        proposalId: proposal.id,
        memoId: proposal.memoId,
        title: proposal.title,
        content: proposal.content,
        isRecommended: false,
      },
      include: {
        author: { select: { id: true, nickname: true } },
      },
    });

    await prisma.topicProposal.update({
      where: { id: proposalId },
      data: { status: 'opened' },
    });

    return discussion;
  },

  // 제안 삭제 (작성자 또는 방장)
  async delete(proposalId: string, userId: string) {
    const proposal = await prisma.topicProposal.findUnique({ where: { id: proposalId } });
    if (!proposal) throw new AppError(404, 'NOT_FOUND', '제안을 찾을 수 없습니다');

    const group = await prisma.group.findUnique({ where: { id: proposal.groupId } });
    if (proposal.authorId !== userId && group?.ownerId !== userId) {
      throw new AppError(403, 'FORBIDDEN', '본인의 제안이거나 방장만 삭제할 수 있습니다');
    }

    await prisma.topicProposal.delete({ where: { id: proposalId } });
  },

  // 제안에 의견 추가
  async addComment(proposalId: string, userId: string, content: string) {
    const proposal = await prisma.topicProposal.findUnique({ where: { id: proposalId } });
    if (!proposal) throw new AppError(404, 'NOT_FOUND', '제안을 찾을 수 없습니다');

    const member = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId: proposal.groupId, userId } },
    });
    if (!member) throw new AppError(403, 'FORBIDDEN', '모임 참여자만 의견을 작성할 수 있습니다');

    return prisma.comment.create({
      data: { proposalId, authorId: userId, content },
      include: { author: { select: { id: true, nickname: true } } },
    });
  },

  // 제안의 의견 목록 조회
  async getComments(proposalId: string) {
    const proposal = await prisma.topicProposal.findUnique({ where: { id: proposalId } });
    if (!proposal) throw new AppError(404, 'NOT_FOUND', '제안을 찾을 수 없습니다');

    return prisma.comment.findMany({
      where: { proposalId },
      orderBy: { createdAt: 'asc' },
      include: {
        author: { select: { id: true, nickname: true } },
        replies: {
          orderBy: { createdAt: 'asc' },
          include: { author: { select: { id: true, nickname: true } } },
        },
      },
    });
  },

  // 제안 의견에 답글 추가
  async addReply(commentId: string, userId: string, content: string) {
    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
      include: { proposal: true },
    });
    if (!comment || !comment.proposal) throw new AppError(404, 'NOT_FOUND', '의견을 찾을 수 없습니다');

    const member = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId: comment.proposal.groupId, userId } },
    });
    if (!member) throw new AppError(403, 'FORBIDDEN', '모임 참여자만 댓글을 작성할 수 있습니다');

    return prisma.reply.create({
      data: { commentId, authorId: userId, content },
      include: { author: { select: { id: true, nickname: true } } },
    });
  },

  // 제안 단건 조회
  async getById(proposalId: string) {
    const proposal = await prisma.topicProposal.findUnique({
      where: { id: proposalId },
      include: { author: { select: { id: true, nickname: true } } },
    });
    if (!proposal) throw new AppError(404, 'NOT_FOUND', '제안을 찾을 수 없습니다');
    return proposal;
  },
};
