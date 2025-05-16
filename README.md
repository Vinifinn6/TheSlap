# TheSlap - Clone Inspirado no Victorious

![TheSlap Logo](./assets/images/theslap-logo.png)

## Sobre o Projeto

TheSlap é uma recriação da rede social fictícia do programa Victorious, adaptada com funcionalidades modernas. Este projeto utiliza Auth0 para autenticação, CockroachDB para armazenamento de dados, e Imgur para hospedagem de imagens.

## Funcionalidades

- **Autenticação**: Login e registro com Auth0
- **Perfil Personalizado**: Upload de foto de perfil via Imgur
- **Posts**: Compartilhe atualizações com texto e até 2 imagens por post
- **Humores Personalizados**: Expresse seu humor com emojis personalizados
- **Amizades**: Adicione outros usuários como amigos
- **Notificações**: Receba alertas sobre novas interações
- **Mensagens**: Sistema de mensagens privadas entre usuários
- **Páginas Populares**: Visualize os perfis com maior interação
- **Feed de Amigos**: Veja as atualizações mais recentes dos seus amigos

## Requisitos

- Node.js 14 ou superior
- Conta no Auth0 (gratuita)
- Conta no CockroachDB (gratuita)
- Conta no Imgur (gratuita)
- Conta na Vercel (opcional, para hospedagem)

## Configuração Passo a Passo

### 1. Clone o Repositório

\`\`\`bash
git clone https://github.com/seu-usuario/theslap.git
cd theslap
\`\`\`

### 2. Configure o Auth0

1. Acesse o [Auth0 Dashboard](https://manage.auth0.com/)
2. Crie uma nova conta se ainda não tiver uma
3. Crie uma nova aplicação:
   - Clique em "Applications" > "Create Application"
   - Escolha "Single Page Application"
   - Dê um nome para sua aplicação (ex: "TheSlap")
4. Configure a aplicação:
   - Na aba "Settings", configure as seguintes URLs:
     - Allowed Callback URLs: `http://localhost:3000, https://seu-dominio.com`
     - Allowed Logout URLs: `http://localhost:3000, https://seu-dominio.com`
     - Allowed Web Origins: `http://localhost:3000, https://seu-dominio.com`
   - Anote o Domain e Client ID
5. Crie uma API:
   - Clique em "APIs" > "Create API"
   - Dê um nome para sua API (ex: "TheSlap API")
   - Defina um identificador (ex: `https://api.theslap.com`)
   - Escolha o algoritmo de assinatura RS256
6. Substitua as credenciais no arquivo `auth0Config.js`:

\`\`\`javascript
// auth0Config.js
const auth0Config = {
  domain: 'seu-dominio.auth0.com',
  clientId: 'seu-client-id-auth0',
  audience: 'https://api.theslap.com', // API identifier
  redirectUri: window.location.origin,
  scope: 'openid profile email'
};
\`\`\`

### 3. Configure o CockroachDB

1. Acesse o [CockroachDB Cloud](https://cockroachlabs.cloud/)
2. Crie uma nova conta se ainda não tiver uma
3. Crie um novo cluster:
   - Escolha o plano gratuito (Serverless)
   - Selecione a região mais próxima de você
   - Dê um nome para seu cluster (ex: "theslap-db")
4. Após a criação do cluster:
   - Vá para "Connect" e selecione "Connection string"
   - Crie um novo usuário e senha para o banco de dados
   - Copie a string de conexão
5. Configure o backend:
   - Crie um arquivo `.env` na raiz do projeto
   - Adicione a string de conexão:
   \`\`\`
   DATABASE_URL=postgresql://usuario:senha@host:porta/defaultdb?sslmode=verify-full&options=--cluster%3Dtheslap-db
   AUTH0_DOMAIN=seu-dominio.auth0.com
   AUTH0_AUDIENCE=https://api.theslap.com
   \`\`\`
6. Substitua as credenciais no arquivo `dbConfig.js`:

\`\`\`javascript
// dbConfig.js
const dbConfig = {
  apiUrl: 'https://seu-backend-api.com/api', // URL da sua API que se conecta ao CockroachDB
  apiKey: 'sua-api-key' // Se você implementar autenticação de API
};
\`\`\`

### 4. Configure o Imgur API

1. Acesse o [Imgur Developer Application](https://api.imgur.com/oauth2/addclient)
2. Crie uma conta se ainda não tiver uma
3. Registre um novo aplicativo:
   - Escolha "OAuth 2 authorization without a callback URL"
   - Preencha o nome do aplicativo e uma descrição
   - Forneça seu e-mail
4. Após o registro, você receberá um Client ID
5. Abra o arquivo `script.js` e substitua a variável `IMGUR_CLIENT_ID` pelo seu Client ID:

\`\`\`javascript
// No início do arquivo script.js
const IMGUR_CLIENT_ID = 'seu_client_id_do_imgur';
\`\`\`

### 5. Configure o Backend

1. Instale as dependências:
\`\`\`bash
npm install express pg cors express-jwt jwks-rsa dotenv
\`\`\`

2. Inicie o servidor:
\`\`\`bash
node server.js
\`\`\`

3. O servidor estará disponível em `http://localhost:3001`

