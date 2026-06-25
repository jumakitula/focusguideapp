import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import { Terminal, Copy, Check } from "lucide-react";
import { useState } from "react";

export default function AndroidSetup() {
  const { email } = useAuth();
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  
  const apiUrl = window.location.origin + "/api";
  
  const handleCopyUrl = () => {
    navigator.clipboard.writeText(apiUrl);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  const codeSnippet = `object FocusApiClient {
    const val BASE_URL = "${apiUrl}"
    const val USER_EMAIL = "${email || 'your_email@example.com'}"
    
    // Use this endpoint to poll for active sessions
    // GET $BASE_URL/focus/active/$USER_EMAIL
}`;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(codeSnippet);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div className="space-y-6 pb-12">
      <div>
        <h1 className="text-3xl font-bold tracking-tight uppercase font-mono">Android VPN Integration</h1>
        <p className="text-muted-foreground mt-1">Connect your mobile device to this mission control instance.</p>
      </div>

      <div className="grid gap-6">
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle className="font-mono uppercase tracking-widest text-sm">Endpoint URL</CardTitle>
            <CardDescription>The base URL your Android app needs to connect to this server.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 bg-card border rounded-md p-3">
              <Terminal className="h-5 w-5 text-muted-foreground shrink-0" />
              <code className="flex-1 font-mono text-sm text-foreground overflow-x-auto whitespace-nowrap">
                {apiUrl}
              </code>
              <button 
                onClick={handleCopyUrl}
                className="shrink-0 p-2 hover:bg-muted rounded-md transition-colors"
                title="Copy to clipboard"
              >
                {copiedUrl ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4 text-muted-foreground" />}
              </button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-mono uppercase tracking-widest text-sm text-muted-foreground">Implementation</CardTitle>
            <CardDescription>Update your Android project's API client with these constants.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="relative">
              <pre className="bg-zinc-950 text-zinc-50 p-4 rounded-lg overflow-x-auto text-sm font-mono leading-relaxed">
                {codeSnippet}
              </pre>
              <button 
                onClick={handleCopyCode}
                className="absolute top-3 right-3 p-2 bg-zinc-800 hover:bg-zinc-700 rounded-md text-zinc-400 hover:text-white transition-colors"
                title="Copy code"
              >
                {copiedCode ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
              </button>
            </div>
            
            <div className="mt-8 space-y-4">
              <h3 className="text-lg font-bold">Connection Steps</h3>
              <ol className="list-decimal list-inside space-y-3 text-muted-foreground">
                <li>Open your Android Studio project containing the VpnService implementation.</li>
                <li>Locate the <code className="text-foreground bg-muted px-1.5 py-0.5 rounded text-xs font-mono">FocusApiClient.kt</code> file.</li>
                <li>Replace the existing variables with the code block above.</li>
                <li>Build and run the Android app on your device.</li>
                <li>The Android app will now automatically poll this server every minute to sync blocklists based on your active focus session.</li>
              </ol>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
