# TheSlap.com - Rede Social

![TheSlap.com Logo](/public/images/theslap-logo.png)

Uma rede social inspirada no TheSlap.com da série Victorious, desenvolvida com Next.js, Auth0, CockroachDB e Imgur.

## 📱 Visão Geral

Este projeto é uma recriação moderna da rede social TheSlap.com, com design inspirado na série Victorious, mas com funcionalidades semelhantes ao Twitter. A aplicação permite que usuários criem perfis, publiquem posts com imagens, comentem em publicações de outros usuários e troquem mensagens privadas.

## ✨ Funcionalidades

### Usuários
- Cadastro e login via Auth0
- Perfil personalizado com foto e nome de usuário (@exemplo)
- Página de perfil com abas para posts e comentários

### Posts
- Publicação de texto
- Upload de até 2 imagens por post (armazenadas no Imgur)
- Marcação de outros usuários (@usuario)
- Campo de humor (pré-definido ou personalizado com emoji)
- Edição e exclusão de posts

### Comentários
- Texto com suporte a menções (@usuario)
- Upload de até 2 imagens por comentário
- Edição e exclusão de comentários

### Mensagens Privadas
- Chat entre usuários
- Suporte a imagens (até 2 por mensagem)

## 🛠️ Tecnologias Utilizadas

- **Frontend**: Next.js com TypeScript e Tailwind CSS
- **Autenticação**: Auth0
- **Banco de Dados**: CockroachDB
- **Armazenamento de Imagens**: Imgur API
- **Hospedagem**: Vercel (com Serverless Functions)

## 🚀 Como Configurar e Executar

### Pré-requisitos

- Node.js (versão 18 ou superior)
- NPM ou Yarn
- Conta na Vercel
- Conta no Auth0
- Conta no CockroachDB
- Conta no Imgur

### Passo 1: Clonar o Repositório

```bash
git clone https://github.com/seu-usuario/theslap-project.git
cd theslap-project
```

### Passo 2: Instalar Dependências

```bash
npm install
# ou
yarn install
```

### Passo 3: Configurar Variáveis de Ambiente

Crie um arquivo `.env.local` na raiz do projeto com as seguintes variáveis:

```
# Configurações do Auth0
AUTH0_SECRET='use [openssl rand -hex 32] para gerar um segredo'
AUTH0_BASE_URL='http://localhost:3000'
AUTH0_ISSUER_BASE_URL='https://vinifinn6.us.auth0.com'
AUTH0_CLIENT_ID='OuKs70nxKcQCb43urRJ8LbiHpOcnm0Ui'
AUTH0_CLIENT_SECRET='GWVS06KjbZ8lwpPEo64KyKPouChlkPgee4whMYwlveOhSilpX2JXDDZ2CEE38y3i'
AUTH0_AUDIENCE='https://api.theslap.com'

# Configurações do CockroachDB
DATABASE_URL='postgresql://Vinifinn6:l4CL2YEEoapFl4O1zCkCYw@theslap-db-6577.jxf.gcp-southamerica-east1.cockroachlabs.cloud:26257/defaultdb?sslmode=verify-full'

# Configurações do Imgur
IMGUR_CLIENT_ID='353a61ba6d157df'
IMGUR_CLIENT_SECRET='df9618d914ec77b264f8fac38f5f74656f5e678f'
```

> **Nota**: Para gerar o AUTH0_SECRET, você pode usar o comando `openssl rand -hex 32` no terminal ou usar um gerador de senhas online.

### Passo 4: Executar em Ambiente de Desenvolvimento

```bash
npm run dev
# ou
yarn dev
```

Acesse `http://localhost:3000` para ver a aplicação rodando.

## 📂 Estrutura de Pastas

```
theslap-project/
├── api/                  # Funções serverless da Vercel
│   ├── auth/             # Endpoints de autenticação
│   ├── posts/            # Endpoints para posts
│   ├── comments/         # Endpoints para comentários
│   ├── messages/         # Endpoints para mensagens
│   └── users/            # Endpoints para usuários
├── public/               # Arquivos estáticos
│   └── images/           # Imagens do site
├── src/                  # Código fonte
│   ├── app/              # Páginas da aplicação (Next.js App Router)
│   ├── components/       # Componentes React reutilizáveis
│   ├── hooks/            # Hooks personalizados
│   ├── lib/              # Bibliotecas e utilitários
│   │   ├── db.ts         # Configuração do banco de dados
│   │   └── imgur.ts      # Funções para upload de imagens
│   ├── styles/           # Estilos globais
│   ├── types/            # Definições de tipos TypeScript
│   └── utils/            # Funções utilitárias
└── .env.local            # Variáveis de ambiente (não versionado)
```

## 🌐 Deploy na Vercel

