'use client';

import { useState, useEffect, useRef, useCallback, type KeyboardEvent } from 'react';
import { csrfFetch } from '@/lib/security/csrf-fetch';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { UsageMeter } from '@/components/coaching/usage-meter';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import {
  Bot,
  Send,
  Plus,
  MessageSquare,
  FileText,
  Users,
  Mail,
  Compass,
  Trash2,
  Menu,
  Sparkles,
  Loader2,
  AlertCircle,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Conversation {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
}

interface UsageData {
  used: number;
  limit: number;
  remaining: number;
  plan: string;
  model: string;
}

type QuickAction = 'resume_review' | 'interview_prep' | 'cover_letter' | 'career_advice';

const QUICK_ACTION_MESSAGES: Record<QuickAction, string> = {
  resume_review:
    "I'd like help reviewing and improving my resume. Can you help me create a strong resume that highlights my skills and experience?",
  interview_prep:
    "I'm preparing for an interview. Can you help me prepare with common questions and strategies?",
  cover_letter:
    "I need help writing a compelling cover letter. Can you guide me through the process?",
  career_advice:
    "I'd like career advice. Can you help me think about my career path and next steps?",
};

const QUICK_ACTIONS: { key: QuickAction; label: string; icon: typeof FileText }[] = [
  { key: 'resume_review', label: 'Resume Review', icon: FileText },
  { key: 'interview_prep', label: 'Interview Prep', icon: Users },
  { key: 'cover_letter', label: 'Cover Letter', icon: Mail },
  { key: 'career_advice', label: 'Career Advice', icon: Compass },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function CoachingPanel() {
  // ---- state ----------------------------------------------------------------
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { toast } = useToast();

  // ---- helpers --------------------------------------------------------------

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingContent, scrollToBottom]);

  // ---- data fetching --------------------------------------------------------

  const fetchConversations = useCallback(async () => {
    try {
      const res = await fetch('/api/ai/conversations');
      if (!res.ok) throw new Error('Failed to load conversations');
      const data = await res.json();
      setConversations(data.conversations ?? []);
    } catch {
      // silently fail - conversations list is non-critical
    }
  }, []);

  const fetchUsage = useCallback(async () => {
    try {
      const res = await fetch('/api/ai/usage');
      if (!res.ok) throw new Error('Failed to load usage');
      const data = await res.json();
      setUsage(data);
    } catch {
      // usage is non-critical
    }
  }, []);

  const fetchMessages = useCallback(async (conversationId: string) => {
    try {
      const res = await fetch(`/api/ai/conversations/${conversationId}`);
      if (!res.ok) throw new Error('Failed to load messages');
      const data = await res.json();
      setMessages(data.messages ?? []);
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to load conversation messages.',
        variant: 'destructive',
      });
    }
  }, [toast]);

  // ---- initial load ---------------------------------------------------------

  useEffect(() => {
    async function init() {
      setLoading(true);
      await Promise.all([fetchConversations(), fetchUsage()]);
      setLoading(false);
    }
    init();
  }, [fetchConversations, fetchUsage]);

  // ---- conversation selection -----------------------------------------------

  const selectConversation = useCallback(
    async (id: string) => {
      setActiveConversation(id);
      setMessages([]);
      setStreamingContent('');
      setError(null);
      await fetchMessages(id);
      setSidebarOpen(false);
    },
    [fetchMessages],
  );

  // ---- create conversation --------------------------------------------------

  const createConversation = useCallback(async (): Promise<string | null> => {
    try {
      const res = await csrfFetch('/api/ai/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      if (!res.ok) throw new Error('Failed to create conversation');
      const data = await res.json();
      const newConv: Conversation = data.conversation;
      setConversations((prev) => [newConv, ...prev]);
      setActiveConversation(newConv.id);
      setMessages([]);
      setStreamingContent('');
      setError(null);
      return newConv.id;
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to create a new conversation.',
        variant: 'destructive',
      });
      return null;
    }
  }, [toast]);

  // ---- delete conversation --------------------------------------------------

  const deleteConversation = useCallback(
    async (id: string) => {
      setDeletingId(id);
      try {
        const res = await csrfFetch(`/api/ai/conversations/${id}`, { method: 'DELETE' });
        if (!res.ok) throw new Error('Failed to delete');
        setConversations((prev) => prev.filter((c) => c.id !== id));
        if (activeConversation === id) {
          setActiveConversation(null);
          setMessages([]);
        }
      } catch {
        toast({
          title: 'Error',
          description: 'Failed to delete conversation.',
          variant: 'destructive',
        });
      } finally {
        setDeletingId(null);
      }
    },
    [activeConversation, toast],
  );

  // ---- send message (streaming) ---------------------------------------------

  const sendMessage = useCallback(
    async (text: string, conversationId?: string) => {
      const convId = conversationId ?? activeConversation;
      if (!convId || !text.trim()) return;

      const userMessage: Message = {
        id: `temp-${Date.now()}`,
        role: 'user',
        content: text.trim(),
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, userMessage]);
      setInput('');
      setSending(true);
      setStreaming(true);
      setStreamingContent('');
      setError(null);

      try {
        const response = await csrfFetch('/api/ai/chat/stream', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            conversationId: convId,
            message: text.trim(),
          }),
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.error || 'Failed to send message');
        }

        const reader = response.body?.getReader();
        if (!reader) throw new Error('No response stream');

        const decoder = new TextDecoder();
        let accumulated = '';
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          // Parse SSE events split by double newlines
          const parts = buffer.split('\n\n');
          // Keep the last potentially incomplete chunk in the buffer
          buffer = parts.pop() ?? '';

          for (const part of parts) {
            if (!part.trim()) continue;

            const lines = part.split('\n');
            let eventType = '';
            let eventData = '';

            for (const line of lines) {
              if (line.startsWith('event: ')) {
                eventType = line.slice(7).trim();
              } else if (line.startsWith('data: ')) {
                eventData = line.slice(6);
              }
            }

            if (eventType === 'token' && eventData) {
              try {
                const parsed = JSON.parse(eventData);
                accumulated += parsed.token ?? parsed.content ?? '';
                setStreamingContent(accumulated);
              } catch {
                // raw text token
                accumulated += eventData;
                setStreamingContent(accumulated);
              }
            } else if (eventType === 'done') {
              // Finalize the assistant message
              let finalContent = accumulated;
              if (eventData) {
                try {
                  const parsed = JSON.parse(eventData);
                  finalContent = parsed.content ?? accumulated;
                } catch {
                  // keep accumulated
                }
              }
              const assistantMsg: Message = {
                id: `msg-${Date.now()}`,
                role: 'assistant',
                content: finalContent,
                createdAt: new Date().toISOString(),
              };
              setMessages((prev) => [...prev, assistantMsg]);
              setStreamingContent('');
              accumulated = '';
              // Refresh usage after a completed response
              fetchUsage();
              // Refresh conversations to pick up title changes
              fetchConversations();
            } else if (eventType === 'error') {
              let errorMsg = 'An error occurred';
              if (eventData) {
                try {
                  const parsed = JSON.parse(eventData);
                  errorMsg = parsed.error ?? parsed.message ?? errorMsg;
                } catch {
                  errorMsg = eventData;
                }
              }
              setError(errorMsg);
              toast({
                title: 'AI Error',
                description: errorMsg,
                variant: 'destructive',
              });
            }
          }
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to send message';
        setError(errorMessage);
        toast({
          title: 'Error',
          description: errorMessage,
          variant: 'destructive',
        });
      } finally {
        setSending(false);
        setStreaming(false);
      }
    },
    [activeConversation, fetchUsage, fetchConversations, toast],
  );

  // ---- quick action ---------------------------------------------------------

  const handleQuickAction = useCallback(
    async (action: QuickAction) => {
      let convId = activeConversation;
      if (!convId) {
        convId = await createConversation();
      }
      if (!convId) return;
      const message = QUICK_ACTION_MESSAGES[action];
      await sendMessage(message, convId);
    },
    [activeConversation, createConversation, sendMessage],
  );

  // ---- new chat -------------------------------------------------------------

  const handleNewChat = useCallback(async () => {
    await createConversation();
    setSidebarOpen(false);
    textareaRef.current?.focus();
  }, [createConversation]);

  // ---- keyboard handling ----------------------------------------------------

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        if (input.trim() && !streaming && !sending) {
          sendMessage(input);
        }
      }
    },
    [input, streaming, sending, sendMessage],
  );

  // ---- loading state --------------------------------------------------------

  if (loading) {
    return (
      <Card className="flex h-full">
        <div className="w-64 border-r p-4 space-y-3 hidden md:block">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
        </div>
        <div className="flex-1 p-6 space-y-4">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-96 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      </Card>
    );
  }

  // ---- sidebar content (shared between desktop & mobile sheet) --------------

  const sidebarContent = (
    <div className="flex flex-col h-full">
      <Button
        onClick={handleNewChat}
        className="w-full bg-teal-600 hover:bg-teal-700 mb-4"
      >
        <Plus className="h-4 w-4 mr-2" />
        New Chat
      </Button>

      <Separator className="mb-3" />

      <div className="flex-1 overflow-y-auto space-y-1">
        {conversations.length === 0 && (
          <p className="text-xs text-slate-400 text-center py-4">
            No conversations yet
          </p>
        )}
        {conversations.map((conv) => (
          <div
            key={conv.id}
            className={cn(
              'group flex items-center gap-2 rounded-md px-3 py-2 text-sm cursor-pointer transition-colors',
              activeConversation === conv.id
                ? 'bg-teal-50 border border-teal-300 text-teal-900 dark:bg-teal-900/20 dark:border-teal-700 dark:text-teal-100'
                : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300',
            )}
            onClick={() => selectConversation(conv.id)}
          >
            <MessageSquare className="h-3.5 w-3.5 shrink-0 text-slate-400" />
            <div className="flex-1 min-w-0">
              <p className="truncate text-sm font-medium">
                {conv.title || 'New conversation'}
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">
                {new Date(conv.updatedAt || conv.createdAt).toLocaleDateString()}
              </p>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                deleteConversation(conv.id);
              }}
              className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/30 transition-opacity"
              disabled={deletingId === conv.id}
              aria-label="Delete conversation"
            >
              {deletingId === conv.id ? (
                <Loader2 className="h-3 w-3 animate-spin text-red-500" />
              ) : (
                <Trash2 className="h-3 w-3 text-red-500" />
              )}
            </button>
          </div>
        ))}
      </div>
    </div>
  );

  // ---- render ---------------------------------------------------------------

  const canSend = input.trim().length > 0 && !streaming && !sending;
  const showQuickActions = messages.length === 0 && !streaming;

  return (
    <Card className="flex h-full overflow-hidden">
      {/* Desktop sidebar */}
      <div className="hidden md:flex w-64 flex-col border-r p-4">
        {sidebarContent}
      </div>

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b bg-white dark:bg-slate-900">
          <div className="flex items-center gap-3">
            {/* Mobile sidebar trigger */}
            <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72 p-4">
                <SheetHeader className="mb-4">
                  <SheetTitle>Conversations</SheetTitle>
                </SheetHeader>
                {sidebarContent}
              </SheetContent>
            </Sheet>

            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-teal-600" />
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                AI Coach
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {usage && (
              <UsageMeter
                used={usage.used}
                limit={usage.limit}
                remaining={usage.remaining}
                plan={usage.plan}
              />
            )}
            {usage?.plan && (
              <Badge className="bg-teal-100 text-teal-700 border-0 hidden sm:inline-flex">
                {usage.plan}
              </Badge>
            )}
          </div>
        </div>

        {/* Messages area */}
        <ScrollArea className="flex-1">
          <div className="p-4 space-y-4 min-h-full">
            {/* Empty state with quick actions */}
            {showQuickActions && (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="w-16 h-16 rounded-full bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center mb-4">
                  <Bot className="h-8 w-8 text-teal-600" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-1">
                  How can I help you today?
                </h3>
                <p className="text-sm text-slate-500 mb-8 text-center max-w-md">
                  I can help with resume reviews, interview prep, cover letters, and career advice. Choose a topic or type your question below.
                </p>

                <div className="grid grid-cols-2 gap-3 w-full max-w-lg">
                  {QUICK_ACTIONS.map((action) => {
                    const Icon = action.icon;
                    return (
                      <button
                        key={action.key}
                        onClick={() => handleQuickAction(action.key)}
                        disabled={streaming || sending}
                        className="flex items-center gap-3 p-4 rounded-lg border bg-white dark:bg-slate-800 hover:border-teal-300 hover:shadow-sm transition-all text-left disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <div className="w-10 h-10 rounded-lg bg-teal-50 dark:bg-teal-900/30 flex items-center justify-center shrink-0">
                          <Icon className="h-5 w-5 text-teal-600" />
                        </div>
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                          {action.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Messages */}
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={cn(
                  'flex',
                  msg.role === 'user' ? 'justify-end' : 'justify-start',
                )}
              >
                <div
                  className={cn(
                    'flex gap-3 max-w-[80%]',
                    msg.role === 'user' ? 'flex-row-reverse' : 'flex-row',
                  )}
                >
                  {msg.role === 'assistant' && (
                    <div className="w-8 h-8 rounded-full bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center shrink-0 mt-1">
                      <Bot className="h-4 w-4 text-teal-600" />
                    </div>
                  )}
                  <div
                    className={cn(
                      'rounded-2xl px-4 py-3 text-sm leading-relaxed',
                      msg.role === 'user'
                        ? 'bg-teal-600 text-white rounded-br-md'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-bl-md',
                    )}
                  >
                    <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                  </div>
                </div>
              </div>
            ))}

            {/* Streaming response */}
            {streaming && streamingContent && (
              <div className="flex justify-start">
                <div className="flex gap-3 max-w-[80%]">
                  <div className="w-8 h-8 rounded-full bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center shrink-0 mt-1">
                    <Bot className="h-4 w-4 text-teal-600" />
                  </div>
                  <div className="rounded-2xl rounded-bl-md px-4 py-3 bg-slate-100 dark:bg-slate-800 text-sm leading-relaxed text-slate-900 dark:text-slate-100">
                    <p className="whitespace-pre-wrap break-words">
                      {streamingContent}
                      <span className="inline-block w-1.5 h-4 bg-teal-600 ml-0.5 animate-pulse rounded-sm" />
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Streaming indicator with no content yet */}
            {streaming && !streamingContent && (
              <div className="flex justify-start">
                <div className="flex gap-3 max-w-[80%]">
                  <div className="w-8 h-8 rounded-full bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center shrink-0 mt-1">
                    <Bot className="h-4 w-4 text-teal-600" />
                  </div>
                  <div className="rounded-2xl rounded-bl-md px-4 py-3 bg-slate-100 dark:bg-slate-800">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 bg-teal-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-2 h-2 bg-teal-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-2 h-2 bg-teal-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Error display */}
            {error && !streaming && (
              <div className="flex justify-center">
                <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 px-4 py-2 rounded-lg">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Input bar */}
        <div className="border-t bg-white dark:bg-slate-900 p-4">
          {!activeConversation && messages.length === 0 ? (
            <div className="flex items-center gap-2">
              <Textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={async (e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    if (!input.trim() || streaming || sending) return;
                    // Create a conversation first, then send
                    const newId = await createConversation();
                    if (newId) {
                      await sendMessage(input, newId);
                    }
                  }
                }}
                placeholder="Ask your AI coach anything..."
                className="flex-1 resize-none min-h-[44px] max-h-32"
                rows={1}
                disabled={streaming || sending}
              />
              <Button
                onClick={async () => {
                  if (!input.trim() || streaming || sending) return;
                  const newId = await createConversation();
                  if (newId) {
                    await sendMessage(input, newId);
                  }
                }}
                disabled={!input.trim() || streaming || sending}
                className="bg-teal-600 hover:bg-teal-700 h-11 px-4 shrink-0"
              >
                {sending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask your AI coach anything..."
                className="flex-1 resize-none min-h-[44px] max-h-32"
                rows={1}
                disabled={streaming || sending}
              />
              <Button
                onClick={() => sendMessage(input)}
                disabled={!canSend}
                className="bg-teal-600 hover:bg-teal-700 h-11 px-4 shrink-0"
              >
                {sending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
