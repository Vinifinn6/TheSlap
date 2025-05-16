// Servidor Express para conectar ao CockroachDB
const express = require("express")
const { Pool } = require("pg")
const cors = require("cors")
const { expressjwt: jwt } = require("express-jwt")
const jwksRsa = require("jwks-rsa")

const app = express()
const port = process.env.PORT || 3001

// Middleware
app.use(cors())
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
  connectionString: process.env.DATABASE_URL,
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

    await client.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id),
        type TEXT NOT NULL,
        data JSONB NOT NULL,
        read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `)

    await client.query(`
      CREATE TABLE IF NOT EXISTS conversations (
        id SERIAL PRIMARY KEY,
        participants TEXT[] NOT NULL,
        last_message TEXT,
        last_message_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `)

    await client.query(`
      CREATE TABLE IF NOT EXISTS messages (
        id SERIAL PRIMARY KEY,
        conversation_id INT NOT NULL REFERENCES conversations(id),
        sender_id TEXT NOT NULL REFERENCES users(id),
        content TEXT NOT NULL,
        read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `)

    console.log("Database initialized successfully")
  } catch (err) {
    console.error("Error initializing database:", err)
  } finally {
    client.release()
  }
}

// Inicializar banco de dados
initDatabase().catch(console.error)

// Rotas de usuários
app.get("/api/users", checkJwt, async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM users ORDER BY username")
    res.json(result.rows)
  } catch (err) {
    console.error("Error fetching users:", err)
    res.status(500).json({ error: "Internal server error" })
  }
})

app.get("/api/users/popular", checkJwt, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT * FROM users
      ORDER BY array_length(friends, 1) DESC NULLS LAST
      LIMIT 6
    `)
    res.json(result.rows)
  } catch (err) {
    console.error("Error fetching popular users:", err)
    res.status(500).json({ error: "Internal server error" })
  }
})

app.get("/api/users/search", checkJwt, async (req, res) => {
  const { query } = req.query
  try {
    const result = await pool.query(
      `
      SELECT * FROM users
      WHERE username ILIKE $1
      ORDER BY username
      LIMIT 10
    `,
      [`%${query}%`],
    )
    res.json(result.rows)
  } catch (err) {
    console.error("Error searching users:", err)
    res.status(500).json({ error: "Internal server error" })
  }
})

app.get("/api/users/:id", checkJwt, async (req, res) => {
  const { id } = req.params
  try {
    const result = await pool.query("SELECT * FROM users WHERE id = $1", [id])
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "User not found" })
    }
    res.json(result.rows[0])
  } catch (err) {
    console.error("Error fetching user:", err)
    res.status(500).json({ error: "Internal server error" })
  }
})

app.post("/api/users", checkJwt, async (req, res) => {
  const { id, username, email, avatar, bio, school, friends } = req.body
  try {
    const result = await pool.query(
      `
      INSERT INTO users (id, username, email, avatar, bio, school, friends)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `,
      [id, username, email, avatar, bio, school, friends || []],
    )
    res.status(201).json(result.rows[0])
  } catch (err) {
    console.error("Error creating user:", err)
    res.status(500).json({ error: "Internal server error" })
  }
})

app.put("/api/users/:id", checkJwt, async (req, res) => {
  const { id } = req.params
  const { avatar, bio, school } = req.body

  // Verificar se o usuário está atualizando seu próprio perfil
  if (req.auth.sub !== id) {
    return res.status(403).json({ error: "Unauthorized" })
  }

  try {
    const result = await pool.query(
      `
      UPDATE users
      SET avatar = COALESCE($1, avatar),
          bio = COALESCE($2, bio),
          school = COALESCE($3, school)
      WHERE id = $4
      RETURNING *
    `,
      [avatar, bio, school, id],
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "User not found" })
    }

    res.json(result.rows[0])
  } catch (err) {
    console.error("Error updating user:", err)
    res.status(500).json({ error: "Internal server error" })
  }
})

