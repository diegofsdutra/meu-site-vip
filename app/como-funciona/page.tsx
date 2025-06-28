"use client";

import React from "react";
import Link from "next/link";

export default function ComoFunciona() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-black text-white">
      <div className="px-6 py-12 max-w-4xl mx-auto">
        {/* Header */}
        <header className="bg-black/30 backdrop-blur-sm py-4 px-6 rounded-xl mb-8">
          <div className="text-center">
            <h1 className="text-4xl font-extrabold text-yellow-400 mb-2">
              🎁 Como Funciona a Promoção VIP Grátis
            </h1>
          </div>
        </header>

        {/* Conteúdo Principal */}
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 mb-8 border border-white/20">
          <p className="text-xl mb-8 text-center text-gray-200">
            Ao realizar sua <strong className="text-yellow-400">primeira compra</strong> no site da <span className="text-blue-400 font-semibold">Tela Prime Express</span>,
            você ganha <strong className="text-green-400">1 mês de acesso VIP</strong> sem pagar nada!
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
              <h3 className="text-xl font-bold mb-3 text-yellow-400">🛒 1. Faça sua primeira compra</h3>
              <p className="text-gray-300">Escolha qualquer produto no nosso site. A promoção é válida para qualquer valor.</p>
            </div>

            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
              <h3 className="text-xl font-bold mb-3 text-yellow-400">💬 2. Confirmação automática</h3>
              <p className="text-gray-300">Após o pedido, nosso sistema identifica que é sua primeira compra e ativa seu acesso VIP gratuito.</p>
            </div>

            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
              <h3 className="text-xl font-bold mb-3 text-yellow-400">🔓 3. Acesso liberado!</h3>
              <p className="text-gray-300">Você receberá um link exclusivo no seu  e-mail com acesso à Lista VIP mensal por 30 dias.</p>
            </div>
          </div>
        </div>

        {/* Dúvidas Frequentes */}
        <div className="bg-gradient-to-r from-green-400/20 to-emerald-500/20 rounded-2xl p-6 mb-8 border border-green-400/30">
          <h4 className="text-xl font-bold mb-4 text-green-400">❓ Dúvidas Frequentes</h4>
          <ul className="space-y-3">
            <li className="flex items-start gap-3">
              <div className="w-6 h-6 bg-green-400 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-black text-sm font-bold">✓</span>
              </div>
              <span className="text-gray-200"><strong className="text-white">É automático?</strong> Sim! Não precisa de cupom.</span>
            </li>
            <li className="flex items-start gap-3">
              <div className="w-6 h-6 bg-green-400 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-black text-sm font-bold">✓</span>
              </div>
              <span className="text-gray-200"><strong className="text-white">Quando recebo o acesso?</strong> Até 1 hora após a confirmação do pagamento.</span>
            </li>
            <li className="flex items-start gap-3">
              <div className="w-6 h-6 bg-green-400 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-black text-sm font-bold">✓</span>
              </div>
              <span className="text-gray-200"><strong className="text-white">Posso transferir o VIP?</strong> Não. O acesso é vinculado ao seu e-mail de compra.</span>
            </li>
          </ul>
        </div>

        {/* Botões */}
        <div className="flex flex-col sm:flex-row justify-center gap-4">
          <Link href="/" className="bg-blue-500 text-white px-6 py-3 rounded-lg font-bold text-center hover:bg-blue-600 transition">
            Voltar ao site
          </Link>
          <Link href="https://telaprimeexpress.com/" target="_blank" className="bg-yellow-400 text-black px-6 py-3 rounded-lg font-bold text-center hover:bg-yellow-300 transition">
            💎 Desbloqueie o VIP agora com sua primeira compra
          </Link>
        </div>
      </div>
    </div>
  );
}