# Projeto Base — Remix Template

## O que é este projeto
Template de fundação para soluções SaaS. Contém auth, roles, vault e segurança prontos.
Faça remix deste projeto para criar novas soluções sem reconfigurar a base.

## ⚠️ Após fazer remix deste projeto

Este projeto usa um trigger em `auth.users` (`on_auth_user_created`) que cria
automaticamente um registro em `public.profiles` + `public.user_roles` ao
registrar um novo usuário, e marca o **primeiro usuário como `admin`**. O Lovable
**não replica triggers em `auth.*` automaticamente** no remix.

### Auto-reparo em 4 camadas

1. **Migration idempotente** — recria `handle_new_user()` + trigger.
   Pode ser rodada múltiplas vezes sem efeito colateral.
2. **RPC `public.ensure_auth_trigger()`** — verifica em `pg_trigger` se o
   trigger existe e o recria se necessário (apenas `service_role`).
3. **Edge Function `ensure-auth-trigger`** — chamada automaticamente pelo
   frontend; invoca a RPC, inspeciona o corpo de `handle_new_user` e devolve
   um payload de health-check (`{ ok, trigger, function, counts }`).
4. **Edge Function `bootstrap-profile`** — fallback no `AuthContext`. Se o
   trigger não rodou, cria `profiles` + `user_roles` pelo lado do app e
   ainda eleva a admin se for o único perfil do sistema.

### Validar remix em 30 segundos

1. Após o remix, faça login com qualquer conta de teste já existente.
2. Acesse **Configurações → Segurança**. O card "Estado do sistema de auth"
   deve mostrar **4 checks verdes**:
   - Trigger `on_auth_user_created` instalado
   - Função `handle_new_user` existe
   - Função cria registro em `user_roles`
   - Primeiro usuário vira admin automaticamente
3. Se algum check estiver vermelho, clique em **Revalidar** (recria o trigger).
4. Para testar o cadastro real do admin: apague todos os usuários em
   **Cloud → Users**, vá em `/auth`, cadastre o primeiro usuário e confirme
   que ele entra direto no dashboard com o menu **Configurações** visível.

### Se mesmo assim o cadastro falhar

Abra o SQL Editor da Cloud como `postgres` e rode a migration mais recente
em [`supabase/migrations`](supabase/migrations) que toca em `handle_new_user`.

## Primeiro acesso
1. Cadastre o primeiro usuário — ele vira admin automaticamente
2. Acesse `/settings` (aba Segurança) para configurar aprovação e domínios
3. Acesse `/settings` (aba Chaves de API) para configurar integrações

## Recuperação de senha

O link de recuperação aponta por padrão para
`https://baseplate-builder.lovable.app/reset-password`, evitando usar o domínio
do editor/preview do Lovable. Para outro domínio publicado, configure
`VITE_APP_URL` com a origem pública desejada. Em **Supabase → Authentication →
URL Configuration**, defina a origem publicada como **Site URL** e permita
`https://baseplate-builder.lovable.app/reset-password` em **Redirect URLs**
(adicione também as origens locais usadas no desenvolvimento, se necessário).

O template de e-mail de redefinição deve usar `{{ .ConfirmationURL }}` no link
de confirmação. Assim, depois de validar o token, o Supabase redireciona para o
formulário da aplicação, onde a pessoa informa e confirma a nova senha.

## Convites de colaboradores

Ao cadastrar um colaborador em **Equipe → Novo colaborador**, informe o e-mail
que ele usará para entrar. O convite de autenticação é enviado para esse
endereço e redireciona para `/accept-invite`, onde o colaborador define e
confirma a senha. Em **Supabase → Authentication → URL Configuration**, permita
`https://baseplate-builder.lovable.app/accept-invite` em **Redirect URLs** (ou
o caminho correspondente do domínio configurado em `VITE_APP_URL`). Se usar
outro domínio, configure também o segredo `APP_URL` das Edge Functions com a
mesma origem. O template de convite do Supabase deve usar
`{{ .ConfirmationURL }}`.

Para testar o fluxo ponta a ponta com contas reais:

1. Como líder, cadastre um colaborador com um endereço de e-mail que possa acessar.
2. Abra o convite recebido, defina e confirme a senha na tela **Ativar acesso**.
3. Como líder, crie uma entrega atribuída a esse colaborador.
4. Entre com a conta do colaborador e registre a conclusão da entrega.

Após confirmar o e-mail, a conta é associada ao cadastro do colaborador; ele
pode então acessar e registrar as entregas atribuídas.

## Stack
Lovable · React 18 · Supabase · TypeScript · Tailwind · shadcn/ui · TanStack Query