// Rotas de amizade
app.post("/api/users/:id/friends", checkJwt, async (req, res) => {
  const { id } = req.params
  const { friendId } = req.body

  // Verificar se o usuário está adicionando amigo ao seu próprio perfil
  if (req.auth.sub !== id) {
    return res.status(403).json({ error: "Unauthorized" })
  }

  try {
    // Adicionar amigo ao usuário atual
    await pool.query(
      `
      UPDATE users
      SET friends = array_append(COALESCE(friends, ARRAY[]::text[]), $1)
      WHERE id = $2 AND NOT ($1 = ANY(COALESCE(friends, ARRAY[]::text[])))
    `,
      [friendId, id],
    )

    // Adicionar usuário atual como amigo do outro usuário
    await pool.query(
      `
      UPDATE users
      SET friends = array_append(COALESCE(friends, ARRAY[]::text[]), $1)
      WHERE id = $2 AND NOT ($1 = ANY(COALESCE(friends, ARRAY[]::text[])))
    `,
      [id, friendId],
    )

    res.status(200).json({ message: "Friend added successfully" })
  } catch (err) {
    console.error("Error adding friend:", err)
    res.status(500).json({ error: "Internal server error" })
  }
})

app.delete("/api/users/:id/friends/:friendId", checkJwt, async (req, res) => {
  const { id, friendId } = req.params

  // Verificar se o usuário está removendo amigo do seu próprio perfil
  if (req.auth.sub !== id) {
    return res.status(403).json({ error: "Unauthorized" })
  }

  try {
    // Remover amigo do usuário atual
    await pool.query(
      `
      UPDATE users
      SET friends = array_remove(friends, $1)
      WHERE id = $2
    `,
      [friendId, id],
    )

    // Remover usuário atual como amigo do outro usuário
    await pool.query(
      `
      UPDATE users
      SET friends = array_remove(friends, $1)
      WHERE id = $2
    `,
      [id, friendId],
    )

    res.status(200).json({ message: "Friend removed successfully" })
  } catch (err) {
    console.error("Error removing friend:", err)
    res.status(500).json({ error: "Internal server error" })
  }
})

// Rotas de posts
app.get("/api/posts", checkJwt, async (req, res) => {
  const { userId, userIds } = req.query

  try {
    let result

    if (userId) {
      // Buscar posts de um usuário específico
      result = await pool.query(
        `
        SELECT * FROM posts
        WHERE user_id = $1
        ORDER BY created_at DESC
        LIMIT 20
      `,
        [userId],
      )
    } else if (userIds) {
      // Buscar posts de vários usuários (feed)
      const userIdArray = userIds.split(",")
      result = await pool.query(
        `
        SELECT * FROM posts
        WHERE user_id = ANY($1)
        ORDER BY created_at DESC
        LIMIT 20
      `,
        [userIdArray],
      )
    } else {
      // Buscar todos os posts
      result = await pool.query(`
        SELECT * FROM posts
        ORDER BY created_at DESC
        LIMIT 20
      `)
    }

    res.json(result.rows)
  } catch (err) {
    console.error("Error fetching posts:", err)
    res.status(500).json({ error: "Internal server error" })
  }
})

app.get("/api/posts/:id", checkJwt, async (req, res) => {
  const { id } = req.params
  try {
    const result = await pool.query("SELECT * FROM posts WHERE id = $1", [id])
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Post not found" })
    }
    res.json(result.rows[0])
  } catch (err) {
    console.error("Error fetching post:", err)
    res.status(500).json({ error: "Internal server error" })
  }
})

