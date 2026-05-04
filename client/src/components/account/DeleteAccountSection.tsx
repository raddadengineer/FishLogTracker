import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { clientAuthHeaders } from "@/lib/queryClient";
import { LoaderCircle } from "lucide-react";

export function DeleteAccountSection() {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);

  if (!isAuthenticated || !user) {
    return null;
  }

  const account = user as { username: string; email?: string | null };

  const typed = confirmText.trim().toLowerCase();
  const matchesUsername = typed === account.username.toLowerCase();
  const matchesEmail =
    !!account.email && typed === String(account.email).toLowerCase();
  const confirmOk = matchesUsername || matchesEmail;
  const canSubmit = confirmOk && password.length > 0;

  async function handleDelete() {
    if (!canSubmit) return;
    setPending(true);
    try {
      const res = await fetch("/api/user/account/delete", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", ...clientAuthHeaders() },
        body: JSON.stringify({ confirmEmail: confirmText.trim(), password }),
      });
      const data = (await res.json().catch(() => ({}))) as { message?: string };
      if (!res.ok) {
        throw new Error(data.message || res.statusText);
      }

      localStorage.removeItem("currentUserId");
      localStorage.removeItem("currentUserName");
      localStorage.removeItem("currentUserRole");
      queryClient.clear();

      toast({ title: "Account deleted", description: "Redirecting…" });
      setOpen(false);
      setConfirmText("");
      setPassword("");
      window.location.href = "/login";
    } catch (e) {
      toast({
        title: "Could not delete account",
        description:
          e instanceof Error ? e.message : "Try signing out and signing in again with email and password.",
        variant: "destructive",
      });
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="pt-6 border-t border-border">
      <h3 className="font-medium text-destructive mb-1">Danger zone</h3>
      <p className="text-sm text-muted-foreground mb-3">
        Permanently delete your account and related data (catches, likes, comments). This cannot be undone.
      </p>
      <AlertDialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) {
            setConfirmText("");
            setPassword("");
          }
        }}
      >
        <AlertDialogTrigger asChild>
          <Button variant="destructive" size="sm" type="button">
            Delete account
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete your account?</AlertDialogTitle>
            <AlertDialogDescription>
              Enter your account password, then type your <strong className="text-foreground">username</strong>
              {account.email ? (
                <>
                  {" "}
                  or <strong className="text-foreground">email</strong> ({account.email})
                </>
              ) : null}{" "}
              exactly to confirm.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-2">
              <Label htmlFor="delete-password">Password</Label>
              <Input
                id="delete-password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={pending}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="delete-confirm">Username or email</Label>
              <Input
                id="delete-confirm"
                autoComplete="off"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder={account.email || account.username || ""}
                disabled={pending}
              />
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel type="button" disabled={pending}>
              Cancel
            </AlertDialogCancel>
            <Button
              type="button"
              variant="destructive"
              disabled={pending || !canSubmit}
              onClick={handleDelete}
            >
              {pending ? <LoaderCircle className="h-4 w-4 animate-spin mr-2" /> : null}
              Delete forever
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
