// ARQUIVO: api/posts/index.ts
// Este arquivo deve estar em: /api/posts/index.ts
// Função: API serverless para gerenciar posts (criar, listar, atualizar, excluir)

import { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from '@auth0/nextjs-auth0';
import { pool } from '../../src/lib/db';
import { uploadImage } from '../../src/lib/imgur';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getSession(req, res);
  
  // Verificar autenticação para operações que exigem login
  if (req.method !== 'GET' && !session) {
    return res.status(401).json({ error: 'Não autorizado' });
  }

  // Obter todos os posts ou filtrar por usuário
  if (req.method === 'GET') {
    try {
      const { userId } = req.query;
      
      let query = `
        SELECT 
          p.id, p.content, p.created_at, p.mood_text, p.mood_emoji,
          u.id as user_id, u.username, u.display_name, u.profile_image,
          COALESCE(json_agg(pi.image_url) FILTER (WHERE pi.image_url IS NOT NULL), '[]') as images,
          COALESCE((SELECT COUNT(*) FROM likes WHERE post_id = p.id), 0) as likes_count
        FROM posts p
        JOIN users u ON p.user_id = u.id
        LEFT JOIN post_images pi ON p.id = pi.post_id
      `;
      
      const params = [];
      
      if (userId) {
        query += ' WHERE p.user_id = $1';
        params.push(userId);
      }
      
      query += `
        GROUP BY p.id, u.id
        ORDER BY p.created_at DESC
        LIMIT 50
      `;
      
      const result = await pool.query(query, params);
      
      // Para cada post, buscar comentários
      const posts = await Promise.all(result.rows.map(async (post) => {
        const commentsQuery = `
          SELECT 
            c.id, c.content, c.created_at,
            u.id as user_id, u.username, u.display_name, u.profile_image,
            COALESCE(json_agg(ci.image_url) FILTER (WHERE ci.image_url IS NOT NULL), '[]') as images
          FROM comments c
          JOIN users u ON c.user_id = u.id
          LEFT JOIN comment_images ci ON c.id = ci.comment_id
          WHERE c.post_id = $1
          GROUP BY c.id, u.id
          ORDER BY c.created_at ASC
        `;
        
        const commentsResult = await pool.query(commentsQuery, [post.id]);
        
        return {
          ...post,
          comments: commentsResult.rows
        };
      }));
      
      return res.status(200).json(posts);
    } catch (error) {
      console.error('Erro ao buscar posts:', error);
      return res.status(500).json({ error: 'Erro ao buscar posts' });
    }
  }
  
  // Criar novo post
  if (req.method === 'POST') {
    try {
      const { content, moodText, moodEmoji, images, mentions } = req.body;
      
      if (!content || content.trim() === '') {
        return res.status(400).json({ error: 'Conteúdo é obrigatório' });
      }
      
      // Iniciar transação
      const client = await pool.connect();
      
      try {
        await client.query('BEGIN');
        
        // Inserir post
        const postResult = await client.query(
          `INSERT INTO posts (user_id, content, mood_text, mood_emoji) 
           VALUES ($1, $2, $3, $4) 
           RETURNING id, created_at`,
          [session.user.sub, content, moodText || null, moodEmoji || null]
        );
        
        const postId = postResult.rows[0].id;
        
        // Processar imagens (upload para o Imgur)
        if (images && images.length > 0) {
          for (const image of images) {
            // Em produção, isso seria um buffer ou stream do arquivo
            // Aqui estamos simulando com uma URL base64
            const imageUrl = await uploadImage(image);
            
            await client.query(
              `INSERT INTO post_images (post_id, image_url) 
               VALUES ($1, $2)`,
              [postId, imageUrl]
            );
          }
        }
        
        // Processar menções
        if (mentions && mentions.length > 0) {
          for (const username of mentions) {
            // Verificar se o usuário existe
            const userResult = await client.query(
              'SELECT id FROM users WHERE username = $1',
              [username]
            );
            
            if (userResult.rows.length > 0) {
              const mentionedUserId = userResult.rows[0].id;
              
              await client.query(
                `INSERT INTO mentions (post_id, user_id) 
                 VALUES ($1, $2)`,
                [postId, mentionedUserId]
              );
            }
          }
        }
        
        await client.query('COMMIT');
        
        // Buscar o post completo para retornar
        const query = `
          SELECT 
            p.id, p.content, p.created_at, p.mood_text, p.mood_emoji,
            u.id as user_id, u.username, u.display_name, u.profile_image,
            COALESCE(json_agg(pi.image_url) FILTER (WHERE pi.image_url IS NOT NULL), '[]') as images,
            0 as likes_count
          FROM posts p
          JOIN users u ON p.user_id = u.id
          LEFT JOIN post_images pi ON p.id = pi.post_id
          WHERE p.id = $1
          GROUP BY p.id, u.id
        `;
        
        const result = await pool.query(query, [postId]);
        
        return res.status(201).json({
          ...result.rows[0],
          comments: []
        });
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Erro ao criar post:', error);
      return res.status(500).json({ error: 'Erro ao criar post' });
    }
  }
  
  // Excluir post
  if (req.method === 'DELETE') {
    try {
      const { id } = req.query;
      
      if (!id) {
        return res.status(400).json({ error: 'ID do post é obrigatório' });
      }
      
      // Verificar se o usuário é o dono do post
      const postResult = await pool.query(
        'SELECT user_id FROM posts WHERE id = $1',
        [id]
      );
      
      if (postResult.rows.length === 0) {
        return res.status(404).json({ error: 'Post não encontrado' });
      }
      
      if (postResult.rows[0].user_id !== session.user.sub) {
        return res.status(403).json({ error: 'Não autorizado a excluir este post' });
      }
      
      // Iniciar transação
      const client = await pool.connect();
      
      try {
        await client.query('BEGIN');
        
        // Excluir menções
        await client.query('DELETE FROM mentions WHERE post_id = $1', [id]);
        
        // Excluir likes
        await client.query('DELETE FROM likes WHERE post_id = $1', [id]);
        
        // Excluir imagens de comentários
        await client.query(`
          DELETE FROM comment_images 
          WHERE comment_id IN (SELECT id FROM comments WHERE post_id = $1)
        `, [id]);
        
        // Excluir comentários
        await client.query('DELETE FROM comments WHERE post_id = $1', [id]);
        
        // Excluir imagens do post
        await client.query('DELETE FROM post_images WHERE post_id = $1', [id]);
        
        // Excluir post
        await client.query('DELETE FROM posts WHERE id = $1', [id]);
        
        await client.query('COMMIT');
        
        return res.status(200).json({ success: true });
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Erro ao excluir post:', error);
      return res.status(500).json({ error: 'Erro ao excluir post' });
    }
  }
  
  // Método não permitido
  return res.status(405).json({ error: 'Método não permitido' });
}
