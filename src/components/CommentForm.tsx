import React, { useState } from 'react';
import { FaImage, FaAt } from 'react-icons/fa';
import { useUser } from '@auth0/nextjs-auth0/client';

// Tipos
interface CommentFormProps {
  postId: string;
  onSubmit: (comment: {
    content: string;
    images: File[];
    mentions: string[];
    postId: string;
  }) => Promise<void>;
}

const CommentForm: React.FC<CommentFormProps> = ({ postId, onSubmit }) => {
  const { user } = useUser();
  const [content, setContent] = useState('');
  const [images, setImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [mentions, setMentions] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showImageUpload, setShowImageUpload] = useState(false);
  
  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
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
    
    if (!content.trim()) return;
    
    setIsSubmitting(true);
    
    try {
      await onSubmit({
        content,
        images,
        mentions,
        postId
      });
      
      // Limpar formulário após envio
      setContent('');
      setImages([]);
      setImagePreviews([]);
      setMentions([]);
      setShowImageUpload(false);
    } catch (error) {
      console.error('Erro ao enviar comentário:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!user) {
    return (
      <div className="text-center py-2 text-gray-500">
        <p>Faça login para comentar</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4 border-t pt-4">
      <div className="flex items-start">
        <img 
          src={user.picture || 'https://via.placeholder.com/40'} 
          alt={user.name || 'Usuário'} 
          className="w-8 h-8 rounded-full mr-2"
        />
        <div className="flex-1">
          <textarea
            value={content}
            onChange={handleContentChange}
            placeholder="Escreva um comentário..."
            className="w-full p-2 border border-gray-300 rounded-lg resize-none"
            rows={2}
            disabled={isSubmitting}
          />
          
          {/* Previews de imagens */}
          {imagePreviews.length > 0 && (
            <div className="flex gap-2 mt-2">
              {imagePreviews.map((preview, index) => (
                <div key={index} className="relative w-16 h-16">
                  <img 
                    src={preview} 
                    alt={`Preview ${index + 1}`} 
                    className="w-full h-full object-cover rounded"
                  />
                  <button 
                    type="button" 
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"
                    onClick={() => removeImage(index)}
                    disabled={isSubmitting}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
          
          <div className="flex justify-between items-center mt-2">
            <div className="flex items-center space-x-4">
              {/* Upload de imagens */}
              <button
                type="button"
                onClick={() => setShowImageUpload(!showImageUpload)}
                className="text-gray-600 hover:text-orange-500 text-sm flex items-center"
                disabled={isSubmitting}
              >
                <FaImage className="mr-1" />
                <span>Imagens {images.length > 0 ? `(${images.length}/2)` : ''}</span>
              </button>
              
              {/* Menções */}
              {mentions.length > 0 && (
                <div className="text-gray-600 text-sm flex items-center">
                  <FaAt className="mr-1" />
                  <span>{mentions.length}</span>
                </div>
              )}
            </div>
            
            <button
              type="submit"
              className="bg-orange-500 hover:bg-orange-600 text-white px-3 py-1 rounded text-sm"
              disabled={isSubmitting || !content.trim()}
            >
              {isSubmitting ? 'Enviando...' : 'Comentar'}
            </button>
          </div>
          
          {showImageUpload && (
            <div className="mt-2">
              <input
                type="file"
                onChange={handleImageUpload}
                accept="image/*"
                multiple
                className="text-sm w-full"
                disabled={isSubmitting || images.length >= 2}
              />
            </div>
          )}
        </div>
      </div>
    </form>
  );
};

export default CommentForm;
