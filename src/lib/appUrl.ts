const DEFAULT_APP_URL = "https://wiaflowgestao.lovable.app";

export function appUrl(path: string): string {
  const baseUrl = import.meta.env.VITE_APP_URL || DEFAULT_APP_URL;
  return new URL(path, baseUrl).toString();
}