### 6. Adicione a Logo do Site

1. Crie uma pasta `assets/images` no seu projeto
2. Adicione sua logo personalizada como `theslap-logo.png` nesta pasta
   - Você pode criar uma logo inspirada no TheSlap original usando ferramentas como Photoshop, GIMP ou Canva
   - Recomendação: use uma mão laranja com o texto "TheSlap" ao lado
3. Ou use a logo padrão incluída no projeto

### 7. Implantação Local

Para testar localmente:

\`\`\`bash
# Instale um servidor local simples
npm install -g serve

# Execute o servidor frontend
serve -s .

# Em outro terminal, execute o servidor backend
node server.js
\`\`\`

Acesse `http://localhost:3000` no seu navegador para o frontend.

### 8. Implantação na Vercel

1. Crie uma conta na [Vercel](https://vercel.com/)
2. Instale a CLI da Vercel:

\`\`\`bash
npm install -g vercel
\`\`\`

3. Faça login e implante:

\`\`\`bash
vercel login
vercel
\`\`\`

4. Configure as variáveis de ambiente na Vercel:
   - DATABASE_URL
   - AUTH0_DOMAIN
   - AUTH0_AUDIENCE

5. Siga as instruções na tela para completar a implantação

## Limites Gratuitos

### Auth0
- **Plano gratuito**: 7.000 usuários ativos
- **Conexões sociais**: Limitadas no plano gratuito
- **Regras e hooks**: Limitados no plano gratuito

### CockroachDB
- **Plano Serverless**: 5GB de armazenamento gratuito
- **Limites de uso**: $0.50/milhão de solicitações (primeiros 50 milhões gratuitos por mês)
- **Limites de computação**: 250M RUs por mês (aproximadamente 5 milhões de transações)

### Imgur
- **Upload de imagens**: 1.250 uploads por dia
- **Largura de banda**: 500GB por mês
- **Sem limite de armazenamento**: As imagens ficam armazenadas indefinidamente

## Solução de Problemas

### Erro de CORS no Imgur

Se encontrar erros de CORS ao fazer upload de imagens:

1. Verifique se o Client ID do Imgur está correto
2. Certifique-se de que está usando o cabeçalho de autorização corretamente:
   \`\`\`javascript
   headers: {
     'Authorization': `Client-ID ${IMGUR_CLIENT_ID}`
   }
   \`\`\`
3. Verifique se o aplicativo Imgur está configurado corretamente

### Problemas de Autenticação com Auth0

Se os usuários não conseguirem fazer login:

1. Verifique se as URLs de callback estão configuradas corretamente
2. Certifique-se de que o domínio e o client ID estão corretos
3. Verifique se há erros no console do navegador
4. Verifique os logs do Auth0 Dashboard

### Problemas de Conexão com CockroachDB

Se o backend não conseguir se conectar ao banco de dados:

1. Verifique se a string de conexão está correta
2. Certifique-se de que o IP do seu servidor está na lista de IPs permitidos
3. Verifique se o usuário e senha estão corretos
4. Verifique os logs do servidor para mensagens de erro específicas

## Contribuição

Contribuições são bem-vindas! Sinta-se à vontade para abrir issues ou enviar pull requests.

## Licença

Este projeto está licenciado sob a licença MIT - veja o arquivo LICENSE para detalhes.

## Informações Adicionais

### Migração do Firebase (Legado)

Se você estiver migrando de uma versão anterior que usava Firebase, siga estes passos:

1. Exporte seus dados do Firebase Firestore:
   - No Firebase Console, vá para Firestore > Exportar
   - Siga as instruções para exportar seus dados

2. Importe os dados para o CockroachDB:
   - Use o script de migração fornecido em `scripts/migrate-firebase-to-cockroach.js`
   - Execute o script com `node scripts/migrate-firebase-to-cockroach.js`

3. Atualize as referências no código:
   - Substitua todas as chamadas Firebase pelo novo sistema de API
   - Atualize a autenticação para usar Auth0 em vez do Firebase Auth

4. Teste a aplicação para garantir que tudo funcione corretamente
\`\`\`

Vamos criar um script de migração para ajudar na transição do Firebase para o CockroachDB:
