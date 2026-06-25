import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useGetCalendarEvents, getGetCalendarEventsQueryKey, useSyncCalendar } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useQueryClient } from "@tanstack/react-query";
import { Calendar as CalendarIcon, RefreshCw, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleString([], { 
    weekday: 'short', 
    month: 'short', 
    day: 'numeric',
    hour: '2-digit', 
    minute: '2-digit' 
  });
}

function getScoreColor(score: number | null | undefined) {
  if (score === null || score === undefined) return "bg-muted text-muted-foreground";
  if (score >= 9) return "bg-destructive text-destructive-foreground";
  if (score >= 7) return "bg-orange-500 text-white";
  if (score >= 4) return "bg-yellow-500 text-white";
  return "bg-green-500 text-white";
}

export default function Calendar() {
  const { email } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const { data: events, isLoading, error } = useGetCalendarEvents(email || "", {
    query: {
      enabled: !!email,
      queryKey: getGetCalendarEventsQueryKey(email || "")
    }
  });

  const syncCalendar = useSyncCalendar();

  const handleSync = () => {
    if (!email) return;
    
    syncCalendar.mutate({ userEmail: email }, {
      onSuccess: (data) => {
        toast({
          title: "Synchronization Complete",
          description: `Generated ${data.sessions_created} new focus sessions.`,
        });
        queryClient.invalidateQueries({ queryKey: getGetCalendarEventsQueryKey(email) });
      },
      onError: () => {
        toast({
          title: "Sync Failed",
          description: "Could not synchronize with Google Calendar.",
          variant: "destructive"
        });
      }
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid gap-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight uppercase font-mono">Calendar Intelligence</h1>
          <p className="text-muted-foreground mt-1">Gemini AI analysis of upcoming events.</p>
        </div>
        <Button 
          onClick={handleSync} 
          disabled={syncCalendar.isPending}
          className="font-mono uppercase tracking-wider"
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${syncCalendar.isPending ? 'animate-spin' : ''}`} />
          {syncCalendar.isPending ? 'Syncing...' : 'Sync with Gemini'}
        </Button>
      </div>

      {error ? (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="pt-6 flex items-start gap-4">
            <AlertCircle className="h-5 w-5 text-destructive mt-0.5" />
            <div>
              <h3 className="font-semibold text-destructive">Connection Error</h3>
              <p className="text-sm text-destructive/80 mt-1">Failed to retrieve calendar events. Make sure your Google Calendar is connected in Settings.</p>
            </div>
          </CardContent>
        </Card>
      ) : events && events.length > 0 ? (
        <div className="space-y-4">
          {events.map((event) => (
            <Card key={event.event_id} className="overflow-hidden transition-all hover:border-primary/50">
              <div className="flex flex-col md:flex-row">
                <div className="p-4 md:p-6 md:w-1/4 bg-muted/30 border-b md:border-b-0 md:border-r flex flex-col justify-center">
                  <div className="text-xs text-muted-foreground font-mono uppercase tracking-wider mb-1">Start Time</div>
                  <div className="font-medium">{formatTime(event.start_time)}</div>
                  <div className="text-xs text-muted-foreground font-mono uppercase tracking-wider mt-4 mb-1">End Time</div>
                  <div className="font-medium">{formatTime(event.end_time)}</div>
                </div>
                <div className="p-4 md:p-6 flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="text-xl font-semibold">{event.title}</h3>
                    {event.description && (
                      <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{event.description}</p>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-3 mt-4 pt-4 border-t border-border/50">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono uppercase text-muted-foreground">AI Focus Score:</span>
                      <Badge className={`font-mono ${getScoreColor(event.ai_focus_score)}`} variant="outline">
                        {event.ai_focus_score !== null && event.ai_focus_score !== undefined ? `${event.ai_focus_score}/10` : 'N/A'}
                      </Badge>
                    </div>
                    {event.suggested_intensity && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono uppercase text-muted-foreground">Intensity:</span>
                        <Badge variant="secondary" className="font-mono uppercase text-[10px]">
                          {event.suggested_intensity}
                        </Badge>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="border-dashed">
          <CardContent className="pt-10 pb-10 flex flex-col items-center justify-center text-center">
            <CalendarIcon className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-xl font-bold">No events found</h3>
            <p className="text-muted-foreground mt-2 max-w-md">
              Sync your calendar to let Gemini AI analyze your upcoming events and schedule focus sessions.
            </p>
            <Button onClick={handleSync} disabled={syncCalendar.isPending} variant="outline" className="mt-6 font-mono uppercase">
              Trigger Initial Sync
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
