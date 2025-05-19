import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Tipos
interface Comment {
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
}

interface CommentListProps {
  comments: Comment[];
  onDelete?: (commentId: string) => void;
  currentUserId?: string;
}

const CommentList: React.FC<CommentListProps> = ({ comments, onDelete, currentUserId }) => {
  if (comments.length === 0) {
    return (
      <div className="text-center py-4 text-gray-500">
        <p>Nenhum comentário ainda. Seja o primeiro a comentar!</p>
      </div>
    );
  }

  return (
    <div className="comment-section">
      <h3 className="text-lg font-semibold mb-2">Comentários ({comments.length})</h3>
      
      {comments.map((comment) => (
        <div key={comment.id} className="comment mb-3">
          <div className="comment-header">
            <Link href={`/profile/${comment.user.username}`}>
              <img 
                src={comment.user.profileImage || 'https://via.placeholder.com/30'} 
                alt={comment.user.displayName} 
                className="comment-avatar"
              />
            </Link>
            
            <div>
              <Link href={`/profile/${comment.user.username}`} className="comment-username">
                {comment.user.displayName}
              </Link>
              <div className="text-xs text-gray-500">
                {formatDistanceToNow(new Date(comment.createdAt), { 
                  addSuffix: true,
                  locale: ptBR
                })}
              </div>
            </div>
            
            {currentUserId === comment.user.id && onDelete && (
              <button 
                onClick={() => onDelete(comment.id)}
                className="ml-auto text-xs text-red-500 hover:text-red-700"
              >
                Excluir
              </button>
            )}
          </div>
          
          <div className="mt-1 text-gray-800">
            {comment.content}
          </div>
          
          {comment.images && comment.images.length > 0 && (
            <div className="flex gap-2 mt-2">
              {comment.images.map((image, index) => (
                <img 
                  key={index}
                  src={image}
                  alt={`Imagem ${index + 1}`}
                  className="max-w-[150px] max-h-[150px] rounded object-cover"
                />
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default CommentList;
