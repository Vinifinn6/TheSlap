// ARQUIVO: src/types/index.ts
// Este arquivo deve estar em: src/types/index.ts
// Função: Definições de tipos TypeScript compartilhados em toda a aplicação

// Tipos relacionados a usuários
export interface User {
  id: string;
  username: string;
  displayName: string;
  profileImage: string;
  bio?: string;
  createdAt?: string;
}

// Tipos relacionados a posts
export interface Post {
  id: string;
  content: string;
  user: User;
  createdAt: string;
  images: string[];
  moodText: string;
  moodEmoji: string;
  comments: Comment[];
  likesCount: number;
}

// Tipos relacionados a comentários
export interface Comment {
  id: string;
  content: string;
  user: User;
  postId: string;
  createdAt: string;
  images: string[];
}

// Tipos relacionados a mensagens
export interface Message {
  id: string;
  content: string;
  sender: User;
  receiver: User;
  createdAt: string;
  images: string[];
  read: boolean;
}

// Tipos relacionados a formulários
export interface PostFormData {
  content: string;
  moodText: string;
  moodEmoji: string;
  images: File[];
  mentions: string[];
}

export interface CommentFormData {
  content: string;
  images: File[];
  mentions: string[];
  postId: string;
}

export interface MessageFormData {
  content: string;
  images: File[];
  receiverId: string;
}

// Tipos relacionados a respostas de API
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}
