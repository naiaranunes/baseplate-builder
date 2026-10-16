import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { AuthLayout } from "@/components/auth/AuthLayout";

export default function AuthPage() {
  const { user, isApproved, isLoading, isPasswordRecovery } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user && !isLoading) {
      if (isPasswordRecovery) {
        navigate("/reset-password", { replace: true });
        return;
      }
      const destination = isApproved ? "/dashboard" : "/pending-approval";
      navigate(destination, { replace: true });
    }
  }, [user, isApproved, isLoading, isPasswordRecovery, navigate]);

  return <AuthLayout />;
}
