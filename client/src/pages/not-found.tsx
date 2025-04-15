import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-b from-blue-50 to-indigo-50">
      <Card className="w-full max-w-md mx-4 border-blue-200 shadow-lg">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center text-center mb-6">
            <AlertCircle className="h-12 w-12 text-red-500 mb-2" />
            <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
              404 - Page Not Found
            </h1>
            <p className="mt-2 text-sm text-gray-600">
              The page you are looking for doesn't exist or has been moved.
            </p>
          </div>
          
          <div className="flex justify-center mt-6">
            <Link href="/">
              <Button className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
                Return to Docway 360
              </Button>
            </Link>
          </div>
          
          <div className="text-center mt-6">
            <p className="text-xs text-gray-500">
              Docway 360 - Simplified document metadata tracker application
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
