# API (`apps/api`)

Backend NestJS empacotado como função serverless pra Vercel (`apps/api/api/index.js`).

## Deploy na Vercel

Esse app é um projeto Vercel separado do admin e da storefront, apontando pra este
repositório com **Root Directory = `apps/api`**.

Configuração necessária no dashboard desse projeto (não dá pra automatizar via `vercel.json`):

- **Settings → General → Framework Preset**: precisa ser **"Other"**. A detecção
  automática de Nx da Vercel às vezes assume Next.js (por causa dos outros apps do
  monorepo) e passa a esperar uma pasta `.next` que nunca vai existir aqui, quebrando o
  deploy com `STATIC_BUILD_NO_OUT_DIR` mesmo com `"framework": null` no `vercel.json`.
- **Storage**: conectar o Postgres (Neon) usado pela API.
- **Environment Variables**: `JWT_SECRET` (obrigatório), `ASAAS_API_KEY`/`ASAAS_ENV`/
  `ASAAS_WEBHOOK_TOKEN` (opcionais, ativam a integração de pagamento).

Depois de mudar qualquer uma dessas configurações, um **Redeploy de uma entrada antiga
não reaplica a mudança** — ela reusa o commit e os ajustes de quando foi criada. É
preciso um deployment novo (push no repositório, ou "Create Deployment" na aba
Deployments) pra pegar a configuração atual.
