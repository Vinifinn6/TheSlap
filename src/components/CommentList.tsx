"use client";

import React from 'react';
import Image from 'next/image';

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
}

const CommentList: React.FC<CommentListProps> = ({ comments }) => {
  if (comments.length === 0) {
    return (
      <div className="text-center py-2 text-gray-500 text-sm">
        Nenhum comentário ainda. Seja o primeiro a comentar!
      </div>
    );
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="space-y-4 mt-4">
      {comments.map(comment => (
        <div key={comment.id} className="flex items-start">
          <div className="mr-3">
            <Image 
              src={comment.user.profileImage || "https://via.placeholder.com/40"} 
              alt={comment.user.displayName} 
              width={40} 
              height={40} 
              className="rounded-full"
            />
          </div>
          
          <div className="flex-1">
            <div className="bg-gray-100 rounded-lg p-3">
              <div className="font-bold text-blue-900">
                {comment.user.displayName}
              </div>
              
              <p className="text-gray-800">{comment.content}</p>
              
              {comment.images && comment.images.length > 0 && (
                <div className={`mt-2 grid ${comment.images.length > 1 ? 'grid-cols-2 gap-2' : 'grid-cols-1'}`}>
                  {comment.images.map((image, index) => (
                    <div key={index} className="relative">
                      <img
                        src={image}
                        alt={`Imagem ${index + 1} do comentário`}
                        className="w-full h-auto object-cover rounded-lg"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div className="text-xs text-gray-500 mt-1">
              {formatDate(comment.createdAt)}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default CommentList;
