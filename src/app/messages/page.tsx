// ARQUIVO: src/app/messages/page.tsx
// Este arquivo deve estar em: src/app/messages/page.tsx
// Função: Página de mensagens privadas entre usuários

"use client";

import React, { useState, useEffect } from 'react';
import { useUser } from '@auth0/nextjs-auth0/client';
import Header from '../../components/Header';
import MessageChat from '../../components/MessageChat';

interface User {
  id: string;
  username: string;
  displayName: string;
  profileImage: string;
  lastMessage?: string;
  lastMessageTime?: string;
  unreadCount?: number;
}

interface Message {
  id: string;
  content: string;
  sender: User;
  receiver: User;
  createdAt: string;
  images: string[];
  read: boolean;
}

export default function MessagesPage() {
  const { user, isLoading } = useUser();
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [contacts, setContacts] = useState<User[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);

  // Simular carregamento de contatos
  useEffect(() => {
    if (!user) return;

    // Em produção, isso seria uma chamada API real
    const mockContacts: User[] = [
      {
        id: '101',
        username: 'tori',
        displayName: 'Tori Vega',
        profileImage: 'https://via.placeholder.com/50',
        lastMessage: 'Oi! Como vai?',
        lastMessageTime: new Date(Date.now() - 3600000).toISOString(),
        unreadCount: 2
      },
      {
        id: '102',
        username: 'andre',
        displayName: 'Andre Harris',
        profileImage: 'https://via.placeholder.com/50',
        lastMessage: 'Viu meu novo post?',
        lastMessageTime: new Date(Date.now() - 86400000).toISOString(),
        unreadCount: 0
      },
      {
        id: '103',
        username: 'jade',
        displayName: 'Jade West',
        profileImage: 'https://via.placeholder.com/50',
        lastMessage: 'Não gostei do seu comentário...',
        lastMessageTime: new Date(Date.now() - 172800000).toISOString(),
        unreadCount: 0
      }
    ];
    
    setContacts(mockContacts);
  }, [user]);

  // Carregar mensagens quando um usuário é selecionado
  useEffect(() => {
    if (!selectedUser) {
      setMessages([]);
      return;
    }

    setIsLoadingMessages(true);

    // Em produção, isso seria uma chamada API real
    // Simular delay de rede
    setTimeout(() => {
      const mockMessages: Message[] = [
        {
          id: 'm1',
          content: 'Oi! Como vai?',
          sender: selectedUser,
          receiver: {
            id: user?.sub || 'unknown',
            username: user?.nickname || 'usuario',
            displayName: user?.name || 'Usuário',
            profileImage: user?.picture || 'https://via.placeholder.com/50'
          },
          createdAt: new Date(Date.now() - 3600000).toISOString(),
          images: [],
          read: true
        },
        {
          id: 'm2',
          content: 'Estou bem, e você?',
          sender: {
            id: user?.sub || 'unknown',
            username: user?.nickname || 'usuario',
            displayName: user?.name || 'Usuário',
            profileImage: user?.picture || 'https://via.placeholder.com/50'
          },
          receiver: selectedUser,
          createdAt: new Date(Date.now() - 3500000).toISOString(),
          images: [],
          read: true
        },
        {
          id: 'm3',
          content: 'Tudo ótimo! Viu meu novo post?',
          sender: selectedUser,
          receiver: {
            id: user?.sub || 'unknown',
            username: user?.nickname || 'usuario',
            displayName: user?.name || 'Usuário',
            profileImage: user?.picture || 'https://via.placeholder.com/50'
          },
          createdAt: new Date(Date.now() - 3400000).toISOString(),
          images: [],
          read: false
        }
      ];
      
      setMessages(mockMessages);
      setIsLoadingMessages(false);
      
      // Atualizar contatos para marcar mensagens como lidas
      setContacts(prevContacts => 
        prevContacts.map(contact => 
          contact.id === selectedUser.id 
            ? { ...contact, unreadCount: 0 } 
            : contact
        )
      );
    }, 1000);
  }, [selectedUser, user]);

  const handleSendMessage = async (message: {
    content: string;
    images: File[];
  }) => {
    if (!selectedUser || !user) return false;
    
    try {
      // Simular envio de mensagem
      console.log('Enviando mensagem:', message);
      
      // Simular delay de rede
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Criar nova mensagem simulada
      const newMessage: Message = {
        id: `msg-${Date.now()}`,
        content: message.content,
        sender: {
          id: user.sub || 'unknown',
          username: user.nickname || 'usuario',
          displayName: user.name || 'Usuário',
          profileImage: user.picture || 'https://via.placeholder.com/50'
        },
        receiver: selectedUser,
        createdAt: new Date().toISOString(),
        images: [], // Em produção, seriam URLs do Imgur após upload
        read: false
      };
      
      // Adicionar à lista de mensagens
      setMessages(prevMessages => [...prevMessages, newMessage]);
      
      // Atualizar último contato
      setContacts(prevContacts => 
        prevContacts.map(contact => 
          contact.id === selectedUser.id 
            ? { 
                ...contact, 
                lastMessage: message.content,
                lastMessageTime: new Date().toISOString()
              } 
            : contact
        )
      );
      
      return true;
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      return false;
    }
  };

  if (isLoading) {
    return (
      <main>
        <Header />
        <div className="main-container">
          <div className="text-center py-8">
            <p>Carregando...</p>
          </div>
        </div>
      </main>
    );
  }

  if (!user) {
    return (
      <main>
        <Header />
        <div className="main-container">
          <div className="text-center py-8 bg-white/90 text-gray-800 rounded-lg">
            <p>Faça login para acessar suas mensagens</p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main>
      <Header />
      
      <div className="main-container">
        <h1 className="text-2xl font-bold mb-4 text-yellow-400">MENSAGENS</h1>
        
        <div className="messages-container">
          {/* Lista de contatos */}
          <div className="messages-sidebar">
            <h2 className="text-lg font-bold mb-3 text-yellow-400">Contatos</h2>
            
            {contacts.length === 0 ? (
              <p className="text-gray-300">Nenhum contato encontrado</p>
            ) : (
              <div className="space-y-2">
                {contacts.map(contact => (
                  <div 
                    key={contact.id}
                    className={`user-item ${selectedUser?.id === contact.id ? 'active' : ''}`}
                    onClick={() => setSelectedUser(contact)}
                  >
                    <div className="relative">
                      <img 
                        src={contact.profileImage} 
                        alt={contact.displayName} 
                        className="user-avatar"
                      />
                      {contact.unreadCount ? (
                        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                          {contact.unreadCount}
                        </span>
                      ) : null}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="user-name">{contact.displayName}</div>
                      {contact.lastMessage && (
                        <div className="text-gray-400 text-xs truncate">
                          {contact.lastMessage}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {/* Área de chat */}
          <div className="messages-main">
            {selectedUser ? (
              <MessageChat 
                contact={selectedUser}
                messages={messages}
                isLoading={isLoadingMessages}
                onSendMessage={handleSendMessage}
              />
            ) : (
              <div className="flex items-center justify-center h-full">
                <p className="text-gray-400">Selecione um contato para iniciar uma conversa</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
