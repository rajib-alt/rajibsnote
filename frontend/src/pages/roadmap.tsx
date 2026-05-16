import { useState } from 'react';
import { useVaultStore, Roadmap, RoadmapPhase, RoadmapStep } from '@/lib/store';
import { useGenerateRoadmap } from '@/lib/api-client';
import { useToast } from '@/hooks/use-toast';
import {
  Sparkles,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  Circle,
  Trash2,
  Plus,
  BookOpen,
  Clock,
  Target,
  Map,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';

function generateId() {
  return Math.random().toString(36).slice(2, 10);
}

export default function RoadmapPage() {
  const { roadmaps, addRoadmap, updateRoadmapStep, deleteRoadmap } = useVaultStore();
  const { toast } = useToast();
  const generateRoadmap = useGenerateRoadmap();

  const [topic, setTopic] = useState('');
  const [currentLevel, setCurrentLevel] = useState('beginner');
  const [goal, setGoal] = useState('');
  const [timeframe, setTimeframe] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [expandedRoadmap, setExpandedRoadmap] = useState<string | null>(null);
  const [expandedPhases, setExpandedPhases] = useState<Set<string>>(new Set());

  const handleGenerate = async () => {
    if (!topic.trim()) {
      toast({ title: 'Please enter a topic', variant: 'destructive' });
      return;
    }

    try {
      const result = await generateRoadmap.mutateAsync({
        data: {
          topic: topic.trim(),
          currentLevel: currentLevel || null,
          goal: goal.trim() || null,
          timeframe: timeframe.trim() || null,
        },
      });

      const roadmap: Roadmap = {
        id: generateId(),
        topic: topic.trim(),
        title: result.title,
        description: result.description,
        estimatedTime: result.estimatedTime ?? null,
        createdAt: new Date().toISOString(),
        phases: result.phases.map((p) => ({
          id: generateId(),
          title: p.title,
          description: p.description,
          duration: p.duration ?? null,
          steps: p.steps.map((s) => ({
            id: generateId(),
            title: s.title,
            description: s.description,
            resources: s.resources ?? [],
            isOptional: s.isOptional ?? false,
            completed: false,
          })),
        })),
      };

      addRoadmap(roadmap);
      setExpandedRoadmap(roadmap.id);
      // Expand all phases by default
      const phaseIds = new Set(roadmap.phases.map((p) => `${roadmap.id}:${p.id}`));
      setExpandedPhases(phaseIds);
      setShowForm(false);
      setTopic('');
      setGoal('');
      setTimeframe('');
      toast({ title: 'Roadmap generated!' });
    } catch (e: any) {
      toast({ title: 'Generation failed', description: e.message, variant: 'destructive' });
    }
  };

  const togglePhase = (roadmapId: string, phaseId: string) => {
    const key = `${roadmapId}:${phaseId}`;
    setExpandedPhases((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const getProgress = (phases: RoadmapPhase[]) => {
    const all = phases.flatMap((p) => p.steps);
    const done = all.filter((s) => s.completed).length;
    return { done, total: all.length, pct: all.length > 0 ? Math.round((done / all.length) * 100) : 0 };
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-3xl mx-auto px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Map className="h-5 w-5 text-primary" />
              <h1 className="text-2xl font-serif font-bold text-foreground">Learning Roadmaps</h1>
            </div>
            <p className="text-sm text-muted-foreground">
              AI-generated step-by-step plans for mastering any skill
            </p>
          </div>
          <Button
            onClick={() => setShowForm(!showForm)}
            className="gap-2"
            size="sm"
          >
            <Plus className="h-4 w-4" />
            New Roadmap
          </Button>
        </div>

        {/* Generation form */}
        {showForm && (
          <div className="border border-border/60 rounded-lg p-5 mb-8 bg-card/50 backdrop-blur-sm">
            <h2 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              Generate a Learning Roadmap
            </h2>

            <div className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">
                  What do you want to learn? *
                </label>
                <Input
                  placeholder="e.g. Machine Learning, Bengali language, Guitar, Web Development..."
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
                  className="text-sm"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">
                    Current level
                  </label>
                  <select
                    className="w-full text-sm rounded-md border border-input bg-background px-3 py-2 text-foreground"
                    value={currentLevel}
                    onChange={(e) => setCurrentLevel(e.target.value)}
                  >
                    <option value="beginner">Beginner</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="advanced">Advanced</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">
                    Timeframe (optional)
                  </label>
                  <Input
                    placeholder="e.g. 3 months"
                    value={timeframe}
                    onChange={(e) => setTimeframe(e.target.value)}
                    className="text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">
                    Specific goal (optional)
                  </label>
                  <Input
                    placeholder="e.g. Build a web app"
                    value={goal}
                    onChange={(e) => setGoal(e.target.value)}
                    className="text-sm"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <Button
                  onClick={handleGenerate}
                  disabled={generateRoadmap.isPending || !topic.trim()}
                  className="gap-2"
                  size="sm"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  {generateRoadmap.isPending ? 'Generating...' : 'Generate Roadmap'}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowForm(false)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Empty state */}
        {roadmaps.length === 0 && !showForm && (
          <div className="text-center py-20 text-muted-foreground">
            <Map className="h-12 w-12 mx-auto mb-4 opacity-20" />
            <p className="text-base font-medium mb-1">No roadmaps yet</p>
            <p className="text-sm opacity-60 mb-4">
              Generate a personalized learning plan for any skill using AI
            </p>
            <Button onClick={() => setShowForm(true)} variant="outline" className="gap-2">
              <Sparkles className="h-4 w-4" />
              Create your first roadmap
            </Button>
          </div>
        )}

        {/* Roadmaps list */}
        <div className="space-y-4">
          {roadmaps.map((roadmap) => {
            const progress = getProgress(roadmap.phases);
            const isExpanded = expandedRoadmap === roadmap.id;

            return (
              <div
                key={roadmap.id}
                className="border border-border/60 rounded-lg overflow-hidden bg-card/30"
              >
                {/* Roadmap header */}
                <div
                  className="flex items-center gap-3 px-5 py-4 cursor-pointer hover:bg-muted/20 transition-colors"
                  onClick={() => setExpandedRoadmap(isExpanded ? null : roadmap.id)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                      <h3 className="font-semibold text-foreground text-sm truncate">
                        {roadmap.title}
                      </h3>
                      <Badge variant="outline" className="text-[10px] capitalize shrink-0">
                        {roadmap.topic}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-1">
                      {roadmap.description}
                    </p>
                    {/* Progress bar */}
                    <div className="flex items-center gap-2 mt-2">
                      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary/60 rounded-full transition-all"
                          style={{ width: `${progress.pct}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-muted-foreground shrink-0">
                        {progress.done}/{progress.total} steps
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    {roadmap.estimatedTime && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {roadmap.estimatedTime}
                      </div>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteRoadmap(roadmap.id);
                      }}
                      className="h-6 w-6 flex items-center justify-center rounded hover:bg-destructive/10 hover:text-destructive text-muted-foreground/50 transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                </div>

                {/* Phases */}
                {isExpanded && (
                  <div className="border-t border-border/40 divide-y divide-border/30">
                    {roadmap.phases.map((phase, phaseIdx) => {
                      const phaseKey = `${roadmap.id}:${phase.id}`;
                      const phaseExpanded = expandedPhases.has(phaseKey);
                      const phaseDone = phase.steps.filter((s) => s.completed).length;

                      return (
                        <div key={phase.id}>
                          {/* Phase header */}
                          <div
                            className="flex items-center gap-3 px-5 py-3 cursor-pointer hover:bg-muted/10 transition-colors"
                            onClick={() => togglePhase(roadmap.id, phase.id)}
                          >
                            <div className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0">
                              {phaseIdx + 1}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-foreground">
                                  {phase.title}
                                </span>
                                {phase.duration && (
                                  <span className="text-[10px] text-muted-foreground">
                                    {phase.duration}
                                  </span>
                                )}
                                <span className="text-[10px] text-muted-foreground ml-auto">
                                  {phaseDone}/{phase.steps.length}
                                </span>
                              </div>
                              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                                {phase.description}
                              </p>
                            </div>
                            {phaseExpanded ? (
                              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                            ) : (
                              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                            )}
                          </div>

                          {/* Steps */}
                          {phaseExpanded && (
                            <div className="pb-2">
                              {phase.steps.map((step) => (
                                <StepItem
                                  key={step.id}
                                  step={step}
                                  onToggle={(completed) =>
                                    updateRoadmapStep(roadmap.id, phase.id, step.id, completed)
                                  }
                                />
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function StepItem({
  step,
  onToggle,
}: {
  step: RoadmapStep;
  onToggle: (completed: boolean) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div
      className={cn(
        'mx-4 my-1 rounded-md border transition-colors',
        step.completed
          ? 'border-border/30 bg-muted/20 opacity-60'
          : 'border-border/40 bg-card/50 hover:border-border/60'
      )}
    >
      <div
        className="flex items-start gap-3 px-3 py-2.5 cursor-pointer"
        onClick={() => setOpen(!open)}
      >
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggle(!step.completed);
          }}
          className="mt-0.5 shrink-0"
        >
          {step.completed ? (
            <CheckCircle2 className="h-4.5 w-4.5 text-primary" />
          ) : (
            <Circle className="h-4.5 w-4.5 text-muted-foreground/50 hover:text-primary/60 transition-colors" />
          )}
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span
              className={cn(
                'text-sm font-medium',
                step.completed ? 'line-through text-muted-foreground' : 'text-foreground'
              )}
            >
              {step.title}
            </span>
            {step.isOptional && (
              <Badge variant="outline" className="text-[9px] py-0">
                optional
              </Badge>
            )}
          </div>
        </div>
        <ChevronRight
          className={cn(
            'h-3.5 w-3.5 text-muted-foreground shrink-0 transition-transform mt-0.5',
            open && 'rotate-90'
          )}
        />
      </div>

      {open && (
        <div className="px-10 pb-3 space-y-2">
          <p className="text-xs text-muted-foreground leading-relaxed">{step.description}</p>
          {step.resources.length > 0 && (
            <div>
              <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider mb-1">
                Resources
              </p>
              <ul className="space-y-0.5">
                {step.resources.map((r, i) => (
                  <li key={i} className="text-xs text-primary/70 flex items-start gap-1">
                    <span className="mt-1 shrink-0">•</span>
                    {r}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
