
import React, { useState, useEffect } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";

function AuthModal({ isOpen, onAuthenticate }: { isOpen: boolean; onAuthenticate: (success: boolean) => void }) {
  const [token, setToken] = useState("");
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const expectedToken = import.meta.env.VITE_AUTH_TOKEN;
    
    if (token === expectedToken) {
      onAuthenticate(true);
      toast({
        title: "Success",
        description: "Authentication successful",
      });
    } else {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Invalid token",
      });
    }
  };

  return (
    <Dialog open={isOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Authentication Required</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            type="password"
            placeholder="Enter secret token"
            value={token}
            onChange={(e) => setToken(e.target.value)}
          />
          <Button type="submit" className="w-full">Authenticate</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthModal 
        isOpen={!isAuthenticated} 
        onAuthenticate={(success) => setIsAuthenticated(success)} 
      />
      {isAuthenticated && (
        <Router />
      )}
      <Toaster />
    </QueryClientProvider>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route component={NotFound} />
    </Switch>
  );
}

export default App;
