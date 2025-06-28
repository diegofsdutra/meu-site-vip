"use client"

import React, { useState } from 'react'
import { useAuth } from '../AuthProvider'
import type { AuthResult } from '../../types/global'

interface AuthFormProps {
  mode: 'login' | 'register' | 'reset'
  onSuccess?: (result: AuthResult) => void
  onToggleMode?: (mode: 'login' | 'register' | 'reset') => void
  className?: string
}

export function AuthForm({ mode, onSuccess, onToggleMode, className = '' }: AuthFormProps) {
  const { signIn, signUp, resetPassword, loading } = useAuth()
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    confirmPassword: ''
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [message, setMessage] = useState<{ type: 'error' | 'success' | 'info', text: string } | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    // Validar email
    if (!formData.email) {
      newErrors.email = 'Email é obrigatório'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Email inválido'
    }

    // Validar password (exceto no reset)
    if (mode !== 'reset') {
      if (!formData.password) {
        newErrors.password = 'Senha é obrigatória'
      } else if (formData.password.length < 6) {
        newErrors.password = 'Senha deve ter pelo menos 6 caracteres'
      }
    }

    // Validar campos específicos do registro
    if (mode === 'register') {
      if (!formData.name?.trim()) {
        newErrors.name = 'Nome é obrigatório'
      }

      if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = 'Senhas não coincidem'
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) return

    setIsSubmitting(true)
    setMessage(null)

    try {
      let result: AuthResult

      switch (mode) {
        case 'login':
          result = await signIn(formData.email, formData.password)
          break
        case 'register':
          result = await signUp(formData.email, formData.password, formData.name)
          break
        case 'reset':
          result = await resetPassword(formData.email)
          break
        default:
          throw new Error('Modo inválido')
      }

      if (result.success) {
        setMessage({ type: 'success', text: result.message })
        
        // Limpar formulário
        setFormData({
          email: '',
          password: '',
          name: '',
          confirmPassword: ''
        })

        // Chamar callback de sucesso
        onSuccess?.(result)

        // Para reset de senha, trocar para login após 3 segundos
        if (mode === 'reset') {
          setTimeout(() => onToggleMode?.('login'), 3000)
        }
      } else {
        setMessage({ type: 'error', text: result.message })
      }
    } catch (error) {
      console.error('Erro no formulário de auth:', error)
      setMessage({ 
        type: 'error', 
        text: 'Erro inesperado. Tente novamente.' 
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    
    // Limpar erro do campo quando usuário começar a digitar
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  const getButtonText = () => {
    if (isSubmitting || loading) return 'Carregando...'
    
    switch (mode) {
      case 'login': return 'Entrar'
      case 'register': return 'Criar Conta'
      case 'reset': return 'Enviar Email'
      default: return 'Enviar'
    }
  }

  const getTitle = () => {
    switch (mode) {
      case 'login': return 'Fazer Login'
      case 'register': return 'Criar Conta'
      case 'reset': return 'Recuperar Senha'
      default: return ''
    }
  }

  return (
    <div className={`w-full max-w-md mx-auto ${className}`}>
      <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
        <h2 className="text-2xl font-bold text-center mb-6 text-gray-900">
          {getTitle()}
        </h2>

        {/* Mensagem de feedback */}
        {message && (
          <div className={`p-3 rounded-md mb-4 text-sm ${
            message.type === 'error' 
              ? 'bg-red-50 text-red-700 border border-red-200' 
              : message.type === 'success'
                ? 'bg-green-50 text-green-700 border border-green-200'
                : 'bg-blue-50 text-blue-700 border border-blue-200'
          }`}>
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Nome (apenas no registro) */}
          {mode === 'register' && (
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                Nome Completo
              </label>
              <input
                type="text"
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent ${
                  errors.name ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Digite seu nome completo"
                disabled={isSubmitting || loading}
              />
              {errors.name && (
                <p className="text-red-500 text-xs mt-1">{errors.name}</p>
              )}
            </div>
          )}

          {/* Email */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              id="email"
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent ${
                errors.email ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="seu@email.com"
              disabled={isSubmitting || loading}
              autoComplete="email"
            />
            {errors.email && (
              <p className="text-red-500 text-xs mt-1">{errors.email}</p>
            )}
          </div>

          {/* Senha (não exibir no reset) */}
          {mode !== 'reset' && (
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Senha
              </label>
              <input
                type="password"
                id="password"
                value={formData.password}
                onChange={(e) => handleInputChange('password', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent ${
                  errors.password ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Digite sua senha"
                disabled={isSubmitting || loading}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              />
              {errors.password && (
                <p className="text-red-500 text-xs mt-1">{errors.password}</p>
              )}
            </div>
          )}

          {/* Confirmar senha (apenas no registro) */}
          {mode === 'register' && (
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                Confirmar Senha
              </label>
              <input
                type="password"
                id="confirmPassword"
                value={formData.confirmPassword}
                onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent ${
                  errors.confirmPassword ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Confirme sua senha"
                disabled={isSubmitting || loading}
                autoComplete="new-password"
              />
              {errors.confirmPassword && (
                <p className="text-red-500 text-xs mt-1">{errors.confirmPassword}</p>
              )}
            </div>
          )}

          {/* Botão de submit */}
          <button
            type="submit"
            disabled={isSubmitting || loading}
            className="w-full bg-yellow-500 text-white py-2 px-4 rounded-md hover:bg-yellow-600 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition duration-200 font-medium"
          >
            {getButtonText()}
          </button>
        </form>

        {/* Links para trocar entre modos */}
        <div className="mt-6 text-center space-y-2">
          {mode === 'login' && (
            <>
              <button
                onClick={() => onToggleMode?.('register')}
                className="text-sm text-blue-600 hover:text-blue-800 underline"
                disabled={isSubmitting || loading}
              >
                Não tem conta? Criar uma agora
              </button>
              <br />
              <button
                onClick={() => onToggleMode?.('reset')}
                className="text-sm text-gray-600 hover:text-gray-800 underline"
                disabled={isSubmitting || loading}
              >
                Esqueci minha senha
              </button>
            </>
          )}

          {mode === 'register' && (
            <button
              onClick={() => onToggleMode?.('login')}
              className="text-sm text-blue-600 hover:text-blue-800 underline"
              disabled={isSubmitting || loading}
            >
              Já tem conta? Fazer login
            </button>
          )}

          {mode === 'reset' && (
            <button
              onClick={() => onToggleMode?.('login')}
              className="text-sm text-blue-600 hover:text-blue-800 underline"
              disabled={isSubmitting || loading}
            >
              Voltar para o login
            </button>
          )}
        </div>
      </div>
    </div>
  )
}