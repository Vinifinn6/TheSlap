"use client";

import React, { useState, useEffect } from 'react';
import Image from 'next/image';

interface MessageChatProps {
  contact: {
    id: string;
    username: string;
    displayName: string;
    profileImage: string;
  };
  messages: Array<{
    id: string;
    content: string;
    sender: {
      id: string;
      username: string;
      displayName: string;
      profileImage: string;
    };
    receiver: {
      id: string;
      username: string;
      displayName: string;
      profileImage: string;
    };
    createdAt: string;
    images: string[];
    read: boolean;
  }>;
  isLoading: boolean;
  onSendMessage: (message: {
    content: string;
    images: File[];
  }) => Promise<boolean>;
}

const MessageChat: React.FC<MessageChatProps> = ({
  contact,
  messages,
  isLoading,
  onSendMessage
}) => {
  const [content, setContent] = useState('');
  const [images, setImages] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = React.useRef<HTMLDivElement>(null);

  // Rolar para o final quando as mensagens mudarem
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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
    
    if (!content.trim() && images.length === 0) return;
    if (isSending) return;
    
    setIsSending(true);
    
    try {
      const success = await onSendMessage({
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
      console.error('Erro ao enviar mensagem:', error);
    } finally {
      setIsSending(false);
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.toDateString() === today.toDateString()) {
      return 'Hoje';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Ontem';
    } else {
      return date.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    }
  };

  // Agrupar mensagens por data
  const groupedMessages = messages.reduce((groups, message) => {
    const date = formatDate(message.createdAt);
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(message);
    return groups;
  }, {} as Record<string, typeof messages>);

  return (
    <div className="flex flex-col h-full">
      {/* Cabeçalho do chat */}
      <div className="bg-blue-900 text-white p-3 rounded-t-lg flex items-center">
        <Image 
          src={contact.profileImage || "https://via.placeholder.com/40"} 
          alt={contact.displayName} 
          width={40} 
          height={40} 
          className="rounded-full mr-3"
        />
        <div>
          <div className="font-bold">{contact.displayName}</div>
          <div className="text-xs">@{contact.username}</div>
        </div>
      </div>
      
      {/* Área de mensagens */}
      <div className="flex-1 overflow-y-auto p-4 bg-gray-100">
        {isLoading ? (
          <div className="flex justify-center items-center h-full">
            <p className="text-gray-500">Carregando mensagens...</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex justify-center items-center h-full">
            <p className="text-gray-500">Nenhuma mensagem ainda. Diga olá!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {Object.entries(groupedMessages).map(([date, dateMessages]) => (
              <div key={date}>
                <div className="text-center my-3">
                  <span className="bg-gray-300 text-gray-700 text-xs px-2 py-1 rounded-full">
                    {date}
                  </span>
                </div>
                
                {dateMessages.map(message => {
                  const isFromContact = message.sender.id === contact.id;
                  
                  return (
                    <div 
                      key={message.id} 
                      className={`flex ${isFromContact ? 'justify-start' : 'justify-end'}`}
                    >
                      <div className={`max-w-[75%] ${isFromContact ? 'bg-white' : 'bg-blue-500 text-white'} rounded-lg p-3 shadow`}>
                        <p className="whitespace-pre-line">{message.content}</p>
                        
                        {message.images && message.images.length > 0 && (
                          <div className={`mt-2 grid ${message.images.length > 1 ? 'grid-cols-2 gap-2' : 'grid-cols-1'}`}>
                            {message.images.map((image, index) => (
                              <div key={index} className="relative">
                                <img
                                  src={image}
                                  alt={`Imagem ${index + 1}`}
                                  className="w-full h-auto object-cover rounded-lg"
                                />
                              </div>
                            ))}
                          </div>
                        )}
                        
                        <div className={`text-xs mt-1 ${isFromContact ? 'text-gray-500' : 'text-blue-200'}`}>
                          {formatTime(message.createdAt)}
                          {!isFromContact && (
                            <span className="ml-1">
                              {message.read ? '✓✓' : '✓'}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>
      
      {/* Formulário de envio */}
      <div className="p-3 bg-white border-t">
        <form onSubmit={handleSubmit}>
          {previewUrls.length > 0 && (
            <div className="mb-2 flex space-x-2">
              {previewUrls.map((url, index) => (
                <div key={index} className="relative">
                  <img 
                    src={url} 
                    alt={`Preview ${index + 1}`} 
                    className="w-16 h-16 object-cover rounded-lg"
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
          
          <div className="flex items-center">
            <label className="mr-2 text-blue-600 hover:text-blue-800 cursor-pointer">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <input
                type="file"
                className="hidden"
                accept="image/*"
                multiple={images.length === 0}
                onChange={handleImageChange}
                disabled={isSending || images.length >= 2}
              />
            </label>
            
            <input
              type="text"
              className="flex-1 border border-gray-300 rounded-full px-4 py-2 focus:outline-none focus:ring-2 focus:ring-yellow-400"
              placeholder="Digite sua mensagem..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              disabled={isSending}
            />
            
            <button
              type="submit"
              className={`ml-2 bg-yellow-400 text-blue-900 rounded-full p-2 ${
                (!content.trim() && images.length === 0) || isSending
                  ? 'opacity-50 cursor-not-allowed'
                  : 'hover:bg-yellow-300'
              }`}
              disabled={(!content.trim() && images.length === 0) || isSending}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default MessageChat;
