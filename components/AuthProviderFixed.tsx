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

  // Inicializar Supabase
  useEffect(() => {
    const initSupabase = async () => {
      try {
        console.log('🔄 Inicializando Supabase Auth...')
        
        const { supabase: supabaseClient } = await import('../app/lib/supabaseClient')
        setSupabase(supabaseClient)
        
        console.log('✅ Supabase Client carregado')
        
        // Verificar sessão atual
        const { data: { session }, error: sessionError } = await supabaseClient.auth.getSession()
        
        if (sessionError) {
          console.error('❌ Erro ao obter sessão:', sessionError)
        } else if (session?.user) {
          console.log('👤 Sessão encontrada:', session.user.email)
          setUser(session.user)
          await loadUserProfile(session.user.id, supabaseClient)
        } else {
          console.log('ℹ️ Nenhuma sessão ativa')
        }
        
        // Escutar mudanças de autenticação
        const { data: { subscription } } = supabaseClient.auth.onAuthStateChange(
          async (event, session) => {
            console.log('🔐 Auth state changed:', event, session?.user?.email)
            
            try {
              if (session?.user) {
                setUser(session.user)
                await loadUserProfile(session.user.id, supabaseClient)
              } else {
                setUser(null)
                setProfile(null)
                setIsVIP(false)
              }
            } catch (error) {
              console.error('❌ Erro ao processar mudança de auth:', error)
            } finally {
              setLoading(false)
            }
          }
        )

        setLoading(false)
        
        return () => {
          subscription.unsubscribe()
        }
      } catch (error) {
        console.error('❌ Erro ao inicializar Supabase:', error)
        setLoading(false)
      }
    }

    initSupabase()
  }, [])

  const loadUserProfile = async (userId: string, supabaseClient: any) => {
    try {
      console.log('📥 Carregando perfil do usuário:', userId)
      
      const { data, error } = await supabaseClient
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle()

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error('❌ Erro ao carregar perfil:', error)
        return
      }

      if (data) {
        console.log('✅ Perfil carregado:', data.email)
        setProfile(data)
        setIsVIP(data.is_vip && data.vip_expires_at && new Date(data.vip_expires_at) > new Date())
      } else {
        console.log('ℹ️ Perfil não encontrado, será criado automaticamente')
        // Perfil será criado pelo trigger do banco
      }
    } catch (err) {
      console.error('❌ Erro geral ao carregar perfil:', err)
    }
  }

  const signUp = async (email: string, password: string, name: string) => {
    try {
      setLoading(true)
      console.log('📝 Iniciando signup:', email)

      if (!supabase) {
        throw new Error('Supabase não inicializado')
      }

      const { data, error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          data: { 
            name: name.trim(),
            full_name: name.trim()
          }
        }
      })

      console.log('📝 Resultado signup:', { 
        user: data?.user?.id, 
        session: !!data?.session, 
        error: error?.message 
      })

      if (error) {
        console.error('❌ Erro no signup:', error)
        return {
          success: false,
          message: getErrorMessage(error),
          error
        }
      }

      if (data.user && !data.session) {
        return {
          success: true,
          message: 'Conta criada! Verifique seu email para confirmar.',
          needsConfirmation: true,
          data
        }
      }

      return {
        success: true,
        message: 'Conta criada com sucesso!',
        data
      }
    } catch (error: any) {
      console.error('💥 Erro crítico no signup:', error)
      return {
        success: false,
        message: 'Erro interno. Tente novamente.',
        error
      }
    } finally {
      setLoading(false)
    }
  }

  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true)
      console.log('🔐 Iniciando signin:', email)

      if (!supabase) {
        throw new Error('Supabase não inicializado')
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password
      })

      console.log('🔐 Resultado signin:', { 
        user: data?.user?.id, 
        session: !!data?.session, 
        error: error?.message 
      })

      if (error) {
        console.error('❌ Erro no signin:', error)
        return {
          success: false,
          message: getErrorMessage(error),
          error
        }
      }

      return {
        success: true,
        message: 'Login realizado com sucesso!',
        data
      }
    } catch (error: any) {
      console.error('💥 Erro crítico no signin:', error)
      return {
        success: false,
        message: 'Erro interno. Tente novamente.',
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
    try {
      if (!supabase) {
        throw new Error('Supabase não inicializado')
      }

      const { data, error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
        redirectTo: `${window.location.origin}/auth/reset-password`
      })

      if (error) {
        return {
          success: false,
          message: getErrorMessage(error),
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
        message: 'Erro interno. Tente novamente.',
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
        setProfile(data)
      }

      return { data, error }
    } catch (error) {
      return { data: null, error }
    }
  }

  const upgradeToVIP = async (paymentMethod: string = 'pix') => {
    if (!user) {
      return {
        success: false,
        message: 'Usuário não logado'
      }
    }

    try {
      setLoading(true)
      console.log('💳 Iniciando upgrade VIP para usuário:', user.id)
      
      // Redirecionar para checkout
      return {
        success: true,
        message: 'Redirecionando para pagamento...'
      }
    } catch (error: any) {
      console.error('❌ Erro no upgrade VIP:', error)
      return {
        success: false,
        message: 'Erro interno. Tente novamente.'
      }
    } finally {
      setLoading(false)
    }
  }

  const refreshVIPStatus = async () => {
    if (!user || !supabase) return

    try {
      await loadUserProfile(user.id, supabase)
    } catch (error) {
      console.error('❌ Erro ao atualizar status VIP:', error)
    }
  }

  // Função para converter erros do Supabase em mensagens amigáveis
  const getErrorMessage = (error: any): string => {
    if (!error) return 'Erro desconhecido'

    const message = error.message?.toLowerCase() || ''

    if (message.includes('invalid login credentials')) {
      return 'Email ou senha incorretos'
    }
    if (message.includes('email already registered')) {
      return 'Este email já está cadastrado'
    }
    if (message.includes('password should be at least')) {
      return 'Senha deve ter pelo menos 6 caracteres'
    }
    if (message.includes('invalid email')) {
      return 'Email inválido'
    }
    if (message.includes('signup disabled')) {
      return 'Cadastro temporariamente desabilitado'
    }
    if (message.includes('email not confirmed')) {
      return 'Confirme seu email antes de fazer login'
    }

    return error.message || 'Erro na autenticação'
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