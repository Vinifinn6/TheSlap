// ARQUIVO: src/hooks/useUser.ts
// Este arquivo deve estar em: src/hooks/useUser.ts
// Função: Hook personalizado para gerenciar informações do usuário atual

import { useState, useEffect } from 'react';
import { useUser as useAuth0User } from '@auth0/nextjs-auth0/client';

interface UserProfile {
  id: string;
  username: string;
  displayName: string;
  profileImage: string;
  bio?: string;
}

export function useUser() {
  const { user, error, isLoading } = useAuth0User();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);

  useEffect(() => {
    if (user && !isLoading) {
      setIsLoadingProfile(true);
      
      // Em produção, isso seria uma chamada API real para buscar o perfil completo
      // Aqui estamos simulando com os dados do Auth0
      setTimeout(() => {
        setProfile({
          id: user.sub || '',
          username: user.nickname || user.email?.split('@')[0] || 'usuario',
          displayName: user.name || 'Usuário',
          profileImage: user.picture || 'https://via.placeholder.com/50',
          bio: ''
        });
        setIsLoadingProfile(false);
      }, 500);
    }
  }, [user, isLoading]);

  return {
    user,
    profile,
    isLoading: isLoading || isLoadingProfile,
    error
  };
}

export default useUser;
