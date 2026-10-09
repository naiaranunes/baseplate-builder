import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export default function ResetPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isPasswordRecovery, clearPasswordRecovery } = useAuth();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingLink, setCheckingLink] = useState(true);
  const [hasRecoverySession, setHasRecoverySession] = useState(false);

  useEffect(() => {
    let mounted = true;
    const recoveryType = searchParams.get("type") ??
      new URLSearchParams(window.location.hash.slice(1)).get("type");
    const tokenHash = searchParams.get("token_hash");

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" && session && mounted) {
        setHasRecoverySession(true);
        setCheckingLink(false);
      }
    });

    const validateRecoveryLink = async () => {
      if (tokenHash && recoveryType === "recovery") {
        const { error: verifyError } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: "recovery",
        });
        if (verifyError) {
          if (mounted) {
            setError("O link de redefinição é inválido ou expirou. Solicite um novo link.");
            setCheckingLink(false);
          }
          return;
        }
        if (mounted) {
          setHasRecoverySession(true);
          setCheckingLink(false);
        }
        return;
      }

      const { data, error: sessionError } = await supabase.auth.getSession();
      if (!mounted) return;

      if (sessionError) {
        setError("Não foi possível validar o link de redefinição. Solicite um novo link.");
      } else if (isPasswordRecovery && data.session) {
        setHasRecoverySession(true);
      } else {
        setError("O link de redefinição é inválido ou expirou. Solicite um novo link.");
      }
      setCheckingLink(false);
    };

    void validateRecoveryLink();

    return () => {
      mounted = false;
      authListener.subscription.unsubscribe();
    };
  }, [isPasswordRecovery, searchParams]);

  async function handleResetPassword(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setMessage("");
    setError("");

    if (!hasRecoverySession) {
      setError("Abra o link enviado por e-mail para redefinir sua senha.");
      return;
    }

    if (password.length < 6) {
      setError("A senha deve ter pelo menos 6 caracteres.");
      return;
    }

    if (password !== confirmPassword) {
      setError("As senhas não coincidem.");
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.updateUser({
      password,
    });

    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    clearPasswordRecovery();
    setHasRecoverySession(false);
    setMessage("Senha alterada com sucesso!");

    setTimeout(() => {
      navigate("/auth");
    }, 1500);
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-md p-8 bg-card rounded-2xl shadow-lg">
        <h1 className="text-2xl font-bold text-center mb-2">
          Redefinir senha
        </h1>

        <p className="text-center text-muted-foreground mb-6">
          {checkingLink
            ? "Validando o link de redefinição..."
            : hasRecoverySession
              ? "Digite sua nova senha abaixo."
              : "Para escolher uma nova senha, abra o link de recuperação enviado ao seu e-mail."}
        </p>

        {checkingLink ? (
          <div role="status" className="text-center text-sm text-muted-foreground">
            Aguarde enquanto validamos o link.
          </div>
        ) : hasRecoverySession ? (
          <form onSubmit={handleResetPassword} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              Nova senha
            </label>

            <input
              type="password"
              placeholder="Digite sua nova senha"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full p-3 border rounded-lg bg-background"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Confirmar nova senha
            </label>

            <input
              type="password"
              placeholder="Digite a senha novamente"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={6}
              className="w-full p-3 border rounded-lg bg-background"
            />
          </div>

          {error && (
            <p className="text-sm text-destructive text-center">
              {error}
            </p>
          )}

          {message && (
            <p className="text-sm text-center text-green-600">
              {message}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full p-3 rounded-lg bg-primary text-primary-foreground disabled:opacity-50"
          >
            {loading ? "Alterando..." : "Alterar senha"}
          </button>
          </form>
        ) : (
          <div className="space-y-3">
            {message ? (
              <p role="status" className="text-sm text-green-600 text-center">
                {message}
              </p>
            ) : (
              <>
                {error && (
                  <p role="alert" className="text-sm text-destructive text-center">
                    {error}
                  </p>
                )}
                <Link
                  to="/forgot-password"
                  className="block w-full p-3 rounded-lg bg-primary text-primary-foreground text-center"
                >
                  Solicitar novo link
                </Link>
              </>
            )}
          </div>
        )}

        <Link
          to="/auth"
          className="block mt-6 text-center text-sm text-primary hover:underline"
        >
          Voltar para o login
        </Link>
      </div>
    </main>
  );
}