app.post("/api/posts", checkJwt, async (req, res) => {
  const { content, imageUrls, userId, username, userAvatar, mood } = req.body

  // Verificar se o usuário está criando post com seu próprio ID
  if (req.auth.sub !== userId) {
    return res.status(403).json({ error: "Unauthorized" })
  }

  try {
    const result = await pool.query(
      `
      INSERT INTO posts (user_id, username, user_avatar, content, image_urls, mood, likes, comments)
      VALUES ($1, $2, $3, $4, $5, $6, 0, '[]')
      RETURNING *
    `,
      [userId, username, userAvatar, content, imageUrls || [], mood],
    )

    res.status(201).json(result.rows[0])
  } catch (err) {
    console.error("Error creating post:", err)
    res.status(500).json({ error: "Internal server error" })
  }
})

app.post("/api/posts/:id/like", checkJwt, async (req, res) => {
  const { id } = req.params
  try {
    const result = await pool.query(
      `
      UPDATE posts
      SET likes = likes + 1
      WHERE id = $1
      RETURNING *
    `,
      [id],
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Post not found" })
    }

    res.json(result.rows[0])
  } catch (err) {
    console.error("Error liking post:", err)
    res.status(500).json({ error: "Internal server error" })
  }
})

app.post("/api/posts/:id/comments", checkJwt, async (req, res) => {
  const { id } = req.params
  const { userId, username, userAvatar, content, timestamp } = req.body

  // Verificar se o usuário está comentando com seu próprio ID
  if (req.auth.sub !== userId) {
    return res.status(403).json({ error: "Unauthorized" })
  }

  try {
    // Buscar post e comentários atuais
    const postResult = await pool.query("SELECT comments FROM posts WHERE id = $1", [id])

    if (postResult.rows.length === 0) {
      return res.status(404).json({ error: "Post not found" })
    }

    // Adicionar novo comentário
    const comments = postResult.rows[0].comments || []
    const newComment = {
      userId,
      username,
      userAvatar,
      content,
      timestamp,
    }

    comments.push(newComment)

    // Atualizar post com novo comentário
    const result = await pool.query(
      `
      UPDATE posts
      SET comments = $1
      WHERE id = $2
      RETURNING *
    `,
      [JSON.stringify(comments), id],
    )

    res.json(result.rows[0])
  } catch (err) {
    console.error("Error adding comment:", err)
    res.status(500).json({ error: "Internal server error" })
  }
})

// Rotas de notificações
app.get("/api/notifications", checkJwt, async (req, res) => {
  const { userId } = req.query

  // Verificar se o usuário está buscando suas próprias notificações
  if (req.auth.sub !== userId) {
    return res.status(403).json({ error: "Unauthorized" })
  }

  try {
    const result = await pool.query(
      `
      SELECT * FROM notifications
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT 20
    `,
      [userId],
    )

    res.json(result.rows)
  } catch (err) {
    console.error("Error fetching notifications:", err)
    res.status(500).json({ error: "Internal server error" })
  }
})

app.post("/api/notifications", checkJwt, async (req, res) => {
  const { userId, type, data, read, timestamp } = req.body

  try {
    const result = await pool.query(
      `
      INSERT INTO notifications (user_id, type, data, read, created_at)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `,
      [userId, type, JSON.stringify(data), read || false, timestamp],
    )

    res.status(201).json(result.rows[0])
  } catch (err) {
    console.error("Error creating notification:", err)
    res.status(500).json({ error: "Internal server error" })
  }
})

app.put("/api/notifications/markAsRead", checkJwt, async (req, res) => {
  const { userId } = req.query

  // Verificar se o usuário está marcando suas próprias notificações
  if (req.auth.sub !== userId) {
    return res.status(403).json({ error: "Unauthorized" })
  }

  try {
    await pool.query(
      `
      UPDATE notifications
      SET read = TRUE
      WHERE user_id = $1 AND read = FALSE
    `,
      [userId],
    )

    res.status(200).json({ message: "Notifications marked as read" })
  } catch (err) {
    console.error("Error marking notifications as read:", err)
    res.status(500).json({ error: "Internal server error" })
  }
})

