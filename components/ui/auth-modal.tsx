"use client"

import React, { useState, useEffect } from 'react'
import { AuthForm } from './auth-form'
import { useAuth } from '../AuthProvider'
import { useRouter } from 'next/navigation'
import type { AuthResult } from '../../types/global'

interface AuthModalProps {
  isOpen: boolean
  onClose: () => void
  initialMode?: 'login' | 'register' | 'reset'
  redirectTo?: string
  title?: string
}

export function AuthModal({ 
  isOpen, 
  onClose, 
  initialMode = 'login',
  redirectTo = '/',
  title 
}: AuthModalProps) {
  const [mode, setMode] = useState<'login' | 'register' | 'reset'>(initialMode)
  const { user } = useAuth()
  const router = useRouter()

  // Fechar modal se usuário já estiver logado
  useEffect(() => {
    if (user && isOpen) {
      onClose()
    }
  }, [user, isOpen, onClose])

  // Resetar modo quando modal abrir
  useEffect(() => {
    if (isOpen) {
      setMode(initialMode)
    }
  }, [isOpen, initialMode])

  // Fechar modal com Escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose])

  const handleSuccess = (result: AuthResult) => {
    console.log('Auth success:', result)

    // Para login bem-sucedido, redirecionar
    if (mode === 'login' && result.success) {
      setTimeout(() => {
        onClose()
        router.push(redirectTo)
      }, 1000)
    }

    // Para registro bem-sucedido
    if (mode === 'register' && result.success) {
      if (result.needsConfirmation) {
        // Usuário precisa confirmar email
        setTimeout(() => {
          setMode('login')
        }, 3000)
      } else {
        // Login automático após registro
        setTimeout(() => {
          onClose()
          router.push(redirectTo)
        }, 1000)
      }
    }

    // Para reset de senha, trocar para login
    if (mode === 'reset' && result.success) {
      setTimeout(() => {
        setMode('login')
      }, 3000)
    }
  }

  const handleToggleMode = (newMode: 'login' | 'register' | 'reset') => {
    setMode(newMode)
  }

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={handleBackdropClick}
    >
      <div className="relative max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Botão de fechar */}
        <button
          onClick={onClose}
          className="absolute -top-2 -right-2 bg-white rounded-full p-2 shadow-lg hover:bg-gray-100 transition-colors z-10"
          aria-label="Fechar"
        >
          <svg 
            className="w-5 h-5 text-gray-600" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M6 18L18 6M6 6l12 12" 
            />
          </svg>
        </button>

        {/* Título personalizado */}
        {title && (
          <div className="text-center mb-4">
            <h1 className="text-xl font-bold text-white bg-black bg-opacity-50 rounded-lg p-3">
              {title}
            </h1>
          </div>
        )}

        {/* Formulário de autenticação */}
        <AuthForm
          mode={mode}
          onSuccess={handleSuccess}
          onToggleMode={handleToggleMode}
        />
      </div>
    </div>
  )
}

// Hook para usar o modal de auth facilmente
export function useAuthModal() {
  const [isOpen, setIsOpen] = useState(false)
  const [mode, setMode] = useState<'login' | 'register' | 'reset'>('login')
  const [config, setConfig] = useState<{
    redirectTo?: string
    title?: string
  }>({})

  const openLogin = (options?: { redirectTo?: string; title?: string }) => {
    setMode('login')
    setConfig(options || {})
    setIsOpen(true)
  }

  const openRegister = (options?: { redirectTo?: string; title?: string }) => {
    setMode('register')
    setConfig(options || {})
    setIsOpen(true)
  }

  const openReset = (options?: { redirectTo?: string; title?: string }) => {
    setMode('reset')
    setConfig(options || {})
    setIsOpen(true)
  }

  const close = () => {
    setIsOpen(false)
  }

  const AuthModalComponent = () => (
    <AuthModal
      isOpen={isOpen}
      onClose={close}
      initialMode={mode}
      redirectTo={config.redirectTo}
      title={config.title}
    />
  )

  return {
    isOpen,
    openLogin,
    openRegister,
    openReset,
    close,
    AuthModal: AuthModalComponent
  }
}