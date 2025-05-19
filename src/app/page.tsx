"use client";

import React, { useState, useEffect } from 'react';
import Header from '../../components/Header';
import React, { useState, useEffect } from 'react';
import Header from '../../components/Header';
import MessageChat from '../../components/MessageChat';
import { useUser } from '@auth0/nextjs-auth0/client';

// Tipos simulados para demonstração
interface User {
  id: string;
  username: string;
  displayName: string;
  profileImage: string;
}

interface Message {
  id: string;
  content: string;
  senderId: string;
  receiverId: string;
  images: string[];
  createdAt: string;
  read: boolean;
}

export default function MessagesPage() {
  const { user, isLoading } = useUser();
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);

  // Simular carregamento de usuários
  useEffect(() => {
    // Em produção, isso seria uma chamada API real
    const mockUsers: User[] = [
      {
        id: '101',
        username: 'tori',
        displayName: 'Tori Vega',
        profileImage: 'https://via.placeholder.com/50?text=TV'
      },
      {
        id: '102',
        username: 'andre',
        displayName: 'Andre Harris',
        profileImage: 'https://via.placeholder.com/50?text=AH'
      },
      {
        id: '103',
        username: 'jade',
        displayName: 'Jade West',
        profileImage: 'https://via.placeholder.com/50?text=JW'
      },
      {
        id: '104',
        username: 'beck',
        displayName: 'Beck Oliver',
        profileImage: 'https://via.placeholder.com/50?text=BO'
      },
      {
        id: '105',
        username: 'cat',
        displayName: 'Cat Valentine',
        profileImage: 'https://via.placeholder.com/50?text=CV'
      }
    ];
    
    setUsers(mockUsers);
  }, []);

  // Carregar mensagens quando um usuário é selecionado
  useEffect(() => {
    if (selectedUser) {
      setIsLoadingMessages(true);
      
      // Simular carregamento de mensagens
      setTimeout(() => {
        // Em produção, isso seria uma chamada API real
        const mockMessages: Message[] = [
          {
            id: '1001',
            content: 'Olá! Como vai?',
            senderId: user?.sub || 'unknown',
            receiverId: selectedUser.id,
            images: [],
            createdAt: new Date(Date.now() - 3600000).toISOString(),
            read: true
          },
          {
            id: '1002',
            content: 'Tudo bem e você?',
            senderId: selectedUser.id,
            receiverId: user?.sub || 'unknown',
            images: [],
            createdAt: new Date(Date.now() - 3500000).toISOString(),
            read: true
          },
          {
            id: '1003',
            content: 'Estou bem! Viu o novo episódio?',
            senderId: user?.sub || 'unknown',
            receiverId: selectedUser.id,
            images: [],
            createdAt: new Date(Date.now() - 3400000).toISOString(),
            read: true
          },
          {
            id: '1004',
            content: 'Sim! Foi incrível!',
            senderId: selectedUser.id,
            receiverId: user?.sub || 'unknown',
            images: [],
            createdAt: new Date(Date.now() - 3300000).toISOString(),
            read: true
          }
        ];
        
        setMessages(mockMessages);
        setIsLoadingMessages(false);
      }, 1000);
    }
  }, [selectedUser, user?.sub]);

  const handleUserSelect = (user: User) => {
    setSelectedUser(user);
  };

  const handleSendMessage = async (message: {
    content: string;
    receiverId: string;
    images: File[];
  }) => {
    try {
      // Simular envio de mensagem
      console.log('Enviando mensagem:', message);
      
      // Simular delay de rede
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Criar nova mensagem simulada
      const newMessage: Message = {
        id: `msg-${Date.now()}`,
        content: message.content,
        senderId: user?.sub || 'unknown',
        receiverId: message.receiverId,
        images: [], // Em produção, seriam URLs do Imgur após upload
        createdAt: new Date().toISOString(),
        read: false
      };
      
      // Adicionar à lista de mensagens
      setMessages(prevMessages => [...prevMessages, newMessage]);
      
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
          <div className="text-center py-8">
            <p>Você precisa estar logado para acessar as mensagens.</p>
            <a href="/api/auth/login" className="text-orange-500 hover:underline">
              Clique aqui para fazer login
            </a>
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
          <div className="messages-sidebar">
            <h2 className="text-lg font-bold mb-3 text-yellow-400">Contatos</h2>
            
            {users.length === 0 ? (
              <div className="text-center py-4 text-gray-400">
                <p>Nenhum usuário encontrado</p>
              </div>
            ) : (
              <div>
                {users.map(user => (
                  <div 
                    key={user.id}
                    className={`user-item ${selectedUser?.id === user.id ? 'active' : ''}`}
                    onClick={() => handleUserSelect(user)}
                  >
                    <img 
                      src={user.profileImage}
                      alt={user.displayName}
                      className="user-avatar"
                    />
                    <div>
                      <div className="user-name">{user.displayName}</div>
                      <div className="text-xs text-gray-400">@{user.username}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {isLoadingMessages ? (
            <div className="flex-1 flex items-center justify-center">
              <p>Carregando mensagens...</p>
            </div>
          ) : (
            <MessageChat 
              selectedUser={selectedUser}
              messages={messages}
              currentUserId={user.sub || 'unknown'}
              onSendMessage={handleSendMessage}
            />
          )}
        </div>
      </div>
    </main>
  );
}
