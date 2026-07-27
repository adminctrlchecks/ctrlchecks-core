import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle,
  Crown,
  KeyRound,
  Loader2,
  LogOut,
  Save,
  Shield,
  Trash2,
  User as UserIcon,
  Zap,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { awsClient } from "@/integrations/aws/client";
import { getBackendUrl } from "@/lib/api/getBackendUrl";
import { isGeneratedCognitoEmail, resolveProfileEmail } from "@/lib/profile-email";
import {
  activateGeminiWallet,
  deactivateGeminiWallet,
  deleteGeminiWallet,
  getGeminiWallet,
  saveGeminiWalletKey,
  testGeminiWallet,
  type GeminiWalletState,
} from "@/lib/api/geminiWallet";
import { AppChromeHeader } from "@/components/layout/AppChromeHeader";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "@/hooks/use-toast";

interface SubscriptionInfo {
  planName: string;
  status: string;
  workflowLimit: number;
  workflowsUsed: number;
  remainingWorkflows: number;
  utilizationPercentage: number;
  billingMode?: "subscription" | "gemini_wallet" | "unlimited";
  subscriptionFrozen?: boolean;
  /** Admin switched off subscription enforcement platform-wide */
  unlimitedModeEnabled?: boolean;
  walletStatus?: string;
  freezeMessage?: string | null;
}

const emptyWallet: GeminiWalletState = {
  enabled: false,
  status: "empty",
  hasKey: false,
  maskedKey: null,
  lastValidatedAt: null,
  lastUsedAt: null,
  lastErrorCode: null,
  lastErrorMessage: null,
  subscriptionFrozen: false,
};

