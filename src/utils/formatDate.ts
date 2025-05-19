// ARQUIVO: src/utils/formatDate.ts
// Este arquivo deve estar em: src/utils/formatDate.ts
// Função: Utilitário para formatação de datas em diferentes formatos

import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

/**
 * Formata uma data no formato completo (ex: 19 de maio de 2025 às 12:30)
 */
export function formatFullDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    return format(date, "d 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR });
  } catch (error) {
    console.error('Erro ao formatar data:', error);
    return dateString;
  }
}

/**
 * Formata uma data no formato curto (ex: 19/05/2025 12:30)
 */
export function formatShortDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    return format(date, 'dd/MM/yyyy HH:mm', { locale: ptBR });
  } catch (error) {
    console.error('Erro ao formatar data:', error);
    return dateString;
  }
}

/**
 * Formata uma data como tempo relativo (ex: há 5 minutos, há 2 horas)
 */
export function formatRelativeTime(dateString: string): string {
  try {
    const date = new Date(dateString);
    return formatDistanceToNow(date, { addSuffix: true, locale: ptBR });
  } catch (error) {
    console.error('Erro ao formatar data relativa:', error);
    return dateString;
  }
}

/**
 * Formata uma data para exibição em posts (relativa se recente, completa se antiga)
 */
export function formatPostDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    // Se for menos de 24 horas, usar formato relativo
    if (diffInHours < 24) {
      return formatRelativeTime(dateString);
    }
    
    // Se for menos de 7 dias, mostrar dia da semana e hora
    if (diffInHours < 168) {
      return format(date, "EEEE 'às' HH:mm", { locale: ptBR });
    }
    
    // Caso contrário, mostrar data completa
    return format(date, "d 'de' MMMM 'às' HH:mm", { locale: ptBR });
  } catch (error) {
    console.error('Erro ao formatar data de post:', error);
    return dateString;
  }
}
