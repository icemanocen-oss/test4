import { create } from 'zustand';

export const useChatStore = create((set, get) => ({
  conversations: [],
  currentChat: null,
  messages: [],
  onlineUsers: new Set(),
  typingUsers: new Map(),
  unreadCount: 0,

  setConversations: (conversations) => set({ conversations }),

  setCurrentChat: (chat) => set({ currentChat: chat, messages: [] }),

  setMessages: (messages) => set({ messages }),

  addMessage: (message) => set((state) => ({
    messages: [...state.messages, message]
  })),

  updateConversation: (partnerId, lastMessage) => set((state) => {
    const conversations = state.conversations.map(conv => 
      conv.partner.id === partnerId 
        ? { ...conv, lastMessage, unreadCount: conv.unreadCount + 1 }
        : conv
    );
    return { conversations };
  }),

  setOnlineUsers: (users) => set({ onlineUsers: new Set(users.map(u => u.id)) }),

  addOnlineUser: (userId) => set((state) => {
    const newSet = new Set(state.onlineUsers);
    newSet.add(userId);
    return { onlineUsers: newSet };
  }),

  removeOnlineUser: (userId) => set((state) => {
    const newSet = new Set(state.onlineUsers);
    newSet.delete(userId);
    return { onlineUsers: newSet };
  }),

  setTyping: (userId, isTyping) => set((state) => {
    const newMap = new Map(state.typingUsers);
    if (isTyping) {
      newMap.set(userId, Date.now());
    } else {
      newMap.delete(userId);
    }
    return { typingUsers: newMap };
  }),

  setUnreadCount: (count) => set({ unreadCount: count }),

  decrementUnread: () => set((state) => ({
    unreadCount: Math.max(0, state.unreadCount - 1)
  })),

  markConversationRead: (partnerId) => set((state) => ({
    conversations: state.conversations.map(conv =>
      conv.partner.id === partnerId ? { ...conv, unreadCount: 0 } : conv
    )
  })),

  isUserOnline: (userId) => get().onlineUsers.has(userId),
}));

export default useChatStore;
