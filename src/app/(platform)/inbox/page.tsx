'use client';

/**
 * Unified Inbox Page
 *
 * Gmail/Slack-inspired messaging inbox with conversation list and thread view.
 * Supports application messages, direct messages, education messages, and admin messages.
 */

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Inbox, MessageSquare, Briefcase, GraduationCap, Shield, Send,
  ArrowLeft, PenSquare, Search, Mail,
} from 'lucide-react';

interface Conversation {
  id: string;
  type: 'application' | 'direct' | 'education' | 'admin';
  subject: string;
  otherPartyName: string;
  otherPartyId: string;
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
  metadata?: Record<string, unknown>;
}

interface Message {
  id: string;
  senderId: string;
  senderName: string;
  senderRole?: string;
  content: string;
  messageType?: string;
  readAt: string | null;
  createdAt: string;
  isOwn: boolean;
}

interface Recipient {
  id: string;
  name: string;
  role: string;
  institution: string | null;
}

const TABS = [
  { key: 'all', label: 'All', icon: Inbox },
  { key: 'applications', label: 'Applications', icon: Briefcase },
  { key: 'direct', label: 'Direct', icon: MessageSquare },
  { key: 'education', label: 'School', icon: GraduationCap },
  { key: 'admin', label: 'System', icon: Shield },
];

const typeIcons: Record<string, typeof Inbox> = {
  application: Briefcase,
  direct: MessageSquare,
  education: GraduationCap,
  admin: Shield,
};

