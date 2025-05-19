"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useUser } from '@auth0/nextjs-auth0/client';
import Header from '../../components/Header';
import PostForm from '../../components/PostForm';
import PostCard from '../../components/PostCard';

// Tipos simulados para demonstração
interface Post {
  id: string;
  content: string;
  user: {
    id: string;
    username: string;
    displayName: string;
    profileImage: string;
  };
  createdAt: string;
  images: string[];
  moodText: string;
  moodEmoji: string;
  comments: any[];
  likesCount: number;
}

export default function Home() {
  const { user, isLoading } = useUser();
  const [posts, setPosts] = useState<Post[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Simular carregamento de posts
  useEffect(() => {
    // Em produção, isso seria uma chamada API real
    const mockPosts: Post[] = [
      {
        id: '1',
        content: 'Estou muito animado com o lançamento do TheSlap.com! Vai ser incrível compartilhar momentos com vocês.',
        user: {
          id: '101',
          username: 'tori',
          displayName: 'Tori Vega',
          profileImage: 'https://i.imgur.com/1234abcd.jpg'
        },
        createdAt: new Date().toISOString(),
        images: [],
        moodText: 'Animado',
        moodEmoji: '🎉',
        comments: [
          {
            id: '201',
            content: 'Mal posso esperar para ver seus posts!',
            user: {
              id: '102',
              username: 'andre',
              displayName: 'Andre Harris',
              profileImage: 'https://i.imgur.com/5678efgh.jpg'
            },
            createdAt: new Date().toISOString(),
            images: []
          }
        ],
        likesCount: 5
      },
      {
        id: '2',
        content: 'Acabei de compor uma nova música! Logo compartilho com vocês.',
        user: {
          id: '102',
          username: 'andre',
          displayName: 'Andre Harris',
          profileImage: 'https://i.imgur.com/5678efgh.jpg'
        },
        createdAt: new Date(Date.now() - 3600000).toISOString(), // 1 hora atrás
        images: [],
        moodText: 'Inspirado',
        moodEmoji: '🎵',
        comments: [],
        likesCount: 3
      }
    ];
    
    setPosts(mockPosts);
  }, []);

  const handlePostSubmit = async (post: {
    content: string;
    moodText: string;
    moodEmoji: string;
    images: File[];
    mentions: string[];
  }) => {
    setIsSubmitting(true);
    
    try {
      // Simular upload de imagens e criação de post
      console.log('Enviando post:', post);
      
      // Em produção, isso seria uma chamada API real
      // Aqui estamos apenas simulando a adição do post na lista
      
      // Simular delay de rede
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Criar novo post simulado
      const newPost: Post = {
        id: `post-${Date.now()}`,
        content: post.content,
        user: {
          id: user?.sub || 'unknown',
          username: user?.nickname || 'usuario',
          displayName: user?.name || 'Usuário',
          profileImage: user?.picture || 'https://via.placeholder.com/50'
        },
        createdAt: new Date().toISOString(),
        images: [], // Em produção, seriam URLs do Imgur após upload
        moodText: post.moodText,
        moodEmoji: post.moodEmoji,
        comments: [],
        likesCount: 0
      };
      
      // Adicionar à lista de posts
      setPosts(prevPosts => [newPost, ...prevPosts]);
      
    } catch (error) {
      console.error('Erro ao criar post:', error);
      alert('Erro ao criar post. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLike = (postId: string) => {
    setPosts(prevPosts => 
      prevPosts.map(post => 
        post.id === postId 
          ? { ...post, likesCount: post.likesCount + 1 } 
          : post
      )
    );
  };

  const handleDelete = (postId: string) => {
    setPosts(prevPosts => prevPosts.filter(post => post.id !== postId));
  };

  const handleCommentSubmit = async (comment: {
    content: string;
    images: File[];
    mentions: string[];
    postId: string;
  }) => {
    try {
      // Simular envio de comentário
      console.log('Enviando comentário:', comment);
      
      // Simular delay de rede
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Criar novo comentário simulado
      const newComment = {
        id: `comment-${Date.now()}`,
        content: comment.content,
        user: {
          id: user?.sub || 'unknown',
          username: user?.nickname || 'usuario',
          displayName: user?.name || 'Usuário',
          profileImage: user?.picture || 'https://via.placeholder.com/30'
        },
        createdAt: new Date().toISOString(),
        images: [] // Em produção, seriam URLs do Imgur após upload
      };
      
      // Adicionar comentário ao post correspondente
      setPosts(prevPosts => 
        prevPosts.map(post => 
          post.id === comment.postId 
            ? { ...post, comments: [...post.comments, newComment] } 
            : post
        )
      );
      
      return true;
    } catch (error) {
      console.error('Erro ao enviar comentário:', error);
      return false;
    }
  };

  const handleCommentDelete = (commentId: string) => {
    setPosts(prevPosts => 
      prevPosts.map(post => ({
        ...post,
        comments: post.comments.filter(comment => comment.id !== commentId)
      }))
    );
  };

  return (
    <main>
      <Header />
      
      <div className="main-container">
        {/* Seção "The Right Now" */}
        <div className="right-now-section">
          <h2 className="right-now-header">THE RIGHT NOW</h2>
          
          {posts.length > 0 && (
            <div className="bg-white/90 text-gray-800 rounded-lg p-4 mb-4">
              <div className="flex items-center mb-2">
                <img 
                  src={posts[0].user.profileImage || 'https://via.placeholder.com/40'} 
                  alt={posts[0].user.displayName} 
                  className="w-10 h-10 rounded-full mr-3"
                />
                <div>
                  <div className="font-bold text-orange-500">{posts[0].user.displayName}</div>
                  <div className="text-sm text-gray-500">Último post</div>
                </div>
              </div>
              
              <div className="mb-2">{posts[0].content}</div>
              
              {posts[0].moodText && (
                <div className="text-sm italic text-gray-600">
                  Humor = {posts[0].moodEmoji} {posts[0].moodText}
                </div>
              )}
            </div>
          )}
          
          <PostForm onSubmit={handlePostSubmit} />
        </div>
        
        {/* Lista de Posts */}
        <div>
          <h2 className="text-xl font-bold mb-4 text-yellow-400">POSTS RECENTES</h2>
          
          {isLoading ? (
            <div className="text-center py-8">
              <p>Carregando posts...</p>
            </div>
          ) : posts.length === 0 ? (
            <div className="text-center py-8 bg-white/90 text-gray-800 rounded-lg">
              <p>Nenhum post encontrado. Seja o primeiro a publicar!</p>
            </div>
          ) : (
            <div className="space-y-6">
              {posts.map(post => (
                <PostCard 
                  key={post.id}
                  post={post}
                  currentUserId={user?.sub}
                  onLike={handleLike}
                  onDelete={handleDelete}
                  onCommentSubmit={handleCommentSubmit}
                  onCommentDelete={handleCommentDelete}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
