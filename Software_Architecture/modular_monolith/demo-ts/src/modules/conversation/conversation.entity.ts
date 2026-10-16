export interface Conversation {
  id: string;
  name: string | null; // null nếu là chat 1-1
  type: 'private' | 'group';
  memberIds: string[];
  createdAt: Date;
}
