import { useCallback, useEffect, useMemo, useState } from 'react';
import { Edit, Eye, EyeOff, Plus, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AdminChromeHeader } from '@/components/layout/AdminChromeHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import {
  createLandingDemoScenario,
  deleteLandingDemoScenario,
  getLandingDemoScenarios,
  type LandingDemoScenario,
  type LandingDemoScript,
} from '@/lib/api/admin';

const defaultScript: LandingDemoScript = {
  steps: [
    {
      id: 'n1',
      type: 'node',
      delayMs: 200,
      node: {
        label: 'New Event',
        icon: 'webhook',
        category: 'trigger',
        position: { x: 70, y: 160 },
      },
    },
    {
      id: 'n2',
      type: 'node',
      delayMs: 650,
      node: {
        label: 'Take Action',
        icon: 'email',
        category: 'communication',
        position: { x: 520, y: 160 },
      },
    },
    {
      id: 'e1',
      type: 'edge',
      delayMs: 950,
      edge: { source: 'n1', target: 'n2' },
    },
  ],
};

export default function LandingDemoManager() {
  const [scenarios, setScenarios] = useState<LandingDemoScenario[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const activeCount = useMemo(() => scenarios.filter((scenario) => scenario.isActive).length, [scenarios]);

  const loadScenarios = useCallback(async () => {
    try {
      setLoading(true);
      setScenarios(await getLandingDemoScenarios());
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to load landing demo scenarios',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadScenarios();
  }, [loadScenarios]);

  async function handleCreate() {
    try {
      setCreating(true);
      const scenario = await createLandingDemoScenario({
        label: 'New landing demo scenario',
        sortOrder: scenarios.length,
        isActive: false,
        script: defaultScript,
      });
      toast({ title: 'Scenario created', description: 'Opening the editor.' });
      navigate(`/admin/landing-demo/${scenario.id}/edit`);
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create scenario',
        variant: 'destructive',
      });
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(scenario: LandingDemoScenario) {
    if (!window.confirm(`Delete "${scenario.label}"?`)) return;

    try {
      await deleteLandingDemoScenario(scenario.id);
      toast({ title: 'Scenario deleted' });
      await loadScenarios();
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to delete scenario',
        variant: 'destructive',
      });
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <AdminChromeHeader />
      <main className="container mx-auto space-y-6 p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold">Landing Demo</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {activeCount} active scenarios shown on the public homepage.
            </p>
          </div>
          <Button onClick={handleCreate} disabled={creating}>
            <Plus className="mr-2 h-4 w-4" />
            {creating ? 'Creating...' : 'Create Scenario'}
          </Button>
        </div>

        {loading ? (
          <p className="text-sm text-muted-foreground">Loading landing demo scenarios...</p>
        ) : (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {scenarios.map((scenario) => (
              <Card key={scenario.id}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <CardTitle className="text-lg leading-snug">{scenario.label}</CardTitle>
                    <Badge variant={scenario.isActive ? 'default' : 'secondary'}>
                      {scenario.isActive ? (
                        <Eye className="mr-1 h-3 w-3" />
                      ) : (
                        <EyeOff className="mr-1 h-3 w-3" />
                      )}
                      {scenario.isActive ? 'Active' : 'Hidden'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                    <span>Sort {scenario.sortOrder}</span>
                    <span>{scenario.script.steps.length} steps</span>
                    <span>{scenario.script.steps.filter((step) => step.type === 'node').length} nodes</span>
                    <span>{scenario.script.steps.filter((step) => step.type === 'edge').length} edges</span>
                  </div>
                  <div className="mt-4 flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => navigate(`/admin/landing-demo/${scenario.id}/edit`)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleDelete(scenario)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