function formatDate(value: string | null) {
  if (!value) return "Never";
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export default function Profile() {
  const { user, signOut } = useAuth();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [profile, setProfile] = useState({ full_name: "", email: "", avatar_url: "" });

  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [loadingSubscription, setLoadingSubscription] = useState(true);

  const [wallet, setWallet] = useState<GeminiWalletState>(emptyWallet);
  const [loadingWallet, setLoadingWallet] = useState(true);
  const [walletBusy, setWalletBusy] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState("");

  const userInitials = useMemo(() => {
    const name = profile.full_name || profile.email || "User";
    return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "U";
  }, [profile.full_name, profile.email]);

  const loadProfile = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await awsClient
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;
      const email = resolveProfileEmail(data?.email, user);

      if (data) {
        setProfile({
          full_name: data.full_name || "",
          email,
          avatar_url: data.avatar_url || "",
        });

        if (email && isGeneratedCognitoEmail(data.email)) {
          await awsClient
            .from("profiles")
            .upsert({
              user_id: user.id,
              email,
              full_name: data.full_name || "",
              avatar_url: data.avatar_url || "",
            }, { onConflict: "user_id" });
        }
      } else {
        setProfile({
          full_name: (user as any)?.user_metadata?.full_name || (user as any)?.user_metadata?.name || "",
          email,
          avatar_url: "",
        });
      }
    } catch (error) {
      console.error("Error loading profile:", error);
      setProfile((prev) => ({ ...prev, email: resolveProfileEmail(prev.email, user) }));
    } finally {
      setLoading(false);
    }
  }, [user]);

  const fetchSubscription = useCallback(async () => {
    if (!user) return;
    setLoadingSubscription(true);
    try {
      const session = await awsClient.auth.getSession();
      const token = session.data.session?.access_token;
      if (!token) return;
      const res = await fetch(`${getBackendUrl()}/api/subscriptions/current`, {
        cache: "no-store",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      if (data.subscription && data.usage) {
        setSubscription({
          planName: data.subscription.planName,
          status: data.subscription.status,
          workflowLimit: data.usage.workflowLimit,
          workflowsUsed: data.usage.workflowsUsed,
          remainingWorkflows: data.usage.remainingWorkflows,
          utilizationPercentage: data.usage.utilizationPercentage,
          billingMode: data.billingMode,
          subscriptionFrozen: data.subscriptionFrozen,
          unlimitedModeEnabled: Boolean(data.unlimitedModeEnabled),
          walletStatus: data.walletStatus,
          freezeMessage: data.freezeMessage,
        });
      }
    } finally {
      setLoadingSubscription(false);
    }
  }, [user]);

  const fetchWallet = useCallback(async () => {
    if (!user) return;
    setLoadingWallet(true);
    try {
      setWallet(await getGeminiWallet());
    } catch (error) {
      toast({ title: "Gemini wallet unavailable", description: error instanceof Error ? error.message : "Unable to load wallet", variant: "destructive" });
    } finally {
      setLoadingWallet(false);
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    loadProfile();
    fetchSubscription();
    fetchWallet();
  }, [user, loadProfile, fetchSubscription, fetchWallet]);

  const refreshBillingState = async () => {
    await Promise.all([fetchWallet(), fetchSubscription()]);
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const { error } = await awsClient
        .from("profiles")
        .upsert({
          user_id: user.id,
          email: resolveProfileEmail(profile.email, user),
          full_name: profile.full_name,
          avatar_url: profile.avatar_url,
        }, { onConflict: "user_id" });
      if (error) throw error;
      toast({ title: "Profile saved", description: "Your profile has been updated." });
    } catch (error) {
      toast({ title: "Profile save failed", description: error instanceof Error ? error.message : "Failed to update profile", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveWallet = async () => {
    if (!apiKeyInput.trim()) {
      toast({ title: "API key required", description: "Paste your Gemini API key before saving.", variant: "destructive" });
      return;
    }
    setWalletBusy(true);
    try {
      setWallet(await saveGeminiWalletKey(apiKeyInput));
      setApiKeyInput("");
      toast({ title: "Gemini key saved", description: "Your key was validated and stored securely." });
      await fetchSubscription();
    } catch (error) {
      toast({ title: "Gemini key rejected", description: error instanceof Error ? error.message : "Replace the key and try again.", variant: "destructive" });
      await refreshBillingState();
    } finally {
      setWalletBusy(false);
    }
  };

  const handleWalletToggle = async (checked: boolean) => {
    setWalletBusy(true);
    try {
      setWallet(checked ? await activateGeminiWallet() : await deactivateGeminiWallet());
      toast({
        title: checked ? "Gemini wallet activated" : "Gemini wallet paused",
        description: checked
          ? "AI usage will now use your Gemini key and subscription quota is frozen."
          : "AI usage will return to your subscription plan.",
      });
      await fetchSubscription();
    } catch (error) {
      toast({ title: "Wallet update failed", description: error instanceof Error ? error.message : "Unable to update wallet mode", variant: "destructive" });
      await refreshBillingState();
    } finally {
      setWalletBusy(false);
    }
  };

  const handleTestWallet = async () => {
    setWalletBusy(true);
    try {
      setWallet(await testGeminiWallet());
      toast({ title: "Gemini key works", description: "Google accepted your API key." });
    } catch (error) {
      toast({ title: "Gemini key needs attention", description: error instanceof Error ? error.message : "Replace the key and try again.", variant: "destructive" });
      await refreshBillingState();
    } finally {
      setWalletBusy(false);
    }
  };

  const handleDeleteWallet = async () => {
    setWalletBusy(true);
    try {
      setWallet(await deleteGeminiWallet());
      setApiKeyInput("");
      toast({ title: "Gemini wallet removed", description: "AI usage will return to your subscription plan." });
      await fetchSubscription();
    } catch (error) {
      toast({ title: "Remove failed", description: error instanceof Error ? error.message : "Unable to remove wallet key", variant: "destructive" });
    } finally {
      setWalletBusy(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
  };

  const handleDeleteAccount = async () => {
    if (!user) return;
    setDeleting(true);
    try {
      await awsClient.from("profiles").delete().eq("user_id", user.id);
      await signOut();
      toast({ title: "Account deleted", description: "Your account has been removed." });
    } catch (error) {
      toast({ title: "Delete failed", description: error instanceof Error ? error.message : "Failed to delete account", variant: "destructive" });
      setDeleting(false);
    }
  };

  const walletNeedsAttention = wallet.status === "invalid" || wallet.status === "quota_exceeded" || wallet.status === "error";

  return (
    <div className="min-h-screen bg-background">
      <AppChromeHeader />

      <main className="container mx-auto max-w-6xl px-4 py-4">
        <div className="space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="flex items-center gap-2 text-xl font-bold">
                <UserIcon className="h-5 w-5" />
                Profile
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Manage your account, plan, and Gemini API wallet.
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleSignOut} disabled={loading || saving || deleting} className="h-8 text-sm">
                <LogOut className="mr-1.5 h-3.5 w-3.5" />
                Sign Out
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm" disabled={loading || saving || deleting} className="h-8 text-sm">
                    <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                    Delete Account
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Account</AlertDialogTitle>
                    <AlertDialogDescription>
                      This action is permanent and cannot be undone. All your data will be permanently deleted.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDeleteAccount} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                      Delete Account
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:items-start">
            <Card className="h-full">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Profile Details</CardTitle>
                <CardDescription className="text-xs">Update your personal information</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3 rounded-lg border bg-muted/25 p-3">
                  <Avatar className="h-16 w-16">
                    <AvatarImage src={profile.avatar_url} />
                    <AvatarFallback className="bg-primary/10 text-lg text-primary">{userInitials}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 space-y-0.5">
                    <p className="text-sm font-medium">Profile Picture</p>
                    <p className="text-xs text-muted-foreground">Update your avatar URL below</p>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="full_name" className="text-xs">Full Name</Label>
                  <Input id="full_name" value={profile.full_name} onChange={(event) => setProfile({ ...profile, full_name: event.target.value })} placeholder="Enter your full name" className="h-9 text-sm" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-xs">Email</Label>
                  <Input id="email" value={profile.email} disabled className="h-9 bg-muted text-sm" />
                  <p className="text-xs text-muted-foreground">Email cannot be changed</p>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="avatar_url" className="text-xs">Avatar URL</Label>
                  <Input id="avatar_url" value={profile.avatar_url} onChange={(event) => setProfile({ ...profile, avatar_url: event.target.value })} placeholder="https://example.com/avatar.jpg" className="h-9 text-sm" />
                </div>

                <Button onClick={handleSaveProfile} disabled={saving} className="h-9 w-full text-sm">
                  {saving ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <Save className="mr-2 h-3.5 w-3.5" />}
                  Save Changes
                </Button>
              </CardContent>
            </Card>

            <Card className="overflow-hidden">
              <div className="border-b">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center justify-between gap-3 text-base">
                    <span>Subscription Plan</span>
                    {subscription && (
                      <Badge variant="outline" className={subscription.subscriptionFrozen ? "border-emerald-500 text-emerald-600" : subscription.planName === "Enterprise" ? "border-amber-500 text-amber-600" : subscription.planName === "Pro" ? "border-primary text-primary" : "border-border text-muted-foreground"}>
                        {subscription.subscriptionFrozen ? <KeyRound className="mr-1 h-3 w-3" /> : subscription.planName === "Enterprise" ? <Crown className="mr-1 h-3 w-3" /> : subscription.planName === "Pro" ? <Zap className="mr-1 h-3 w-3" /> : <Shield className="mr-1 h-3 w-3" />}
                        {subscription.subscriptionFrozen ? "Gemini Wallet" : subscription.planName}
                      </Badge>
                    )}
                  </CardTitle>
                  <CardDescription className="text-xs">Your plan usage and current billing mode</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 pb-5">
                  {loadingSubscription ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading subscription...
                    </div>
                  ) : subscription ? (
                    subscription.unlimitedModeEnabled ? (
                      <div className="flex items-start gap-2 rounded-lg border border-primary/30 bg-primary/10 p-3 text-xs text-primary">
                        <CheckCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                        Unlimited access is active — you can create as many workflows as you need, and
                        no plan limits apply.
                      </div>
                    ) : (
                    <>
                      {subscription.subscriptionFrozen && (
                        <div className="flex items-start gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-700">
                          <CheckCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                          {subscription.freezeMessage || "Your Gemini wallet is active. Subscription workflow quota is frozen."}
                        </div>
                      )}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Subscription workflows used</span>
                          <span className="font-medium">{subscription.workflowsUsed} / {subscription.workflowLimit}</span>
                        </div>
                        <Progress value={subscription.utilizationPercentage} className={`h-2 ${subscription.utilizationPercentage >= 90 ? "[&>div]:bg-red-500" : subscription.utilizationPercentage >= 70 ? "[&>div]:bg-amber-500" : "[&>div]:bg-primary"}`} />
                        <p className="text-xs text-muted-foreground">
                          {subscription.subscriptionFrozen
                            ? "New wallet-mode workflows use your Gemini quota instead of this plan quota."
                            : `${subscription.remainingWorkflows} workflow${subscription.remainingWorkflows !== 1 ? "s" : ""} remaining`}
                        </p>
                      </div>
                      {!subscription.subscriptionFrozen && subscription.remainingWorkflows === 0 && (
                        <div className="flex items-start gap-2 rounded-lg bg-destructive/10 p-3 text-xs text-destructive">
                          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                          You've reached your workflow limit. Upgrade your plan or activate your Gemini wallet.
                        </div>
                      )}
                      <Button asChild className="h-9 w-full text-sm" variant={subscription.planName === "Free" ? "default" : "outline"}>
                        <Link to="/subscriptions">
                          {subscription.planName === "Free" ? <><Zap className="mr-2 h-3.5 w-3.5" />Upgrade Plan</> : <>Manage Subscription<ArrowRight className="ml-2 h-3.5 w-3.5" /></>}
                        </Link>
                      </Button>
                    </>
                    )
                  ) : (
                    <Button asChild className="h-9 w-full text-sm">
                      <Link to="/subscriptions"><Zap className="mr-2 h-3.5 w-3.5" />View Plans</Link>
                    </Button>
                  )}
                </CardContent>
              </div>

              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between gap-3 text-base">
                  <span>Gemini API Key Wallet</span>
                  <Switch checked={wallet.enabled && wallet.status === "active"} disabled={walletBusy || loadingWallet || !wallet.hasKey} onCheckedChange={handleWalletToggle} />
                </CardTitle>
                <CardDescription className="text-xs">
                  Use your own Gemini key for AI calls and keep plan quota untouched.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {loadingWallet ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading wallet...
                  </div>
                ) : (
                  <>
                    <div className="rounded-lg border bg-muted/30 p-3 text-sm">
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate font-medium">{wallet.hasKey ? wallet.maskedKey : "No Gemini key saved"}</p>
                          <p className="text-xs text-muted-foreground">
                            {wallet.subscriptionFrozen ? "Active. CtrlChecks is using your Gemini quota." : "Inactive. CtrlChecks uses your subscription plan."}
                          </p>
                        </div>
                        <Badge variant="outline" className={wallet.subscriptionFrozen ? "border-emerald-500 text-emerald-600" : walletNeedsAttention ? "border-destructive text-destructive" : ""}>
                          {wallet.status.replace("_", " ")}
                        </Badge>
                      </div>
                    </div>

                    {walletNeedsAttention && (
                      <div className="flex items-start gap-2 rounded-lg bg-destructive/10 p-3 text-xs text-destructive">
                        <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                        <div className="space-y-2">
                          <p>{wallet.lastErrorMessage || "Your Gemini key needs attention."}</p>
                          <Link to="/subscriptions" className="font-medium underline underline-offset-2">Choose a CtrlChecks plan</Link>
                        </div>
                      </div>
                    )}

                    <div className="space-y-1.5">
                      <Label htmlFor="gemini_api_key" className="text-xs">Gemini API Key</Label>
                      <Input
                        id="gemini_api_key"
                        type="password"
                        value={apiKeyInput}
                        onChange={(event) => setApiKeyInput(event.target.value)}
                        placeholder={wallet.hasKey ? "Paste a new key to replace the saved key" : "AIza..."}
                        className="h-9 text-sm"
                      />
                    </div>

                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                      <Button onClick={handleSaveWallet} disabled={walletBusy || !apiKeyInput.trim()} className="h-9 text-sm">
                        {walletBusy ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <Save className="mr-2 h-3.5 w-3.5" />}
                        Save
                      </Button>
                      <Button variant="outline" onClick={handleTestWallet} disabled={walletBusy || !wallet.hasKey} className="h-9 text-sm">
                        Test Key
                      </Button>
                      <Button variant="outline" onClick={handleDeleteWallet} disabled={walletBusy || !wallet.hasKey} className="h-9 text-sm">
                        Remove
                      </Button>
                    </div>

                    <div className="grid grid-cols-1 gap-2 text-xs text-muted-foreground sm:grid-cols-2">
                      <p>Validated: <span className="text-foreground">{formatDate(wallet.lastValidatedAt)}</span></p>
                      <p>Last used: <span className="text-foreground">{formatDate(wallet.lastUsedAt)}</span></p>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
