"use client";

import React, { useState } from 'react';
import { useUser } from '@auth0/nextjs-auth0/client';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { FaHeart, FaComment, FaTrash } from 'react-icons/fa';
import CommentForm from './CommentForm';

// Tipos
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

interface Post {
  id: string;
  content: string;
  user: User;
  createdAt: string;
  images: string[];
  moodText: string;
  moodEmoji: string;
  comments: Comment[];
  likesCount: number;
}

interface PostCardProps {
  post: Post;
  currentUserId?: string;
  onLike: (postId: string) => void;
  onDelete: (postId: string) => void;
  onCommentSubmit: (comment: {
    content: string;
    images: File[];
    mentions: string[];
    postId: string;
  }) => Promise<boolean>;
  onCommentDelete: (commentId: string) => void;
}

const PostCard: React.FC<PostCardProps> = ({
  post,
  currentUserId,
  onLike,
  onDelete,
  onCommentSubmit,
  onCommentDelete
}) => {
  const { user } = useUser();
  const [showComments, setShowComments] = useState(false);
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  
  const isPostOwner = currentUserId === post.user.id;
  
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return format(date, "d 'de' MMMM 'às' HH:mm", { locale: ptBR });
    } catch (error) {
      return dateString;
    }
  };
  
  const handleCommentSubmit = async (comment: {
    content: string;
    images: File[];
    mentions: string[];
  }) => {
    if (!user) return false;
    
    setIsSubmittingComment(true);
    
    try {
      const success = await onCommentSubmit({
        ...comment,
        postId: post.id
      });
      
      if (success) {
        setShowComments(true);
      }
      
      return success;
    } catch (error) {
      console.error('Erro ao enviar comentário:', error);
      return false;
    } finally {
      setIsSubmittingComment(false);
    }
  };

  return (
    <div className="post-card">
      <div className="post-header">
        <img 
          src={post.user.profileImage || 'https://via.placeholder.com/50'} 
          alt={post.user.displayName} 
          className="post-avatar"
        />
        <div className="post-user-info">
          <div className="post-username">{post.user.displayName}</div>
          <div className="post-date">{formatDate(post.createdAt)}</div>
        </div>
        
        {isPostOwner && (
          <button 
            onClick={() => onDelete(post.id)}
            className="text-gray-500 hover:text-red-500"
            aria-label="Excluir post"
          >
            <FaTrash />
          </button>
        )}
      </div>
      
      <div className="post-content">
        {post.content}
      </div>
      
      {post.images.length > 0 && (
        <div className="post-images">
          {post.images.map((image, index) => (
            <img 
              key={index} 
              src={image} 
              alt={`Imagem ${index + 1} do post`} 
              className="post-image"
            />
          ))}
        </div>
      )}
      
      {post.moodText && (
        <div className="post-mood">
          Humor = {post.moodEmoji} {post.moodText}
        </div>
      )}
      
      <div className="flex items-center mt-4 space-x-4">
        <button 
          onClick={() => onLike(post.id)}
          className="flex items-center text-gray-600 hover:text-red-500"
        >
          <FaHeart className="mr-1" />
          <span>{post.likesCount}</span>
        </button>
        
        <button 
          onClick={() => setShowComments(!showComments)}
          className="flex items-center text-gray-600 hover:text-blue-500"
        >
          <FaComment className="mr-1" />
          <span>{post.comments.length}</span>
        </button>
      </div>
      
      {showComments && (
        <div className="comment-section">
          {post.comments.length > 0 && (
            <div className="space-y-2 mb-4">
              {post.comments.map(comment => (
                <div key={comment.id} className="comment">
                  <div className="comment-header">
                    <img 
                      src={comment.user.profileImage || 'https://via.placeholder.com/30'} 
                      alt={comment.user.displayName} 
                      className="comment-avatar"
                    />
                    <div className="comment-username">{comment.user.displayName}</div>
                    <div className="ml-auto text-xs text-gray-500">
                      {formatDate(comment.createdAt)}
                    </div>
                    
                    {currentUserId === comment.user.id && (
                      <button 
                        onClick={() => onCommentDelete(comment.id)}
                        className="ml-2 text-gray-500 hover:text-red-500 text-xs"
                        aria-label="Excluir comentário"
                      >
                        <FaTrash />
                      </button>
                    )}
                  </div>
                  
                  <div className="mt-1">{comment.content}</div>
                  
                  {comment.images.length > 0 && (
                    <div className="flex gap-2 mt-2">
                      {comment.images.map((image, index) => (
                        <img 
                          key={index} 
                          src={image} 
                          alt={`Imagem ${index + 1} do comentário`} 
                          className="w-16 h-16 object-cover rounded"
                        />
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
          
          <CommentForm 
            onSubmit={handleCommentSubmit}
            isSubmitting={isSubmittingComment}
          />
        </div>
      )}
    </div>
  );
};

export default PostCard;
