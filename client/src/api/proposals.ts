import apiClient from './client';

export interface TopicProposal {
  id: string;
  groupId: string;
  authorId: string;
  title: string;
  content?: string;
  memoId?: string;
  status: 'proposed' | 'opened';
  createdAt: string;
  author: { id: string; nickname: string };
  commentCount?: number;
}

export const proposalsApi = {
  list: (groupId: string) =>
    apiClient.get<TopicProposal[]>(`/groups/${groupId}/proposals`),

  create: (groupId: string, data: { title: string; content?: string; memoId?: string }) =>
    apiClient.post<TopicProposal>(`/groups/${groupId}/proposals`, data),

  openDiscussion: (proposalId: string) =>
    apiClient.post(`/proposals/${proposalId}/open`),

  delete: (proposalId: string) =>
    apiClient.delete(`/proposals/${proposalId}`),

  getComments: (proposalId: string) =>
    apiClient.get<any[]>(`/proposals/${proposalId}/comments`),

  addComment: (proposalId: string, content: string) =>
    apiClient.post(`/proposals/${proposalId}/comments`, { content }),

  addReply: (commentId: string, content: string) =>
    apiClient.post(`/proposal-comments/${commentId}/replies`, { content }),

  getById: (proposalId: string) =>
    apiClient.get<TopicProposal>(`/proposals/${proposalId}`),
};