### Configuração do Vercel e Serverless Functions

1. **Crie uma conta na Vercel** (se ainda não tiver)
   - Acesse [vercel.com](https://vercel.com) e crie uma conta gratuita

2. **Instale a CLI da Vercel**
   ```bash
   npm install -g vercel
   ```

3. **Faça login na Vercel via CLI**
   ```bash
   vercel login
   ```

4. **Configure o projeto para deploy**
   ```bash
   vercel
   ```
   - Responda às perguntas interativas:
     - Set up and deploy: `Y`
     - Which scope: Selecione sua conta
     - Link to existing project: `N`
     - Project name: `theslap`
     - Root directory: `./`
     - Override settings: `N`

5. **Configure as variáveis de ambiente na Vercel**
   - Acesse o painel da Vercel
   - Vá para seu projeto
   - Clique em "Settings" > "Environment Variables"
   - Adicione todas as variáveis do arquivo `.env.local`

6. **Faça o deploy final**
   ```bash
   vercel --prod
   ```

### Entendendo as Vercel Functions (Serverless)

As Vercel Functions são funções serverless que permitem executar código no servidor sem precisar gerenciar a infraestrutura. No nosso projeto, elas estão na pasta `/api` e são usadas para:

1. **Autenticação**: Integração com Auth0
2. **Operações de banco de dados**: Consultas e mutações no CockroachDB
3. **Upload de imagens**: Integração com a API do Imgur

#### Exemplo de Função Serverless para Posts

```typescript
// /api/posts/index.js
import { query } from '../../src/lib/db';

export default async function handler(req, res) {
  // Permitir apenas métodos específicos
  if (!['GET', 'POST'].includes(req.method)) {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    // GET: Listar posts
    if (req.method === 'GET') {
      const result = await query(`
        SELECT p.*, u.username, u.display_name, u.profile_image
        FROM posts p
        JOIN users u ON p.user_id = u.id
        ORDER BY p.created_at DESC
        LIMIT 20
      `);
      
      return res.status(200).json(result.rows);
    }
    
    // POST: Criar novo post
    if (req.method === 'POST') {
      const { content, moodText, moodEmoji, imageUrls, userId } = req.body;
      
      const result = await query(`
        INSERT INTO posts (content, mood_text, mood_emoji, image1_url, image2_url, user_id)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `, [content, moodText, moodEmoji, imageUrls[0] || null, imageUrls[1] || null, userId]);
      
      return res.status(201).json(result.rows[0]);
    }
  } catch (error) {
    console.error('Erro na API de posts:', error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
}
```

## 🔄 Inicialização do Banco de Dados

Para inicializar o banco de dados com as tabelas necessárias, criamos uma função na biblioteca `db.ts` que pode ser chamada durante o primeiro deploy:

```typescript
// Exemplo de uso em uma função serverless
// /api/setup/index.js
import { initDatabase } from '../../src/lib/db';

export default async function handler(req, res) {
  try {
    await initDatabase();
    res.status(200).json({ message: 'Banco de dados inicializado com sucesso!' });
  } catch (error) {
    console.error('Erro ao inicializar banco de dados:', error);
    res.status(500).json({ error: 'Falha ao inicializar banco de dados' });
  }
}
```

## 📸 Integração com Imgur

A integração com o Imgur permite o upload automático de imagens. O processo funciona assim:

1. Usuário seleciona uma imagem no formulário
2. Frontend comprime a imagem (se necessário)
3. Imagem é convertida para base64
4. API do Imgur é chamada para fazer o upload
5. URL da imagem é salva no banco de dados

## 🔐 Autenticação com Auth0

A autenticação é gerenciada pelo Auth0, que oferece:

- Login social (Google, Facebook, etc.)
- Login por email/senha
- Proteção contra ataques
- Gerenciamento de sessões

Para configurar o Auth0:

1. Crie uma conta em [auth0.com](https://auth0.com)
2. Crie uma aplicação do tipo "Regular Web Application"
3. Configure as URLs de callback: `https://seu-dominio.vercel.app/api/auth/callback`
4. Configure as URLs permitidas de logout: `https://seu-dominio.vercel.app`
5. Adicione as credenciais ao arquivo `.env.local` e ao painel da Vercel

## 📝 Notas Importantes

- **Segurança**: Nunca compartilhe suas credenciais ou o arquivo `.env.local`
- **Limites**: O plano gratuito do Imgur tem limite de uploads, monitore o uso
- **Escalabilidade**: Para mais de 20 usuários, considere atualizar os planos dos serviços

## 🤝 Contribuição

Contribuições são bem-vindas! Sinta-se à vontade para abrir issues ou enviar pull requests.

## 📄 Licença

Este projeto está licenciado sob a licença MIT - veja o arquivo LICENSE para detalhes.
