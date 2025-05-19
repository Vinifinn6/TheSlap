"use client";

import React, { useState, useRef } from 'react';
import { useUser } from '@auth0/nextjs-auth0/client';
import Image from 'next/image';

interface PostFormProps {
  onSubmit: (post: {
    content: string;
    moodText: string;
    moodEmoji: string;
    images: File[];
  }) => Promise<boolean>;
}

const PostForm: React.FC<PostFormProps> = ({ onSubmit }) => {
  const { user } = useUser();
  const [content, setContent] = useState('');
  const [moodText, setMoodText] = useState('');
  const [moodEmoji, setMoodEmoji] = useState('');
  const [images, setImages] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const moods = [
    { text: 'Feliz', emoji: '😃' },
    { text: 'Triste', emoji: '😢' },
    { text: 'Animado', emoji: '🎉' },
    { text: 'Cansado', emoji: '😴' },
    { text: 'Apaixonado', emoji: '❤️' },
    { text: 'Irritado', emoji: '😡' },
    { text: 'Confuso', emoji: '🤔' },
    { text: 'Entediado', emoji: '😒' }
  ];

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
      const success = await onSubmit({
        content,
        moodText,
        moodEmoji,
        images
      });
      
      if (success) {
        setContent('');
        setMoodText('');
        setMoodEmoji('');
        
        // Revogar URLs de preview
        previewUrls.forEach(url => URL.revokeObjectURL(url));
        
        setImages([]);
        setPreviewUrls([]);
      }
    } catch (error) {
      console.error('Erro ao enviar post:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMoodSelect = (text: string, emoji: string) => {
    setMoodText(text);
    setMoodEmoji(emoji);
  };

  if (!user) {
    return (
      <div className="bg-white/90 rounded-lg p-4 shadow-md mb-6 text-center">
        <p className="text-gray-800">Faça login para criar posts</p>
      </div>
    );
  }

  return (
    <div className="bg-white/90 rounded-lg p-4 shadow-md mb-6">
      <form onSubmit={handleSubmit}>
        <div className="flex items-start mb-4">
          <div className="mr-3">
            <Image 
              src={user.picture || "https://via.placeholder.com/50"} 
              alt={user.name || "Usuário"} 
              width={50} 
              height={50} 
              className="rounded-full"
            />
          </div>
          
          <div className="flex-1">
            <textarea
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400 text-gray-800"
              placeholder="O que está acontecendo?"
              rows={3}
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
                      className="w-20 h-20 object-cover rounded-lg"
                    />
                    <button
                      type="button"
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center"
                      onClick={() => removeImage(index)}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
            
            <div className="flex items-center justify-between mt-3">
              <div className="flex items-center space-x-3">
                <button
                  type="button"
                  className="text-blue-600 hover:text-blue-800"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isSubmitting || images.length >= 2}
                >
                  📷 {images.length === 0 ? 'Adicionar foto' : images.length === 1 ? '1 foto' : '2 fotos'}
                </button>
                
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept="image/*"
                  multiple={images.length === 0}
                  onChange={handleImageChange}
                  disabled={isSubmitting || images.length >= 2}
                />
                
                <div className="relative">
                  <button
                    type="button"
                    className="text-blue-600 hover:text-blue-800 flex items-center"
                  >
                    😊 {moodText || 'Humor'}
                  </button>
                  
                  <div className="absolute top-full left-0 mt-1 bg-white rounded-lg shadow-lg p-2 z-10 grid grid-cols-4 gap-1 w-48">
                    {moods.map((mood) => (
                      <button
                        key={mood.text}
                        type="button"
                        className="p-1 hover:bg-gray-100 rounded text-center"
                        onClick={() => handleMoodSelect(mood.text, mood.emoji)}
                      >
                        <div className="text-xl">{mood.emoji}</div>
                        <div className="text-xs">{mood.text}</div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              
              <button
                type="submit"
                className={`px-4 py-2 rounded-full font-bold ${
                  !content.trim() || isSubmitting
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-yellow-400 text-blue-900 hover:bg-yellow-300'
                }`}
                disabled={!content.trim() || isSubmitting}
              >
                {isSubmitting ? 'Enviando...' : 'Publicar'}
              </button>
            </div>
            
            {moodText && (
              <div className="mt-2 text-sm text-gray-600">
                Humor: {moodEmoji} {moodText}
              </div>
            )}
          </div>
        </div>
      </form>
    </div>
  );
};

export default PostForm;
