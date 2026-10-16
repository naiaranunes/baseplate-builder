import { describe, expect, it } from "vitest";
import { authErrorMessage } from "./authErrorMessage";

describe("authErrorMessage", () => {
  it("translates invalid credentials without revealing whether an account exists", () => {
    expect(authErrorMessage({ message: "User not found" })).toBe(
      "E-mail ou senha incorretos.",
    );
    expect(authErrorMessage({ code: "invalid_credentials", message: "Invalid login credentials" })).toBe(
      "E-mail ou senha incorretos.",
    );
  });

  it("translates weak password messages and preserves the minimum length", () => {
    expect(authErrorMessage({
      message: "Password should be at least 8 characters",
    })).toBe("A senha deve ter pelo menos 8 caracteres.");
    expect(authErrorMessage({ code: "weak_password", message: "Weak password" })).toContain(
      "A senha é muito fraca",
    );
  });

  it("returns only the Portuguese translation, without English fragments", () => {
    expect(authErrorMessage({
      message: "New password should be different from old password",
    })).toBe("A nova senha deve ser diferente da senha atual.");
    expect(authErrorMessage({
      message: "Password should be at least 8 characters long and contain letters",
    })).toBe("A senha deve ter pelo menos 8 caracteres.");
  });

  it("translates other common authentication errors", () => {
    expect(authErrorMessage({ message: "Email not confirmed" })).toBe(
      "Confirme seu e-mail antes de entrar.",
    );
    expect(authErrorMessage({ message: "User already registered" })).toBe(
      "Já existe uma conta cadastrada com este e-mail.",
    );
    expect(authErrorMessage({ message: "Token has expired or is invalid" })).toBe(
      "Este link expirou ou é inválido. Solicite um novo link.",
    );
  });

  it("does not show unknown English backend messages directly", () => {
    expect(authErrorMessage({ message: "Unexpected internal server error" })).toBe(
      "Não foi possível concluir a operação de autenticação. Verifique os dados e tente novamente.",
    );
  });

  it("preserves messages that are already in Portuguese", () => {
    expect(authErrorMessage({ message: "A conta não está ativa." })).toBe(
      "A conta não está ativa.",
    );
  });
});
