"use client";

import React, { useState } from 'react';
import Image from 'next/image';
import { useUser } from '@auth0/nextjs-auth0/client';

interface CommentFormProps {
  postId: string;
  onSubmit: (postId: string, comment: {
    content: string;
    images: File[];
  }) => Promise<boolean>;
}

const CommentForm: React.FC<CommentFormProps> = ({ postId, onSubmit }) => {
  const { user } = useUser();
  const [content, setContent] = useState('');
  const [images, setImages] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newImages = Array.from(e.target.files);
      
      // Limitar a 2 imagens
      const selectedImages = [...images, ...newImages].slice(0, 2);
      setImages(selectedImages);
      
      // Criar URLs de preview
      const newPreviewUrls = selectedImages.map(file => URL.createObjectURL(file));
      
      // Revogar URLs antigas para evitar vazamento de memória
      previewUrls.forEach(url => URL.revokeObjectURL(url));
      
      setPreviewUrls(newPreviewUrls);
    }
  };

  const removeImage = (index: number) => {
    const newImages = [...images];
    newImages.splice(index, 1);
    setImages(newImages);
    
    // Atualizar previews
    URL.revokeObjectURL(previewUrls[index]);
    const newPreviewUrls = [...previewUrls];
    newPreviewUrls.splice(index, 1);
    setPreviewUrls(newPreviewUrls);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!content.trim()) return;
    if (isSubmitting) return;
    
    setIsSubmitting(true);
    
    try {
      const success = await onSubmit(postId, {
        content,
        images
      });
      
      if (success) {
        setContent('');
        
        // Revogar URLs de preview
        previewUrls.forEach(url => URL.revokeObjectURL(url));
        
        setImages([]);
        setPreviewUrls([]);
      }
    } catch (error) {
      console.error('Erro ao enviar comentário:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!user) {
    return null;
  }

  return (
    <div className="mb-4">
      <form onSubmit={handleSubmit}>
        <div className="flex items-start">
          <div className="mr-3">
            <Image 
              src={user.picture || "https://via.placeholder.com/40"} 
              alt={user.name || "Usuário"} 
              width={40} 
              height={40} 
              className="rounded-full"
            />
          </div>
          
          <div className="flex-1">
            <textarea
              className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400 text-gray-800 text-sm"
              placeholder="Escreva um comentário..."
              rows={2}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              disabled={isSubmitting}
            />
            
            {previewUrls.length > 0 && (
              <div className="mt-2 flex space-x-2">
                {previewUrls.map((url, index) => (
                  <div key={index} className="relative">
                    <img 
                      src={url} 
                      alt={`Preview ${index + 1}`} 
                      className="w-16 h-16 object-cover rounded-lg"
                    />
                    <button
                      type="button"
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-xs"
                      onClick={() => removeImage(index)}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
            
            <div className="flex items-center justify-between mt-2">
              <div className="flex items-center">
                <label className="text-blue-600 hover:text-blue-800 cursor-pointer text-sm">
                  📷 {images.length === 0 ? 'Foto' : images.length === 1 ? '1 foto' : '2 fotos'}
                  <input
                    type="file"
                    className="hidden"
                    accept="image/*"
                    multiple={images.length === 0}
                    onChange={handleImageChange}
                    disabled={isSubmitting || images.length >= 2}
                  />
                </label>
              </div>
              
              <button
                type="submit"
                className={`px-3 py-1 rounded-full text-sm font-bold ${
                  !content.trim() || isSubmitting
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-yellow-400 text-blue-900 hover:bg-yellow-300'
                }`}
                disabled={!content.trim() || isSubmitting}
              >
                {isSubmitting ? 'Enviando...' : 'Comentar'}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};

export default CommentForm;
