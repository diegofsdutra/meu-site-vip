// app/api/auth/login/route.js
import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

// Legacy authentication - consider migrating to Supabase Auth only
// This endpoint is deprecated and should not be used in production

const JWT_SECRET = process.env.JWT_SECRET;

export async function POST(request) {
  try {
    // This legacy endpoint is deprecated
    // All authentication should use Supabase Auth instead
    console.warn('⚠️ Legacy JWT authentication endpoint called - migrate to Supabase Auth');
    
    return NextResponse.json(
      { 
        success: false, 
        message: 'This authentication method is deprecated. Please use Supabase Auth.' 
      },
      { status: 410 } // Gone
    );

  } catch (error) {
    console.error('Erro no login:', error);
    return NextResponse.json(
      { success: false, message: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}