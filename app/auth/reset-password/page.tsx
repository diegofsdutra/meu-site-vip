'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '../../lib/supabaseClient'

function ResetPasswordContent() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [sessionReady, setSessionReady] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const processAuthCallback = async () => {
      try {
        console.log('🔐 Processando callback de reset de senha...')
        
        // Verificar se há parâmetros de auth na URL
        const accessToken = searchParams?.get('access_token')
        const refreshToken = searchParams?.get('refresh_token')
        const type = searchParams?.get('type')
        
        console.log('📋 Parâmetros da URL:', { 
          hasAccessToken: !!accessToken, 
          hasRefreshToken: !!refreshToken, 
          type 
        })

        if (accessToken && refreshToken && type === 'recovery') {
          console.log('✅ Parâmetros de recovery encontrados, configurando sessão...')
          
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken
          })

          if (error) {
            console.error('❌ Erro ao configurar sessão:', error)
            setMessage('Erro ao processar link de recuperação: ' + error.message)
          } else {
            console.log('✅ Sessão configurada com sucesso:', data.user?.email)
            setSessionReady(true)
            setMessage('Link válido! Digite sua nova senha.')
          }
        } else {
          // Verificar se já existe uma sessão ativa
          const { data: { session } } = await supabase.auth.getSession()
          
          if (session?.user) {
            console.log('✅ Sessão ativa encontrada:', session.user.email)
            setSessionReady(true)
            setMessage('Digite sua nova senha.')
          } else {
            console.log('❌ Nenhuma sessão encontrada')
            setMessage('Link de recuperação inválido ou expirado. Solicite um novo.')
          }
        }
      } catch (error) {
        console.error('❌ Erro ao processar callback:', error)
        setMessage('Erro ao processar link de recuperação.')
      }
    }

    processAuthCallback()
  }, [searchParams])

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!sessionReady) {
      setMessage('Sessão não está pronta. Aguarde ou solicite um novo link.')
      return
    }
    
    if (password !== confirmPassword) {
      setMessage('Senhas não coincidem')
      return
    }

    if (password.length < 6) {
      setMessage('Senha deve ter pelo menos 6 caracteres')
      return
    }

    setLoading(true)

    try {
      console.log('🔄 Atualizando senha...')
      
      const { data, error } = await supabase.auth.updateUser({
        password: password
      })

      if (error) {
        console.error('❌ Erro ao atualizar senha:', error)
        setMessage('Erro ao atualizar senha: ' + error.message)
      } else {
        console.log('✅ Senha atualizada com sucesso:', data.user?.email)
        setMessage('Senha atualizada com sucesso!')
        setTimeout(() => {
          router.push('/auth/login')
        }, 2000)
      }
    } catch (error) {
      console.error('❌ Erro geral:', error)
      setMessage('Erro inesperado ao atualizar senha.')
    }

    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Redefinir Senha
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Sistema integrado com Supabase
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleResetPassword}>
          <div>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="Nova senha"
            />
          </div>
          <div>
            <input
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="Confirmar nova senha"
            />
          </div>

          {message && (
            <div className={`text-center text-sm p-3 rounded ${
              message.includes('sucesso') ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
            }`}>
              {message}
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={loading || !sessionReady}
              className={`group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 ${
                sessionReady ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-400'
              }`}
            >
              {loading ? 'Atualizando...' : !sessionReady ? 'Aguardando sessão...' : 'Atualizar Senha'}
            </button>
          </div>
          
          <div className="text-center">
            <button
              type="button"
              onClick={() => router.push('/')}
              className="text-blue-600 hover:text-blue-800 underline"
            >
              Voltar ao início
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function ResetPassword() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Carregando...</p>
        </div>
      </div>
    }>
      <ResetPasswordContent />
    </Suspense>
  )
}