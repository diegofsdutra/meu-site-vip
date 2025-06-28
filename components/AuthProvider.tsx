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
            console.log('🔐 Auth state changed:', event, session?.user?.email)
            
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

        // ✅ NOVO: Escutar mudanças na tabela de pagamentos/VIP
        const vipSubscription = supabaseClient
          .channel('vip_updates')
          .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'vip_payments'
          }, async (payload: any) => {
            console.log('💳 Pagamento atualizado:', payload)
            
            // Se o pagamento for do usuário atual
            if (user && payload.new?.user_id === user.id) {
              console.log('🔄 Atualizando status VIP do usuário atual...')
              await refreshVIPStatus()
            }
          })
          .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'profiles'
          }, async (payload: any) => {
            console.log('👤 Perfil atualizado:', payload)
            
            // Se for o perfil do usuário atual
            if (user && payload.new?.id === user.id) {
              console.log('🔄 Recarregando perfil...')
              await loadUserProfile(user.id, supabaseClient)
            }
          })
          .subscribe()

        setLoading(false)
        
        return () => {
          subscription.unsubscribe()
          vipSubscription.unsubscribe()
        }
      } catch (error) {
        console.error('❌ Erro ao inicializar Supabase:', error)
        setLoading(false)
      }
    }

    // Executar IMEDIATAMENTE
    initSupabase()
  }, [])

  // ✅ CORRIGIDO: Atualizar status VIP quando profile mudar
  useEffect(() => {
    if (profile) {
      checkVIPStatus(profile)
    } else {
      setIsVIP(false)
    }
  }, [profile])

  // ✅ NOVA FUNÇÃO: Verificar status VIP de forma mais robusta
  const checkVIPStatus = async (profileData: any) => {
    try {
      // Método 1: Verificar usando vipUtils se existir
      try {
        const { isVIPActive } = await import('../app/lib/vipUtils')
        const vipStatus = isVIPActive(profileData)
        console.log('📊 Status VIP (vipUtils):', vipStatus)
        setIsVIP(vipStatus)
        return
      } catch (error) {
        console.log('⚠️ vipUtils não encontrado, usando método alternativo')
      }

      // Método 2: Verificar diretamente no perfil
      if (profileData.is_vip) {
        // Se tem data de expiração, verificar se ainda é válida
        if (profileData.vip_expires_at) {
          const isActive = new Date(profileData.vip_expires_at) > new Date()
          console.log('📅 VIP expires at:', profileData.vip_expires_at, 'Active:', isActive)
          setIsVIP(isActive)
        } else {
          // VIP sem expiração
          setIsVIP(true)
        }
      } else if (profileData.vip_data?.status === 'active') {
        // Verificar via vip_data
        setIsVIP(true)
      } else {
        // Método 3: Verificar na tabela de pagamentos
        await checkVIPFromPayments(profileData.id)
      }
    } catch (error) {
      console.error('❌ Erro ao verificar status VIP:', error)
      setIsVIP(false)
    }
  }

  // ✅ NOVA FUNÇÃO: Verificar VIP na tabela de pagamentos
  const checkVIPFromPayments = async (userId: string) => {
    if (!supabase || !userId) return

    try {
      const { data, error } = await supabase
        .from('vip_payments')
        .select('*')
        .eq('user_id', userId)
        .eq('payment_status', 'approved')
        .order('created_at', { ascending: false })
        .limit(1)

      if (!error && data && data.length > 0) {
        const payment = data[0]
        // Verificar se o pagamento ainda é válido (ex: último mês)
        const paymentDate = new Date(payment.created_at)
        const oneMonthAgo = new Date()
        oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1)

        const isActive = paymentDate > oneMonthAgo
        console.log('💳 Último pagamento:', paymentDate, 'Ativo:', isActive)
        setIsVIP(isActive)
      } else {
        setIsVIP(false)
      }
    } catch (error) {
      console.error('❌ Erro ao verificar pagamentos:', error)
      setIsVIP(false)
    }
  }

  const loadUserProfile = async (userId: string, supabaseClient: any) => {
    try {
      console.log('📥 Carregando perfil do usuário:', userId)
      
      // Carregar dados básicos do perfil
      const { data, error } = await supabaseClient
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (!error && data) {
        console.log('✅ Perfil carregado:', data)
        
        // Tentar carregar dados VIP separadamente
        try {
          const { loadUserVIPData } = await import('../app/lib/vipUtils')
          const vipData = await loadUserVIPData(data.email)
          
          // Adicionar dados VIP ao perfil
          const profileWithVIP = {
            ...data,
            vip_data: vipData
          }
          
          setProfile(profileWithVIP)
          console.log('🎯 Profile com VIP:', {
            email: data.email,
            hasVIP: !!vipData,
            vipExpires: vipData?.data_expiracao
          })
        } catch (vipError) {
          console.log('⚠️ Erro ao carregar VIP data, usando perfil básico:', vipError)
          setProfile(data)
        }
      } else if (error) {
        console.error('❌ Erro ao carregar perfil:', error)
      }
    } catch (err) {
      console.error('❌ Erro geral ao carregar perfil:', err)
    }
  }

  // ✅ CORRIGIDO: Função de refresh mais robusta
  const refreshVIPStatus = async () => {
    if (!user || !supabase) {
      console.log('⚠️ Não é possível atualizar: usuário ou supabase não disponível')
      return
    }

    console.log('🔄 Iniciando atualização de status VIP...')
    
    try {
      // Recarregar perfil completo
      await loadUserProfile(user.id, supabase)
      
      // Forçar nova verificação de VIP após um delay
      setTimeout(async () => {
        if (profile) {
          await checkVIPStatus(profile)
        }
      }, 1000)
      
      console.log('✅ Status VIP atualizado!')
    } catch (error) {
      console.error('❌ Erro ao atualizar status VIP:', error)
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

      // ✅ ADICIONADO: Forçar atualização do status VIP após login
      setTimeout(async () => {
        console.log('🔄 Verificando status VIP após login...')
        await refreshVIPStatus()
      }, 2000) // Aguardar 2 segundos para garantir que o perfil foi carregado

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

  // ✅ CORRIGIDO: FUNÇÃO VIP INTEGRADA
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
      
      const { processVIPUpgrade } = await import('../app/lib/vipUtils')
      const result = await processVIPUpgrade(user.id, paymentMethod)
      
      if (result.success) {
        console.log('✅ VIP upgrade bem-sucedido!')
        // Atualizar status imediatamente
        setTimeout(async () => {
          await refreshVIPStatus()
        }, 1000)
      }
      
      return result
    } catch (error: any) {
      console.error('❌ Erro no upgrade VIP:', error)
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