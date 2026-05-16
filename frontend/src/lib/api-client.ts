import { useMutation } from '@tanstack/react-query';

const BASE = '/api';

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((err as any).error ?? res.statusText);
  }
  return res.json();
}

// Annotate a note
export function useAnnotateNote() {
  return useMutation({
    mutationFn: (vars: { data: { title: string; content: string; existingNotes?: { path: string; title: string }[] } }) =>
      post<{ type: string; annotation: string; suggestedConnections: string[]; tags: string[]; summary: string | null }>(
        '/ai/annotate', vars.data
      ),
  });
}

// Suggest connections
export function useSuggestConnections() {
  return useMutation({
    mutationFn: (vars: { data: { notes: { path: string; title: string; content?: string }[] } }) =>
      post<{ connections: { source: string; target: string; reason: string; strength: number }[] }>(
        '/ai/suggest-connections', vars.data
      ),
  });
}

// Synthesize notes
export function useSynthesizeNotes() {
  return useMutation({
    mutationFn: (vars: { data: { notes: { path: string; title: string; content?: string }[]; prompt: string } }) =>
      post<{ title: string; synthesis: string; keyInsights: string[]; suggestedConnections: string[] }>(
        '/ai/synthesize', vars.data
      ),
  });
}

// Suggest placement
export function useSuggestPlacement() {
  return useMutation({
    mutationFn: (vars: { data: { title: string; content: string; existingNotes?: { path: string; title: string }[]; existingFolders?: string[] } }) =>
      post<{ suggestedFolder: string; backlinks: { path: string; title: string; reason: string }[]; reasoning: string }>(
        '/ai/suggest-placement', vars.data
      ),
  });
}

// Chat with vault
export function useChatWithVault() {
  return useMutation({
    mutationFn: (vars: { data: { question: string; notes: { path: string; title: string; content?: string }[]; history?: { role: string; content: string }[] } }) =>
      post<{ answer: string; citations: { path: string; title: string; excerpt: string }[] }>(
        '/ai/chat', vars.data
      ),
  });
}

// Generate roadmap
export function useGenerateRoadmap() {
  return useMutation({
    mutationFn: (vars: { data: { topic: string; currentLevel?: string | null; goal?: string | null; timeframe?: string | null } }) =>
      post<{
        title: string;
        description: string;
        estimatedTime: string | null;
        phases: {
          title: string;
          description: string;
          duration: string | null;
          steps: { title: string; description: string; resources: string[]; isOptional: boolean }[];
        }[];
      }>('/ai/generate-roadmap', vars.data),
  });
}

// Batch annotate notes
export function useAnnotateNotesBatch() {
  return useMutation({
    mutationFn: (vars: { data: { notes: { path: string; title: string; content?: string }[] } }) =>
      post<{ results: { path: string; annotation: { type: string; annotation: string; tags: string[]; summary: string | null } }[] }>(
        '/ai/annotate-batch', vars.data
      ),
  });
}
