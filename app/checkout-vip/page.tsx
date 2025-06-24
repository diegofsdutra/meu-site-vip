"use client";

import React, { useState } from "react";
import Head from "next/head";
import Image from "next/image";
import { useAuth } from "../../components/AuthProvider";

export default function CheckoutVIPPage() {
  const [selectedPlan, setSelectedPlan] = useState('quarterly');
  const [showModal, setShowModal] = useState(false);
  const [modalStep, setModalStep] = useState('auth'); // 'auth' ou 'payment'
  const [authMode, setAuthMode] = useState('login');
  const [paymentMethod, setPaymentMethod] = useState('pix');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  
  // Formulários
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [registerForm, setRegisterForm] = useState({ 
    name: '', 
    email: '', 
    password: '', 
    confirmPassword: '' 
  });

  const { user, signIn, signUp, upgradeToVIP } = useAuth();
  const isLoggedIn = !!user;

  const plans = {
    monthly: { name: '1 Mês', price: 7.90, savings: null },
    quarterly: { name: '3 Meses', price: 19.90, savings: 'Economize R$ 3,20' },
    yearly: { name: '1 Ano', price: 59.90, savings: 'Economize R$ 32,50' }
  };

  const handlePlanClick = (planType) => {
    setSelectedPlan(planType);
    if (isLoggedIn) {
      setModalStep('payment');
    } else {
      setModalStep('auth');
    }
    setShowModal(true);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });
    
    const result = await signIn(loginForm.email, loginForm.password);
    
    if (result.success) {
      setMessage({ type: 'success', text: 'Login realizado com sucesso!' });
      setTimeout(() => {
        setModalStep('payment');
        setMessage({ type: '', text: '' });
      }, 1000);
    } else {
      setMessage({ type: 'error', text: result.message });
    }
    setLoading(false);
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });
    
    if (registerForm.password !== registerForm.confirmPassword) {
      setMessage({ type: 'error', text: 'Senhas não coincidem' });
      setLoading(false);
      return;
    }
    
    if (registerForm.password.length < 6) {
      setMessage({ type: 'error', text: 'Senha deve ter pelo menos 6 caracteres' });
      setLoading(false);
      return;
    }
    
    const result = await signUp(registerForm.email, registerForm.password, registerForm.name);
    
    if (result.success) {
      setMessage({ type: 'success', text: 'Conta criada com sucesso!' });
      setTimeout(() => {
        setModalStep('payment');
        setMessage({ type: '', text: '' });
      }, 1000);
    } else {
      setMessage({ type: 'error', text: result.message });
    }
    setLoading(false);
  };

  const handlePayment = async () => {
    setLoading(true);
    setMessage({ type: '', text: '' });
    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planType: selectedPlan,
          email: user?.email,
        }),
      });
      const data = await response.json();
      if (data.init_point) {
        window.location.href = data.init_point; // Redireciona para o Mercado Pago
      } else {
        setMessage({ type: 'error', text: 'Erro ao iniciar pagamento' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Erro ao se conectar com o servidor' });
    }
    setLoading(false);
  };

  const closeModal = () => {
    setShowModal(false);
    setMessage({ type: '', text: '' });
    setModalStep('auth');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-black text-white" style={{ zoom: '0.8' }}>
      <Head>
        <title>Checkout VIP - Lista Compatível</title>
        <meta name="description" content="Assine o plano VIP e tenha acesso completo à nossa base de dados" />
      </Head>

      {/* Header */}
      <header className="bg-black/30 backdrop-blur-sm py-4 px-6">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <a href="/" className="bg-blue-500 text-white px-6 py-3 rounded-lg font-bold hover:bg-blue-600 transition flex items-center gap-2">
              <span>←</span>
              Voltar
            </a>
            <div className="text-2xl font-bold">
              Lista <span className="text-yellow-400">VIP</span>
            </div>
          </div>
          
          {isLoggedIn && (
            <div className="text-sm">
              Bem-vindo, <span className="text-yellow-400">{user?.email}</span>
            </div>
          )}
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        {/* Título */}
        <div className="text-center mb-12">
          <div className="flex flex-col items-center justify-center">
            <Image
              src="/tela prime s fundoo.png"
              alt="Logo VIP"
              width={350}
              height={350}
              className="object-contain"
            />
            <h1 className="text-6xl font-bold -mt-20 text-white drop-shadow-2xl">Escolha seu plano VIP</h1>
            <p className="text-2xl text-gray-200 mt-6 font-semibold drop-shadow-lg">Desbloqueie todas as tabelas e conteúdos exclusivos da Lista VIP</p>
          </div>
        </div>
        
        {/* Planos em Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Plano 1 Mês */}
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border-2 border-white/30 hover:border-yellow-400/50 transition-all hover:scale-105 flex flex-col h-[400px]">
            <div className="flex-1">
              <div className="text-center">
                <h3 className="text-3xl font-bold mb-3">Plano Mensal</h3>
                <p className="text-gray-300 text-lg mb-4">Ideal para começar e testar nossa plataforma por 30 dias</p>
                <div className="text-6xl font-bold text-yellow-400 mb-3">R$ 7,70</div>
                <div className="text-lg text-gray-400 mb-4">por mês</div>
              </div>
            </div>
            <div className="w-full mt-auto">
              <button 
                onClick={() => handlePlanClick('monthly')}
                className="w-full bg-blue-500 text-white py-2 font-bold text-base hover:bg-blue-600 transition rounded-lg mb-2"
              >
                CLIQUE AQUI PARA COMPRAR!
              </button>
              <button 
                className="w-full h-10 bg-cover bg-center bg-no-repeat rounded-lg hover:opacity-80 transition"
                style={{backgroundImage: 'url(/compra-garantida.png)'}}
              >
              </button>
            </div>
          </div>

          {/* Plano 3 Meses - RECOMENDADO */}
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border-2 border-white/30 hover:border-yellow-400/50 transition-all hover:scale-105 relative flex flex-col h-[400px]">
            <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
              <div className="bg-blue-500 text-white px-6 py-2 rounded-full text-sm font-bold">
                RECOMENDADO
              </div>
            </div>
            <div className="flex-1">
              <div className="text-center">
                <h3 className="text-3xl font-bold mb-3">Plano Trimestral</h3>
                <p className="text-gray-300 text-lg mb-4">Mais economia para quem já conhece e quer continuar com acesso VIP</p>
                <div className="text-6xl font-bold text-yellow-400 mb-3">R$ 19,90</div>
                <div className="text-lg text-gray-400 mb-4">R$ 6,63/mês</div>
              </div>
            </div>
            <div className="w-full mt-auto">
              <button 
                onClick={() => handlePlanClick('quarterly')}
                className="w-full bg-blue-500 text-white py-2 font-bold text-base hover:bg-blue-600 transition rounded-lg mb-2"
              >
                CLIQUE AQUI PARA COMPRAR!
              </button>
              <button 
                className="w-full h-10 bg-cover bg-center bg-no-repeat rounded-lg hover:opacity-80 transition"
                style={{backgroundImage: 'url(/compra-garantida.png)'}}
              >
              </button>
            </div>
          </div>

          {/* Plano 1 Ano */}
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border-2 border-white/30 hover:border-yellow-400/50 transition-all hover:scale-105 relative flex flex-col h-[400px]">
            <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
              <div className="bg-green-500 text-white px-6 py-2 rounded-full text-sm font-bold">
                MELHOR OFERTA
              </div>
            </div>
            <div className="flex-1">
              <div className="text-center">
                <h3 className="text-3xl font-bold mb-3">Plano Anual</h3>
                <p className="text-gray-300 text-lg mb-4">Para quem vive da manutenção e quer acesso completo o ano todo</p>
                <div className="text-6xl font-bold text-yellow-400 mb-3">R$ 59,90</div>
                <div className="text-lg text-gray-400 mb-4">R$ 4,99/mês</div>
              </div>
            </div>
            <div className="w-full mt-auto">
              <button 
                onClick={() => handlePlanClick('yearly')}
                className="w-full bg-blue-500 text-white py-2 font-bold text-base hover:bg-blue-600 transition rounded-lg mb-2"
              >
                CLIQUE AQUI PARA COMPRAR!
              </button>
              <button 
                className="w-full h-10 bg-cover bg-center bg-no-repeat rounded-lg hover:opacity-80 transition"
                style={{backgroundImage: 'url(/compra-garantida.png)'}}
              >
              </button>
            </div>
          </div>
        </div>

        {/* Benefícios */}
        <div className="bg-gradient-to-r from-green-400/20 to-emerald-500/20 rounded-2xl p-8 mb-8 border border-green-400/30">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-green-400 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-black text-lg font-bold">✓</span>
              </div>
              <span className="font-semibold">Acesso ILIMITADO a todos os dados</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-green-400 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-black text-lg font-bold">✓</span>
              </div>
              <span className="font-semibold">Base atualizada DIARIAMENTE</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-green-400 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-black text-lg font-bold">✓</span>
              </div>
              <span className="font-semibold">ECONOMIA garantida - menos estoque, mais vendas</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-green-400 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-black text-lg font-bold">✓</span>
              </div>
              <span className="font-semibold">1 película = pode dar em +5 modelos compatíveis</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-green-400 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-black text-lg font-bold">✓</span>
              </div>
              <span className="font-semibold">Economia de TEMPO e dinheiro</span>
            </div>
          </div>
        </div>

        <div className="bg-green-500/20 rounded-xl pb-1 pt-2 px-4 text-center mb-8">
          <div className="text-3xl font-bold text-green-400 mb-1">Acesso imediato após o pagamento</div>
          <div className="text-xl text-gray-300 -mb-3">Uma comunidade crescente de clientes satisfeitos</div>
          
          {/* Banner Mercado Pago */}
          <div className="rounded-lg overflow-hidden mx-auto max-w-3xl">
            <Image
              src="/seguranca.png"
              alt="Segurança e Formas de Pagamento"
              width={1370}
              height={422}
              className="w-full object-contain bg-transparent mx-auto"
            />
          </div>
        </div>
      </main>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 max-w-md w-full relative border border-white/20">
            {/* Botão Fechar */}
            <button 
              onClick={closeModal}
              className="absolute top-4 right-4 w-8 h-8 bg-white/20 rounded-full flex items-center justify-center hover:bg-white/30 transition"
            >
              ✕
            </button>

            {/* Conteúdo do Modal - Autenticação */}
            {modalStep === 'auth' && (
              <div>
                <h2 className="text-2xl font-bold text-center mb-6">
                  {authMode === 'login' ? 'Fazer Login' : 'Criar sua conta'}
                </h2>

                <div className="flex gap-2 mb-6">
                  <button
                    onClick={() => setAuthMode('login')}
                    className={`flex-1 py-2 px-4 rounded-lg font-semibold transition ${
                      authMode === 'login' 
                        ? 'bg-yellow-400 text-black' 
                        : 'bg-white/20 text-white hover:bg-white/30'
                    }`}
                  >
                    Login
                  </button>
                  <button
                    onClick={() => setAuthMode('register')}
                    className={`flex-1 py-2 px-4 rounded-lg font-semibold transition ${
                      authMode === 'register' 
                        ? 'bg-yellow-400 text-black' 
                        : 'bg-white/20 text-white hover:bg-white/30'
                    }`}
                  >
                    Criar conta
                  </button>
                </div>

                {message.text && (
                  <div className={`p-3 rounded-lg mb-4 text-sm ${
                    message.type === 'error' ? 'bg-red-500/20 text-red-200' : 'bg-green-500/20 text-green-200'
                  }`}>
                    {message.text}
                  </div>
                )}

                {authMode === 'login' ? (
                  <form onSubmit={handleLogin} className="space-y-4">
                    <div>
                      <input
                        type="email"
                        value={loginForm.email}
                        onChange={(e) => setLoginForm(prev => ({...prev, email: e.target.value}))}
                        className="w-full px-4 py-3 bg-white/20 border border-white/30 rounded-lg focus:outline-none focus:border-yellow-400 text-white placeholder-gray-400"
                        placeholder="seu@email.com"
                        required
                        disabled={loading}
                      />
                    </div>
                    
                    <div>
                      <input
                        type="password"
                        value={loginForm.password}
                        onChange={(e) => setLoginForm(prev => ({...prev, password: e.target.value}))}
                        className="w-full px-4 py-3 bg-white/20 border border-white/30 rounded-lg focus:outline-none focus:border-yellow-400 text-white placeholder-gray-400"
                        placeholder="••••••••"
                        required
                        disabled={loading}
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full bg-yellow-400 text-black py-3 rounded-lg font-bold hover:bg-yellow-300 transition disabled:opacity-50"
                    >
                      {loading ? 'Entrando...' : 'Continuar'}
                    </button>
                  </form>
                ) : (
                  <form onSubmit={handleRegister} className="space-y-4">
                    <div>
                      <input
                        type="text"
                        value={registerForm.name}
                        onChange={(e) => setRegisterForm(prev => ({...prev, name: e.target.value}))}
                        className="w-full px-4 py-3 bg-white/20 border border-white/30 rounded-lg focus:outline-none focus:border-yellow-400 text-white placeholder-gray-400"
                        placeholder="Nome"
                        required
                        disabled={loading}
                      />
                    </div>

                    <div>
                      <input
                        type="email"
                        value={registerForm.email}
                        onChange={(e) => setRegisterForm(prev => ({...prev, email: e.target.value}))}
                        className="w-full px-4 py-3 bg-white/20 border border-white/30 rounded-lg focus:outline-none focus:border-yellow-400 text-white placeholder-gray-400"
                        placeholder="diegoffsdutra@gmail.com"
                        required
                        disabled={loading}
                      />
                    </div>
                    
                    <div>
                      <input
                        type="password"
                        value={registerForm.password}
                        onChange={(e) => setRegisterForm(prev => ({...prev, password: e.target.value}))}
                        className="w-full px-4 py-3 bg-white/20 border border-white/30 rounded-lg focus:outline-none focus:border-yellow-400 text-white placeholder-gray-400"
                        placeholder="••••••••••"
                        required
                        disabled={loading}
                      />
                    </div>

                    <div>
                      <input
                        type="password"
                        value={registerForm.confirmPassword}
                        onChange={(e) => setRegisterForm(prev => ({...prev, confirmPassword: e.target.value}))}
                        className="w-full px-4 py-3 bg-white/20 border border-white/30 rounded-lg focus:outline-none focus:border-yellow-400 text-white placeholder-gray-400"
                        placeholder="Confirme sua senha"
                        required
                        disabled={loading}
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full bg-black text-white py-3 rounded-lg font-bold hover:bg-gray-800 transition disabled:opacity-50"
                    >
                      {loading ? 'Criando conta...' : 'Cadastrar'}
                    </button>
                  </form>
                )}
              </div>
            )}

            {/* Conteúdo do Modal - Pagamento */}
            {modalStep === 'payment' && (
              <div>
                {/* Header */}
                <div className="text-center mb-6">
                  <div className="flex items-center justify-center gap-3 mb-3">
                    <span className="text-white font-bold text-lg">Finalizar Pagamento</span>
                  </div>
                </div>
                
                <div className="bg-white/10 rounded-lg p-4 mb-6">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-semibold">Plano VIP {plans[selectedPlan].name}</span>
                    <span className="text-yellow-400 font-bold text-xl">R$ {plans[selectedPlan].price.toFixed(2).replace('.', ',')}</span>
                  </div>
                  <div className="text-sm text-gray-300">
                    {selectedPlan === 'quarterly' && 'R$ 6,63/mês'}
                    {selectedPlan === 'yearly' && 'R$ 4,99/mês'}
                    {selectedPlan === 'monthly' && 'Renovação mensal'}
                  </div>
                </div>

                <div className="space-y-4 mb-6">
                  <div 
                    className={`p-4 border-2 rounded-lg cursor-pointer transition ${
                      paymentMethod === 'pix' ? 'border-yellow-400 bg-yellow-400/10' : 'border-white/30 hover:border-white/50'
                    }`}
                    onClick={() => setPaymentMethod('pix')}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex-1">
                        <div className="font-semibold">PIX</div>
                        <div className="text-sm text-gray-300">Aprovação imediata</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 border-2 border-yellow-400 rounded-full flex items-center justify-center">
                          {paymentMethod === 'pix' && <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div 
                    className={`p-4 border-2 rounded-lg cursor-pointer transition ${
                      paymentMethod === 'card' ? 'border-yellow-400 bg-yellow-400/10' : 'border-white/30 hover:border-white/50'
                    }`}
                    onClick={() => setPaymentMethod('card')}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex-1">
                        <div className="font-semibold">Cartão de Crédito</div>
                        <div className="text-sm text-gray-300">Visa, Mastercard, Elo</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 border-2 border-yellow-400 rounded-full flex items-center justify-center">
                          {paymentMethod === 'card' && <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {message.text && (
                  <div className={`p-3 rounded-lg mb-4 text-sm ${
                    message.type === 'error' ? 'bg-red-500/20 text-red-200' : 'bg-green-500/20 text-green-200'
                  }`}>
                    {message.text}
                  </div>
                )}

                <button
                  onClick={handlePayment}
                  disabled={loading}
                  className="w-full bg-yellow-400 text-black py-4 rounded-lg font-bold text-lg hover:bg-yellow-300 transition disabled:opacity-50 relative mb-2"
                >
                  <div className="flex items-center justify-center gap-2">
                    <span>{loading ? 'Processando...' : `Pagar R$ ${plans[selectedPlan].price.toFixed(2).replace('.', ',')} via ${paymentMethod === 'pix' ? 'PIX' : 'Cartão'}`}</span>
                  </div>
                </button>

                {/* Banner Mercado Pago */}
                <div className="rounded-lg overflow-hidden mx-auto">
                  <Image
                    src="/seguranca.png"
                    alt="Segurança e Formas de Pagamento"
                    width={1370}
                    height={422}
                    className="w-full object-contain bg-transparent mx-auto"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}