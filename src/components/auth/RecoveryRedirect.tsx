import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

export function RecoveryRedirect() {
  const { isPasswordRecovery } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    const hashParams = new URLSearchParams(location.hash.slice(1));
    const hasRecoveryLink =
      queryParams.get("type") === "recovery" ||
      hashParams.get("type") === "recovery";

    if ((isPasswordRecovery || hasRecoveryLink) && location.pathname !== "/reset-password") {
      navigate(
        {
          pathname: "/reset-password",
          search: location.search,
          hash: location.hash,
        },
        { replace: true },
      );
    }
  }, [isPasswordRecovery, location.hash, location.pathname, location.search, navigate]);

  return null;
}