app.get("/api/notifications/unread", checkJwt, async (req, res) => {
  const { userId } = req.query

  // Verificar se o usuário está contando suas próprias notificações
  if (req.auth.sub !== userId) {
    return res.status(403).json({ error: "Unauthorized" })
  }

  try {
    const result = await pool.query(
      `
      SELECT COUNT(*) FROM notifications
      WHERE user_id = $1 AND read = FALSE
    `,
      [userId],
    )

    res.json({ count: Number.parseInt(result.rows[0].count) })
  } catch (err) {
    console.error("Error counting unread notifications:", err)
    res.status(500).json({ error: "Internal server error" })
  }
})

// Rotas de conversas
app.get("/api/conversations", checkJwt, async (req, res) => {
  const { userId } = req.query

  // Verificar se o usuário está buscando suas próprias conversas
  if (req.auth.sub !== userId) {
    return res.status(403).json({ error: "Unauthorized" })
  }

  try {
    const result = await pool.query(
      `
      SELECT * FROM conversations
      WHERE $1 = ANY(participants)
      ORDER BY last_message_time DESC
    `,
      [userId],
    )

    res.json(result.rows)
  } catch (err) {
    console.error("Error fetching conversations:", err)
    res.status(500).json({ error: "Internal server error" })
  }
})

app.get("/api/conversations/:id", checkJwt, async (req, res) => {
  const { id } = req.params

  try {
    const result = await pool.query("SELECT * FROM conversations WHERE id = $1", [id])

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Conversation not found" })
    }

    // Verificar se o usuário é participante da conversa
    const conversation = result.rows[0]
    if (!conversation.participants.includes(req.auth.sub)) {
      return res.status(403).json({ error: "Unauthorized" })
    }

    res.json(conversation)
  } catch (err) {
    console.error("Error fetching conversation:", err)
    res.status(500).json({ error: "Internal server error" })
  }
})

app.post("/api/conversations", checkJwt, async (req, res) => {
  const { participants, lastMessage, lastMessageTime } = req.body

  // Verificar se o usuário é um dos participantes
  if (!participants.includes(req.auth.sub)) {
    return res.status(403).json({ error: "Unauthorized" })
  }

  try {
    const result = await pool.query(
      `
      INSERT INTO conversations (participants, last_message, last_message_time)
      VALUES ($1, $2, $3)
      RETURNING *
    `,
      [participants, lastMessage || "", lastMessageTime],
    )

    res.status(201).json(result.rows[0])
  } catch (err) {
    console.error("Error creating conversation:", err)
    res.status(500).json({ error: "Internal server error" })
  }
})

app.put("/api/conversations/:id", checkJwt, async (req, res) => {
  const { id } = req.params
  const { lastMessage, lastMessageTime } = req.body

  try {
    // Verificar se o usuário é participante da conversa
    const conversationResult = await pool.query("SELECT * FROM conversations WHERE id = $1", [id])

    if (conversationResult.rows.length === 0) {
      return res.status(404).json({ error: "Conversation not found" })
    }

    const conversation = conversationResult.rows[0]
    if (!conversation.participants.includes(req.auth.sub)) {
      return res.status(403).json({ error: "Unauthorized" })
    }

    const result = await pool.query(
      `
      UPDATE conversations
      SET last_message = $1,
          last_message_time = $2
      WHERE id = $3
      RETURNING *
    `,
      [lastMessage, lastMessageTime, id],
    )

    res.json(result.rows[0])
  } catch (err) {
    console.error("Error updating conversation:", err)
    res.status(500).json({ error: "Internal server error" })
  }
})

