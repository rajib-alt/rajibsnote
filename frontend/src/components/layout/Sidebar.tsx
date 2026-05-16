import { useLocation, Link } from 'wouter';
import {
  Files,
  GitBranch,
  Settings,
  Share2,
  LayoutGrid,
  MousePointer2,
  Map,
  CalendarDays,
  MessageSquare,
  LayoutTemplate,
  BarChart2,
  Tag,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useVaultStore, SidebarPanel } from '@/lib/store';
import { FileTree } from '@/components/explorer/FileTree';
import { TagPanel } from '@/components/explorer/TagPanel';

const NAV_ITEMS: {
  icon: React.FC<{ className?: string }>;
  label: string;
  panel?: SidebarPanel;
  href?: string;
}[] = [
  { icon: Files, label: 'Explorer', panel: 'explorer' },
  { icon: Tag, label: 'Tags', panel: 'tags' },
  { icon: MousePointer2, label: 'Canvas', href: '/canvas' },
  { icon: Share2, label: 'Graph', href: '/graph' },
  { icon: LayoutGrid, label: 'Kanban', href: '/kanban' },
  { icon: CalendarDays, label: 'Daily Notes', href: '/daily' },
  { icon: MessageSquare, label: 'AI Chat', href: '/chat' },
  { icon: LayoutTemplate, label: 'Templates', href: '/templates' },
  { icon: Map, label: 'Roadmaps', href: '/roadmap' },
  { icon: BarChart2, label: 'Stats', href: '/stats' },
];

const BOTTOM_ITEMS: {
  icon: React.FC<{ className?: string }>;
  label: string;
  href: string;
}[] = [{ icon: Settings, label: 'Settings', href: '/settings' }];

export function Sidebar() {
  const [location] = useLocation();
  const { sidebarPanel, setSidebarPanel } = useVaultStore();

  const panelOpen = sidebarPanel !== null;

  const handlePanelToggle = (panel: SidebarPanel) => {
    if (sidebarPanel === panel) {
      setSidebarPanel(null);
    } else {
      setSidebarPanel(panel);
    }
  };

  return (
    <aside className="flex h-full shrink-0" style={{ zIndex: 10 }}>
      {/* Icon rail */}
      <div className="flex flex-col w-12 bg-sidebar border-r border-sidebar-border h-full py-2">
        <div className="flex flex-col gap-0.5 px-1.5 flex-1">
          {NAV_ITEMS.map((item) => {
            const isPanel = !!item.panel;
            const isPanelActive = isPanel && sidebarPanel === item.panel;
            const isRouteActive = item.href
              ? location === item.href
              : false;
            const isActive = isPanelActive || isRouteActive;

            if (item.href) {
              return (
                <Link key={item.href} href={item.href}>
                  <button
                    className={cn(
                      'w-full flex items-center justify-center h-9 rounded transition-colors',
                      isActive
                        ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                        : 'text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-foreground'
                    )}
                    title={item.label}
                  >
                    <item.icon className="h-4 w-4" />
                  </button>
                </Link>
              );
            }

            return (
              <button
                key={item.label}
                onClick={() => handlePanelToggle(item.panel!)}
                className={cn(
                  'w-full flex items-center justify-center h-9 rounded transition-colors',
                  isActive
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                    : 'text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-foreground'
                )}
                title={item.label}
              >
                <item.icon className="h-4 w-4" />
              </button>
            );
          })}
        </div>

        <div className="flex flex-col gap-0.5 px-1.5 pb-1">
          {BOTTOM_ITEMS.map((item) => (
            <Link key={item.href} href={item.href}>
              <button
                className={cn(
                  'w-full flex items-center justify-center h-9 rounded transition-colors',
                  location === item.href
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                    : 'text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-foreground'
                )}
                title={item.label}
              >
                <item.icon className="h-4 w-4" />
              </button>
            </Link>
          ))}
          <div className="flex items-center justify-center h-9 text-muted-foreground/40" title="GitHub Sync">
            <GitBranch className="h-4 w-4" />
          </div>
        </div>
      </div>

      {/* Panel */}
      {panelOpen && (
        <div className="w-64 bg-sidebar border-r border-sidebar-border flex flex-col h-full overflow-hidden">
          {sidebarPanel === 'explorer' && <FileTree />}
          {sidebarPanel === 'tags' && <TagPanel />}
        </div>
      )}
    </aside>
  );
}
