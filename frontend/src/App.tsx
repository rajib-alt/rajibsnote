import { Switch, Route } from 'wouter';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Layout } from '@/components/layout/Layout';
import { ThemeProvider } from 'next-themes';
import { useVaultStore } from '@/lib/store';
import NotFound from '@/pages/not-found';
import { KeyboardShortcuts } from '@/components/KeyboardShortcuts';
import CanvasPage from '@/pages/canvas';
import GraphPage from '@/pages/graph';
import KanbanPage from '@/pages/kanban';
import SettingsPage from '@/pages/settings';
import NoteEditorPage from '@/pages/note-editor';
import RoadmapPage from '@/pages/roadmap';
import DailyNotesPage from '@/pages/daily-notes';
import AIChatPage from '@/pages/ai-chat';
import TemplatesPage from '@/pages/templates';
import StatsPage from '@/pages/stats';

const queryClient = new QueryClient();

function Router() {
  const { activeNotePath } = useVaultStore();
  return (
    <Switch>
      <Route path="/">{activeNotePath ? <NoteEditorPage /> : <CanvasPage />}</Route>
      <Route path="/canvas" component={CanvasPage} />
      <Route path="/graph" component={GraphPage} />
      <Route path="/kanban" component={KanbanPage} />
      <Route path="/roadmap" component={RoadmapPage} />
      <Route path="/daily" component={DailyNotesPage} />
      <Route path="/chat" component={AIChatPage} />
      <Route path="/templates" component={TemplatesPage} />
      <Route path="/stats" component={StatsPage} />
      <Route path="/settings" component={SettingsPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Layout><Router /></Layout>
          <KeyboardShortcuts />
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
