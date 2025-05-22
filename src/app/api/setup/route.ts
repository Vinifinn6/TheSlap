import { NextResponse } from 'next/server';
import db from '@/lib/db';

// Rota para inicializar o banco de dados
export async function GET(request: Request) {
  try {
    // Inicializar o banco de dados
    await db.initDatabase();
    
    return NextResponse.json({ 
      success: true, 
      message: 'Banco de dados inicializado com sucesso' 
    });
  } catch (error) {
    console.error('Erro ao inicializar banco de dados:', error);
    return NextResponse.json(
      { error: 'Erro ao inicializar banco de dados' },
      { status: 500 }
    );
  }
}

// Rota para verificar o status do banco de dados
export async function POST(request: Request) {
  try {
    // Verificar conexão com o banco
    const result = await db.query('SELECT NOW() as time');
    
    return NextResponse.json({ 
      success: true, 
      message: 'Conexão com banco de dados estabelecida',
      timestamp: result.rows[0].time
    });
  } catch (error) {
    console.error('Erro ao verificar conexão com banco de dados:', error);
    return NextResponse.json(
      { error: 'Erro ao verificar conexão com banco de dados' },
      { status: 500 }
    );
  }
}
