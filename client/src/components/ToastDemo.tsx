import React from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

export function ToastDemo() {
  const { toast } = useToast();

  const showDefaultToast = () => {
    toast({
      title: "Default Toast",
      description: "This is how a standard toast notification appears in the application.",
    });
  };

  const showDestructiveToast = () => {
    toast({
      variant: "destructive",
      title: "Destructive Toast",
      description: "This is how an error or warning toast notification appears.",
    });
  };

  return (
    <div className="p-4 space-y-4 border rounded-md bg-slate-50">
      <h2 className="text-lg font-semibold">Toast Style Preview</h2>
      <div className="flex flex-wrap gap-2">
        <Button onClick={showDefaultToast}>Show Default Toast</Button>
        <Button variant="destructive" onClick={showDestructiveToast}>
          Show Destructive Toast
        </Button>
      </div>
    </div>
  );
}