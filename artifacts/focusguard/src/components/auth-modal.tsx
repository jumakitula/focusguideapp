import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

interface AuthModalProps {
  isOpen: boolean;
  onComplete: (email: string) => void;
}

export function AuthModal({ isOpen, onComplete }: AuthModalProps) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }
    setError("");
    onComplete(email);
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md [&>button]:hidden">
        <DialogHeader>
          <DialogTitle className="font-mono tracking-tight text-xl uppercase">Initialization</DialogTitle>
          <DialogDescription>
            Enter your email to connect to your FocusGuard instance.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              type="email"
              placeholder="operator@focusguard.ai"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="font-mono text-sm"
              autoFocus
            />
            {error && <p className="text-sm text-destructive font-medium">{error}</p>}
          </div>
          <Button type="submit" className="w-full font-mono uppercase tracking-widest">
            Connect
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
