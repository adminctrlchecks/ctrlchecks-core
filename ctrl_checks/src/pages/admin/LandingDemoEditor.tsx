import { useEffect, useState } from 'react';
import { ArrowDown, ArrowLeft, ArrowUp, Plus, Save, Trash2 } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { AdminChromeHeader } from '@/components/layout/AdminChromeHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import {
  getLandingDemoScenario,
  updateLandingDemoScenario,
  type LandingDemoScenario,
  type LandingDemoStep,
} from '@/lib/api/admin';

function blankNodeStep(index: number): LandingDemoStep {
  return {
    id: `n${index}`,
    type: 'node',
    delayMs: index * 350,
    node: {
      label: 'New Node',
      icon: 'webhook',
      category: 'trigger',
      position: { x: 70 + index * 220, y: 160 },
    },
  };
}

function blankEdgeStep(index: number): LandingDemoStep {
  return {
    id: `e${index}`,
    type: 'edge',
    delayMs: index * 350,
    edge: { source: 'n1', target: 'n2' },
  };
}

export default function LandingDemoEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [scenario, setScenario] = useState<LandingDemoScenario | null>(null);
  const [label, setLabel] = useState('');
  const [sortOrder, setSortOrder] = useState(0);
  const [isActive, setIsActive] = useState(true);
  const [steps, setSteps] = useState<LandingDemoStep[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!id) return;

    async function loadScenario() {
      try {
        setLoading(true);
        const data = await getLandingDemoScenario(id);
        setScenario(data);
        setLabel(data.label);
        setSortOrder(data.sortOrder);
        setIsActive(data.isActive);
        setSteps(data.script.steps);
      } catch (error) {
        toast({
          title: 'Error',
          description: error instanceof Error ? error.message : 'Failed to load scenario',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    }

    loadScenario();
  }, [id, toast]);

  function updateStep(index: number, nextStep: LandingDemoStep) {
    setSteps((current) => current.map((step, i) => (i === index ? nextStep : step)));
  }

  function moveStep(index: number, direction: -1 | 1) {
    setSteps((current) => {
      const nextIndex = index + direction;
      if (nextIndex < 0 || nextIndex >= current.length) return current;
      const next = [...current];
      const [step] = next.splice(index, 1);
      next.splice(nextIndex, 0, step);
      return next;
    });
  }

  function addStep(type: 'node' | 'edge') {
    setSteps((current) => [
      ...current,
      type === 'node' ? blankNodeStep(current.length + 1) : blankEdgeStep(current.length + 1),
    ]);
  }

  async function handleSave() {
    if (!id) return;
    if (!label.trim()) {
      toast({ title: 'Validation error', description: 'Label is required.', variant: 'destructive' });
      return;
    }

    try {
      setSaving(true);
      const updated = await updateLandingDemoScenario(id, {
        label: label.trim(),
        sortOrder,
        isActive,
        script: { steps },
      });
      setScenario(updated);
      toast({ title: 'Scenario saved', description: 'The public endpoint will reflect this change shortly.' });
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to save scenario',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <AdminChromeHeader />
        <main className="container mx-auto p-6 text-sm text-muted-foreground">Loading scenario...</main>
      </div>
    );
  }

  if (!scenario) {
    return (
      <div className="min-h-screen bg-background">
        <AdminChromeHeader />
        <main className="container mx-auto p-6">Scenario not found.</main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <AdminChromeHeader />
      <main className="container mx-auto space-y-6 p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/admin/landing-demo')}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Edit Landing Demo</h1>
              <div className="mt-1 flex items-center gap-2">
                <Badge variant={isActive ? 'default' : 'secondary'}>{isActive ? 'Active' : 'Hidden'}</Badge>
                <span className="text-sm text-muted-foreground">{steps.length} reveal steps</span>
              </div>
            </div>
          </div>
          <Button onClick={handleSave} disabled={saving}>
            <Save className="mr-2 h-4 w-4" />
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </div>

        <section className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_220px_160px]">
          <div className="space-y-2">
            <Label htmlFor="landing-demo-label">Pill label</Label>
            <Input id="landing-demo-label" value={label} onChange={(event) => setLabel(event.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="landing-demo-sort">Sort order</Label>
            <Input
              id="landing-demo-sort"
              type="number"
              value={sortOrder}
              min={0}
              onChange={(event) => setSortOrder(Number(event.target.value) || 0)}
            />
          </div>
          <div className="flex items-end gap-2 pb-2">
            <Checkbox id="landing-demo-active" checked={isActive} onCheckedChange={(checked) => setIsActive(checked === true)} />
            <Label htmlFor="landing-demo-active">Active</Label>
          </div>
        </section>

        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => addStep('node')}>
            <Plus className="mr-2 h-4 w-4" />
            Node
          </Button>
          <Button variant="outline" size="sm" onClick={() => addStep('edge')}>
            <Plus className="mr-2 h-4 w-4" />
            Edge
          </Button>
        </div>

        <section className="space-y-4">
          {steps.map((step, index) => (
            <Card key={`${step.id}-${index}`}>
              <CardHeader>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <CardTitle className="text-base">Step {index + 1}</CardTitle>
                  <div className="flex gap-2">
                    <Button variant="outline" size="icon" onClick={() => moveStep(index, -1)} disabled={index === 0}>
                      <ArrowUp className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="icon" onClick={() => moveStep(index, 1)} disabled={index === steps.length - 1}>
                      <ArrowDown className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="icon" onClick={() => setSteps((current) => current.filter((_, i) => i !== index))}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label>Step id</Label>
                    <Input value={step.id} onChange={(event) => updateStep(index, { ...step, id: event.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Type</Label>
                    <Select
                      value={step.type}
                      onValueChange={(value: 'node' | 'edge') =>
                        updateStep(index, value === 'node' ? { ...blankNodeStep(index + 1), id: step.id } : { ...blankEdgeStep(index + 1), id: step.id })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="node">Node</SelectItem>
                        <SelectItem value="edge">Edge</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Delay ms</Label>
                    <Input
                      type="number"
                      value={step.delayMs}
                      min={0}
                      max={3000}
                      onChange={(event) => updateStep(index, { ...step, delayMs: Number(event.target.value) || 0 })}
                    />
                  </div>
                </div>

                {step.type === 'node' && step.node && (
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
                    <div className="space-y-2 md:col-span-2">
                      <Label>Node label</Label>
                      <Input value={step.node.label} onChange={(event) => updateStep(index, { ...step, node: { ...step.node!, label: event.target.value } })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Icon</Label>
                      <Input value={step.node.icon} onChange={(event) => updateStep(index, { ...step, node: { ...step.node!, icon: event.target.value } })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Category</Label>
                      <Input value={step.node.category} onChange={(event) => updateStep(index, { ...step, node: { ...step.node!, category: event.target.value } })} />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-2">
                        <Label>X</Label>
                        <Input
                          type="number"
                          value={step.node.position.x}
                          onChange={(event) =>
                            updateStep(index, {
                              ...step,
                              node: { ...step.node!, position: { ...step.node!.position, x: Number(event.target.value) || 0 } },
                            })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Y</Label>
                        <Input
                          type="number"
                          value={step.node.position.y}
                          onChange={(event) =>
                            updateStep(index, {
                              ...step,
                              node: { ...step.node!, position: { ...step.node!.position, y: Number(event.target.value) || 0 } },
                            })
                          }
                        />
                      </div>
                    </div>
                  </div>
                )}

                {step.type === 'edge' && step.edge && (
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                    <div className="space-y-2">
                      <Label>Source</Label>
                      <Input value={step.edge.source} onChange={(event) => updateStep(index, { ...step, edge: { ...step.edge!, source: event.target.value } })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Target</Label>
                      <Input value={step.edge.target} onChange={(event) => updateStep(index, { ...step, edge: { ...step.edge!, target: event.target.value } })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Handle</Label>
                      <Input value={step.edge.sourceHandle || ''} onChange={(event) => updateStep(index, { ...step, edge: { ...step.edge!, sourceHandle: event.target.value || undefined } })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Label</Label>
                      <Input value={step.edge.label || ''} onChange={(event) => updateStep(index, { ...step, edge: { ...step.edge!, label: event.target.value || undefined } })} />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </section>
      </main>
    </div>
  );
}
