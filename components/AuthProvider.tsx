'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { User } from '@supabase/supabase-js'
import { UserProfile } from '../app/lib/supabaseClient'

interface AuthContextType {
  user: User | null
  profile: UserProfile | null
  loading: boolean
  isVIP: boolean
  signUp: (email: string, password: string, name: string) => Promise<{
    success: boolean
    message: string
    needsConfirmation?: boolean
    data?: any
    error?: any
  }>
  signIn: (email: string, password: string) => Promise<{
    success: boolean
    message: string
    data?: any
    error?: any
  }>
  signOut: () => Promise<{ success: boolean; error?: any }>
  resetPassword: (email: string) => Promise<{
    success: boolean
    message: string
    data?: any
    error?: any
  }>
  updateProfile: (updates: Partial<UserProfile>) => Promise<{ data: any; error: any }>
  upgradeToVIP: (paymentMethod?: string) => Promise<{
    success: boolean
    message: string
    data?: any
  }>
  refreshVIPStatus: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de AuthProvider')
  }
  return context
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [isVIP, setIsVIP] = useState(false)
  const [supabase, setSupabase] = useState<any>(null)

  // Inicializar Supabase IMEDIATAMENTE
  useEffect(() => {
    const initSupabase = async () => {
      try {
        // Importação síncrona direta
        const { supabase: supabaseClient } = await import('../app/lib/supabaseClient')
        setSupabase(supabaseClient)
        
        // Verificar sessão atual
        const { data: { session } } = await supabaseClient.auth.getSession()
        
        if (session?.user) {
          setUser(session.user)
          await loadUserProfile(session.user.id, supabaseClient)
        }
        
        // Escutar mudanças de autenticação
        const { data: { subscription } } = supabaseClient.auth.onAuthStateChange(
          async (event, session) => {
            console.log('Auth state changed:', event, session?.user?.email)
            
            if (session?.user) {
              setUser(session.user)
              await loadUserProfile(session.user.id, supabaseClient)
            } else {
              setUser(null)
              setProfile(null)
              setIsVIP(false)
            }
            setLoading(false)
          }
        )

        setLoading(false)
        
        return () => subscription.unsubscribe()
      } catch (error) {
        console.error('Erro ao inicializar Supabase:', error)
        setLoading(false)
      }
    }

    // Executar IMEDIATAMENTE
    initSupabase()
  }, [])

  // Atualizar status VIP quando profile mudar
  useEffect(() => {
    if (profile) {
      import('../app/lib/vipUtils').then(({ isVIPActive }) => {
        setIsVIP(isVIPActive(profile))
      })
    } else {
      setIsVIP(false)
    }
  }, [profile])

  const loadUserProfile = async (userId: string, supabaseClient: any) => {
    try {
      // Carregar dados básicos do perfil
      const { data, error } = await supabaseClient
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (!error && data) {
        // Carregar dados VIP separadamente
        const { loadUserVIPData } = await import('../app/lib/vipUtils')
        const vipData = await loadUserVIPData(data.email)
        
        // Adicionar dados VIP ao perfil
        const profileWithVIP = {
          ...data,
          vip_data: vipData
        }
        
        setProfile(profileWithVIP)
        console.log('Profile carregado:', {
          email: data.email,
          hasVIP: !!vipData,
          vipExpires: vipData?.data_expiraca
        })
      } else if (error) {
        console.error('Erro ao carregar perfil:', error)
      }
    } catch (err) {
      console.error('Erro ao carregar perfil:', err)
    }
  }

  const refreshVIPStatus = async () => {
    if (user && profile && supabase) {
      console.log('🔄 Atualizando status VIP...')
      await loadUserProfile(user.id, supabase)
    }
  }

  const signUp = async (email: string, password: string, name: string) => {
    // Aguardar inicialização se necessário
    if (!supabase) {
      // Tentar carregar Supabase dinamicamente
      const { supabase: supabaseClient } = await import('../app/lib/supabaseClient')
      setSupabase(supabaseClient)
      
      // Usar o cliente recém carregado
      return await performSignUp(supabaseClient, email, password, name)
    }

    return await performSignUp(supabase, email, password, name)
  }

  const performSignUp = async (supabaseClient: any, email: string, password: string, name: string) => {
    try {
      setLoading(true)
      
      const { data, error } = await supabaseClient.auth.signUp({
        email,
        password,
        options: {
          data: { name }
        }
      })

      if (error) {
        return {
          success: false,
          message: error.message,
          error
        }
      }

      if (data.user && !data.session) {
        return {
          success: true,
          message: 'Verifique seu email para confirmar a conta',
          needsConfirmation: true,
          data
        }
      }

      return {
        success: true,
        message: 'Cadastro realizado com sucesso!',
        data
      }
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Erro interno',
        error
      }
    } finally {
      setLoading(false)
    }
  }

  const signIn = async (email: string, password: string) => {
    // Aguardar inicialização se necessário
    if (!supabase) {
      // Tentar carregar Supabase dinamicamente
      const { supabase: supabaseClient } = await import('../app/lib/supabaseClient')
      setSupabase(supabaseClient)
      
      // Usar o cliente recém carregado
      return await performSignIn(supabaseClient, email, password)
    }

    return await performSignIn(supabase, email, password)
  }

  const performSignIn = async (supabaseClient: any, email: string, password: string) => {
    try {
      setLoading(true)
      
      const { data, error } = await supabaseClient.auth.signInWithPassword({
        email,
        password
      })

      if (error) {
        return {
          success: false,
          message: 'Email ou senha incorretos',
          error
        }
      }

      return {
        success: true,
        message: 'Login realizado com sucesso!',
        data
      }
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Erro interno',
        error
      }
    } finally {
      setLoading(false)
    }
  }

  const signOut = async () => {
    if (!supabase) {
      return { success: false, error: 'Sistema não inicializado' }
    }

    try {
      setLoading(true)
      const { error } = await supabase.auth.signOut()
      
      if (!error) {
        setUser(null)
        setProfile(null)
        setIsVIP(false)
      }
      
      return { success: !error, error }
    } catch (error) {
      return { success: false, error }
    } finally {
      setLoading(false)
    }
  }

  const resetPassword = async (email: string) => {
    // Aguardar inicialização se necessário
    if (!supabase) {
      const { supabase: supabaseClient } = await import('../app/lib/supabaseClient')
      setSupabase(supabaseClient)
      
      return await performResetPassword(supabaseClient, email)
    }

    return await performResetPassword(supabase, email)
  }

  const performResetPassword = async (supabaseClient: any, email: string) => {
    try {
      const { data, error } = await supabaseClient.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`
      })

      if (error) {
        return {
          success: false,
          message: error.message,
          error
        }
      }

      return {
        success: true,
        message: 'Email de recuperação enviado!',
        data
      }
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Erro interno',
        error
      }
    }
  }

  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (!user) return { data: null, error: { message: 'Usuário não logado' } }
    if (!supabase) return { data: null, error: { message: 'Sistema não inicializado' } }
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id)
        .select()
        .single()

      if (!error && data) {
        // Recarregar perfil completo com dados VIP
        await loadUserProfile(user.id, supabase)
      }

      return { data, error }
    } catch (error) {
      return { data: null, error }
    }
  }

  // FUNÇÃO VIP INTEGRADA
  const upgradeToVIP = async (paymentMethod: string = 'pix') => {
    if (!user) {
      return {
        success: false,
        message: 'Usuário não logado'
      }
    }

    try {
      setLoading(true)
      
      console.log('Iniciando upgrade VIP para usuário:', user.id)
      
      const { processVIPUpgrade } = await import('../app/lib/vipUtils')
      const result = await processVIPUpgrade(user.id, paymentMethod)
      
      if (result.success) {
        console.log('VIP upgrade bem-sucedido!')
      }
      
      return result
    } catch (error: any) {
      console.error('Erro no upgrade VIP:', error)
      return {
        success: false,
        message: error.message || 'Erro interno. Tente novamente.'
      }
    } finally {
      setLoading(false)
    }
  }

  const value = {
    user,
    profile,
    loading,
    isVIP,
    signUp,
    signIn,
    signOut,
    resetPassword,
    updateProfile,
    upgradeToVIP,
    refreshVIPStatus
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}