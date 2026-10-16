type AuthErrorDetails = {
  code?: unknown;
  message?: unknown;
};

const PORTUGUESE_AUTH_MESSAGES: Array<[RegExp, string]> = [
  [/invalid login credentials|invalid_credentials|user not found|user_not_found/i, "E-mail ou senha incorretos."],
  [/email not confirmed|email_not_confirmed/i, "Confirme seu e-mail antes de entrar."],
  [/user already registered|user_already_exists|email already registered|email_exists/i, "Já existe uma conta cadastrada com este e-mail."],
  [/signup is disabled|signups not allowed|signup_disabled/i, "O cadastro de novas contas está desativado."],
  [/email rate limit exceeded|over_email_send_rate_limit/i, "Muitas solicitações de e-mail. Aguarde alguns minutos e tente novamente."],
  [/too many requests|rate limit exceeded|over_request_rate_limit/i, "Muitas tentativas. Aguarde alguns minutos antes de tentar novamente."],
  [/new password should be different|same_password/i, "A nova senha deve ser diferente da senha atual."],
  [/password (?:should|must) be at least (\d+) characters?/i, "A senha deve ter pelo menos $1 caracteres."],
  [/password should contain.*$/i, "A senha deve atender aos requisitos de segurança informados."],
  [/password.*(weak|too short)|weak_password/i, "A senha é muito fraca. Escolha uma senha mais segura, com pelo menos 6 caracteres."],
  [/invalid email|email address is invalid/i, "O endereço de e-mail é inválido."],
  [/token has expired(?: or is invalid)?|otp_expired|token is invalid|invalid token/i, "Este link expirou ou é inválido. Solicite um novo link."],
  [/auth session missing|session_not_found/i, "Sua sessão expirou. Entre novamente e tente outra vez."],
];

const PORTUGUESE_MARKERS =
  /[áàâãéêíóôõúç]|\b(falha|senha|e-?mail|conta|usuário|acesso|cadastro|inválid[oa]|expirou|tentativas|confirme|link|perfil|altera[rd]|concluir)\b/i;

function translatedMessage(message: string): string {
  const minimumLength = message.match(/at least (\d+) characters?/i)?.[1];
  return PORTUGUESE_AUTH_MESSAGES.find(([pattern]) => pattern.test(message))?.[1]
    .replace("$1", minimumLength ?? "")
    .trim() ?? "";
}

export function authErrorMessage(error: unknown): string {
  const details = error && typeof error === "object"
    ? error as AuthErrorDetails
    : undefined;
  const code = typeof details?.code === "string" ? details.code : "";
  const message = typeof details?.message === "string"
    ? details.message
    : typeof error === "string"
      ? error
      : "";
  for (const [pattern, translated] of PORTUGUESE_AUTH_MESSAGES) {
    if (pattern.test(message)) {
      const minimumLength = message.match(/at least (\d+) characters?/i)?.[1];
      return translated.replace("$1", minimumLength ?? "").trim();
    }
    if (pattern.test(code)) {
      return translatedMessage(code) || translated.replace(/\$\d/g, "");
    }
  }

  if (PORTUGUESE_MARKERS.test(message)) return message;
  return "Não foi possível concluir a operação de autenticação. Verifique os dados e tente novamente.";
}
