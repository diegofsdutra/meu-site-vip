"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "../../components/AuthProvider";
import { checkVIPStatus, getUserPayments } from "../lib/vipUtils";

export default function PlanoVIPPage() {
  const { user, isVIP, loading, upgradeToVIP } = useAuth();
  const [processingPayment, setProcessingPayment] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [vipStatus, setVipStatus] = useState(null);
  const [userPayments, setUserPayments] = useState([]);
  const router = useRouter();

  // Verificar status VIP detalhado
  useEffect(() => {
    if (user) {
      loadVipStatus();
      loadUserPayments();
    }
  }, [user]);

  const loadVipStatus = async () => {
    if (!user) return;
    
    const result = await checkVIPStatus(user.id);
    if (result.success) {
      setVipStatus(result);
    }
  };

  const loadUserPayments = async () => {
    if (!user) return;
    
    const result = await getUserPayments(user.id);
    if (result.success) {
      setUserPayments(result.payments);
    }
  };

  const handleVIPUpgrade = async (planType = 'mensal') => {
    if (!user) {
      router.push('/?login=true');
      return;
    }

    if (isVIP) {
      setMessage({ 
        type: 'info', 
        text: 'Você já tem um plano VIP ativo!' 
      });
      return;
    }

    setProcessingPayment(true);
    setMessage({ type: '', text: '' });

    try {
      const result = await upgradeToVIP('pix');
      
      if (result.success) {
        setMessage({ 
          type: 'success', 
          text: result.message 
        });
        
        // Recarregar status
        await loadVipStatus();
        await loadUserPayments();
        
        // Redirecionar após 3 segundos
        setTimeout(() => {
          router.push('/');
        }, 3000);
      } else {
        setMessage({ 
          type: 'error', 
          text: result.message || 'Erro ao processar pagamento' 
        });
      }
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: 'Erro interno. Tente novamente.' 
      });
    } finally {
      setProcessingPayment(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const formatPrice = (amountInCents) => {
    return (amountInCents / 100).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500 mx-auto mb-4"></div>
          <p>Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white px-6 py-10 max-w-4xl mx-auto text-gray-900">
      {/* Header com status do usuário */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-extrabold text-yellow-500 mb-4">
          💎 Plano VIP - Lista Exclusiva
        </h1>
        
        {user ? (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <p className="text-lg font-medium">
              Olá, <span className="font-bold text-blue-800">{user.email?.split('@')[0]}</span>!
            </p>
            {isVIP ? (
              <div className="bg-green-100 border border-green-300 rounded-lg p-3 mt-3">
                <p className="text-green-800 font-bold flex items-center justify-center gap-2">
                  ✅ Seu plano VIP está ATIVO
                  <span className="bg-green-500 text-white px-2 py-1 rounded-full text-xs">
                    VIP
                  </span>
                </p>
                {vipStatus?.expiresAt && (
                  <p className="text-green-600 text-sm mt-1">
                    Válido até: {formatDate(vipStatus.expiresAt)}
                  </p>
                )}
              </div>
            ) : (
              <p className="text-gray-600 mt-2">
                Você ainda não tem um plano VIP ativo
              </p>
            )}
          </div>
        ) : (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <p className="text-gray-700 mb-3">
              Para assinar o VIP, você precisa fazer login
            </p>
            <button
              onClick={() => router.push('/')}
              className="bg-blue-600 text-white px-6 py-2 rounded-full font-semibold hover:bg-blue-700 transition"
            >
              Fazer Login / Cadastrar
            </button>
          </div>
        )}
      </div>

      {/* Mensagem de status */}
      {message.text && (
        <div className={`p-4 rounded-lg mb-6 text-center ${
          message.type === 'error' ? 'bg-red-100 text-red-700 border border-red-300' : 
          message.type === 'success' ? 'bg-green-100 text-green-700 border border-green-300' :
          'bg-blue-100 text-blue-700 border border-blue-300'
        }`}>
          {message.text}
        </div>
      )}

      {/* Descrição do VIP */}
      <p className="text-center text-lg mb-6">
        Tenha acesso exclusivo à lista dos <strong>modelos mais vendidos</strong> e receba atualizações frequentes para nunca mais perder vendas por falta de informação.
      </p>

      <div className="flex justify-center mb-8">
        <Image src="/vippp.png" alt="Exemplo da Lista VIP" width={300} height={400} className="rounded-xl shadow-md" />
      </div>

      {/* Benefícios */}
      <ul className="list-disc list-inside space-y-3 text-base mb-8 bg-gray-50 p-6 rounded-lg">
        <li>✅ Acesso completo a TODOS os modelos compatíveis</li>
        <li>📦 Lista atualizada diariamente com novos lançamentos</li>
        <li>🔍 Detecte os modelos que mais estão vendendo no Brasil</li>
        <li>🧠 Tome decisões de estoque com base em dados reais</li>
        <li>💡 Suporte prioritário via WhatsApp</li>
        <li>🚀 Sem anúncios na plataforma</li>
      </ul>

      {/* Planos */}
      <div className="text-center mb-10">
        <p className="text-xl font-bold text-green-600 mb-6">Escolha seu plano:</p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Plano Mensal */}
          <div className="bg-yellow-100 border border-yellow-300 rounded-xl p-6 hover:shadow-lg transition">
            <h3 className="text-lg font-semibold mb-2">🔁 Plano Mensal</h3>
            <p className="text-2xl font-bold text-yellow-700 mb-4">R$ 7,70/mês</p>
            <p className="text-sm text-gray-600 mb-4">Renovação automática</p>
            
            {user && !isVIP ? (
              <button
                onClick={() => handleVIPUpgrade('mensal')}
                disabled={processingPayment || loading}
                className="w-full bg-yellow-400 text-black px-5 py-3 rounded-full font-semibold hover:bg-yellow-500 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {processingPayment || loading ? 'Processando...' : 'Assinar Agora'}
              </button>
            ) : isVIP ? (
              <div className="bg-green-500 text-white px-5 py-3 rounded-full font-semibold text-center">
                ✅ Plano Ativo
              </div>
            ) : (
              <button
                onClick={() => router.push('/')}
                className="w-full bg-gray-400 text-white px-5 py-3 rounded-full font-semibold hover:bg-gray-500 transition"
              >
                Fazer Login
              </button>
            )}
          </div>

          {/* Plano Trimestral */}
          <div className="bg-yellow-50 border border-yellow-300 rounded-xl p-6 hover:shadow-lg transition">
            <h3 className="text-lg font-semibold mb-2">💎 Plano Trimestral</h3>
            <p className="text-2xl font-bold text-yellow-700 mb-2">R$ 19,90</p>
            <p className="text-sm text-gray-500 line-through mb-1">R$ 23,10</p>
            <p className="text-xs text-green-600 font-semibold mb-4">Economize R$ 3,20</p>
            
            <div className="bg-gray-100 text-gray-500 px-5 py-3 rounded-full font-semibold text-center">
              Em breve
            </div>
          </div>

          {/* Plano Anual */}
          <div className="bg-yellow-200 border-4 border-yellow-500 rounded-xl p-6 relative shadow-lg hover:shadow-xl transition">
            <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 bg-yellow-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow">
              ⭐ Maior economia
            </div>
            <h3 className="text-lg font-semibold mb-2">📅 Plano Anual</h3>
            <p className="text-2xl font-bold text-yellow-700 mb-2">R$ 59,90/ano</p>
            <p className="text-sm text-gray-500 line-through mb-1">R$ 92,40</p>
            <p className="text-xs text-green-600 font-semibold mb-4">Economize R$ 32,50</p>
            
            <div className="bg-gray-100 text-gray-500 px-5 py-3 rounded-full font-semibold text-center">
              Em breve
            </div>
          </div>
        </div>
      </div>

      {/* Histórico de pagamentos para usuários VIP */}
      {user && userPayments.length > 0 && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 mb-8">
          <h3 className="text-lg font-bold mb-4">📋 Histórico de Pagamentos</h3>
          <div className="space-y-3">
            {userPayments.slice(0, 5).map((payment) => (
              <div key={payment.id} className="flex justify-between items-center bg-white p-3 rounded border">
                <div>
                  <p className="font-medium">{formatPrice(payment.amount)}</p>
                  <p className="text-sm text-gray-600">{formatDate(payment.created_at)}</p>
                </div>
                <div className="text-right">
                  <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                    payment.payment_status === 'completed' ? 'bg-green-100 text-green-700' :
                    payment.payment_status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {payment.payment_status === 'completed' ? 'Pago' :
                     payment.payment_status === 'pending' ? 'Pendente' : 'Falhou'}
                  </span>
                  <p className="text-xs text-gray-500 mt-1">{payment.payment_method?.toUpperCase()}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Informações adicionais */}
      <div className="text-center text-sm text-gray-500 bg-blue-50 p-6 rounded-lg">
        <p className="mb-3">
          🔓 <strong>Sistema integrado com Supabase:</strong> Seus dados estão seguros e o sistema é confiável!
        </p>
        <div className="flex justify-center gap-4 flex-wrap">
          <Link
            href="/"
            className="text-blue-600 hover:text-blue-800 underline"
          >
            Voltar ao início
          </Link>
          <a
            href="https://telaprimeexpress.com"
            target="_blank"
            className="text-blue-600 hover:text-blue-800 underline"
          >
            Loja de telas
          </a>
        </div>
      </div>
    </div>
  );
}