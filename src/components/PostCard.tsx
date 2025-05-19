"use client";

import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useUser } from '@auth0/nextjs-auth0/client';
import CommentForm from './CommentForm';
import CommentList from './CommentList';

interface User {
  id: string;
  username: string;
  displayName: string;
  profileImage: string;
}

interface Comment {
  id: string;
  content: string;
  user: User;
  createdAt: string;
  images: string[];
}

interface PostCardProps {
  id: string;
  content: string;
  user: User;
  createdAt: string;
  images: string[];
  moodText?: string;
  moodEmoji?: string;
  comments: Comment[];
  likesCount: number;
  onLike?: (id: string) => Promise<void>;
  onComment?: (postId: string, comment: { content: string; images: File[] }) => Promise<boolean>;
  onDelete?: (id: string) => Promise<void>;
}

const PostCard: React.FC<PostCardProps> = ({
  id,
  content,
  user,
  createdAt,
  images,
  moodText,
  moodEmoji,
  comments,
  likesCount,
  onLike,
  onComment,
  onDelete
}) => {
  const { user: currentUser } = useUser();
  const [showComments, setShowComments] = useState(false);
  const [isLiking, setIsLiking] = useState(false);
  const [localLikesCount, setLocalLikesCount] = useState(likesCount);
  const [isDeleting, setIsDeleting] = useState(false);

  const formattedDate = new Date(createdAt).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  const handleLike = async () => {
    if (!onLike || isLiking) return;
    
    setIsLiking(true);
    try {
      await onLike(id);
      setLocalLikesCount(prev => prev + 1);
    } catch (error) {
      console.error('Erro ao curtir post:', error);
    } finally {
      setIsLiking(false);
    }
  };

  const handleDelete = async () => {
    if (!onDelete || isDeleting) return;
    
    if (!confirm('Tem certeza que deseja excluir este post?')) return;
    
    setIsDeleting(true);
    try {
      await onDelete(id);
    } catch (error) {
      console.error('Erro ao excluir post:', error);
      setIsDeleting(false);
    }
  };

  const toggleComments = () => {
    setShowComments(!showComments);
  };

  return (
    <div className="bg-white/90 rounded-lg p-4 shadow-md mb-6">
      {/* Cabeçalho do post */}
      <div className="flex items-center mb-3">
        <Link href={`/profile/${user.username}`} className="flex items-center">
          <Image 
            src={user.profileImage || "https://via.placeholder.com/50"} 
            alt={user.displayName} 
            width={50} 
            height={50} 
            className="rounded-full mr-3"
          />
        </Link>
        
        <div className="flex-1">
          <Link href={`/profile/${user.username}`} className="font-bold text-blue-900 hover:underline">
            {user.displayName}
          </Link>
          <div className="text-xs text-gray-500">
            {formattedDate}
            {moodText && (
              <span className="ml-2">
                Humor: {moodEmoji} {moodText}
              </span>
            )}
          </div>
        </div>
        
        {currentUser && currentUser.sub === user.id && (
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="text-red-500 hover:text-red-700"
            aria-label="Excluir post"
          >
            {isDeleting ? '...' : '🗑️'}
          </button>
        )}
      </div>
      
      {/* Conteúdo do post */}
      <div className="mb-4">
        <p className="text-gray-800 whitespace-pre-line">{content}</p>
      </div>
      
      {/* Imagens do post */}
      {images && images.length > 0 && (
        <div className={`mb-4 grid ${images.length > 1 ? 'grid-cols-2 gap-2' : 'grid-cols-1'}`}>
          {images.map((image, index) => (
            <div key={index} className="relative aspect-square">
              <img
                src={image}
                alt={`Imagem ${index + 1} do post`}
                className="w-full h-full object-cover rounded-lg"
              />
            </div>
          ))}
        </div>
      )}
      
      {/* Ações do post */}
      <div className="flex items-center justify-between border-t border-b border-gray-200 py-2 mb-3">
        <button
          onClick={handleLike}
          disabled={isLiking}
          className="flex items-center text-gray-600 hover:text-red-500"
        >
          ❤️ {localLikesCount}
        </button>
        
        <button
          onClick={toggleComments}
          className="flex items-center text-gray-600 hover:text-blue-500"
        >
          💬 {comments.length}
        </button>
      </div>
      
      {/* Seção de comentários */}
      {showComments && (
        <div className="mt-4">
          {currentUser && onComment && (
            <CommentForm postId={id} onSubmit={onComment} />
          )}
          
          <CommentList comments={comments} />
        </div>
      )}
    </div>
  );
};

export default PostCard;
