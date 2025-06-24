'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../../../components/AuthProvider'

const CheckoutSuccessPage = () => {
  const { refreshVIPStatus, isVIP, profile } = useAuth()
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const atualizarStatus = async () => {
      console.log('🔄 Verificando status VIP após pagamento...')
      await refreshVIPStatus()
      setLoading(false)
    }

    atualizarStatus()
  }, [refreshVIPStatus])

  const handleGoHome = () => {
    router.push('/')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-green-50">
        <div className="bg-white p-8 rounded-lg shadow-lg text-center">
          <div className="loader mb-4" />
          <h2 className="text-2xl font-bold text-gray-700">Processando pagamento...</h2>
          <p className="text-gray-500">Aguarde, estamos ativando seu acesso VIP</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-green-50">
      <div className="bg-white p-8 rounded-lg shadow-lg text-center">
        <h2 className="text-3xl font-bold text-green-600">✅ Pagamento Aprovado!</h2>
        {isVIP ? (
          <p className="text-gray-700 mt-2">
            Seu plano VIP <strong>{profile?.vip_data?.plano}</strong> está ativo até{' '}
            <strong>{new Date(profile?.vip_data?.data_expiraca).toLocaleDateString()}</strong>.
          </p>
        ) : (
          <>
            <p className="text-gray-700 mt-2">
              Seu pagamento foi aprovado, mas o VIP ainda está processando.
            </p>
            <p className="text-gray-500">Tente recarregar a página ou entre em contato.</p>
          </>
        )}
        <button
          onClick={handleGoHome}
          className="mt-4 bg-green-500 text-white px-6 py-3 rounded hover:bg-green-600"
        >
          Ir para a Plataforma
        </button>
      </div>
    </div>
  )
}

export default CheckoutSuccessPage
