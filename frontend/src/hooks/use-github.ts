import { useEffect, useState } from 'react';
import { useVaultStore } from '@/lib/store';
import { githubClient } from '@/lib/github';
import { useToast } from '@/hooks/use-toast';

export function useGithub() {
  const { settings, setNotes } = useVaultStore();
  const { toast } = useToast();
  const [isSyncing, setIsSyncing] = useState(false);
  
  useEffect(() => {
    if (settings.githubPAT && settings.repoOwner && settings.repoName) {
      githubClient.initialize(settings.githubPAT, settings.repoOwner, settings.repoName, settings.defaultBranch);
    }
  }, [settings.githubPAT, settings.repoOwner, settings.repoName, settings.defaultBranch]);

  const syncNotes = async () => {
    if (!githubClient.isInitialized()) return;
    
    setIsSyncing(true);
    try {
      const { notes } = useVaultStore.getState();
      const existingPositions = Object.fromEntries(
        Object.entries(notes).map(([path, note]) => [path, note.position])
      );
      
      const newNotes = await githubClient.syncAllNotes(existingPositions);
      setNotes(newNotes);
      toast({ title: 'Synced with GitHub', description: `Loaded ${Object.keys(newNotes).length} notes.` });
    } catch (e: any) {
      toast({ title: 'Sync failed', description: e.message, variant: 'destructive' });
    } finally {
      setIsSyncing(false);
    }
  };

  const saveNote = async (path: string, content: string, sha?: string) => {
    try {
      const newSha = await githubClient.saveFile(path, content, sha);
      return newSha;
    } catch (e: any) {
      toast({ title: 'Save failed', description: e.message, variant: 'destructive' });
      throw e;
    }
  };

  return { syncNotes, isSyncing, saveNote, isInitialized: githubClient.isInitialized() };
}
