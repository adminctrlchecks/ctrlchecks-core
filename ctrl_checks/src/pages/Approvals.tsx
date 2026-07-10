import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { awsClient } from '@/integrations/aws/client';
import { ENDPOINTS } from '@/config/endpoints';
import { CheckCircle, XCircle, Loader2, ShieldAlert } from 'lucide-react';
import { AppChromeHeader } from '@/components/layout/AppChromeHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';

interface NodeApproval {
  id: string;
  execution_id: string;
  workflow_id: string;
  node_id: string;
  status: 'pending' | 'approved' | 'rejected';
  preview: Record<string, unknown>;
  requested_at: string;
}

async function authorizedFetch(path: string, init?: RequestInit) {
  const { data: sessionData } = await awsClient.auth.getSession();
  return fetch(`${ENDPOINTS.itemBackend}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(sessionData?.session?.access_token
        ? { Authorization: `Bearer ${sessionData.session.access_token}` }
        : {}),
      ...(init?.headers || {}),
    },
  });
}

export default function Approvals() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [approvals, setApprovals] = useState<NodeApproval[]>([]);
  const [loading, setLoading] = useState(true);
  const [respondingId, setRespondingId] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/signin');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      loadApprovals();
    }
  }, [user]);

  const loadApprovals = async () => {
    try {
      const response = await authorizedFetch('/api/execution-node-approvals');
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to load approvals');
      setApprovals(data.approvals || []);
    } catch (error) {
      console.error('Error loading approvals:', error);
      toast({ title: 'Error', description: 'Failed to load pending approvals', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const respond = async (approval: NodeApproval, approved: boolean) => {
    if (respondingId) return;
    setRespondingId(approval.id);
    try {
      const response = await authorizedFetch(`/api/execution-node-approvals/${approval.id}/respond`, {
        method: 'POST',
        body: JSON.stringify({ approved }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to respond');

      toast({
        title: approved ? 'Approved' : 'Rejected',
        description: approved
          ? 'Workflow execution has resumed.'
          : 'Workflow execution has been stopped.',
      });
      setApprovals((prev) => prev.filter((a) => a.id !== approval.id));
    } catch (error: any) {
      console.error('Error responding to approval:', error);
      toast({ title: 'Error', description: error?.message || 'Failed to respond', variant: 'destructive' });
    } finally {
      setRespondingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <AppChromeHeader />
      <div className="container mx-auto max-w-3xl px-4 py-8">
        <div className="mb-6 flex items-center gap-2">
          <ShieldAlert className="h-5 w-5 text-muted-foreground" />
          <h1 className="text-xl font-semibold">Pending Approvals</h1>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : approvals.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              No pending approvals right now.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {approvals.map((approval) => (
              <Card key={approval.id}>
                <CardContent className="py-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">
                        Node <span className="font-mono text-xs">{approval.node_id}</span>
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Requested {new Date(approval.requested_at).toLocaleString()}
                      </p>
                    </div>
                    <Badge variant="outline">{approval.status}</Badge>
                  </div>

                  <pre className="max-h-40 overflow-auto rounded bg-muted/40 p-2 text-xs">
                    {JSON.stringify(approval.preview, null, 2)}
                  </pre>

                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="flex-1"
                      disabled={respondingId === approval.id}
                      onClick={() => respond(approval, true)}
                    >
                      <CheckCircle className="mr-1.5 h-3.5 w-3.5" />
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      className="flex-1"
                      disabled={respondingId === approval.id}
                      onClick={() => respond(approval, false)}
                    >
                      <XCircle className="mr-1.5 h-3.5 w-3.5" />
                      Reject
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
