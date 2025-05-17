// Script para migrar dados do Firebase para o CockroachDB
require("dotenv").config()
const { Pool } = require("pg")
const admin = require("firebase-admin")
const fs = require("fs")
const path = require("path")

// Inicializar Firebase Admin
const serviceAccount = require("../firebase-service-account.json")
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
})

// Inicializar CockroachDB
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
})

// Função para criar tabelas no CockroachDB
async function createTables() {
  const client = await pool.connect()
  try {
    console.log("Criando tabelas no CockroachDB...")

    // Criar tabela de usuários
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
    console.log("Tabela users criada.")

    // Criar tabela de posts
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
    console.log("Tabela posts criada.")

    // Criar tabela de notificações
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
    console.log("Tabela notifications criada.")

    // Criar tabela de conversas
    await client.query(`
      CREATE TABLE IF NOT EXISTS conversations (
        id SERIAL PRIMARY KEY,
        participants TEXT[] NOT NULL,
        last_message TEXT,
        last_message_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `)
    console.log("Tabela conversations criada.")

    // Criar tabela de mensagens
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
    console.log("Tabela messages criada.")
  } catch (err) {
    console.error("Erro ao criar tabelas:", err)
  } finally {
    client.release()
  }
}

// Função para migrar usuários
async function migrateUsers() {
  console.log("Migrando usuários...")

  const usersSnapshot = await admin.firestore().collection("users").get()
  const client = await pool.connect()

  try {
    for (const doc of usersSnapshot.docs) {
      const userData = doc.data()

      // Converter amigos para array se existir
      const friends = userData.friends || []

      await client.query(
        `
        INSERT INTO users (id, username, email, avatar, bio, school, friends, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (id) DO UPDATE SET
          username = EXCLUDED.username,
          email = EXCLUDED.email,
          avatar = EXCLUDED.avatar,
          bio = EXCLUDED.bio,
          school = EXCLUDED.school,
          friends = EXCLUDED.friends
      `,
        [
          doc.id,
          userData.username,
          userData.email,
          userData.avatar,
          userData.bio || "",
          userData.school || "",
          friends,
          userData.createdAt ? new Date(userData.createdAt.toDate()) : new Date(),
        ],
      )

      console.log(`Usuário ${userData.username} migrado.`)
    }

    console.log(`Total de ${usersSnapshot.size} usuários migrados.`)
  } catch (err) {
    console.error("Erro ao migrar usuários:", err)
  } finally {
    client.release()
  }
}

// Função para migrar posts
async function migratePosts() {
  console.log("Migrando posts...")

  const postsSnapshot = await admin.firestore().collection("posts").get()
  const client = await pool.connect()

  try {
    for (const doc of postsSnapshot.docs) {
      const postData = doc.data()

      // Converter imageUrl para imageUrls array
      const imageUrls = postData.imageUrl ? [postData.imageUrl] : postData.imageUrls || []

      // Converter timestamp
      const timestamp = postData.timestamp ? new Date(postData.timestamp.toDate()) : new Date()

      await client.query(
        `
        INSERT INTO posts (id, user_id, username, user_avatar, content, image_urls, mood, likes, comments, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        ON CONFLICT (id) DO UPDATE SET
          content = EXCLUDED.content,
          image_urls = EXCLUDED.image_urls,
          mood = EXCLUDED.mood,
          likes = EXCLUDED.likes,
          comments = EXCLUDED.comments
      `,
        [
          doc.id,
          postData.userId,
          postData.username,
          postData.userAvatar,
          postData.content,
          imageUrls,
          postData.mood || "",
          postData.likes || 0,
          JSON.stringify(postData.comments || []),
          timestamp,
        ],
      )

      console.log(`Post ${doc.id} migrado.`)
    }

    console.log(`Total de ${postsSnapshot.size} posts migrados.`)
  } catch (err) {
    console.error("Erro ao migrar posts:", err)
  } finally {
    client.release()
  }
}

// Função para migrar notificações
async function migrateNotifications() {
  console.log("Migrando notificações...")

  const notificationsSnapshot = await admin.firestore().collection("notifications").get()
  const client = await pool.connect()

  try {
    for (const doc of notificationsSnapshot.docs) {
      const notificationData = doc.data()

      // Converter timestamp
      const timestamp = notificationData.timestamp ? new Date(notificationData.timestamp.toDate()) : new Date()

      await client.query(
        `
        INSERT INTO notifications (id, user_id, type, data, read, created_at)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (id) DO UPDATE SET
          type = EXCLUDED.type,
          data = EXCLUDED.data,
          read = EXCLUDED.read
      `,
        [
          doc.id,
          notificationData.userId,
          notificationData.type,
          JSON.stringify(notificationData.data || {}),
          notificationData.read || false,
          timestamp,
        ],
      )

      console.log(`Notificação ${doc.id} migrada.`)
    }

    console.log(`Total de ${notificationsSnapshot.size} notificações migradas.`)
  } catch (err) {
    console.error("Erro ao migrar notificaç��es:", err)
  } finally {
    client.release()
  }
}

// Função para migrar conversas e mensagens
async function migrateConversations() {
  console.log("Migrando conversas e mensagens...")

  const conversationsSnapshot = await admin.firestore().collection("conversations").get()
  const client = await pool.connect()

  try {
    for (const doc of conversationsSnapshot.docs) {
      const conversationData = doc.data()

      // Converter timestamp
      const lastMessageTime = conversationData.lastMessageTime
        ? new Date(conversationData.lastMessageTime.toDate())
        : new Date()

      // Inserir conversa
      const conversationResult = await client.query(
        `
        INSERT INTO conversations (id, participants, last_message, last_message_time)
        VALUES ($1, $2, $3, $4)
        RETURNING id
      `,
        [doc.id, conversationData.participants || [], conversationData.lastMessage || "", lastMessageTime],
      )

      console.log(`Conversa ${doc.id} migrada.`)

      // Migrar mensagens da conversa
      const messagesSnapshot = await admin
        .firestore()
        .collection("conversations")
        .doc(doc.id)
        .collection("messages")
        .get()

      for (const messageDoc of messagesSnapshot.docs) {
        const messageData = messageDoc.data()

        // Converter timestamp
        const messageTimestamp = messageData.timestamp ? new Date(messageData.timestamp.toDate()) : new Date()

        await client.query(
          `
          INSERT INTO messages (id, conversation_id, sender_id, content, read, created_at)
          VALUES ($1, $2, $3, $4, $5, $6)
        `,
          [
            messageDoc.id,
            doc.id,
            messageData.senderId,
            messageData.content,
            messageData.read || false,
            messageTimestamp,
          ],
        )
      }

      console.log(`${messagesSnapshot.size} mensagens migradas para a conversa ${doc.id}.`)
    }

    console.log(`Total de ${conversationsSnapshot.size} conversas migradas.`)
  } catch (err) {
    console.error("Erro ao migrar conversas e mensagens:", err)
  } finally {
    client.release()
  }
}

// Função principal para executar a migração
async function runMigration() {
  try {
    console.log("Iniciando migração do Firebase para o CockroachDB...")

    // Criar tabelas
    await createTables()

    // Migrar dados
    await migrateUsers()
    await migratePosts()
    await migrateNotifications()
    await migrateConversations()

    console.log("Migração concluída com sucesso!")
  } catch (err) {
    console.error("Erro durante a migração:", err)
  } finally {
    // Fechar conexão com o pool
    await pool.end()

    // Encerrar o app do Firebase Admin
    await admin.app().delete()
  }
}

// Executar migração
runMigration()
