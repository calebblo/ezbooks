import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../pages/LoginPage";

export default function AuthCallbackPage() {
  const navigate = useNavigate();

  useEffect(() => {
    const checkSession = async () => {
      const { data, error } = await supabase.auth.getSession();
      const session = data?.session;

      if (session) {
        navigate("/dashboard"); 
      } else {
        setTimeout(checkSession, 500);
      }
    };

    checkSession();
  }, [navigate]);

  return (
    <div className="flex items-center justify-center h-screen text-white bg-black">
      Authenticating...
    </div>
  );
}

