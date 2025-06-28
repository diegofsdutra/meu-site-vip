"use client"

import React, { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '../../../components/AuthProvider'
import { AuthForm } from '../../../components/ui/auth-form'
import Link from 'next/link'
import type { AuthResult } from '../../../types/global'

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user } = useAuth()
  const [mode, setMode] = useState<'login' | 'register' | 'reset'>('login')

  // Redirecionar se usuário já estiver logado
  useEffect(() => {
    if (user) {
      const redirect = searchParams.get('redirect') || '/'
      router.push(redirect)
    }
  }, [user, router, searchParams])

  // Definir modo baseado na URL
  useEffect(() => {
    const modeParam = searchParams.get('mode')
    if (modeParam === 'register' || modeParam === 'reset') {
      setMode(modeParam)
    }
  }, [searchParams])

  const handleSuccess = (result: AuthResult) => {
    if (result.success) {
      const redirect = searchParams.get('redirect') || '/'
      
      // Para login bem-sucedido, redirecionar imediatamente
      if (mode === 'login') {
        setTimeout(() => {
          router.push(redirect)
        }, 1000)
      }
      
      // Para registro, pode precisar confirmar email
      if (mode === 'register') {
        if (!result.needsConfirmation) {
          setTimeout(() => {
            router.push(redirect)
          }, 1000)
        }
      }
    }
  }

  const handleModeChange = (newMode: 'login' | 'register' | 'reset') => {
    setMode(newMode)
    // Atualizar URL sem recarregar página
    const newParams = new URLSearchParams(searchParams.toString())
    newParams.set('mode', newMode)
    router.replace(`/auth/login?${newParams.toString()}`)
  }

  // Não renderizar se usuário já estiver logado (evitar flash)
  if (user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Redirecionando...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="text-center">
          <Link 
            href="/"
            className="inline-flex items-center text-2xl font-bold text-yellow-600 hover:text-yellow-700 transition-colors"
          >
            📱 Tela Prime Express
          </Link>
          <p className="mt-2 text-gray-600">
            Faça login para acessar sua conta VIP
          </p>
        </div>
      </div>

      {/* Formulário */}
      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <AuthForm
          mode={mode}
          onSuccess={handleSuccess}
          onToggleMode={handleModeChange}
          className="px-4"
        />
        
        {/* Link para voltar */}
        <div className="mt-6 text-center">
          <Link
            href="/"
            className="text-sm text-gray-500 hover:text-gray-700 underline"
          >
            ← Voltar para o início
          </Link>
        </div>
      </div>

      {/* Informações adicionais */}
      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
          <h3 className="text-sm font-semibold text-blue-900 mb-2">
            💎 Benefícios VIP
          </h3>
          <ul className="text-xs text-blue-700 space-y-1">
            <li>✅ Acesso completo a todos os modelos</li>
            <li>📱 Lista atualizada diariamente</li>
            <li>🚀 Sem anúncios na plataforma</li>
            <li>💬 Suporte prioritário</li>
          </ul>
        </div>
      </div>
    </div>
  )
}