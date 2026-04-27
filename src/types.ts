export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  status: 'online' | 'offline' | 'away';
  lastSeen: number;
}

export interface Message {
  id: string;
  senderId: string;
  senderName: string;
  content: string;
  timestamp: number;
  hubId: string;
  attachments?: string[];
}

export interface Hub {
  id: string;
  name: string;
  topic: string;
  unreadCount?: number;
}
