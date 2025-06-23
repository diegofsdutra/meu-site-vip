// app/api/auth/login/route.js
import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

// Simulação de banco de dados (substitua por MySQL/PostgreSQL depois)
const users = [
  {
    id: 1,
    email: 'admin@vip.com',
    password: '123456', // Senha em texto simples para teste
    name: 'Admin VIP',
    isVIP: true,
    createdAt: new Date()
  },
  {
    id: 2,
    email: 'user@teste.com',
    password: '123456', // Senha em texto simples para teste
    name: 'Usuário Teste',
    isVIP: false,
    createdAt: new Date()
  }
];

const JWT_SECRET = process.env.JWT_SECRET || 'seu-jwt-secret-super-seguro';

export async function POST(request) {
  try {
    const { email, password } = await request.json();

    console.log('Tentativa de login:', { email, password }); // Debug

    // Validações básicas
    if (!email || !password) {
      return NextResponse.json(
        { success: false, message: 'Email e senha são obrigatórios' },
        { status: 400 }
      );
    }

    // Buscar usuário
    const user = users.find(u => u.email === email);
    
    if (!user) {
      console.log('Usuário não encontrado:', email); // Debug
      return NextResponse.json(
        { success: false, message: 'Email ou senha incorretos' },
        { status: 401 }
      );
    }

    // Verificar senha (comparação simples para teste)
    const isPasswordValid = password === user.password;
    
    console.log('Senha válida:', isPasswordValid); // Debug
    
    if (!isPasswordValid) {
      return NextResponse.json(
        { success: false, message: 'Email ou senha incorretos' },
        { status: 401 }
      );
    }

    // Gerar JWT token
    const token = jwt.sign(
      { 
        userId: user.id, 
        email: user.email, 
        isVIP: user.isVIP 
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Remover senha da resposta
    const { password: _, ...userWithoutPassword } = user;

    console.log('Login bem-sucedido para:', email); // Debug

    return NextResponse.json({
      success: true,
      message: 'Login realizado com sucesso',
      user: userWithoutPassword,
      token
    });

  } catch (error) {
    console.error('Erro no login:', error);
    return NextResponse.json(
      { success: false, message: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}