import { useState, useRef, useEffect } from 'react';
import { useVaultStore, ChatSession, ChatMessage } from '@/lib/store';
import { useChatWithVault } from '@/lib/api-client';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  MessageSquare,
  Send,
  Plus,
  Trash2,
  ChevronDown,
  Sparkles,
  BookOpen,
} from 'lucide-react';

function nanoid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

function CitationChip({ citation }: { citation: { path: string; title: string; excerpt: string } }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative inline-block mr-1 mb-1">
      <button
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-1 text-xs bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 rounded px-1.5 py-0.5 transition-colors"
      >
        <BookOpen className="h-3 w-3 shrink-0" />
        <span className="max-w-32 truncate">{citation.title}</span>
        <ChevronDown className={cn('h-3 w-3 transition-transform shrink-0', open && 'rotate-180')} />
      </button>
      {open && (
        <div className="absolute bottom-full mb-1 left-0 z-50 w-64 bg-popover border border-border rounded-lg shadow-lg p-3 text-xs text-muted-foreground">
          <div className="font-semibold text-foreground mb-1">{citation.title}</div>
          <div className="text-muted-foreground font-mono text-[10px] mb-2">{citation.path}</div>
          <div className="leading-relaxed">{citation.excerpt}</div>
        </div>
      )}
    </div>
  );
}

