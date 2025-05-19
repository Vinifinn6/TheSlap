"use client";

import React, { useState } from 'react';
import { useUser } from '@auth0/nextjs-auth0/client';
import { FaImage, FaAt } from 'react-icons/fa';

interface CommentFormProps {
  onSubmit: (comment: {
    content: string;
    images: File[];
    mentions: string[];
  }) => Promise<boolean>;
  isSubmitting?: boolean;
}

const CommentForm: React.FC<CommentFormProps> = ({ onSubmit, isSubmitting = false }) => {
  const { user } = useUser();
  const [content, setContent] = useState('');
  const [images, setImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [mentions, setMentions] = useState<string[]>([]);
  
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleContentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setContent(e.target.value);
    
    // Detectar menções (@username)
    const mentionRegex = /@(\w+)/g;
    const foundMentions = e.target.value.match(mentionRegex)?.map(m => m.substring(1)) || [];
    setMentions(foundMentions);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newImages = Array.from(e.target.files);
      
      // Limitar a 2 imagens
      const totalImages = [...images, ...newImages].slice(0, 2);
      setImages(totalImages);
      
      // Criar previews
      const newPreviews = totalImages.map(file => URL.createObjectURL(file));
      setImagePreviews(newPreviews);
    }
  };

  const removeImage = (index: number) => {
    const updatedImages = [...images];
    updatedImages.splice(index, 1);
    setImages(updatedImages);
    
    const updatedPreviews = [...imagePreviews];
    URL.revokeObjectURL(updatedPreviews[index]);
    updatedPreviews.splice(index, 1);
    setImagePreviews(updatedPreviews);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!content.trim() || isSubmitting) return;
    
    const success = await onSubmit({
      content,
      images,
      mentions
    });
    
    if (success) {
      // Limpar formulário após envio bem-sucedido
      setContent('');
      setImages([]);
      setImagePreviews([]);
      setMentions([]);
    }
  };

  if (!user) {
    return null;
  }

  return (
    <form onSubmit={handleSubmit} className="comment-form">
      <div className="flex-1">
        <div className="flex items-center">
          <img 
            src={user.picture || 'https://via.placeholder.com/30'} 
            alt={user.name || 'Usuário'} 
            className="w-8 h-8 rounded-full mr-2"
          />
          <input
            type="text"
            value={content}
            onChange={handleContentChange}
            placeholder="Escreva um comentário..."
            className="comment-input flex-1"
            disabled={isSubmitting}
          />
        </div>
        
        {/* Previews de imagens */}
        {imagePreviews.length > 0 && (
          <div className="flex gap-2 mt-2">
            {imagePreviews.map((preview, index) => (
              <div key={index} className="relative w-12 h-12">
                <img 
                  src={preview} 
                  alt={`Preview ${index + 1}`} 
                  className="w-full h-full object-cover rounded"
                />
                <button 
                  type="button" 
                  className="absolute -top-1 -right-1 bg-red-500/80 text-white rounded-full w-4 h-4 flex items-center justify-center text-xs"
                  onClick={() => removeImage(index)}
                  disabled={isSubmitting}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
        
        <div className="flex items-center mt-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="text-gray-500 hover:text-orange-500 mr-3"
            disabled={isSubmitting || images.length >= 2}
          >
            <FaImage />
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImageUpload}
            accept="image/*"
            multiple
            className="hidden"
            disabled={isSubmitting || images.length >= 2}
          />
          
          {mentions.length > 0 && (
            <div className="text-gray-500 text-xs flex items-center">
              <FaAt className="mr-1" />
              <span>Menções: {mentions.length}</span>
            </div>
          )}
        </div>
      </div>
      
      <button
        type="submit"
        className="comment-button"
        disabled={isSubmitting || !content.trim()}
      >
        {isSubmitting ? 'Enviando...' : 'Comentar'}
      </button>
    </form>
  );
};

export default CommentForm;
