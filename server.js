// Servidor Express para conectar ao CockroachDB
const express = require("express")
const { Pool } = require("pg")
const cors = require("cors")
const { expressjwt: jwt } = require("express-jwt")
const jwksRsa = require("jwks-rsa")

const app = express()
const port = process.env.PORT || 3001

// Middleware
// Adicionar middleware CORS mais permissivo para desenvolvimento
app.use(
  cors({
    origin: (origin, callback) => {
      // Permitir requisições sem origem (como apps móveis ou curl)
      if (!origin) return callback(null, true)

      // Permitir todas as origens em desenvolvimento
      // Em produção, você deve restringir isso apenas aos domínios permitidos
      return callback(null, true)
    },
    credentials: true,
  }),
)
app.use(express.json())

// Configuração do Auth0
const checkJwt = jwt({
  secret: jwksRsa.expressJwtSecret({
    cache: true,
    rateLimit: true,
    jwksRequestsPerMinute: 5,
    jwksUri: `https://${process.env.AUTH0_DOMAIN}/.well-known/jwks.json`,
  }),
  audience: process.env.AUTH0_AUDIENCE,
  issuer: `https://${process.env.AUTH0_DOMAIN}/`,
  algorithms: ["RS256"],
})

// Configuração do CockroachDB
const pool = new Pool({
  connectionString:
    "postgresql://Vinifinn6:l4CL2YEEoapFl4O1zCkCYw@theslap-db-6577.jxf.gcp-southamerica-east1.cockroachlabs.cloud:26257/defaultdb?sslmode=verify-full",
  ssl: {
    rejectUnauthorized: false,
  },
})

// Inicialização do banco de dados
async function initDatabase() {
  const client = await pool.connect()
  try {
    // Criar tabelas se não existirem
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT NOT NULL,
        email TEXT NOT NULL,
        avatar TEXT,
        bio TEXT,
        school TEXT,
        friends TEXT[],
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `)

    await client.query(`
      CREATE TABLE IF NOT EXISTS posts (
        id SERIAL PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id),
        username TEXT NOT NULL,
        user_avatar TEXT,
        content TEXT NOT NULL,
        image_urls TEXT[],
        mood TEXT,
        likes INT DEFAULT 0,
        comments JSONB DEFAULT '[]',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `)
  } finally {
    client.release()
  }
}

// Iniciar o servidor
app.listen(port, () => {
  console.log(`Servidor rodando na porta ${port}`)
  initDatabase()
})
