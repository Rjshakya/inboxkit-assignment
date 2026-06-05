import { useState } from "react";

import { Button } from "@inboxkit-assignment/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@inboxkit-assignment/ui/components/card";
import { Input } from "@inboxkit-assignment/ui/components/input";
import { Label } from "@inboxkit-assignment/ui/components/label";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";

import { useUpdateUserSettings, useUserSettings } from "@/hooks/use-settings";
import { useSession } from "@/hooks/use-session";

export const Route = createFileRoute("/$userId/settings")({
  component: RouteComponent,
});

function RouteComponent() {
  const session = useSession();

  const { data: settings, isLoading } = useUserSettings();
  const updateMutation = useUpdateUserSettings();

  const [color, setColor] = useState(settings?.color ?? "");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateMutation.mutateAsync({ color });
      toast.success("Settings updated successfully");
    } catch {
      toast.error("Failed to update settings");
    }
  };

  return (
    <div className="container mx-auto max-w-2xl py-10">
      <Card>
        <CardHeader>
          <CardTitle>User Settings</CardTitle>
          <CardDescription>Manage your profile and preferences.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label>Name</Label>
            <Input value={session?.user.name ?? ""} disabled />
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input value={session?.user.email ?? ""} disabled />
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="color">Favorite Color</Label>
              <Input
                id="color"
                name="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                placeholder="Enter a color"
              />
            </div>
            <Button type="submit" disabled={updateMutation.isPending || isLoading}>
              {updateMutation.isPending ? "Saving..." : "Save Settings"}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="text-muted-foreground text-sm">
          Your settings are saved automatically when you click Save.
        </CardFooter>
      </Card>
    </div>
  );
}
