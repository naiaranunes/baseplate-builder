import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { AuthLayout } from "@/components/auth/AuthLayout";

export default function AuthPage() {
  const { user, isApproved, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user && !isLoading) {
      const destination = isApproved ? "/dashboard" : "/pending-approval";
      navigate(destination, { replace: true });
    }
  }, [user, isApproved, isLoading, navigate]);

  return <AuthLayout />;
}