export default function InboxPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('all');
  const [totalUnread, setTotalUnread] = useState(0);

  // Thread view
  const [selectedConvo, setSelectedConvo] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [threadLoading, setThreadLoading] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);

  // Compose dialog
  const [showCompose, setShowCompose] = useState(false);
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [recipientSearch, setRecipientSearch] = useState('');
  const [selectedRecipient, setSelectedRecipient] = useState<Recipient | null>(null);
  const [composeSubject, setComposeSubject] = useState('');
  const [composeMessage, setComposeMessage] = useState('');
  const [composeSending, setComposeSending] = useState(false);

  const fetchConversations = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/messages/inbox?tab=${tab}`);
      const data = await res.json();
      setConversations(data.conversations || []);
      setTotalUnread(data.totalUnread || 0);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  const openThread = async (convo: Conversation) => {
    setSelectedConvo(convo);
    setMessages([]);
    setThreadLoading(true);
    setReplyText('');

    try {
      let res;
      if (convo.type === 'application') {
        res = await fetch(`/api/messages/application/${convo.id}`);
      } else if (convo.type === 'direct') {
        res = await fetch(`/api/direct-messages/${convo.id}`);
      } else {
        // Education and admin messages are single messages, not threads
        setMessages([{
          id: convo.id,
          senderId: convo.otherPartyId,
          senderName: convo.otherPartyName,
          content: convo.lastMessage,
          createdAt: convo.lastMessageAt,
          readAt: null,
          isOwn: false,
        }]);
        setThreadLoading(false);
        return;
      }

      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
        // Refresh conversations to update unread counts
        fetchConversations();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setThreadLoading(false);
    }
  };

  const handleReply = async () => {
    if (!selectedConvo || !replyText.trim()) return;
    setSending(true);
    try {
      let res;
      if (selectedConvo.type === 'application') {
        res = await fetch(`/api/messages/application/${selectedConvo.id}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: replyText }),
        });
      } else if (selectedConvo.type === 'direct') {
        res = await fetch(`/api/direct-messages/${selectedConvo.id}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: replyText }),
        });
      }

      if (res?.ok) {
        const data = await res.json();
        setMessages((prev) => [...prev, data.message]);
        setReplyText('');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSending(false);
    }
  };

  // Compose: search recipients
  useEffect(() => {
    if (!showCompose) return;
    const timeout = setTimeout(async () => {
      try {
        const res = await fetch(`/api/compose/eligible-recipients?q=${encodeURIComponent(recipientSearch)}`);
        const data = await res.json();
        setRecipients(data.recipients || []);
      } catch (err) {
        console.error(err);
      }
    }, 300);
    return () => clearTimeout(timeout);
  }, [recipientSearch, showCompose]);

  const handleCompose = async () => {
    if (!selectedRecipient || !composeMessage.trim()) return;
    setComposeSending(true);
    try {
      const res = await fetch('/api/direct-messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientId: selectedRecipient.id,
          subject: composeSubject || undefined,
          content: composeMessage,
        }),
      });
      if (res.ok) {
        setShowCompose(false);
        setSelectedRecipient(null);
        setComposeSubject('');
        setComposeMessage('');
        setRecipientSearch('');
        fetchConversations();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setComposeSending(false);
    }
  };

  const formatTime = (dateStr: string) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    if (diff < 86400000) {
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    if (diff < 604800000) {
      return d.toLocaleDateString([], { weekday: 'short' });
    }
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  // Thread view
  if (selectedConvo) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => setSelectedConvo(null)}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Button>
          <div>
            <h2 className="font-semibold text-lg">{selectedConvo.subject}</h2>
            <p className="text-sm text-slate-500">with {selectedConvo.otherPartyName}</p>
          </div>
        </div>

        {threadLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16" />)}
          </div>
        ) : (
          <div className="space-y-3 max-h-[60vh] overflow-y-auto">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.isOwn ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[70%] rounded-lg px-4 py-3 ${
                    msg.isOwn
                      ? 'bg-teal-600 text-white'
                      : msg.messageType === 'system'
                        ? 'bg-amber-50 border border-amber-200 text-amber-800'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white'
                  }`}
                >
                  {!msg.isOwn && (
                    <p className={`text-xs font-medium mb-1 ${msg.isOwn ? 'text-teal-100' : 'text-slate-500'}`}>
                      {msg.senderName}
                    </p>
                  )}
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                  <p className={`text-xs mt-1 ${msg.isOwn ? 'text-teal-200' : 'text-slate-400'}`}>
                    {formatTime(msg.createdAt)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {(selectedConvo.type === 'application' || selectedConvo.type === 'direct') && (
          <div className="flex gap-2">
            <Textarea
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder="Type a message..."
              rows={2}
              className="flex-1"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleReply();
                }
              }}
            />
            <Button
              onClick={handleReply}
              disabled={sending || !replyText.trim()}
              className="bg-teal-600 hover:bg-teal-700 self-end"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    );
  }

  // Inbox list view
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Messages</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Your conversations and notifications
            {totalUnread > 0 && (
              <Badge className="ml-2 bg-teal-600">{totalUnread} unread</Badge>
            )}
          </p>
        </div>
        <Button className="bg-teal-600 hover:bg-teal-700" onClick={() => setShowCompose(true)}>
          <PenSquare className="h-4 w-4 mr-2" /> Compose
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <Button
            key={t.key}
            variant={tab === t.key ? 'default' : 'outline'}
            size="sm"
            onClick={() => { setTab(t.key); }}
            className={tab === t.key ? 'bg-teal-600 hover:bg-teal-700' : ''}
          >
            <t.icon className="h-3 w-3 mr-1" />
            {t.label}
          </Button>
        ))}
      </div>

      {/* Conversation list */}
      {loading && (
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-20" />)}
        </div>
      )}

      {!loading && conversations.length === 0 && (
        <Card>
          <CardContent className="py-16 text-center">
            <Mail className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <h3 className="font-medium text-slate-600">No messages yet</h3>
            <p className="text-sm text-slate-400 mt-1">
              {tab === 'all'
                ? 'Start a conversation or wait for messages from others'
                : `No ${tab} messages`}
            </p>
          </CardContent>
        </Card>
      )}

      {!loading && conversations.length > 0 && (
        <div className="space-y-1">
          {conversations.map((convo) => {
            const Icon = typeIcons[convo.type] || MessageSquare;
            return (
              <Card
                key={`${convo.type}-${convo.id}`}
                className={`cursor-pointer transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50 ${
                  convo.unreadCount > 0 ? 'border-l-4 border-l-teal-500' : ''
                }`}
                onClick={() => openThread(convo)}
              >
                <CardContent className="py-3 px-4">
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                      <Icon className="h-5 w-5 text-slate-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className={`text-sm truncate ${convo.unreadCount > 0 ? 'font-bold' : 'font-medium'}`}>
                            {convo.otherPartyName}
                          </span>
                          <Badge variant="outline" className="text-[10px] px-1 py-0 shrink-0">
                            {convo.type === 'application' ? 'App' : convo.type}
                          </Badge>
                        </div>
                        <span className="text-xs text-slate-400 shrink-0 ml-2">
                          {formatTime(convo.lastMessageAt)}
                        </span>
                      </div>
                      <p className={`text-sm truncate ${convo.unreadCount > 0 ? 'text-slate-700 dark:text-slate-200' : 'text-slate-500'}`}>
                        {convo.subject}
                      </p>
                      <p className="text-xs text-slate-400 truncate mt-0.5">
                        {convo.lastMessage}
                      </p>
                    </div>
                    {convo.unreadCount > 0 && (
                      <Badge className="bg-teal-600 shrink-0">{convo.unreadCount}</Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Compose Dialog */}
      <Dialog open={showCompose} onOpenChange={setShowCompose}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>New Message</DialogTitle>
            <DialogDescription>Send a direct message</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {!selectedRecipient ? (
              <div className="space-y-2">
                <Label>To</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <Input
                    className="pl-9"
                    placeholder="Search for a recipient..."
                    value={recipientSearch}
                    onChange={(e) => setRecipientSearch(e.target.value)}
                  />
                </div>
                {recipients.length > 0 && (
                  <div className="max-h-40 overflow-y-auto border rounded-md">
                    {recipients.map((r) => (
                      <button
                        key={r.id}
                        className="w-full text-left px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 text-sm flex items-center justify-between"
                        onClick={() => setSelectedRecipient(r)}
                      >
                        <span>{r.name}</span>
                        <span className="text-xs text-slate-400">{r.role.replace('_', ' ')}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Label>To:</Label>
                <Badge className="bg-teal-600">
                  {selectedRecipient.name}
                  <button className="ml-1 text-xs" onClick={() => setSelectedRecipient(null)}>&times;</button>
                </Badge>
              </div>
            )}
            <div className="space-y-2">
              <Label>Subject (optional)</Label>
              <Input
                value={composeSubject}
                onChange={(e) => setComposeSubject(e.target.value)}
                placeholder="Subject..."
              />
            </div>
            <div className="space-y-2">
              <Label>Message *</Label>
              <Textarea
                value={composeMessage}
                onChange={(e) => setComposeMessage(e.target.value)}
                placeholder="Write your message..."
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCompose(false)}>Cancel</Button>
            <Button
              onClick={handleCompose}
              disabled={composeSending || !selectedRecipient || !composeMessage.trim()}
              className="bg-teal-600 hover:bg-teal-700"
            >
              <Send className="h-4 w-4 mr-2" />
              {composeSending ? 'Sending...' : 'Send'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
