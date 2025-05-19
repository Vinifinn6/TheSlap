// ARQUIVO: src/app/api/auth/[...auth0]/route.ts
// Este arquivo deve estar em: src/app/api/auth/[...auth0]/route.ts
// Função: Rotas de API para autenticação Auth0 no Next.js App Router

import { handleAuth } from '@auth0/nextjs-auth0';

// Exporta as funções GET e POST para lidar com autenticação Auth0
export const GET = handleAuth();
export const POST = handleAuth();
