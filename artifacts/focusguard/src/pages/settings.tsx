import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useGetUserSettings, getGetUserSettingsQueryKey, useUpdateUserSettings } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { X, Save, AlertCircle } from "lucide-react";

export default function Settings() {
  const { email } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const { data: settings, isLoading } = useGetUserSettings(email || "", {
    query: {
      enabled: !!email,
      queryKey: getGetUserSettingsQueryKey(email || "")
    }
  });

  const updateSettings = useUpdateUserSettings();

  // Local state for editing
  const [blockedSites, setBlockedSites] = useState<string[]>([]);
  const [emergencySites, setEmergencySites] = useState<string[]>([]);
  const [siteInput, setSiteInput] = useState("");
  const [emergencyInput, setEmergencyInput] = useState("");
  const [triggerIntensity, setTriggerIntensity] = useState("medium");
  const [advanceMinutes, setAdvanceMinutes] = useState("5");

  // Sync server state to local state
  useEffect(() => {
    if (settings) {
      setBlockedSites(settings.blocked_sites || []);
      setEmergencySites(settings.emergency_sites || []);
      setTriggerIntensity(settings.trigger_intensity || "medium");
      setAdvanceMinutes(settings.advance_minutes?.toString() || "5");
    }
  }, [settings]);

  const handleSave = () => {
    if (!email) return;

    updateSettings.mutate({
      userEmail: email,
      data: {
        blocked_sites: blockedSites,
        emergency_sites: emergencySites,
        trigger_intensity: triggerIntensity,
        advance_minutes: parseInt(advanceMinutes, 10) || 5
      }
    }, {
      onSuccess: () => {
        toast({
          title: "Settings Updated",
          description: "Your configuration has been saved successfully.",
        });
        queryClient.invalidateQueries({ queryKey: getGetUserSettingsQueryKey(email) });
      },
      onError: () => {
        toast({
          title: "Error",
          description: "Failed to update settings.",
          variant: "destructive"
        });
      }
    });
  };

  const handleAddSite = (e: React.KeyboardEvent<HTMLInputElement>, list: string[], setList: (v: string[]) => void, input: string, setInput: (v: string) => void) => {
    if (e.key === 'Enter' && input.trim()) {
      e.preventDefault();
      const newSite = input.trim().toLowerCase();
      if (!list.includes(newSite)) {
        setList([...list, newSite]);
      }
      setInput("");
    }
  };

  const handleRemoveSite = (site: string, list: string[], setList: (v: string[]) => void) => {
    setList(list.filter(s => s !== site));
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      <div>
        <h1 className="text-3xl font-bold tracking-tight uppercase font-mono">System Configuration</h1>
        <p className="text-muted-foreground mt-1">Configure VPN blocking rules and AI trigger thresholds.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="font-mono uppercase tracking-widest text-sm text-muted-foreground">Identity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label>Active Account</Label>
              <Input value={email || ""} disabled className="font-mono bg-muted" />
              <p className="text-xs text-muted-foreground">To switch accounts, clear your browser data or logout from the sidebar.</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-mono uppercase tracking-widest text-sm text-destructive">Blocklist</CardTitle>
            <CardDescription>Domains to block during active focus sessions.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Input 
                placeholder="youtube.com (Press Enter)" 
                value={siteInput}
                onChange={(e) => setSiteInput(e.target.value)}
                onKeyDown={(e) => handleAddSite(e, blockedSites, setBlockedSites, siteInput, setSiteInput)}
                className="font-mono text-sm"
              />
            </div>
            <div className="flex flex-wrap gap-2 min-h-[60px] p-3 border rounded-md bg-muted/30">
              {blockedSites.length === 0 ? (
                <span className="text-sm text-muted-foreground italic w-full text-center py-2">No domains blocked</span>
              ) : (
                blockedSites.map(site => (
                  <Badge key={site} variant="secondary" className="flex items-center gap-1 pr-1 font-mono">
                    {site}
                    <button 
                      onClick={() => handleRemoveSite(site, blockedSites, setBlockedSites)}
                      className="hover:bg-muted rounded-full p-0.5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-mono uppercase tracking-widest text-sm text-green-500">Allowlist (Emergency)</CardTitle>
            <CardDescription>Domains that bypass all blocks.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Input 
                placeholder="github.com (Press Enter)" 
                value={emergencyInput}
                onChange={(e) => setEmergencyInput(e.target.value)}
                onKeyDown={(e) => handleAddSite(e, emergencySites, setEmergencySites, emergencyInput, setEmergencyInput)}
                className="font-mono text-sm"
              />
            </div>
            <div className="flex flex-wrap gap-2 min-h-[60px] p-3 border rounded-md bg-muted/30">
              {emergencySites.length === 0 ? (
                <span className="text-sm text-muted-foreground italic w-full text-center py-2">No emergency domains</span>
              ) : (
                emergencySites.map(site => (
                  <Badge key={site} variant="outline" className="flex items-center gap-1 pr-1 font-mono border-green-500/30">
                    {site}
                    <button 
                      onClick={() => handleRemoveSite(site, emergencySites, setEmergencySites)}
                      className="hover:bg-muted rounded-full p-0.5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="font-mono uppercase tracking-widest text-sm text-muted-foreground">Session Triggers</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label>Minimum AI Trigger Intensity</Label>
                <Select value={triggerIntensity} onValueChange={setTriggerIntensity}>
                  <SelectTrigger className="font-mono">
                    <SelectValue placeholder="Select intensity" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low (Score 0-3+)</SelectItem>
                    <SelectItem value="medium">Medium (Score 4-6+)</SelectItem>
                    <SelectItem value="high">High (Score 7-8+)</SelectItem>
                    <SelectItem value="critical">Critical Only (Score 9-10)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">Only auto-start sessions for events meeting this threshold.</p>
              </div>
              
              <div className="space-y-2">
                <Label>Advance Start Time (Minutes)</Label>
                <Input 
                  type="number" 
                  min="0" 
                  max="60"
                  value={advanceMinutes} 
                  onChange={(e) => setAdvanceMinutes(e.target.value)}
                  className="font-mono"
                />
                <p className="text-xs text-muted-foreground">Start blocking this many minutes before event begins.</p>
              </div>
            </div>
            
            <div className="pt-6 border-t flex justify-end">
              <Button 
                onClick={handleSave} 
                disabled={updateSettings.isPending}
                className="font-mono uppercase tracking-wider min-w-[140px]"
              >
                <Save className="mr-2 h-4 w-4" />
                {updateSettings.isPending ? "Saving..." : "Save Config"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
