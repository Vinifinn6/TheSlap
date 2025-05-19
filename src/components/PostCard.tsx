import React, { useState } from 'react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { FaComment, FaHeart, FaTrash, FaPencilAlt } from 'react-icons/fa';
import CommentList from './CommentList';
import CommentForm from './CommentForm';

// Tipos
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

interface PostCardProps {
  post: Post;
  currentUserId?: string;
  onLike?: (postId: string) => void;
  onDelete?: (postId: string) => void;
  onEdit?: (postId: string) => void;
  onCommentSubmit?: (comment: {
    content: string;
    images: File[];
    mentions: string[];
    postId: string;
  }) => Promise<void>;
  onCommentDelete?: (commentId: string) => void;
}

const PostCard: React.FC<PostCardProps> = ({
  post,
  currentUserId,
  onLike,
  onDelete,
  onEdit,
  onCommentSubmit,
  onCommentDelete
}) => {
  const [showComments, setShowComments] = useState(false);
  const isAuthor = currentUserId === post.user.id;
  
  const toggleComments = () => {
    setShowComments(!showComments);
  };
  
  const handleCommentSubmit = async (comment: {
    content: string;
    images: File[];
    mentions: string[];
    postId: string;
  }) => {
    if (onCommentSubmit) {
      await onCommentSubmit(comment);
      // Garantir que os comentários estejam visíveis após enviar um novo
      setShowComments(true);
    }
  };

  return (
    <div className="post-card">
      <div className="post-header">
        <Link href={`/profile/${post.user.username}`}>
          <img 
            src={post.user.profileImage || 'https://via.placeholder.com/50'} 
            alt={post.user.displayName} 
            className="post-avatar"
          />
        </Link>
        
        <div className="post-user-info">
          <Link href={`/profile/${post.user.username}`} className="post-username">
            {post.user.displayName}
          </Link>
          <div className="post-date">
            {formatDistanceToNow(new Date(post.createdAt), { 
              addSuffix: true,
              locale: ptBR
            })}
          </div>
        </div>
        
        {isAuthor && (
          <div className="flex gap-2">
            {onEdit && (
              <button 
                onClick={() => onEdit(post.id)}
                className="text-gray-500 hover:text-orange-500"
              >
                <FaPencilAlt />
              </button>
            )}
            
            {onDelete && (
              <button 
                onClick={() => onDelete(post.id)}
                className="text-gray-500 hover:text-red-500"
              >
                <FaTrash />
              </button>
            )}
          </div>
        )}
      </div>
      
      <div className="post-content">
        {post.content}
      </div>
      
      {post.images && post.images.length > 0 && (
        <div className="post-images">
          {post.images.map((image, index) => (
            <img 
              key={index}
              src={image}
              alt={`Imagem ${index + 1}`}
              className="post-image"
            />
          ))}
        </div>
      )}
      
      {(post.moodText || post.moodEmoji) && (
        <div className="post-mood">
          Humor: {post.moodEmoji} {post.moodText}
        </div>
      )}
      
      <div className="flex items-center justify-between mt-4 border-t pt-2">
        <div className="flex gap-4">
          {onLike && (
            <button 
              onClick={() => onLike(post.id)}
              className="flex items-center gap-1 text-gray-500 hover:text-red-500"
            >
              <FaHeart /> <span>{post.likesCount}</span>
            </button>
          )}
          
          <button 
            onClick={toggleComments}
            className="flex items-center gap-1 text-gray-500 hover:text-blue-500"
          >
            <FaComment /> <span>{post.comments.length}</span>
          </button>
        </div>
      </div>
      
      {showComments && (
        <div className="mt-4">
          <CommentList 
            comments={post.comments}
            onDelete={onCommentDelete}
            currentUserId={currentUserId}
          />
          
          {onCommentSubmit && (
            <CommentForm 
              postId={post.id}
              onSubmit={handleCommentSubmit}
            />
          )}
        </div>
      )}
    </div>
  );
};

export default PostCard;
