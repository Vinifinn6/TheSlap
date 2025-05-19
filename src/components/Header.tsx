import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useUser } from '@auth0/nextjs-auth0/client';
import { FaSearch } from 'react-icons/fa';

const Header: React.FC = () => {
  const { user, isLoading } = useUser();

  return (
    <header className="bg-gradient-to-r from-orange-500 to-yellow-400 p-2">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between">
        <div className="flex items-center mb-2 md:mb-0">
          <Link href="/">
            <Image 
              src="/images/theslap-logo.png" 
              alt="TheSlap.com" 
              width={200} 
              height={80} 
              className="h-16 w-auto"
            />
          </Link>
        </div>
        
        <div className="flex flex-col md:flex-row items-center gap-4">
          <div className="search-bar">
            <input 
              type="text" 
              placeholder="Buscar..." 
              className="search-input"
            />
            <button className="search-button">
              <FaSearch />
            </button>
          </div>
          
          <div className="auth-buttons">
            {isLoading ? (
              <span>Carregando...</span>
            ) : user ? (
              <>
                <Link href="/profile" className="auth-button">
                  Perfil
                </Link>
                <Link href="/api/auth/logout" className="auth-button">
                  Sair
                </Link>
              </>
            ) : (
              <>
                <Link href="/api/auth/login" className="auth-button">
                  Entrar
                </Link>
                <Link href="/api/auth/login" className="auth-button">
                  Registrar
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
      
      <nav className="max-w-7xl mx-auto mt-2">
        <div className="nav-menu">
          <Link href="/" className="nav-item active">
            HOME
          </Link>
          <Link href="/profiles" className="nav-item">
            PROFILES
          </Link>
          <Link href="/search" className="nav-item">
            SEARCH
          </Link>
        </div>
      </nav>
    </header>
  );
};

export default Header;
