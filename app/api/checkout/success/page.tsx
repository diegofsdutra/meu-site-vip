'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '../../../../../components/AuthProvider'
import { useRouter } from 'next/navigation'

export default function SuccessPage() {
  const [loading, setLoading] = useState(true)
  const { refreshVIPStatus, user, isVIP } = useAuth()
  const router = useRouter()

  useEffect(() => {
    const handleSuccess = async () => {
      console.log('📄 Página de sucesso carregada')

      await new Promise(resolve => setTimeout(resolve, 3000))

      if (user) {
        await refreshVIPStatus()
      }

      setLoading(false)
    }

    handleSuccess()
  }, [user, refreshVIPStatus])

  const handleGoHome = () => {
    router.push('/')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center">
        <div className="bg-white rounded-2xl p-8 max-w-md text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-green-500 mx-auto mb-4"></div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Processando pagamento...</h1>
          <p className="text-gray-600">Aguarde enquanto ativamos seu VIP</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl p-8 max-w-md w-full text-center shadow-2xl">
        <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        </div>

        <h1 className="text-3xl font-bold text-gray-800 mb-4">
          🎉 Pagamento Aprovado!
        </h1>

        <p className="text-gray-600 mb-6">
          Seu pagamento foi processado com sucesso e seu plano VIP foi ativado!
        </p>

        {isVIP ? (
          <div className="bg-yellow-100 border border-yellow-400 rounded-lg p-4 mb-6">
            <p className="text-yellow-800 font-semibold">
              ✅ Status VIP Ativado!
            </p>
            <p className="text-yellow-700 text-sm">
              Agora você tem acesso completo a todas as funcionalidades VIP
            </p>
          </div>
        ) : (
          <div className="bg-blue-100 border border-blue-400 rounded-lg p-4 mb-6">
            <p className="text-blue-800 font-semibold">
              ⏳ VIP sendo processado
            </p>
            <p className="text-blue-700 text-sm">
              Seu VIP será ativado em alguns minutos. Faça login novamente se necessário.
            </p>
          </div>
        )}

        <div className="space-y-3">
          <button
            onClick={handleGoHome}
            className="w-full bg-green-500 text-white py-3 px-6 rounded-lg font-semibold hover:bg-green-600 transition"
          >
            Acessar Plataforma
          </button>

          <button
            onClick={() => window.location.reload()}
            className="w-full bg-gray-200 text-gray-700 py-3 px-6 rounded-lg font-semibold hover:bg-gray-300 transition"
          >
            Atualizar Status
          </button>
        </div>

        <p className="text-xs text-gray-500 mt-6">
          Em caso de dúvidas, entre em contato conosco
        </p>
      </div>
    </div>
  )
}
