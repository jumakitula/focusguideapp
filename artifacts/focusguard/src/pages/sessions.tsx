import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useListSessions, getListSessionsQueryKey, useSubmitCompletion } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { History, Shield, CheckCircle2, XCircle } from "lucide-react";

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleString([], { 
    month: 'short', 
    day: 'numeric',
    hour: '2-digit', 
    minute: '2-digit' 
  });
}

export default function Sessions() {
  const { email } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [proofModalOpen, setProofModalOpen] = useState(false);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [proofDescription, setProofDescription] = useState("");
  
  const { data: sessions, isLoading, error } = useListSessions(email || "", {
    query: {
      enabled: !!email,
      queryKey: getListSessionsQueryKey(email || "")
    }
  });

  const submitCompletion = useSubmitCompletion();

  const handleOpenProofModal = (sessionId: string) => {
    setSelectedSessionId(sessionId);
    setProofDescription("");
    setProofModalOpen(true);
  };

  const handleSubmitProof = () => {
    if (!email || !selectedSessionId || !proofDescription) return;
    
    submitCompletion.mutate({
      sessionId: selectedSessionId,
      data: {
        user_email: email,
        description: proofDescription
      }
    }, {
      onSuccess: (data) => {
        setProofModalOpen(false);
        toast({
          title: data.verified ? "Verification Successful" : "Verification Failed",
          description: data.message,
          variant: data.verified ? "default" : "destructive"
        });
        queryClient.invalidateQueries({ queryKey: getListSessionsQueryKey(email) });
      },
      onError: () => {
        toast({
          title: "Submission Error",
          description: "Failed to submit proof. Please try again.",
          variant: "destructive"
        });
      }
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight uppercase font-mono">Session History</h1>
        <p className="text-muted-foreground mt-1">Review past focus sessions and verification logs.</p>
      </div>

      {!sessions || sessions.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="pt-10 pb-10 flex flex-col items-center justify-center text-center">
            <History className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-xl font-bold">No sessions logged</h3>
            <p className="text-muted-foreground mt-2">Sessions will appear here once they are completed or active.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {sessions.map(session => {
            const isPast = new Date(session.end_time).getTime() < new Date().getTime();
            
            return (
              <Card key={session.session_id} className={session.is_active ? 'border-green-500/50 bg-green-500/5' : ''}>
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-bold">{session.event_title}</h3>
                        {session.is_active && <Badge className="bg-green-500 hover:bg-green-600 font-mono text-[10px]">LIVE</Badge>}
                      </div>
                      <div className="flex text-sm text-muted-foreground font-mono space-x-2">
                        <span>{formatTime(session.start_time)}</span>
                        <span>—</span>
                        <span>{formatTime(session.end_time)}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4 flex-wrap md:flex-nowrap">
                      <div className="flex items-center gap-1.5 text-sm bg-muted px-2 py-1 rounded-md font-mono">
                        <Shield className="h-3.5 w-3.5" />
                        <span className="uppercase text-[10px]">Intensity: {session.focus_intensity}</span>
                      </div>
                      
                      {session.override_count ? (
                        <div className="flex items-center gap-1.5 text-sm bg-destructive/10 text-destructive px-2 py-1 rounded-md font-mono">
                          <XCircle className="h-3.5 w-3.5" />
                          <span className="uppercase text-[10px]">{session.override_count} overrides</span>
                        </div>
                      ) : null}

                      {session.completed ? (
                        <div className="flex items-center gap-1.5 text-sm bg-green-500/10 text-green-600 dark:text-green-400 px-2 py-1 rounded-md font-mono">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          <span className="uppercase text-[10px]">Verified</span>
                        </div>
                      ) : isPast && !session.is_active ? (
                        <Button 
                          size="sm" 
                          variant="secondary"
                          className="font-mono text-xs uppercase"
                          onClick={() => handleOpenProofModal(session.session_id)}
                        >
                          Upload Proof
                        </Button>
                      ) : null}
                    </div>
                  </div>
                  
                  {session.ai_reason && (
                    <div className="mt-4 pt-4 border-t text-sm text-muted-foreground">
                      <span className="font-semibold text-foreground">AI Context: </span>
                      {session.ai_reason}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={proofModalOpen} onOpenChange={setProofModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-mono uppercase tracking-widest text-lg">Verification Upload</DialogTitle>
            <DialogDescription>
              Provide evidence that you completed the tasks required during this focus session.
              Gemini AI will analyze this to verify completion.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="proof">Description of completed work</Label>
              <Textarea 
                id="proof" 
                placeholder="I finished the quarterly report and sent the email..."
                value={proofDescription}
                onChange={(e) => setProofDescription(e.target.value)}
                rows={5}
                className="font-mono text-sm resize-none"
              />
            </div>
            <div className="p-3 bg-muted rounded-md border border-dashed border-muted-foreground/30 text-center">
              <span className="text-xs font-mono text-muted-foreground uppercase">Image upload coming soon</span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setProofModalOpen(false)}>Cancel</Button>
            <Button 
              onClick={handleSubmitProof} 
              disabled={!proofDescription || submitCompletion.isPending}
              className="font-mono uppercase"
            >
              {submitCompletion.isPending ? "Analyzing..." : "Submit Proof"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
