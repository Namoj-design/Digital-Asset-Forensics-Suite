import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center">
        <AlertTriangle className="h-8 w-8 text-hud-red mx-auto mb-4" />
        <h1 className="mb-2 text-3xl font-bold font-mono text-foreground">404</h1>
        <p className="mb-4 text-xs text-muted-foreground font-mono tracking-widest uppercase">Route Not Found</p>
        <a href="/" className="btn-tactical inline-block">
          Return to Base
        </a>
      </div>
    </div>
  );
};

export default NotFound;
