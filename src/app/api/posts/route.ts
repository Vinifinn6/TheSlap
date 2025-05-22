import { NextResponse } from 'next/server';
import db from '@/lib/db';
import imgur from '@/lib/imgur';

// Rota para listar posts
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = parseInt(searchParams.get('offset') || '0');
    
    // Buscar posts com imagens, usuários e contagem de comentários
    const result = await db.query(`
      SELECT 
        p.id, 
        p.content, 
        p.mood_text, 
        p.mood_emoji, 
        p.created_at,
        u.id as user_id, 
        u.username, 
        u.display_name, 
        u.profile_image,
        COUNT(DISTINCT c.id) as comments_count,
        COUNT(DISTINCT l.id) as likes_count
      FROM posts p
      JOIN users u ON p.user_id = u.id
      LEFT JOIN comments c ON c.post_id = p.id
      LEFT JOIN likes l ON l.post_id = p.id
      GROUP BY p.id, u.id
      ORDER BY p.created_at DESC
      LIMIT $1 OFFSET $2
    `, [limit, offset]);
    
    // Buscar imagens para cada post
    const posts = await Promise.all(result.rows.map(async (post) => {
      const imagesResult = await db.query(
        'SELECT image_url FROM post_images WHERE post_id = $1',
        [post.id]
      );
      
      const images = imagesResult.rows.map(img => img.image_url);
      
      return {
        id: post.id,
        content: post.content,
        moodText: post.mood_text,
        moodEmoji: post.mood_emoji,
        createdAt: post.created_at,
        user: {
          id: post.user_id,
          username: post.username,
          displayName: post.display_name,
          profileImage: post.profile_image
        },
        commentsCount: parseInt(post.comments_count),
        likesCount: parseInt(post.likes_count),
        images
      };
    }));
    
    return NextResponse.json({ posts });
  } catch (error) {
    console.error('Erro ao buscar posts:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar posts' },
      { status: 500 }
    );
  }
}

// Rota para criar um novo post
export async function POST(request: Request) {
  try {
    const { content, moodText, moodEmoji, userId, images } = await request.json();
    
    // Validar dados
    if (!content || !userId) {
      return NextResponse.json(
        { error: 'Conteúdo e ID do usuário são obrigatórios' },
        { status: 400 }
      );
    }
    
    // Criar post
    const postId = `post_${Date.now()}`;
    await db.query(
      'INSERT INTO posts (id, user_id, content, mood_text, mood_emoji) VALUES ($1, $2, $3, $4, $5)',
      [postId, userId, content, moodText || null, moodEmoji || null]
    );
    
    // Processar imagens se houver
    if (images && images.length > 0) {
      for (const imageData of images) {
        try {
          // Converter base64 para buffer
          const base64Data = imageData.replace(/^data:image\/\w+;base64,/, '');
          const buffer = Buffer.from(base64Data, 'base64');
          
          // Comprimir imagem
          const compressedBuffer = await imgur.compressImage(buffer);
          
          // Fazer upload para o Imgur
          const imageUrl = await imgur.uploadImage(compressedBuffer);
          
          // Salvar URL da imagem no banco
          const imageId = `img_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
          await db.query(
            'INSERT INTO post_images (id, post_id, image_url) VALUES ($1, $2, $3)',
            [imageId, postId, imageUrl]
          );
        } catch (imgError) {
          console.error('Erro ao processar imagem:', imgError);
          // Continua mesmo se uma imagem falhar
        }
      }
    }
    
    return NextResponse.json({ 
      success: true, 
      postId 
    });
  } catch (error) {
    console.error('Erro ao criar post:', error);
    return NextResponse.json(
      { error: 'Erro ao criar post' },
      { status: 500 }
    );
  }
}
