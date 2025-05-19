import { NextApiRequest, NextApiResponse } from 'next';
import { query } from '../../../src/lib/db';
import { uploadToImgur } from '../../../src/lib/imgur';
import { getSession } from '@auth0/nextjs-auth0';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getSession(req, res);
  
  // Verificar autenticação
  if (!session || !session.user) {
    return res.status(401).json({ error: 'Não autorizado' });
  }
  
  // Permitir apenas métodos específicos
  if (!['GET', 'POST', 'DELETE'].includes(req.method || '')) {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    // GET: Listar mensagens
    if (req.method === 'GET') {
      const { userId } = req.query;
      
      // Verificar se o usuário existe no banco
      const userResult = await query(`
        SELECT id FROM users WHERE auth0_id = $1
      `, [session.user.sub]);
      
      if (userResult.rows.length === 0) {
        return res.status(404).json({ error: 'Usuário não encontrado' });
      }
      
      const currentUserId = userResult.rows[0].id;
      
      // Buscar mensagens entre os usuários
      const messagesResult = await query(`
        SELECT m.*, 
          sender.username as sender_username, 
          sender.display_name as sender_display_name, 
          sender.profile_image as sender_profile_image,
          receiver.username as receiver_username, 
          receiver.display_name as receiver_display_name, 
          receiver.profile_image as receiver_profile_image
        FROM messages m
        JOIN users sender ON m.sender_id = sender.id
        JOIN users receiver ON m.receiver_id = receiver.id
        WHERE (m.sender_id = $1 AND m.receiver_id = $2)
           OR (m.sender_id = $2 AND m.receiver_id = $1)
        ORDER BY m.created_at ASC
      `, [currentUserId, userId]);
      
      // Marcar mensagens como lidas
      await query(`
        UPDATE messages
        SET read = true
        WHERE receiver_id = $1 AND sender_id = $2 AND read = false
      `, [currentUserId, userId]);
      
      return res.status(200).json(messagesResult.rows);
    }
    
    // POST: Enviar mensagem
    if (req.method === 'POST') {
      const { content, receiverId, images } = req.body;
      
      // Verificar se o usuário existe no banco
      const userResult = await query(`
        SELECT id FROM users WHERE auth0_id = $1
      `, [session.user.sub]);
      
      let senderId;
      
      if (userResult.rows.length === 0) {
        // Criar usuário se não existir
        const newUserResult = await query(`
          INSERT INTO users (auth0_id, username, display_name, profile_image)
          VALUES ($1, $2, $3, $4)
          RETURNING id
        `, [
          session.user.sub,
          session.user.nickname || `user${Date.now()}`,
          session.user.name || 'Usuário',
          session.user.picture || null
        ]);
        
        senderId = newUserResult.rows[0].id;
      } else {
        senderId = userResult.rows[0].id;
      }
      
      // Upload de imagens para o Imgur (se houver)
      const imageUrls = [];
      if (images && images.length > 0) {
        for (const image of images.slice(0, 2)) { // Limitar a 2 imagens
          try {
            const imageUrl = await uploadToImgur(image);
            imageUrls.push(imageUrl);
          } catch (error) {
            console.error('Erro ao fazer upload de imagem:', error);
          }
        }
      }
      
      // Inserir mensagem no banco
      const messageResult = await query(`
        INSERT INTO messages (content, sender_id, receiver_id, image1_url, image2_url)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `, [
        content,
        senderId,
        receiverId,
        imageUrls[0] || null,
        imageUrls[1] || null
      ]);
      
      return res.status(201).json(messageResult.rows[0]);
    }
    
    // DELETE: Excluir mensagem
    if (req.method === 'DELETE') {
      const { messageId } = req.query;
      
      // Verificar se o usuário existe no banco
      const userResult = await query(`
        SELECT id FROM users WHERE auth0_id = $1
      `, [session.user.sub]);
      
      if (userResult.rows.length === 0) {
        return res.status(404).json({ error: 'Usuário não encontrado' });
      }
      
      const userId = userResult.rows[0].id;
      
      // Verificar se a mensagem pertence ao usuário
      const messageResult = await query(`
        SELECT * FROM messages WHERE id = $1 AND sender_id = $2
      `, [messageId, userId]);
      
      if (messageResult.rows.length === 0) {
        return res.status(403).json({ error: 'Não autorizado a excluir esta mensagem' });
      }
      
      // Excluir mensagem
      await query(`
        DELETE FROM messages WHERE id = $1
      `, [messageId]);
      
      return res.status(200).json({ success: true });
    }
  } catch (error) {
    console.error('Erro na API de mensagens:', error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
}
