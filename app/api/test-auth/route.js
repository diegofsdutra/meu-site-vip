import { NextResponse } from 'next/server'

export async function POST(req) {
  try {
    const { action, email, password, name } = await req.json()
    
    console.log('🧪 Testando autenticação Supabase:', { action, email: email?.substring(0, 3) + '***' })

    // Importar cliente Supabase
    const { supabase } = await import('../../lib/supabaseClient')
    
    let result = null
    let error = null

    if (action === 'signup') {
      console.log('📝 Testando signup...')
      const response = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { name }
        }
      })
      result = response.data
      error = response.error
    } else if (action === 'signin') {
      console.log('🔐 Testando signin...')
      const response = await supabase.auth.signInWithPassword({
        email,
        password
      })
      result = response.data
      error = response.error
    }

    if (error) {
      console.error('❌ Erro na autenticação:', error)
      return NextResponse.json({
        success: false,
        error: {
          message: error.message,
          code: error.status,
          details: error
        }
      })
    }

    console.log('✅ Autenticação bem-sucedida:', {
      user: result?.user?.id,
      session: !!result?.session
    })

    return NextResponse.json({
      success: true,
      data: {
        user: result?.user ? {
          id: result.user.id,
          email: result.user.email,
          created_at: result.user.created_at
        } : null,
        session: !!result?.session
      }
    })

  } catch (error) {
    console.error('💥 Erro crítico no teste de auth:', error)
    return NextResponse.json({
      success: false,
      error: {
        message: 'Erro interno no teste',
        details: error.message
      }
    }, { status: 500 })
  }
}

export async function GET() {
  try {
    console.log('🔍 Verificando configuração do Supabase Auth...')
    
    // Testar configuração
    const { supabase } = await import('../../lib/supabaseClient')
    
    // Verificar variáveis de ambiente
    const config = {
      hasUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      url: process.env.NEXT_PUBLIC_SUPABASE_URL,
      anonKeyPrefix: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.substring(0, 20) + '...'
    }

    console.log('📋 Configuração:', config)

    return NextResponse.json({
      message: 'Teste de configuração Auth',
      config,
      instructions: {
        signup: 'POST /api/test-auth com { "action": "signup", "email": "test@example.com", "password": "123456", "name": "Test User" }',
        signin: 'POST /api/test-auth com { "action": "signin", "email": "test@example.com", "password": "123456" }'
      }
    })
  } catch (error) {
    console.error('❌ Erro na verificação:', error)
    return NextResponse.json({
      error: 'Erro na verificação da configuração',
      details: error.message
    }, { status: 500 })
  }
}