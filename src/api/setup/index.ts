// ARQUIVO: api/setup/index.ts
// Este arquivo deve estar em: /api/setup/index.ts
// Função: API serverless para configuração inicial do banco de dados e criação de tabelas

import { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from '@auth0/nextjs-auth0';
import { pool } from '../../src/lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Verificar se é uma solicitação POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }
  
  // Verificar autenticação (opcional, dependendo da segurança desejada)
  const session = await getSession(req, res);
  if (!session) {
    return res.status(401).json({ error: 'Não autorizado' });
  }
  
  try {
    // Iniciar transação
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Criar tabela de usuários
      await client.query(`
        CREATE TABLE IF NOT EXISTS users (
          id VARCHAR(255) PRIMARY KEY,
          username VARCHAR(50) UNIQUE NOT NULL,
          display_name VARCHAR(100) NOT NULL,
          profile_image TEXT,
          bio TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
      `);
      
      // Criar tabela de posts
      await client.query(`
        CREATE TABLE IF NOT EXISTS posts (
          id SERIAL PRIMARY KEY,
          user_id VARCHAR(255) REFERENCES users(id) ON DELETE CASCADE,
          content TEXT NOT NULL,
          mood_text VARCHAR(50),
          mood_emoji VARCHAR(10),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
      `);
      
      // Criar tabela de imagens de posts
      await client.query(`
        CREATE TABLE IF NOT EXISTS post_images (
          id SERIAL PRIMARY KEY,
          post_id INTEGER REFERENCES posts(id) ON DELETE CASCADE,
          image_url TEXT NOT NULL
        )
      `);
      
      // Criar tabela de comentários
      await client.query(`
        CREATE TABLE IF NOT EXISTS comments (
          id SERIAL PRIMARY KEY,
          post_id INTEGER REFERENCES posts(id) ON DELETE CASCADE,
          user_id VARCHAR(255) REFERENCES users(id) ON DELETE CASCADE,
          content TEXT NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
      `);
      
      // Criar tabela de imagens de comentários
      await client.query(`
        CREATE TABLE IF NOT EXISTS comment_images (
          id SERIAL PRIMARY KEY,
          comment_id INTEGER REFERENCES comments(id) ON DELETE CASCADE,
          image_url TEXT NOT NULL
        )
      `);
      
      // Criar tabela de likes
      await client.query(`
        CREATE TABLE IF NOT EXISTS likes (
          id SERIAL PRIMARY KEY,
          post_id INTEGER REFERENCES posts(id) ON DELETE CASCADE,
          user_id VARCHAR(255) REFERENCES users(id) ON DELETE CASCADE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(post_id, user_id)
        )
      `);
      
      // Criar tabela de menções
      await client.query(`
        CREATE TABLE IF NOT EXISTS mentions (
          id SERIAL PRIMARY KEY,
          post_id INTEGER REFERENCES posts(id) ON DELETE CASCADE,
          user_id VARCHAR(255) REFERENCES users(id) ON DELETE CASCADE,
          UNIQUE(post_id, user_id)
        )
      `);
      
      // Criar tabela de mensagens
      await client.query(`
        CREATE TABLE IF NOT EXISTS messages (
          id SERIAL PRIMARY KEY,
          sender_id VARCHAR(255) REFERENCES users(id) ON DELETE CASCADE,
          receiver_id VARCHAR(255) REFERENCES users(id) ON DELETE CASCADE,
          content TEXT NOT NULL,
          read BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
      `);
      
      // Criar tabela de imagens de mensagens
      await client.query(`
        CREATE TABLE IF NOT EXISTS message_images (
          id SERIAL PRIMARY KEY,
          message_id INTEGER REFERENCES messages(id) ON DELETE CASCADE,
          image_url TEXT NOT NULL
        )
      `);
      
      // Criar índices para melhorar performance
      await client.query('CREATE INDEX IF NOT EXISTS idx_posts_user_id ON posts(user_id)');
      await client.query('CREATE INDEX IF NOT EXISTS idx_comments_post_id ON comments(post_id)');
      await client.query('CREATE INDEX IF NOT EXISTS idx_comments_user_id ON comments(user_id)');
      await client.query('CREATE INDEX IF NOT EXISTS idx_likes_post_id ON likes(post_id)');
      await client.query('CREATE INDEX IF NOT EXISTS idx_likes_user_id ON likes(user_id)');
      await client.query('CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id)');
      await client.query('CREATE INDEX IF NOT EXISTS idx_messages_receiver_id ON messages(receiver_id)');
      
      // Verificar se o usuário atual já existe no banco
      const userResult = await client.query(
        'SELECT id FROM users WHERE id = $1',
        [session.user.sub]
      );
      
      // Se não existir, criar o usuário
      if (userResult.rows.length === 0) {
        // Extrair username do email ou criar um baseado no nome
        let username = session.user.email 
          ? session.user.email.split('@')[0] 
          : session.user.name?.toLowerCase().replace(/\s+/g, '');
        
        // Garantir que o username seja único
        let isUnique = false;
        let counter = 1;
        let baseUsername = username;
        
        while (!isUnique) {
          const checkResult = await client.query(
            'SELECT id FROM users WHERE username = $1',
            [username]
          );
          
          if (checkResult.rows.length === 0) {
            isUnique = true;
          } else {
            username = `${baseUsername}${counter}`;
            counter++;
          }
        }
        
        await client.query(
          `INSERT INTO users (id, username, display_name, profile_image) 
           VALUES ($1, $2, $3, $4)`,
          [
            session.user.sub,
            username,
            session.user.name || 'Usuário',
            session.user.picture || null
          ]
        );
      }
      
      await client.query('COMMIT');
      
      return res.status(200).json({ 
        success: true, 
        message: 'Configuração inicial concluída com sucesso' 
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Erro na configuração inicial:', error);
    return res.status(500).json({ 
      error: 'Erro na configuração inicial do banco de dados',
      details: error.message
    });
  }
}
