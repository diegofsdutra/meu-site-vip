// app/api/auth/forgot-password/route.js
import { NextResponse } from 'next/server';
import crypto from 'crypto';

// Simulação de banco para tokens de reset
let resetTokens = [];

// Simulação de usuários (mesmo array dos outros arquivos)
const users = [
  {
    id: 1,
    email: 'admin@vip.com',
    name: 'Admin VIP'
  },
  {
    id: 2,
    email: 'user@teste.com',
    name: 'Usuário Teste'
  }
];

export async function POST(request) {
  try {
    const { email } = await request.json();

    // Validação
    if (!email) {
      return NextResponse.json(
        { success: false, message: 'Email é obrigatório' },
        { status: 400 }
      );
    }

    // Verificar se usuário existe
    const user = users.find(u => u.email === email);
    
    if (!user) {
      // Por segurança, não revelamos se o email existe ou não
      return NextResponse.json({
        success: true,
        message: 'Se o email estiver cadastrado, você receberá as instruções para redefinir sua senha.'
      });
    }

    // Gerar token de reset
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hora

    // Salvar token (em produção, salve no banco de dados)
    resetTokens.push({
      email: user.email,
      token: resetToken,
      expiresAt: resetTokenExpiry,
      used: false
    });

    // Simular envio de email (em produção, use SendGrid, Mailgun, etc.)
    console.log(`
      📧 EMAIL DE RECUPERAÇÃO ENVIADO PARA: ${email}
      🔗 Link de reset: http://localhost:3000/reset-password?token=${resetToken}
      ⏰ Expira em: ${resetTokenExpiry.toLocaleString()}
    `);

    return NextResponse.json({
      success: true,
      message: 'Email de recuperação enviado! Verifique sua caixa de entrada.',
      // Em desenvolvimento, retornamos o token para facilitar testes
      ...(process.env.NODE_ENV === 'development' && { 
        resetToken,
        resetLink: `http://localhost:3000/reset-password?token=${resetToken}`
      })
    });

  } catch (error) {
    console.error('Erro na recuperação de senha:', error);
    return NextResponse.json(
      { success: false, message: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}