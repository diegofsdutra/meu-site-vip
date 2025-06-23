// app/api/auth/register/route.js
import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// Simulação de banco de dados (mesmo array do login)
let users = [
  {
    id: 1,
    email: 'admin@vip.com',
    password: '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
    name: 'Admin VIP',
    isVIP: true,
    createdAt: new Date()
  },
  {
    id: 2,
    email: 'user@teste.com',
    password: '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
    name: 'Usuário Teste',
    isVIP: false,
    createdAt: new Date()
  }
];

const JWT_SECRET = process.env.JWT_SECRET || 'seu-jwt-secret-super-seguro';

export async function POST(request) {
  try {
    const { name, email, password } = await request.json();

    // Validações
    if (!name || !email || !password) {
      return NextResponse.json(
        { success: false, message: 'Todos os campos são obrigatórios' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { success: false, message: 'Senha deve ter pelo menos 6 caracteres' },
        { status: 400 }
      );
    }

    // Verificar se email já existe
    const existingUser = users.find(u => u.email === email);
    if (existingUser) {
      return NextResponse.json(
        { success: false, message: 'Email já cadastrado' },
        { status: 409 }
      );
    }

    // Criptografar senha
    const hashedPassword = await bcrypt.hash(password, 10);

    // Criar novo usuário
    const newUser = {
      id: users.length + 1,
      email,
      password: hashedPassword,
      name,
      isVIP: false, // Novos usuários começam como gratuitos
      createdAt: new Date()
    };

    // Adicionar ao "banco de dados"
    users.push(newUser);

    // Gerar JWT token
    const token = jwt.sign(
      { 
        userId: newUser.id, 
        email: newUser.email, 
        isVIP: newUser.isVIP 
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Remover senha da resposta
    const { password: _, ...userWithoutPassword } = newUser;

    return NextResponse.json({
      success: true,
      message: 'Cadastro realizado com sucesso',
      user: userWithoutPassword,
      token
    });

  } catch (error) {
    console.error('Erro no cadastro:', error);
    return NextResponse.json(
      { success: false, message: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}