import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowRightLeft, Lightbulb, Code } from 'lucide-react';
import { NodeUsageGuide } from './nodeTypes';

interface NodeUsageCardProps {
  guide: NodeUsageGuide;
  nodeLabel: string;
}

export default function NodeUsageCard({ guide }: NodeUsageCardProps) {
  return (
    <Card className="min-w-0 max-w-full overflow-hidden border-primary/20 bg-primary/5" data-testid="node-usage-card">
      <CardContent className="min-w-0 max-w-full overflow-hidden p-3">
        <Tabs defaultValue="overview" className="w-full min-w-0 max-w-full">
          <TabsList className="grid w-full min-w-0 max-w-full grid-cols-3 h-8">
            <TabsTrigger value="overview" className="min-w-0 truncate px-1 text-xs">Overview</TabsTrigger>
            <TabsTrigger value="io" className="min-w-0 truncate px-1 text-xs">I/O</TabsTrigger>
            <TabsTrigger value="example" className="min-w-0 truncate px-1 text-xs">Example</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-2 min-w-0 max-w-full overflow-hidden">
            <p className="text-xs text-muted-foreground leading-relaxed break-words">
              {guide.overview}
            </p>
            {guide.tips && guide.tips.length > 0 && (
              <div className="mt-3 min-w-0 max-w-full space-y-1 overflow-hidden">
                <div className="flex items-center gap-1 text-xs font-medium text-primary">
                  <Lightbulb className="h-3 w-3 shrink-0" />
                  Tips
                </div>
                <ul className="min-w-0 max-w-full space-y-1 text-xs text-muted-foreground">
                  {guide.tips.map((tip, i) => (
                    <li key={i} className="flex min-w-0 max-w-full items-start gap-1.5">
                      <span className="text-primary shrink-0">•</span>
                      <span className="min-w-0 break-words">{tip}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </TabsContent>

          <TabsContent value="io" className="mt-2 min-w-0 max-w-full space-y-3 overflow-hidden">
            <div className="min-w-0 max-w-full overflow-hidden">
              <div className="flex items-center gap-1 text-xs font-medium mb-1">
                <ArrowRightLeft className="h-3 w-3 shrink-0 text-green-500" />
                <span className="text-green-600">Inputs</span>
              </div>
              <div className="flex min-w-0 max-w-full flex-wrap gap-1">
                {guide.inputs.map((input, i) => (
                  <Badge key={i} variant="outline" className="max-w-full truncate text-xs bg-green-500/10 border-green-500/30">
                    {input}
                  </Badge>
                ))}
              </div>
            </div>
            <div className="min-w-0 max-w-full overflow-hidden">
              <div className="flex items-center gap-1 text-xs font-medium mb-1">
                <ArrowRightLeft className="h-3 w-3 shrink-0 text-blue-500" />
                <span className="text-blue-600">Outputs</span>
              </div>
              <div className="flex min-w-0 max-w-full flex-wrap gap-1">
                {guide.outputs.map((output, i) => (
                  <Badge key={i} variant="outline" className="max-w-full truncate text-xs bg-blue-500/10 border-blue-500/30">
                    {output}
                  </Badge>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="example" className="mt-2 min-w-0 max-w-full overflow-hidden">
            <div className="flex items-center gap-1 text-xs font-medium mb-2 text-primary">
              <Code className="h-3 w-3 shrink-0" />
              Example Usage
            </div>
            <div className="max-h-[140px] min-w-0 max-w-full overflow-y-auto overflow-x-hidden rounded-md">
              <pre className="min-w-0 max-w-full whitespace-pre-wrap break-words rounded-md bg-muted/50 p-2 font-mono text-xs">
                {guide.example}
              </pre>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