export default function AIChatPage() {
  const {
    notes,
    chatSessions,
    activeChatSessionId,
    addChatSession,
    setActiveChatSession,
    addChatMessage,
    updateChatSession,
    deleteChatSession,
  } = useVaultStore();
  const { toast } = useToast();
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const { mutateAsync: chat, isPending } = useChatWithVault();

  const activeSession = chatSessions.find((s) => s.id === activeChatSessionId) ?? null;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeSession?.messages.length]);

  const createNewSession = () => {
    const session: ChatSession = {
      id: nanoid(),
      title: 'New conversation',
      messages: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    addChatSession(session);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const sendMessage = async () => {
    const q = input.trim();
    if (!q || isPending) return;

    let sessionId = activeChatSessionId;
    if (!sessionId) {
      const session: ChatSession = {
        id: nanoid(),
        title: q.slice(0, 48),
        messages: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      addChatSession(session);
      sessionId = session.id;
    }

    const userMsg: ChatMessage = {
      id: nanoid(),
      role: 'user',
      content: q,
      createdAt: new Date().toISOString(),
    };
    addChatMessage(sessionId, userMsg);
    setInput('');

    const currentSession = useVaultStore.getState().chatSessions.find((s) => s.id === sessionId)!;
    if (currentSession && currentSession.messages.length <= 1) {
      updateChatSession(sessionId, { title: q.slice(0, 48) });
    }

    const noteList = Object.values(notes).map((n) => ({
      path: n.path,
      title: n.title,
      content: n.content.slice(0, 600),
    }));

    const history = (currentSession?.messages ?? []).slice(-10).map((m) => ({
      role: m.role,
      content: m.content,
    }));

    try {
      const result = await chat({
        data: { question: q, notes: noteList, history },
      });

      const assistantMsg: ChatMessage = {
        id: nanoid(),
        role: 'assistant',
        content: result.answer,
        citations: result.citations,
        createdAt: new Date().toISOString(),
      };
      addChatMessage(sessionId, assistantMsg);
    } catch (e: any) {
      toast({ title: 'Chat failed', description: e.message, variant: 'destructive' });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const noteCount = Object.keys(notes).length;

  return (
    <div className="flex h-full overflow-hidden">
      {/* Session list */}
      <div className="w-56 border-r border-border flex flex-col bg-sidebar shrink-0 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-sidebar-border">
          <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            Conversations
          </span>
          <button
            onClick={createNewSession}
            className="h-5 w-5 flex items-center justify-center rounded hover:bg-sidebar-accent text-muted-foreground hover:text-foreground transition-colors"
            title="New chat"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto py-1">
          {chatSessions.length === 0 && (
            <div className="px-4 py-6 text-xs text-muted-foreground text-center">No conversations yet</div>
          )}
          {chatSessions.map((s) => (
            <div
              key={s.id}
              onClick={() => setActiveChatSession(s.id)}
              className={cn(
                'group flex items-start gap-2 px-3 py-2.5 cursor-pointer hover:bg-sidebar-accent/60 transition-colors',
                s.id === activeChatSessionId && 'bg-sidebar-accent text-sidebar-accent-foreground'
              )}
            >
              <MessageSquare className="h-3.5 w-3.5 mt-0.5 shrink-0 text-muted-foreground" />
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium truncate">{s.title}</div>
                <div className="text-xs text-muted-foreground">{s.messages.length} msg</div>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); deleteChatSession(s.id); }}
                className="opacity-0 group-hover:opacity-100 h-4 w-4 flex items-center justify-center rounded hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-all shrink-0"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Chat area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-3">
            <Sparkles className="h-5 w-5 text-muted-foreground" />
            <div>
              <h1 className="font-serif text-xl font-bold text-foreground">
                {activeSession?.title ?? 'AI Chat'}
              </h1>
              <p className="text-xs text-muted-foreground">
                {noteCount} note{noteCount !== 1 ? 's' : ''} in vault
              </p>
            </div>
          </div>
          {!activeSession && (
            <Button size="sm" onClick={createNewSession} className="gap-1.5">
              <Plus className="h-3.5 w-3.5" />
              New chat
            </Button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {!activeSession || activeSession.messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center gap-3 pb-8">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                <Sparkles className="h-7 w-7 text-muted-foreground" />
              </div>
              <h2 className="font-serif text-xl font-semibold">Chat with your vault</h2>
              <p className="text-sm text-muted-foreground max-w-sm">
                Ask questions, find connections, synthesize ideas — answers are grounded in your notes.
              </p>
              <div className="grid gap-2 mt-2 w-full max-w-sm">
                {[
                  'What are the key themes across my research notes?',
                  'Summarize my ideas about machine learning',
                  'What tasks are still unfinished?',
                ].map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => { setInput(suggestion); inputRef.current?.focus(); }}
                    className="text-left text-sm px-4 py-2.5 rounded-lg border border-border hover:bg-muted/60 transition-colors text-muted-foreground hover:text-foreground"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {activeSession.messages.map((msg) => (
                <div key={msg.id} className={cn('flex', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
                  <div
                    className={cn(
                      'max-w-[78%] rounded-2xl px-4 py-3 text-sm leading-relaxed',
                      msg.role === 'user'
                        ? 'bg-primary text-primary-foreground rounded-br-sm'
                        : 'bg-muted text-foreground rounded-bl-sm'
                    )}
                  >
                    <div className="whitespace-pre-wrap">{msg.content}</div>
                    {msg.citations && msg.citations.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-white/10">
                        <div className="text-xs opacity-70 mb-1.5">Sources:</div>
                        <div className="flex flex-wrap">
                          {msg.citations.map((c) => (
                            <CitationChip key={c.path} citation={c} />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {isPending && (
                <div className="flex justify-start">
                  <div className="bg-muted rounded-2xl rounded-bl-sm px-4 py-3">
                    <div className="flex gap-1 items-center h-4">
                      <span className="w-1.5 h-1.5 bg-muted-foreground/60 rounded-full animate-bounce [animation-delay:0ms]" />
                      <span className="w-1.5 h-1.5 bg-muted-foreground/60 rounded-full animate-bounce [animation-delay:150ms]" />
                      <span className="w-1.5 h-1.5 bg-muted-foreground/60 rounded-full animate-bounce [animation-delay:300ms]" />
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        <div className="px-6 py-4 border-t border-border">
          <div className="flex items-end gap-2 bg-muted/40 rounded-xl border border-border px-4 py-2">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask your vault anything… (Enter to send, Shift+Enter for newline)"
              rows={1}
              className="flex-1 bg-transparent resize-none outline-none text-sm placeholder:text-muted-foreground max-h-32 leading-6"
              onInput={(e) => {
                const t = e.target as HTMLTextAreaElement;
                t.style.height = 'auto';
                t.style.height = `${Math.min(t.scrollHeight, 128)}px`;
              }}
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim() || isPending}
              className="mb-0.5 h-7 w-7 flex items-center justify-center rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0"
            >
              <Send className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
