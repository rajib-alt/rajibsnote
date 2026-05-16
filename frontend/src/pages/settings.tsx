import { useVaultStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { githubClient } from "@/lib/github";
import { useState } from "react";
import { Github, Database } from "lucide-react";

export default function SettingsPage() {
  const { settings, setSettings } = useVaultStore();
  const { toast } = useToast();
  const [testing, setTesting] = useState(false);

  const [localSettings, setLocalSettings] = useState(settings);

  const handleSave = () => {
    setSettings(localSettings);
    toast({ title: "Settings saved", description: "GitHub configuration updated." });
  };

  const handleTestConnection = async () => {
    setTesting(true);
    githubClient.initialize(localSettings.githubPAT, localSettings.repoOwner, localSettings.repoName, localSettings.defaultBranch);
    try {
      const repo = await githubClient.testConnection();
      toast({ 
        title: "Connection successful!", 
        description: `Connected to ${repo.full_name}` 
      });
    } catch (e: any) {
      toast({ 
        title: "Connection failed", 
        description: e.message,
        variant: "destructive"
      });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-serif font-bold mb-2">Settings</h1>
        <p className="text-muted-foreground">Configure your VaultCanvas experience.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Github className="h-5 w-5" />
            GitHub Storage
          </CardTitle>
          <CardDescription>
            Connect a GitHub repository to store your notes as markdown files.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label>Personal Access Token (PAT)</Label>
            <Input 
              type="password" 
              value={localSettings.githubPAT}
              onChange={e => setLocalSettings({...localSettings, githubPAT: e.target.value})}
              placeholder="ghp_..."
            />
            <p className="text-xs text-muted-foreground">Needs 'repo' scope to read and write files.</p>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label>Repository Owner</Label>
              <Input 
                value={localSettings.repoOwner}
                onChange={e => setLocalSettings({...localSettings, repoOwner: e.target.value})}
                placeholder="username"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Repository Name</Label>
              <Input 
                value={localSettings.repoName}
                onChange={e => setLocalSettings({...localSettings, repoName: e.target.value})}
                placeholder="vault-notes"
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label>Default Branch</Label>
            <Input 
              value={localSettings.defaultBranch}
              onChange={e => setLocalSettings({...localSettings, defaultBranch: e.target.value})}
              placeholder="main"
            />
          </div>

          <div className="flex gap-4 mt-4">
            <Button variant="outline" onClick={handleTestConnection} disabled={testing}>
              {testing ? "Testing..." : "Test Connection"}
            </Button>
            <Button onClick={handleSave} className="flex-1">Save Configuration</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Local Data
          </CardTitle>
          <CardDescription>
            Manage the local cache of your notes.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="destructive" onClick={() => {
            useVaultStore.getState().setNotes({});
            toast({ title: "Local cache cleared" });
          }}>
            Clear Local Cache
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
