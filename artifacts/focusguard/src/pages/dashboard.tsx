import { useGetDashboard, getGetDashboardQueryKey } from "@workspace/api-client-react";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Activity, Calendar, Clock, ShieldAlert, Target } from "lucide-react";
import { useEffect, useState } from "react";

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function CountdownTimer({ endTime }: { endTime: string }) {
  const [timeLeft, setTimeLeft] = useState("");

  useEffect(() => {
    const end = new Date(endTime).getTime();
    
    const updateTimer = () => {
      const now = new Date().getTime();
      const diff = end - now;
      
      if (diff <= 0) {
        setTimeLeft("00:00:00");
        return;
      }
      
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      
      setTimeLeft(
        `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
      );
    };
    
    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [endTime]);

  return <span className="font-mono tabular-nums text-4xl font-bold">{timeLeft}</span>;
}

export default function Dashboard() {
  const { email } = useAuth();
  const { data: dashboard, isLoading, error } = useGetDashboard(email || "", {
    query: {
      enabled: !!email,
      queryKey: getGetDashboardQueryKey(email || "")
    }
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold tracking-tight">System Status</h1>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error || !dashboard) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <div className="text-center space-y-2">
          <ShieldAlert className="h-10 w-10 text-destructive mx-auto" />
          <h2 className="text-xl font-bold">System Error</h2>
          <p className="text-muted-foreground">Unable to fetch dashboard telemetry.</p>
        </div>
      </div>
    );
  }

  const { active_session, upcoming_sessions, total_sessions_today, focus_minutes_today, top_blocked_sites } = dashboard;

  return (
    <div className="space-y-8 pb-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight uppercase font-mono">System Status</h1>
          <p className="text-muted-foreground mt-1">Real-time telemetry and overview.</p>
        </div>
        <div className="flex items-center gap-2 border px-4 py-2 rounded-md bg-card">
          <span className="relative flex h-3 w-3">
            {active_session ? (
              <>
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
              </>
            ) : (
              <span className="relative inline-flex rounded-full h-3 w-3 bg-muted-foreground"></span>
            )}
          </span>
          <span className="font-mono font-medium text-sm tracking-widest">
            {active_session ? "LIVE" : "STANDBY"}
          </span>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Focus Minutes</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono">{focus_minutes_today}</div>
            <p className="text-xs text-muted-foreground mt-1">Logged today</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sessions</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono">{total_sessions_today}</div>
            <p className="text-xs text-muted-foreground mt-1">Completed today</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Upcoming</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono">{upcoming_sessions.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Scheduled sessions</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Blocks Triggered</CardTitle>
            <ShieldAlert className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono">{top_blocked_sites.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Unique sites blocked</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className={`lg:col-span-2 ${active_session ? 'border-green-500/50 shadow-[0_0_15px_rgba(34,197,94,0.1)]' : ''}`}>
          <CardHeader>
            <CardTitle className="uppercase tracking-widest font-mono text-sm">Active Session</CardTitle>
          </CardHeader>
          <CardContent>
            {active_session ? (
              <div className="space-y-6">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-2xl font-bold">{active_session.event_title}</h3>
                    <p className="text-muted-foreground mt-1">{active_session.ai_reason || "AI generated focus session based on calendar context."}</p>
                  </div>
                  <Badge variant={
                    active_session.focus_intensity === 'critical' ? 'destructive' :
                    active_session.focus_intensity === 'high' ? 'default' : 'secondary'
                  } className="font-mono uppercase">
                    Level: {active_session.focus_intensity}
                  </Badge>
                </div>
                
                <div className="p-6 bg-card border rounded-lg flex flex-col items-center justify-center space-y-2">
                  <span className="text-sm font-medium text-muted-foreground uppercase tracking-widest">Time Remaining</span>
                  <CountdownTimer endTime={active_session.end_time} />
                  <span className="text-xs text-muted-foreground mt-2 font-mono">
                    Ends at {formatTime(active_session.end_time)}
                  </span>
                </div>
              </div>
            ) : (
              <div className="h-48 flex flex-col items-center justify-center text-center space-y-3">
                <Activity className="h-8 w-8 text-muted-foreground" />
                <div>
                  <p className="text-lg font-medium">No Active Session</p>
                  <p className="text-sm text-muted-foreground">FocusGuard is in standby mode.</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="uppercase tracking-widest font-mono text-sm">Upcoming Operations</CardTitle>
          </CardHeader>
          <CardContent>
            {upcoming_sessions.length > 0 ? (
              <div className="space-y-4">
                {upcoming_sessions.map(session => (
                  <div key={session.session_id} className="flex flex-col space-y-2 p-3 border rounded-md">
                    <div className="flex justify-between items-start">
                      <span className="font-medium truncate mr-2" title={session.event_title}>{session.event_title}</span>
                      <span className="text-xs font-mono text-muted-foreground shrink-0">{formatTime(session.start_time)}</span>
                    </div>
                    <Badge variant="outline" className="w-fit text-[10px] font-mono uppercase">{session.focus_intensity}</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-48 flex flex-col items-center justify-center text-center">
                <p className="text-sm text-muted-foreground">No upcoming sessions today.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
