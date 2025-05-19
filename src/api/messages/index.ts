// ARQUIVO: api/messages/index.ts
// Este arquivo deve estar em: /api/messages/index.ts
// Função: API serverless para gerenciar mensagens privadas entre usuários

import { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from '@auth0/nextjs-auth0';
import { pool } from '../../src/lib/db';
import { uploadImage } from '../../src/lib/imgur';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getSession(req, res);
  
  // Verificar autenticação para todas as operações
  if (!session) {
    return res.status(401).json({ error: 'Não autorizado' });
  }

  // Obter conversas do usuário
  if (req.method === 'GET' && !req.query.userId) {
    try {
      // Buscar todas as conversas do usuário atual
      const query = `
        WITH conversations AS (
          SELECT 
            CASE 
              WHEN sender_id = $1 THEN receiver_id 
              ELSE sender_id 
            END as contact_id,
            MAX(created_at) as last_message_time
          FROM messages
          WHERE sender_id = $1 OR receiver_id = $1
          GROUP BY contact_id
        )
        SELECT 
          u.id, u.username, u.display_name, u.profile_image,
          (
            SELECT content 
            FROM messages 
            WHERE (sender_id = $1 AND receiver_id = u.id) OR (sender_id = u.id AND receiver_id = $1)
            ORDER BY created_at DESC 
            LIMIT 1
          ) as last_message,
          c.last_message_time,
          (
            SELECT COUNT(*) 
            FROM messages 
            WHERE sender_id = u.id AND receiver_id = $1 AND read = false
          ) as unread_count
        FROM conversations c
        JOIN users u ON c.contact_id = u.id
        ORDER BY c.last_message_time DESC
      `;
      
      const result = await pool.query(query, [session.user.sub]);
      
      return res.status(200).json(result.rows);
    } catch (error) {
      console.error('Erro ao buscar conversas:', error);
      return res.status(500).json({ error: 'Erro ao buscar conversas' });
    }
  }
  
  // Obter mensagens com um usuário específico
  if (req.method === 'GET' && req.query.userId) {
    try {
      const { userId } = req.query;
      
      // Marcar mensagens como lidas
      await pool.query(
        `UPDATE messages 
         SET read = true 
         WHERE sender_id = $1 AND receiver_id = $2 AND read = false`,
        [userId, session.user.sub]
      );
      
      // Buscar mensagens
      const query = `
        SELECT 
          m.id, m.content, m.created_at, m.read,
          sender.id as sender_id, sender.username as sender_username, 
          sender.display_name as sender_display_name, sender.profile_image as sender_profile_image,
          receiver.id as receiver_id, receiver.username as receiver_username, 
          receiver.display_name as receiver_display_name, receiver.profile_image as receiver_profile_image,
          COALESCE(json_agg(mi.image_url) FILTER (WHERE mi.image_url IS NOT NULL), '[]') as images
        FROM messages m
        JOIN users sender ON m.sender_id = sender.id
        JOIN users receiver ON m.receiver_id = receiver.id
        LEFT JOIN message_images mi ON m.id = mi.message_id
        WHERE (m.sender_id = $1 AND m.receiver_id = $2) OR (m.sender_id = $2 AND m.receiver_id = $1)
        GROUP BY m.id, sender.id, receiver.id
        ORDER BY m.created_at ASC
      `;
      
      const result = await pool.query(query, [session.user.sub, userId]);
      
      // Formatar mensagens
      const messages = result.rows.map(row => ({
        id: row.id,
        content: row.content,
        createdAt: row.created_at,
        read: row.read,
        sender: {
          id: row.sender_id,
          username: row.sender_username,
          displayName: row.sender_display_name,
          profileImage: row.sender_profile_image
        },
        receiver: {
          id: row.receiver_id,
          username: row.receiver_username,
          displayName: row.receiver_display_name,
          profileImage: row.receiver_profile_image
        },
        images: row.images
      }));
      
      return res.status(200).json(messages);
    } catch (error) {
      console.error('Erro ao buscar mensagens:', error);
      return res.status(500).json({ error: 'Erro ao buscar mensagens' });
    }
  }
  
  // Enviar nova mensagem
  if (req.method === 'POST') {
    try {
      const { receiverId, content, images } = req.body;
      
      if (!receiverId) {
        return res.status(400).json({ error: 'ID do destinatário é obrigatório' });
      }
      
      if (!content || content.trim() === '') {
        return res.status(400).json({ error: 'Conteúdo é obrigatório' });
      }
      
      // Verificar se o destinatário existe
      const userResult = await pool.query(
        'SELECT id FROM users WHERE id = $1',
        [receiverId]
      );
      
      if (userResult.rows.length === 0) {
        return res.status(404).json({ error: 'Destinatário não encontrado' });
      }
      
      // Iniciar transação
      const client = await pool.connect();
      
      try {
        await client.query('BEGIN');
        
        // Inserir mensagem
        const messageResult = await client.query(
          `INSERT INTO messages (sender_id, receiver_id, content, read) 
           VALUES ($1, $2, $3, false) 
           RETURNING id, created_at`,
          [session.user.sub, receiverId, content]
        );
        
        const messageId = messageResult.rows[0].id;
        
        // Processar imagens (upload para o Imgur)
        const imageUrls = [];
        if (images && images.length > 0) {
          for (const image of images) {
            // Em produção, isso seria um buffer ou stream do arquivo
            // Aqui estamos simulando com uma URL base64
            const imageUrl = await uploadImage(image);
            imageUrls.push(imageUrl);
            
            await client.query(
              `INSERT INTO message_images (message_id, image_url) 
               VALUES ($1, $2)`,
              [messageId, imageUrl]
            );
          }
        }
        
        await client.query('COMMIT');
        
        // Buscar informações do remetente e destinatário
        const usersQuery = `
          SELECT id, username, display_name, profile_image
          FROM users
          WHERE id IN ($1, $2)
        `;
        
        const usersResult = await pool.query(usersQuery, [session.user.sub, receiverId]);
        
        const sender = usersResult.rows.find(user => user.id === session.user.sub);
        const receiver = usersResult.rows.find(user => user.id === receiverId);
        
        return res.status(201).json({
          id: messageId,
          content,
          createdAt: messageResult.rows[0].created_at,
          read: false,
          sender: {
            id: sender.id,
            username: sender.username,
            displayName: sender.display_name,
            profileImage: sender.profile_image
          },
          receiver: {
            id: receiver.id,
            username: receiver.username,
            displayName: receiver.display_name,
            profileImage: receiver.profile_image
          },
          images: imageUrls
        });
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      return res.status(500).json({ error: 'Erro ao enviar mensagem' });
    }
  }
  
  // Método não permitido
  return res.status(405).json({ error: 'Método não permitido' });
}
