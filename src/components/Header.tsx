"use client";

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useUser } from '@auth0/nextjs-auth0/client';

const Header = () => {
  const { user, isLoading } = useUser();

  return (
    <header className="bg-blue-900 text-white">
      <div className="container mx-auto px-4 py-2 flex justify-between items-center">
        <div className="flex items-center">
          <Link href="/" className="flex items-center">
            <Image 
              src="/images/theslap-logo.png" 
              alt="TheSlap.com" 
              width={150} 
              height={60} 
              className="mr-2"
            />
          </Link>
        </div>
        
        <div className="flex items-center space-x-4">
          <Link href="/" className="hover:text-yellow-300">
            HOME
          </Link>
          <Link href="/profiles" className="hover:text-yellow-300">
            PROFILES
          </Link>
          <Link href="/search" className="hover:text-yellow-300">
            SEARCH
          </Link>
          
          <div className="relative ml-4">
            <input 
              type="text" 
              placeholder="Buscar..." 
              className="bg-white text-gray-800 rounded-full px-4 py-1 text-sm w-40"
            />
            <button className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-red-500 text-white rounded-full px-2 py-0 text-xs">
              GO
            </button>
          </div>
          
          <div className="ml-4">
            {isLoading ? (
              <span>Carregando...</span>
            ) : user ? (
              <div className="flex items-center space-x-2">
                <Link href="/messages" className="hover:text-yellow-300">
                  MENSAGENS
                </Link>
                <Link href="/api/auth/logout" className="hover:text-yellow-300">
                  SAIR
                </Link>
                <Link href="/profile" className="flex items-center">
                  <Image 
                    src={user.picture || "https://via.placeholder.com/30"} 
                    alt={user.name || "Usuário"} 
                    width={30} 
                    height={30} 
                    className="rounded-full"
                  />
                </Link>
              </div>
            ) : (
              <Link 
                href="/api/auth/login" 
                className="bg-yellow-400 text-blue-900 px-4 py-1 rounded-full font-bold hover:bg-yellow-300"
              >
                LOGIN
              </Link>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
