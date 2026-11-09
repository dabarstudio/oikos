# Oikos

A economia da sua casa: orçamento, metas, mercado e patrimônio, com login e senha.
Versão 0.1 — uso pessoal da Família Vital (a mesma lógica do painel que usamos no Claude).

## Como está montado

| Parte | Ferramenta | Custo inicial |
|---|---|---|
| Site / app web (PWA, instala na tela do celular) | GitHub Pages (dabarstudio.github.io/oikos) | grátis no plano inicial |
| Login (e-mail e senha) e banco de dados | Supabase (Postgres + Auth) | grátis no plano inicial |
| App iOS e Android | Capacitor, empacotando a mesma pasta `public/` | Apple: US$ 99/ano · Google Play: US$ 25 uma vez |

Os dados ficam no Supabase. Cada família só enxerga os próprios dados: isso é garantido no banco (regras RLS em `supabase/schema.sql`), não só na tela. Foi testado: um usuário de fora da família vê zero registros.

## Colocar no ar (cerca de 30 minutos)

1. **Supabase** — crie uma conta em supabase.com e um projeto (região São Paulo).
   - SQL Editor → cole e rode `supabase/schema.sql`.
   - Authentication → Providers → Email: deixe **desligado** "Allow new users to sign up" (só entra quem você cadastrar).
   - Authentication → Users → **Add user**: crie o seu e o da Jheniffer, com senha.
   - Abra `supabase/seed_familia_vital.sql`, troque os dois e-mails de exemplo pelos cadastrados e rode no SQL Editor.
   - Project Settings → API: copie a *Project URL* e a *anon public key*.
2. **Configuração** — cole esses dois valores em `public/config.js`.
3. **Netlify** — em app.netlify.com: Add new site → Deploy manually → arraste a pasta `public/`.
   - Domain management: troque o endereço para algo como `saldovital.netlify.app` ou ligue um domínio próprio.
   - Authentication → URL Configuration (no Supabase): coloque o endereço do site em *Site URL* (para o link de "esqueci a senha").
4. Abra o endereço no celular → menu do navegador → **Adicionar à tela de início**. Já funciona como app.

## Testar no computador sem configurar nada

`npm run dev` e abra `http://localhost:8080/public/` — sem `config.js` preenchido, o app abre em **modo demonstração** com os arquivos da pasta `seed/`.

## Atualizar os dados

Hoje os números vêm da planilha `ORCAMENTO_FAMILIAR_2026_compilado.xlsx`, que o Claude atualiza com os extratos. A cada atualização sai um novo `seed_familia_vital.sql`: basta rodar de novo no SQL Editor (ele substitui os dados da família).

As **correções de categoria** feitas no app ficam salvas na tabela `correcoes` e são aplicadas na atualização seguinte.

## App nas lojas (iOS e Android)

```
npm install
npm run cap:add:android   # gera o projeto Android (abrir no Android Studio)
npm run cap:add:ios       # gera o projeto iOS (precisa de um Mac com Xcode)
npm run cap:sync          # depois de cada mudança na pasta public/
```
Para publicar: conta Google Play Console (US$ 25, uma vez) e Apple Developer Program (US$ 99/ano). A Apple costuma recusar app que é só um site embrulhado: antes de enviar, vale somar recursos de celular (notificação de meta estourada, leitura de QR Code de nota fiscal).

## Próximos passos para vender (versão comercial)

1. Importação de extratos pelo próprio usuário (OFX/CSV dos bancos) e regras de categorização automáticas.
2. Correção de categoria com efeito imediato (lançamentos em tabela própria, totais calculados no banco).
3. Cadastro aberto com plano pago (assinatura via Stripe ou Mercado Pago), uma "família" por assinatura, convite de membros.
4. Leitura de NFC-e por QR Code para a análise de mercado.
5. LGPD: termo de uso e política de privacidade (dados financeiros são sensíveis), registro de consentimento e exclusão de conta.
6. Registro da marca no INPI antes de divulgar o nome.


---
by Dabar Studio
