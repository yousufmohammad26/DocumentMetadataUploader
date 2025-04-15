import React, { useEffect } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  // Show a welcome toast on app load
  React.useEffect(() => {
    // Import directly to avoid hook issues
    import("@/hooks/use-toast").then(module => {
      const { toast } = module;
      setTimeout(() => {
        toast({
          title: "App Loaded",
          description: "Document Metadata Uploader is ready",
          variant: "default",
        });
      }, 1000);
    });
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <Router />
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;
