import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { authErrorMessage } from "@/lib/authErrorMessage";

export default function AcceptInvitePage() {
  const { user, isLoading, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const inviteError = new URLSearchParams(location.search).get("error_code");

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    if (password.length < 6) {
      setError("A senha deve ter pelo menos 6 caracteres.");
      return;
    }
    if (password !== confirmPassword) {
      setError("As senhas não coincidem.");
      return;
    }

    setSaving(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) {
      setError(authErrorMessage(updateError));
      setSaving(false);
      return;
    }

    try {
      await refreshProfile();
      navigate("/dashboard", { replace: true });
    } catch {
      setError("A senha foi salva, mas não foi possível carregar seu perfil. Atualize a página para continuar.");
      setSaving(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-md p-8 bg-card rounded-2xl shadow-lg">
        <h1 className="text-2xl font-bold text-center mb-2">Ativar acesso</h1>
        {isLoading ? (
          <p role="status" className="text-center text-muted-foreground">
            Validando seu convite...
          </p>
        ) : inviteError ? (
          <>
            <p role="alert" className="text-center text-muted-foreground mb-6">
              O link do convite expirou ou já foi usado. Peça ao administrador para reenviar o convite e abra o link mais recente.
            </p>
            <Link to="/auth" className="block text-center text-primary hover:underline">
              Ir para o login
            </Link>
          </>
        ) : user ? (
          <>
            <p className="text-center text-muted-foreground mb-6">
              Defina uma senha para concluir seu cadastro e acessar suas entregas.
            </p>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="invite-password">Nova senha</Label>
                <Input
                  id="invite-password"
                  type="password"
                  autoComplete="new-password"
                  minLength={6}
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="invite-password-confirm">Confirmar nova senha</Label>
                <Input
                  id="invite-password-confirm"
                  type="password"
                  autoComplete="new-password"
                  minLength={6}
                  required
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                />
              </div>
              {error && <p role="alert" className="text-sm text-destructive text-center">{error}</p>}
              <Button type="submit" className="w-full" disabled={saving}>
                {saving ? "Ativando..." : "Concluir cadastro"}
              </Button>
            </form>
          </>
        ) : (
          <>
            <p role="alert" className="text-center text-muted-foreground mb-6">
              Este convite é inválido ou expirou. Peça ao seu líder para enviar um novo.
            </p>
            <Link to="/auth" className="block text-center text-primary hover:underline">
              Ir para o login
            </Link>
          </>
        )}
      </div>
    </main>
  );
}
