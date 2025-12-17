import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { messagesAPI, usersAPI } from '../services/api';
import useChatStore from '../stores/chatStore';
import socketService from '../services/socket';
import { Send, ArrowLeft, MoreVertical } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Chat() {
  const { id: partnerId } = useParams();
  const { user } = useAuthStore();
  const { conversations, setConversations, messages, setMessages, addMessage, isUserOnline, typingUsers } = useChatStore();
  const [loading, setLoading] = useState(true);
  const [partner, setPartner] = useState(null);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  useEffect(() => {
    loadConversations();
  }, []);

  useEffect(() => {
    if (partnerId) {
      loadChat(partnerId);
    }
  }, [partnerId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (partnerId) {
      const handleNewMessage = (message) => {
        if (message.sender?.id === partnerId || message.senderId === partnerId) {
          addMessage({ ...message, isFromMe: false });
        }
      };

      socketService.on('new_message', handleNewMessage);
      return () => socketService.off('new_message', handleNewMessage);
    }
  }, [partnerId, addMessage]);

  const loadConversations = async () => {
    try {
      const res = await messagesAPI.getConversations();
      setConversations(res.data.conversations || []);
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };

  const loadChat = async (userId) => {
    try {
      const [messagesRes, profileRes] = await Promise.all([
        messagesAPI.getMessages(userId),
        usersAPI.getProfile(userId)
      ]);
      setMessages(messagesRes.data.messages || []);
      setPartner(profileRes.data);
    } catch (error) {
      toast.error('Failed to load chat');
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !partnerId) return;

    const content = newMessage.trim();
    setNewMessage('');
    setSending(true);

    try {
      socketService.sendMessage({ receiverId: partnerId, content });
      addMessage({
        id: Date.now(),
        content,
        isFromMe: true,
        createdAt: new Date().toISOString()
      });
    } catch (error) {
      toast.error('Failed to send');
    } finally {
      setSending(false);
    }
  };

  const handleTyping = () => {
    if (partnerId) {
      socketService.sendTyping({ receiverId: partnerId, isTyping: true });
      
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        socketService.sendTyping({ receiverId: partnerId, isTyping: false });
      }, 2000);
    }
  };

  const isPartnerOnline = partnerId && (isUserOnline(partnerId) || partner?.isOnline);
  const isPartnerTyping = partnerId && typingUsers.has(partnerId);

  if (loading) return <div className="flex justify-center py-12"><div className="spinner"></div></div>;

  return (
    <div className="h-[calc(100vh-8rem)] flex">
      <div className={`w-full md:w-80 border-r bg-white flex flex-col ${partnerId ? 'hidden md:flex' : 'flex'}`}>
        <div className="p-4 border-b">
          <h2 className="font-semibold">Messages</h2>
        </div>
        <div className="flex-1 overflow-y-auto">
          {conversations.length === 0 ? (
            <div className="text-center py-8 text-gray-500 text-sm">No conversations yet</div>
          ) : (
            conversations.map(conv => (
              <Link key={conv.partner?.id} to={`/chat/${conv.partner?.id}`}
                className={`flex items-center gap-3 p-4 hover:bg-gray-50 border-b ${partnerId === conv.partner?.id ? 'bg-primary-50' : ''}`}>
                <div className="relative">
                  <img src={conv.partner?.profile_picture || `https://api.dicebear.com/7.x/avataaars/svg?seed=${conv.partner?.name}`}
                    alt="" className="w-12 h-12 rounded-full" />
                  {isUserOnline(conv.partner?.id) && <div className="absolute bottom-0 right-0 online-indicator" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center">
                    <p className="font-medium truncate">{conv.partner?.name}</p>
                    {conv.unreadCount > 0 && (
                      <span className="bg-primary-600 text-white text-xs px-2 py-0.5 rounded-full">{conv.unreadCount}</span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 truncate">
                    {conv.lastMessage?.isFromMe && 'You: '}{conv.lastMessage?.content}
                  </p>
                </div>
              </Link>
            ))
          )}
        </div>
      </div>

      <div className={`flex-1 flex flex-col ${!partnerId ? 'hidden md:flex' : 'flex'}`}>
        {partnerId && partner ? (
          <>
            <div className="p-4 border-b bg-white flex items-center gap-3">
              <Link to="/chat" className="md:hidden p-2 hover:bg-gray-100 rounded-lg">
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div className="relative">
                <img src={partner.profilePicture || `https://api.dicebear.com/7.x/avataaars/svg?seed=${partner.name}`}
                  alt="" className="w-10 h-10 rounded-full" />
                {isPartnerOnline && <div className="absolute bottom-0 right-0 online-indicator" />}
              </div>
              <div className="flex-1">
                <Link to={`/profile/${partnerId}`} className="font-medium hover:underline">{partner.name}</Link>
                <p className="text-xs text-gray-500">
                  {isPartnerTyping ? 'typing...' : isPartnerOnline ? 'Online' : 'Offline'}
                </p>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
              {messages.map((msg, i) => (
                <div key={msg.id || i} className={`flex ${msg.isFromMe ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[70%] px-4 py-2 rounded-2xl ${
                    msg.isFromMe ? 'bg-primary-600 text-white rounded-br-md' : 'bg-white text-gray-800 rounded-bl-md shadow-sm'
                  }`}>
                    <p>{msg.content}</p>
                    <p className={`text-xs mt-1 ${msg.isFromMe ? 'text-primary-200' : 'text-gray-400'}`}>
                      {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            <form onSubmit={handleSend} className="p-4 border-t bg-white flex gap-2">
              <input type="text" value={newMessage}
                onChange={(e) => { setNewMessage(e.target.value); handleTyping(); }}
                placeholder="Type a message..." className="input flex-1" />
              <button type="submit" disabled={sending || !newMessage.trim()} className="btn btn-primary px-4">
                <Send className="w-5 h-5" />
              </button>
            </form>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            Select a conversation to start chatting
          </div>
        )}
      </div>
    </div>
  );
}
