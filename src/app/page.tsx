"use client";

import React, { useState, useEffect } from 'react';
import Header from '../components/Header';
import PostForm from '../components/PostForm';
import PostCard from '../components/PostCard';
import { useUser } from '@auth0/nextjs-auth0/client';

export default function Home() {
  const { user, isLoading } = useUser();
  const [posts, setPosts] = useState([]);
  const [isLoadingPosts, setIsLoadingPosts] = useState(false);

  // Carregar posts
  useEffect(() => {
    const fetchPosts = async () => {
      setIsLoadingPosts(true);
      try {
        // Em produção, isso seria uma chamada API real
        // Simular delay de rede
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Dados simulados
        const mockPosts = [
          {
            id: '1',
            content: 'Estou muito animado para o show de hoje à noite! Quem mais vai estar lá?',
            user: {
              id: '101',
              username: 'tori',
              displayName: 'Tori Vega',
              profileImage: 'https://via.placeholder.com/50'
            },
            createdAt: new Date(Date.now() - 3600000).toISOString(),
            images: ['https://via.placeholder.com/500x300'],
            moodText: 'Animada',
            moodEmoji: '🎉',
            comments: [
              {
                id: 'c1',
                content: 'Eu vou estar lá! Vai ser incrível!',
                user: {
                  id: '102',
                  username: 'andre',
                  displayName: 'Andre Harris',
                  profileImage: 'https://via.placeholder.com/50'
                },
                createdAt: new Date(Date.now() - 3000000).toISOString(),
                images: []
              }
            ],
            likesCount: 12
          },
          {
            id: '2',
            content: 'Novo vídeo no meu canal! Confira minha nova música "Freak the Freak Out"!',
            user: {
              id: '101',
              username: 'tori',
              displayName: 'Tori Vega',
              profileImage: 'https://via.placeholder.com/50'
            },
            createdAt: new Date(Date.now() - 86400000).toISOString(),
            images: ['https://via.placeholder.com/500x300', 'https://via.placeholder.com/500x300'],
            moodText: 'Feliz',
            moodEmoji: '😃',
            comments: [],
            likesCount: 24
          },
          {
            id: '3',
            content: 'Alguém viu meu café? Não consigo encontrar em lugar nenhum e preciso de cafeína AGORA.',
            user: {
              id: '103',
              username: 'jade',
              displayName: 'Jade West',
              profileImage: 'https://via.placeholder.com/50'
            },
            createdAt: new Date(Date.now() - 172800000).toISOString(),
            images: [],
            moodText: 'Irritada',
            moodEmoji: '😡',
            comments: [
              {
                id: 'c2',
                content: 'Você deixou na sala de música ontem.',
                user: {
                  id: '104',
                  username: 'beck',
                  displayName: 'Beck Oliver',
                  profileImage: 'https://via.placeholder.com/50'
                },
                createdAt: new Date(Date.now() - 150000000).toISOString(),
                images: []
              },
              {
                id: 'c3',
                content: 'Eu não tocaria nesse café, já deve estar frio há dias.',
                user: {
                  id: '102',
                  username: 'andre',
                  displayName: 'Andre Harris',
                  profileImage: 'https://via.placeholder.com/50'
                },
                createdAt: new Date(Date.now() - 140000000).toISOString(),
                images: []
              }
            ],
            likesCount: 8
          }
        ];
        
        setPosts(mockPosts);
      } catch (error) {
        console.error('Erro ao carregar posts:', error);
      } finally {
        setIsLoadingPosts(false);
      }
    };
    
    fetchPosts();
  }, []);

  const handleCreatePost = async (post) => {
    try {
      // Em produção, isso seria uma chamada API real
      console.log('Criando post:', post);
      
      // Simular delay de rede
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Criar novo post simulado
      const newPost = {
        id: `post-${Date.now()}`,
        content: post.content,
        user: {
          id: user.sub,
          username: user.nickname || user.email?.split('@')[0] || 'usuario',
          displayName: user.name || 'Usuário',
          profileImage: user.picture || 'https://via.placeholder.com/50'
        },
        createdAt: new Date().toISOString(),
        images: post.images.length > 0 ? ['https://via.placeholder.com/500x300'] : [],
        moodText: post.moodText,
        moodEmoji: post.moodEmoji,
        comments: [],
        likesCount: 0
      };
      
      // Adicionar à lista de posts
      setPosts(prevPosts => [newPost, ...prevPosts]);
      
      return true;
    } catch (error) {
      console.error('Erro ao criar post:', error);
      return false;
    }
  };

  const handleLikePost = async (postId) => {
    try {
      // Em produção, isso seria uma chamada API real
      console.log('Curtindo post:', postId);
      
      // Simular delay de rede
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Atualizar contagem de likes localmente
      setPosts(prevPosts =>
        prevPosts.map(post =>
          post.id === postId
            ? { ...post, likesCount: post.likesCount + 1 }
            : post
        )
      );
    } catch (error) {
      console.error('Erro ao curtir post:', error);
    }
  };

  const handleCommentPost = async (postId, comment) => {
    try {
      // Em produção, isso seria uma chamada API real
      console.log('Comentando no post:', postId, comment);
      
      // Simular delay de rede
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // Criar novo comentário simulado
      const newComment = {
        id: `comment-${Date.now()}`,
        content: comment.content,
        user: {
          id: user.sub,
          username: user.nickname || user.email?.split('@')[0] || 'usuario',
          displayName: user.name || 'Usuário',
          profileImage: user.picture || 'https://via.placeholder.com/50'
        },
        createdAt: new Date().toISOString(),
        images: comment.images.length > 0 ? ['https://via.placeholder.com/300x200'] : []
      };
      
      // Adicionar comentário ao post
      setPosts(prevPosts =>
        prevPosts.map(post =>
          post.id === postId
            ? { ...post, comments: [...post.comments, newComment] }
            : post
        )
      );
      
      return true;
    } catch (error) {
      console.error('Erro ao comentar no post:', error);
      return false;
    }
  };

  const handleDeletePost = async (postId) => {
    try {
      // Em produção, isso seria uma chamada API real
      console.log('Excluindo post:', postId);
      
      // Simular delay de rede
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // Remover post da lista
      setPosts(prevPosts => prevPosts.filter(post => post.id !== postId));
    } catch (error) {
      console.error('Erro ao excluir post:', error);
    }
  };

  return (
    <main>
      <Header />
      
      <div className="container mx-auto px-4 py-6 max-w-2xl">
        <div className="right-now-container mb-6">
          <h2 className="text-2xl font-bold mb-4 text-yellow-400">THE RIGHT NOW</h2>
          
          {user && <PostForm onSubmit={handleCreatePost} />}
          
          {isLoadingPosts ? (
            <div className="bg-white/90 rounded-lg p-4 shadow-md text-center">
              <p className="text-gray-800">Carregando posts...</p>
            </div>
          ) : posts.length === 0 ? (
            <div className="bg-white/90 rounded-lg p-4 shadow-md text-center">
              <p className="text-gray-800">Nenhum post encontrado</p>
            </div>
          ) : (
            <div className="space-y-6">
              {posts.map(post => (
                <PostCard
                  key={post.id}
                  id={post.id}
                  content={post.content}
                  user={post.user}
                  createdAt={post.createdAt}
                  images={post.images}
                  moodText={post.moodText}
                  moodEmoji={post.moodEmoji}
                  comments={post.comments}
                  likesCount={post.likesCount}
                  onLike={handleLikePost}
                  onComment={handleCommentPost}
                  onDelete={post.user.id === user?.sub ? handleDeletePost : undefined}
                />
              ))}
            </div>
          )}
        </div>
        
        <div className="fun-facts-container mb-6">
          <h2 className="text-2xl font-bold mb-4 text-yellow-400">THE FUN FACTS</h2>
          
          <div className="bg-blue-200/90 rounded-lg p-4 shadow-md">
            <p className="text-gray-800">No idioma português, a palavra "pé" também significa "macacos sangrentos."</p>
          </div>
        </div>
      </div>
    </main>
  );
}
