import { useState, useEffect, useRef } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Lock, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import * as THREE from "three";
// @ts-ignore
import NET from "vanta/dist/vanta.net.min";
import "./Login.css";

const Login = () => {
  const { isAuthenticated, login } = useAuth();
  const [email, setEmail] = useState("namoj@namolabs.io");
  const [password, setPassword] = useState("password");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const vantaRef = useRef<HTMLDivElement>(null);
  const effectRef = useRef<any>(null);

  useEffect(() => {
    if (!effectRef.current && vantaRef.current) {
      effectRef.current = NET({
        el: vantaRef.current,
        THREE: THREE,
        mouseControls: true,
        touchControls: true,
        gyroControls: false,
        minHeight: 200.0,
        minWidth: 200.0,
        scale: 1.0,
        scaleMobile: 1.0,
        color: 0xffffff,
        backgroundColor: 0x181128,
        points: 12.0,
        maxDistance: 35.0,
        spacing: 16.0,
        showDots: true
      });
    }

    return () => {
      if (effectRef.current) {
        effectRef.current.destroy();
        effectRef.current = null;
      }
    };
  }, []);

  if (isAuthenticated) return <Navigate to="/" replace />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      toast({ title: "ACCESS GRANTED", description: "Session initialized." });
    } catch {
      toast({ title: "ACCESS DENIED", description: "Invalid credentials.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div ref={vantaRef} className="login-container">
      <div className="login-box">
        <div className="text-center">
          <h2 className="tracking-[0.4em]">Namo Labs</h2>
          <p className="subtitle">
            Digital Asset<br />
            Forensics Suite
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="input-group">
            <label htmlFor="email">Operator ID</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="name@namolabs.io"
              required
            />
          </div>

          <div className="input-group">
            <label htmlFor="password">Access Key</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
          </div>

          <button type="submit" disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
            Authenticate
          </button>
        </form>

        <div className="login-footer">
          <div className="line" />
          <span>Secure Access Only</span>
          <div className="line" />
        </div>
      </div>
    </div>
  );
};

export default Login;
