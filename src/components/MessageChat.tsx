import React, { useState, useEffect, useRef } from 'react';
import { FaImage, FaPaperPlane } from 'react-icons/fa';
import { useUser } from '@auth0/nextjs-auth0/client';

// Tipos
interface Message {
  id: string;
  content: string;
  senderId: string;
  receiverId: string;
  images: string[];
  createdAt: string;
  read: boolean;
}

interface User {
  id: string;
  username: string;
  displayName: string;
  profileImage: string;
}

interface MessageChatProps {
  selectedUser: User | null;
  messages: Message[];
  currentUserId: string;
  onSendMessage: (message: {
    content: string;
    receiverId: string;
    images: File[];
  }) => Promise<void>;
}

const MessageChat: React.FC<MessageChatProps> = ({ 
  selectedUser, 
  messages, 
  currentUserId,
  onSendMessage 
}) => {
  const [content, setContent] = useState('');
  const [images, setImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Rolar para o final quando novas mensagens chegarem
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
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
    
    if (!selectedUser || (!content.trim() && images.length === 0)) return;
    
    setIsSubmitting(true);
    
    try {
      await onSendMessage({
        content,
        receiverId: selectedUser.id,
        images
      });
      
      // Limpar formulário após envio
      setContent('');
      setImages([]);
      setImagePreviews([]);
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!selectedUser) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-800/30 rounded-r-lg">
        <p className="text-gray-400">Selecione um usuário para iniciar uma conversa</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full">
      <div className="messages-header">
        <div className="flex items-center">
          <img 
            src={selectedUser.profileImage || 'https://via.placeholder.com/40'} 
            alt={selectedUser.displayName} 
            className="w-10 h-10 rounded-full mr-3"
          />
          <div>
            <div className="font-bold text-white">{selectedUser.displayName}</div>
            <div className="text-sm text-gray-400">@{selectedUser.username}</div>
          </div>
        </div>
      </div>
      
      <div className="messages-list">
        {messages.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <p>Nenhuma mensagem ainda. Comece a conversa!</p>
          </div>
        ) : (
          messages.map((message) => {
            const isSentByMe = message.senderId === currentUserId;
            
            return (
              <div 
                key={message.id} 
                className={`message-bubble ${isSentByMe ? 'message-sent' : 'message-received'}`}
              >
                <div>{message.content}</div>
                
                {message.images && message.images.length > 0 && (
                  <div className="message-images">
                    {message.images.map((image, index) => (
                      <img 
                        key={index}
                        src={image}
                        alt={`Imagem ${index + 1}`}
                        className="message-image"
                      />
                    ))}
                  </div>
                )}
                
                <div className="message-time">
                  {new Date(message.createdAt).toLocaleTimeString('pt-BR', {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>
      
      <form onSubmit={handleSubmit} className="message-form">
        <div className="flex-1">
          <input
            type="text"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Digite sua mensagem..."
            className="message-input w-full"
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
        </div>
        
        <div className="flex items-center gap-2">
          <label className="cursor-pointer text-gray-400 hover:text-orange-500">
            <FaImage size={20} />
            <input
              type="file"
              onChange={handleImageUpload}
              accept="image/*"
              multiple
              className="hidden"
              disabled={isSubmitting || images.length >= 2}
            />
          </label>
          
          <button
            type="submit"
            className="message-send"
            disabled={isSubmitting || (!content.trim() && images.length === 0)}
          >
            <FaPaperPlane />
          </button>
        </div>
      </form>
    </div>
  );
};

export default MessageChat;
