import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

export function RecoveryRedirect() {
  const { isPasswordRecovery } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (isPasswordRecovery && location.pathname !== "/reset-password") {
      navigate("/reset-password", { replace: true });
    }
  }, [isPasswordRecovery, location.pathname, navigate]);

  return null;
}