// Rotas de mensagens
app.get("/api/conversations/:id/messages", checkJwt, async (req, res) => {
  const { id } = req.params

  try {
    // Verificar se o usuário é participante da conversa
    const conversationResult = await pool.query("SELECT * FROM conversations WHERE id = $1", [id])

    if (conversationResult.rows.length === 0) {
      return res.status(404).json({ error: "Conversation not found" })
    }

    const conversation = conversationResult.rows[0]
    if (!conversation.participants.includes(req.auth.sub)) {
      return res.status(403).json({ error: "Unauthorized" })
    }

    const result = await pool.query(
      `
      SELECT * FROM messages
      WHERE conversation_id = $1
      ORDER BY created_at
    `,
      [id],
    )

    res.json(result.rows)
  } catch (err) {
    console.error("Error fetching messages:", err)
    res.status(500).json({ error: "Internal server error" })
  }
})

app.post("/api/conversations/:id/messages", checkJwt, async (req, res) => {
  const { id } = req.params
  const { senderId, content, timestamp } = req.body

  // Verificar se o usuário está enviando mensagem com seu próprio ID
  if (req.auth.sub !== senderId) {
    return res.status(403).json({ error: "Unauthorized" })
  }

  try {
    // Verificar se o usuário é participante da conversa
    const conversationResult = await pool.query("SELECT * FROM conversations WHERE id = $1", [id])

    if (conversationResult.rows.length === 0) {
      return res.status(404).json({ error: "Conversation not found" })
    }

    const conversation = conversationResult.rows[0]
    if (!conversation.participants.includes(senderId)) {
      return res.status(403).json({ error: "Unauthorized" })
    }

    const result = await pool.query(
      `
      INSERT INTO messages (conversation_id, sender_id, content, created_at)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `,
      [id, senderId, content, timestamp],
    )

    res.status(201).json(result.rows[0])
  } catch (err) {
    console.error("Error creating message:", err)
    res.status(500).json({ error: "Internal server error" })
  }
})

app.put("/api/conversations/:id/messages/markAsRead", checkJwt, async (req, res) => {
  const { id } = req.params
  const { userId } = req.body

  // Verificar se o usuário está marcando suas próprias mensagens
  if (req.auth.sub !== userId) {
    return res.status(403).json({ error: "Unauthorized" })
  }

  try {
    // Verificar se o usuário é participante da conversa
    const conversationResult = await pool.query("SELECT * FROM conversations WHERE id = $1", [id])

    if (conversationResult.rows.length === 0) {
      return res.status(404).json({ error: "Conversation not found" })
    }

    const conversation = conversationResult.rows[0]
    if (!conversation.participants.includes(userId)) {
      return res.status(403).json({ error: "Unauthorized" })
    }

    await pool.query(
      `
      UPDATE messages
      SET read = TRUE
      WHERE conversation_id = $1 AND sender_id != $2 AND read = FALSE
    `,
      [id, userId],
    )

    res.status(200).json({ message: "Messages marked as read" })
  } catch (err) {
    console.error("Error marking messages as read:", err)
    res.status(500).json({ error: "Internal server error" })
  }
})

app.get("/api/conversations/unread", checkJwt, async (req, res) => {
  const { userId } = req.query

  // Verificar se o usuário está contando suas próprias mensagens
  if (req.auth.sub !== userId) {
    return res.status(403).json({ error: "Unauthorized" })
  }

  try {
    // Buscar todas as conversas do usuário
    const conversationsResult = await pool.query(
      `
      SELECT id FROM conversations
      WHERE $1 = ANY(participants)
    `,
      [userId],
    )

    const conversationIds = conversationsResult.rows.map((row) => row.id)

    if (conversationIds.length === 0) {
      return res.json({ count: 0 })
    }

    // Contar mensagens não lidas
    const result = await pool.query(
      `
      SELECT COUNT(*) FROM messages
      WHERE conversation_id = ANY($1) AND sender_id != $2 AND read = FALSE
    `,
      [conversationIds, userId],
    )

    res.json({ count: Number.parseInt(result.rows[0].count) })
  } catch (err) {
    console.error("Error counting unread messages:", err)
    res.status(500).json({ error: "Internal server error" })
  }
})

// Iniciar servidor
app.listen(port, () => {
  console.log(`Server running on port ${port}`)
})
