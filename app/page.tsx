"use client";

import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import Head from "next/head";
import { ArrowDown, Package } from "lucide-react";
import Image from "next/image";
import { useAuth } from "../components/AuthProvider";
import { fetchPeliculas, PeliculaData } from "../app/lib/peliculasService";
import dadosTelas from "../data/dadosTelas.json";
import dadosCapas from "../data/dados_capas_compatíveis_2025.json";
import dadosBaterias from "../data/dados_baterias_compatíveis.json";
import dadosConectoresV8 from "../data/dadosconectoresv8.json";
import dadosConectoresTypeC from "../data/dados_conectores_typec.json";

const categorias = [
  "Películas 3D Compatíveis",
  "Conectores Type-C",
  "Conectores V8",
  "Telas Compatíveis"
];

// Interface para as props dos modais
interface ModalProps {
  show: boolean;
  onClose: () => void;
  message: { type: string; text: string };
  setMessage: (message: { type: string; text: string }) => void;
}

// Modal de Login INTEGRADO COM SUPABASE
const LoginModal = React.memo(({ show, onClose, message, setMessage }: ModalProps) => {
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const { signIn, loading } = useAuth();

  if (!show) return null;

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setMessage({ type: '', text: '' });
    
    const result = await signIn(loginForm.email, loginForm.password);
    
    if (result.success) {
      onClose();
      setLoginForm({ email: '', password: '' });
      setMessage({ type: 'success', text: result.message });
    } else {
      setMessage({ type: 'error', text: result.message });
    }
  };
  
  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full mx-4">
        <h2 className="text-2xl font-bold text-gray-800 mb-4 text-center">Entrar</h2>
        
        {message.text && (
          <div className={`p-3 rounded mb-4 ${message.type === 'error' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
            {message.text}
          </div>
        )}
        
        <form onSubmit={handleLogin}>
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2">Email:</label>
            <input
              type="email"
              value={loginForm.email}
              onChange={(e) => setLoginForm(prev => ({...prev, email: e.target.value}))}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:border-blue-500"
              placeholder="seu@email.com"
              required
              disabled={loading}
              autoComplete="email"
            />
          </div>
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2">Senha:</label>
            <input
              type="password"
              value={loginForm.password}
              onChange={(e) => setLoginForm(prev => ({...prev, password: e.target.value}))}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:border-blue-500"
              placeholder="••••••••"
              required
              disabled={loading}
              autoComplete="current-password"
            />
          </div>
          
          <div className="flex gap-3 mb-4">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-blue-800 text-white py-2 rounded-lg hover:bg-blue-900 transition disabled:opacity-50"
            >
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
            <button
              type="button"
              onClick={() => {
                onClose();
                setMessage({ type: '', text: '' });
              }}
              className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-400 transition"
              disabled={loading}
            >
              Cancelar
            </button>
          </div>
        </form>
        
        <div className="text-center text-sm text-gray-600">
          <p>Sistema integrado com Supabase</p>
          <p>Autenticação real e segura</p>
        </div>
      </div>
    </div>
  );
});

// Modal de Cadastro INTEGRADO COM SUPABASE
const RegisterModal = React.memo(({ show, onClose, message, setMessage }: ModalProps) => {
  const [registerForm, setRegisterForm] = useState({ 
    name: '', 
    email: '', 
    password: '', 
    confirmPassword: '' 
  });
  const { signUp, loading } = useAuth();

  if (!show) return null;

  const handleRegister = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setMessage({ type: '', text: '' });
    
    if (registerForm.password !== registerForm.confirmPassword) {
      setMessage({ type: 'error', text: 'Senhas não coincidem' });
      return;
    }
    
    if (registerForm.password.length < 6) {
      setMessage({ type: 'error', text: 'Senha deve ter pelo menos 6 caracteres' });
      return;
    }
    
    const result = await signUp(registerForm.email, registerForm.password, registerForm.name);
    
    if (result.success) {
      onClose();
      setRegisterForm({ name: '', email: '', password: '', confirmPassword: '' });
      setMessage({ type: 'success', text: result.message });
    } else {
      setMessage({ type: 'error', text: result.message });
    }
  };
  
  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full mx-4">
        <h2 className="text-2xl font-bold text-gray-800 mb-4 text-center">Criar Conta</h2>
        
        {message.text && (
          <div className={`p-3 rounded mb-4 ${message.type === 'error' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
            {message.text}
          </div>
        )}
        
        <form onSubmit={handleRegister}>
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2">Nome:</label>
            <input
              type="text"
              value={registerForm.name}
              onChange={(e) => setRegisterForm(prev => ({...prev, name: e.target.value}))}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:border-blue-500"
              placeholder="Seu nome completo"
              required
              disabled={loading}
              autoComplete="name"
            />
          </div>
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2">Email:</label>
            <input
              type="email"
              value={registerForm.email}
              onChange={(e) => setRegisterForm(prev => ({...prev, email: e.target.value}))}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:border-blue-500"
              placeholder="seu@email.com"
              required
              disabled={loading}
              autoComplete="email"
            />
          </div>
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2">Senha:</label>
            <input
              type="password"
              value={registerForm.password}
              onChange={(e) => setRegisterForm(prev => ({...prev, password: e.target.value}))}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:border-blue-500"
              placeholder="Mínimo 6 caracteres"
              required
              disabled={loading}
              autoComplete="new-password"
            />
          </div>
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2">Confirmar Senha:</label>
            <input
              type="password"
              value={registerForm.confirmPassword}
              onChange={(e) => setRegisterForm(prev => ({...prev, confirmPassword: e.target.value}))}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:border-blue-500"
              placeholder="Repita sua senha"
              required
              disabled={loading}
              autoComplete="new-password"
            />
          </div>
          
          <div className="flex gap-3 mb-4">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 transition disabled:opacity-50"
            >
              {loading ? 'Cadastrando...' : 'Criar Conta'}
            </button>
            <button
              type="button"
              onClick={() => {
                onClose();
                setMessage({ type: '', text: '' });
              }}
              className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-400 transition"
              disabled={loading}
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
});

// Modal de Recuperação de Senha INTEGRADO COM SUPABASE
const ForgotPasswordModal = React.memo(({ show, onClose, message, setMessage }: ModalProps) => {
  const [forgotForm, setForgotForm] = useState({ email: '' });
  const { resetPassword, loading } = useAuth();

  if (!show) return null;

  const handleForgotPassword = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setMessage({ type: '', text: '' });
    
    const result = await resetPassword(forgotForm.email);
    
    if (result.success) {
      onClose();
      setForgotForm({ email: '' });
      setMessage({ type: 'success', text: result.message });
    } else {
      setMessage({ type: 'error', text: result.message });
    }
  };
  
  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full mx-4">
        <h2 className="text-2xl font-bold text-gray-800 mb-4 text-center">Recuperar Senha</h2>
        
        {message.text && (
          <div className={`p-3 rounded mb-4 ${message.type === 'error' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
            {message.text}
          </div>
        )}
        
        <form onSubmit={handleForgotPassword}>
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2">Email:</label>
            <input
              type="email"
              value={forgotForm.email}
              onChange={(e) => setForgotForm(prev => ({...prev, email: e.target.value}))}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:border-blue-500"
              placeholder="seu@email.com"
              required
              disabled={loading}
              autoComplete="email"
            />
            <p className="text-xs text-gray-500 mt-1">
              Enviaremos um link para redefinir sua senha
            </p>
          </div>
          
          <div className="flex gap-3 mb-4">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-blue-800 text-white py-2 rounded-lg hover:bg-blue-900 transition disabled:opacity-50"
            >
              {loading ? 'Enviando...' : 'Enviar Email'}
            </button>
            <button
              type="button"
              onClick={() => {
                onClose();
                setMessage({ type: '', text: '' });
              }}
              className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-400 transition"
              disabled={loading}
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
});

export default function CompatibilidadePage(): React.JSX.Element {
  // Estados básicos da página
  const [busca, setBusca] = useState("");
  const [categoriaSelecionada, setCategoriaSelecionada] = useState("Películas 3D Compatíveis");
  const [buscaTelas, setBuscaTelas] = useState("");
  const [buscaCapas, setBuscaCapas] = useState("");
  const [buscaBaterias, setBuscaBaterias] = useState("");
  const [buscaConectoresV8, setBuscaConectoresV8] = useState("");
  const [buscaConectoresTypeC, setBuscaConectoresTypeC] = useState("");
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [showAccountDropdown, setShowAccountDropdown] = useState(false);
  const [dropdownView, setDropdownView] = useState('login');
  
  // Estados para películas dinâmicas
  const [peliculasData, setPeliculasData] = useState<PeliculaData[]>([]);
  const [peliculasLoading, setPeliculasLoading] = useState(true);
  const [peliculasMessage, setPeliculasMessage] = useState('');
  
  // Estados dos modais
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  // Hook de autenticação Supabase
  const { user, isVIP, loading, signOut, upgradeToVIP, signIn, signUp, resetPassword } = useAuth();
  const isLoggedIn = !!user;

  // Contador total de modelos
  const totalModelos = peliculasData.length + dadosTelas.length + dadosCapas.length + dadosBaterias.length + (dadosConectoresV8?.length || 0) + (dadosConectoresTypeC?.length || 0);

  // Fechar dropdown quando clicar fora
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showAccountDropdown && !(event.target as Element)?.closest('.relative')) {
        setShowAccountDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showAccountDropdown]);

  // Carregar películas quando usuário ou busca mudar
  React.useEffect(() => {
    const loadPeliculas = async () => {
      try {
        setPeliculasLoading(true);
        const result = await fetchPeliculas(user?.email, busca);
        
        setPeliculasData(result.data);
        setPeliculasMessage(result.message);
        
        console.log('🎬 Películas carregadas:', {
          total: result.data.length,
          isVIP: result.isVIP,
          message: result.message
        });
        
      } catch (error) {
        console.error('❌ Erro ao carregar películas:', error);
        setPeliculasData([]);
        setPeliculasMessage('Erro ao carregar dados');
      } finally {
        setPeliculasLoading(false);
      }
    };

    loadPeliculas();
  }, [user?.email, busca]);

  // Controle do botão "Voltar ao topo"
  React.useEffect(() => {
    const handleScroll = (): void => {
      setShowBackToTop(window.scrollY > 500);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Função para voltar ao topo
  const scrollToTop = (): void => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  // Função para upgrade VIP
  const handleVIPUpgrade = async (): Promise<void> => {
    if (!isLoggedIn) {
      setShowLoginModal(true);
      return;
    }
    
    const result = await upgradeToVIP('pix');
    setMessage({ 
      type: result.success ? 'success' : 'error', 
      text: result.message 
    });
  };

  // Função de logout
  const handleLogout = async (): Promise<void> => {
    await signOut();
    setMessage({ type: 'success', text: 'Logout realizado com sucesso!' });
  };

  // Função de login do dropdown
  const handleDropdownLogin = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setMessage({ type: '', text: '' });
    
    const formData = new FormData(e.target as HTMLFormElement);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    
    const result = await signIn(email, password);
    
    if (result.success) {
      setShowAccountDropdown(false);
      setMessage({ type: 'success', text: 'Login realizado com sucesso!' });
    } else {
      setMessage({ type: 'error', text: result.message });
    }
  };

  // Função de cadastro do dropdown
  const handleDropdownRegister = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setMessage({ type: '', text: '' });
    
    const formData = new FormData(e.target as HTMLFormElement);
    const name = formData.get('name') as string;
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const confirmPassword = formData.get('confirmPassword') as string;
    
    if (password !== confirmPassword) {
      setMessage({ type: 'error', text: 'Senhas não coincidem' });
      return;
    }
    
    if (password && password.length < 6) {
      setMessage({ type: 'error', text: 'Senha deve ter pelo menos 6 caracteres' });
      return;
    }
    
    const result = await signUp(email, password, name);
    
    if (result.success) {
      setShowAccountDropdown(false);
      setMessage({ type: 'success', text: 'Cadastro realizado com sucesso!' });
    } else {
      setMessage({ type: 'error', text: result.message });
    }
  };

  // Função de recuperação de senha do dropdown
  const handleDropdownForgot = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setMessage({ type: '', text: '' });
    
    const formData = new FormData(e.target as HTMLFormElement);
    const email = formData.get('email') as string;
    
    const result = await resetPassword(email);
    
    if (result.success) {
      setShowAccountDropdown(false);
      setMessage({ type: 'success', text: result.message });
    } else {
      setMessage({ type: 'error', text: result.message });
    }
  };

  // Dados das películas já vêm limitados da API baseado no status VIP
  const exibidosPeliculas = peliculasData.slice(0, busca ? peliculasData.length : 10);

  const filtradasTelas = dadosTelas.filter((item) =>
    item.modelo.toLowerCase().includes(buscaTelas.toLowerCase())
  );
  const exibidosTelas = buscaTelas ? filtradasTelas : dadosTelas.slice(0, 10);

  const filtradasCapas = dadosCapas.filter((item) =>
    item.modelo.toLowerCase().includes(buscaCapas.toLowerCase())
  );
  const exibidosCapas = buscaCapas ? filtradasCapas : dadosCapas.slice(0, 10);

  const filtradasBaterias = dadosBaterias.filter((item) =>
    item.modelo.toLowerCase().includes(buscaBaterias.toLowerCase())
  );
  const exibidosBaterias = buscaBaterias ? filtradasBaterias : dadosBaterias.slice(0, 10);

  const filtradasConectoresV8 = (dadosConectoresV8 || []).filter((item) =>
    item.modelos && item.modelos.toLowerCase().includes(buscaConectoresV8.toLowerCase())
  );
  const exibidosConectoresV8 = buscaConectoresV8 ? filtradasConectoresV8 : (dadosConectoresV8 || []).slice(0, 10);

  const filtradasConectoresTypeC = (dadosConectoresTypeC || []).filter((item: any) =>
    item.modelo && item.modelo.toLowerCase().includes(buscaConectoresTypeC.toLowerCase())
  );
  const exibidosConectoresTypeC = buscaConectoresTypeC ? filtradasConectoresTypeC : (dadosConectoresTypeC || []).slice(0, 10);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-100 to-gray-200 text-gray-900 px-0 py-6 font-sans" style={{ zoom: '0.9' }}>
      <Head>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet" />
        <style>{`body { font-family: 'Inter', sans-serif; }`}</style>
      </Head>

      <header className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-b from-blue-900 to-blue-800 text-white shadow-md backdrop-blur-sm min-h-[140px]">
        <div className="grid grid-cols-1 md:grid-cols-1 items-center px-4 pt-2">
          <div className="text-center md:text-left">
            <div className="flex justify-center md:justify-start items-center">
              <div>
                <h1 className="text-4xl md:text-6xl font-extrabold text-white">
                  TODAS AS PELÍCULAS <span className="text-yellow-400">3D</span> <span className="text-green-400">COMPATÍVEIS</span>
                </h1>
                <div className="w-full h-1 bg-gradient-to-r from-black via-white to-black my-1" />
                <p className="text-base md:text-lg text-gray-200 font-medium">100% Atualizada 2025 - Powered by Supabase</p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end px-4 pt-2 pb-3">
          {isLoggedIn ? (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 bg-[#1E40AF] backdrop-blur-sm rounded-full px-4 py-2 border border-[#3B82F6]">
                <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-blue-800" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="text-left">
                  <p className="text-sm font-medium text-[#FFFFFF]">Olá, {user?.email?.split('@')[0]}!</p>
                  <div className="flex items-center gap-2">
                    {isVIP ? (
                      <span className="bg-gradient-to-r from-yellow-400 to-yellow-500 text-black px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                        VIP ATIVO
                      </span>
                    ) : (
                      <span className="bg-[#64748B] text-[#FFFFFF] px-3 py-1 rounded-full text-xs font-medium">
                        Plano Gratuito
                      </span>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="flex flex-col gap-1">
                {!isVIP && (
                  <a
                    href="/checkout-vip"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-[#FFB800] hover:bg-[#e0a200] text-black px-4 py-2 rounded-full text-xs font-bold transition-all duration-300 shadow-lg hover:shadow-xl flex items-center gap-1"
                  >
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                    ASSINAR VIP
                  </a>
                )}
                <button
                  onClick={handleLogout}
                  disabled={loading}
                  className="bg-[#D32F2F] hover:bg-[#B71C1C] text-[#FFFFFF] px-4 py-2 rounded-full text-xs font-medium transition-all duration-300 shadow-lg disabled:opacity-50"
                >
                  Sair da Conta
                </button>
              </div>
            </div>
          ) : (
            <div className="relative">
              <button
                onClick={() => {
                  setShowAccountDropdown(!showAccountDropdown);
                  setDropdownView('login');
                }}
                className="flex items-center gap-2 bg-white hover:bg-gray-100 text-blue-800 px-4 py-2 rounded-full font-semibold transition text-sm border-2 border-white shadow-lg"
              >
                <div className="w-6 h-6 bg-blue-800 rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="text-left">
                  <div className="text-xs text-gray-600">Entrar / Cadastrar</div>
                  <div className="text-sm font-bold">Minha conta</div>
                </div>
                <span className="text-blue-800">▼</span>
              </button>
              
              {/* Dropdown Menu */}
              {showAccountDropdown && (
                <div className="absolute right-0 mt-2 w-72 bg-white rounded-lg shadow-xl border border-gray-200 z-50">
                  
                  {/* Login View */}
                  {dropdownView === 'login' && (
                    <div className="p-6">
                      <h3 className="text-lg font-bold text-gray-800 mb-4">Entrar em minha conta</h3>
                      <p className="text-sm text-gray-600 mb-4">Insira seu e-mail e senha:</p>
                      
                      <form onSubmit={handleDropdownLogin}>
                        <div className="mb-3">
                          <input
                            type="email"
                            name="email"
                            className="w-full px-3 py-3 bg-gray-100 border-0 rounded-lg text-sm text-black"
                            placeholder="E-mail"
                            required
                            disabled={loading}
                          />
                        </div>
                        <div className="mb-4">
                          <input
                            type="password"
                            name="password"
                            className="w-full px-3 py-3 bg-gray-100 border-0 rounded-lg text-sm text-black"
                            placeholder="Senha"
                            required
                            disabled={loading}
                          />
                        </div>
                        
                        <button
                          type="submit"
                          disabled={loading}
                          className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-full font-semibold transition disabled:opacity-50"
                        >
                          {loading ? 'Entrando...' : 'Entrar'}
                        </button>
                      </form>
                      
                      <div className="mt-4 text-center text-sm">
                        <span className="text-gray-600">Novo cliente? </span>
                        <button
                          onClick={() => setDropdownView('register')}
                          className="text-blue-600 hover:underline font-medium"
                        >
                          Criar sua conta
                        </button>
                      </div>
                      
                      <div className="mt-2 text-center text-sm">
                        <span className="text-gray-600">Esqueceu sua senha? </span>
                        <button
                          onClick={() => setDropdownView('forgot')}
                          className="text-blue-600 hover:underline font-medium"
                        >
                          Recuperar senha
                        </button>
                      </div>
                      
                      {message.text && (
                        <div className={`mt-3 p-3 rounded text-sm ${message.type === 'error' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                          {message.text}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Register View */}
                  {dropdownView === 'register' && (
                    <div className="p-6">
                      <h3 className="text-lg font-bold text-gray-800 mb-4">Criar Conta</h3>
                      <p className="text-sm text-gray-600 mb-4">Preencha os campos abaixo:</p>
                      
                      <form onSubmit={handleDropdownRegister}>
                        <div className="mb-3">
                          <input
                            type="text"
                            name="name"
                            className="w-full px-3 py-3 bg-gray-100 border-0 rounded-lg text-sm text-black"
                            placeholder="Primeiro nome"
                            required
                            disabled={loading}
                          />
                        </div>
                        <div className="mb-3">
                          <input
                            type="email"
                            name="email"
                            className="w-full px-3 py-3 bg-gray-100 border-0 rounded-lg text-sm text-black"
                            placeholder="E-mail"
                            required
                            disabled={loading}
                          />
                        </div>
                        <div className="mb-3">
                          <input
                            type="password"
                            name="password"
                            className="w-full px-3 py-3 bg-gray-100 border-0 rounded-lg text-sm text-black"
                            placeholder="Senha"
                            required
                            disabled={loading}
                          />
                        </div>
                        <div className="mb-4">
                          <input
                            type="password"
                            name="confirmPassword"
                            className="w-full px-3 py-3 bg-gray-100 border-0 rounded-lg text-sm text-black"
                            placeholder="Confirmar Senha"
                            required
                            disabled={loading}
                          />
                        </div>
                        
                        <button
                          type="submit"
                          disabled={loading}
                          className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-full font-semibold transition disabled:opacity-50"
                        >
                          {loading ? 'Cadastrando...' : 'Criar Conta'}
                        </button>
                      </form>
                      
                      <div className="mt-4 text-center text-sm">
                        <span className="text-gray-600">Já tem conta? </span>
                        <button
                          onClick={() => setDropdownView('login')}
                          className="text-blue-600 hover:underline font-medium"
                        >
                          Fazer login
                        </button>
                      </div>
                      
                      {message.text && (
                        <div className={`mt-3 p-3 rounded text-sm ${message.type === 'error' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                          {message.text}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Forgot Password View */}
                  {dropdownView === 'forgot' && (
                    <div className="p-6">
                      <h3 className="text-lg font-bold text-gray-800 mb-4">Recuperar Senha</h3>
                      <p className="text-sm text-gray-600 mb-4">Insira seu e-mail:</p>
                      
                      <form onSubmit={handleDropdownForgot}>
                        <div className="mb-4">
                          <input
                            type="email"
                            name="email"
                            className="w-full px-3 py-3 bg-gray-100 border-0 rounded-lg text-sm text-black"
                            placeholder="E-mail"
                            required
                            disabled={loading}
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            Enviaremos um link para redefinir sua senha
                          </p>
                        </div>
                        
                        <button
                          type="submit"
                          disabled={loading}
                          className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-full font-semibold transition disabled:opacity-50"
                        >
                          {loading ? 'Enviando...' : 'Recuperar'}
                        </button>
                      </form>
                      
                      <div className="mt-4 text-center text-sm">
                        <span className="text-gray-600">Lembrar sua senha? </span>
                        <button
                          onClick={() => setDropdownView('login')}
                          className="text-blue-600 hover:underline font-medium"
                        >
                          Voltar para o login
                        </button>
                      </div>
                      
                      {message.text && (
                        <div className={`mt-3 p-3 rounded text-sm ${message.type === 'error' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                          {message.text}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </header>

      <div className="pt-32 px-4">
        <div className="w-full flex justify-center -mb-20">
          <Image src="/tela prime s fundoo.png" alt="Logo Centralizada" width={350} height={175} className="mx-auto" />
        </div>

        <div className="text-center py-2 bg-green-100 border border-green-300 rounded-lg mx-4 mb-4">
          <p className="text-lg font-bold text-green-800">
            ✅ Lista completa, confiável e em constante atualização!
          </p>
          <p className="text-sm text-green-600">Atualizada diariamente com novos lançamentos - Sistema Supabase</p>
        </div>

        <div className="mb-2">
          <Image src="/banner peliculas compativeis.png" alt="Banner Descubra Películas Compatíveis" width={1200} height={300} className="w-full rounded-none shadow-md" />
        </div>

        <main className="grid grid-cols-1 md:grid-cols-[270px_1fr_300px] gap-2 md:gap-6 items-start">
          <aside className="flex flex-col space-y-4 min-h-[1500px]">
            <style jsx>{`
              @media (max-width: 768px) {
                aside {
                  min-height: auto !important;
                }
                main {
                  gap: 1rem !important;
                }
              }
            `}</style>
            <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-xl p-12 text-center font-semibold text-white text-xl shadow-lg">
              Confira também outras categorias de <br />compatibilidade
              <div className="flex justify-center mt-6">
                <ArrowDown className="animate-bounce text-yellow-300 w-7 h-7" />
                <ArrowDown className="animate-bounce text-yellow-300 w-7 h-7 -ml-2" />
              </div>
            </div>
            <nav className="space-y-4">
              {categorias.map((item: string) => (
                <button
                  key={item}
                  onClick={() => setCategoriaSelecionada(item)}
                  className={`w-full text-left px-6 py-7 font-semibold rounded-xl shadow transition-all ${
                    categoriaSelecionada === item ? "bg-blue-800 text-white" : "bg-blue-50 text-blue-900 hover:bg-blue-100"
                  }`}
                >
                  <span className="text-base">{item}</span>
                </button>
              ))}
            </nav>
          </aside>

          <section className="w-full">
            {categoriaSelecionada === "Películas 3D Compatíveis" && (
              <div className="w-full bg-white p-6 rounded-xl shadow-lg border border-blue-300 mb-8">
                <h2 className="text-4xl font-extrabold text-blue-900 text-center mb-2">Películas Compatíveis</h2>
                <div className="flex justify-center mb-4">
                  <ArrowDown className="animate-bounce text-yellow-500 w-6 h-6" />
                </div>
                <div className="flex flex-col items-center mb-6">
                  <div className="bg-gradient-to-r from-blue-100 to-blue-50 p-4 rounded-xl mb-4 border-2 border-blue-200">
                    <p className="text-blue-800 font-semibold text-center mb-2">
                      🔍 Digite o modelo do seu aparelho abaixo:
                    </p>
                    <Input
                      placeholder="Ex: A54, iPhone 14, Redmi Note 12..."
                      className="w-full md:w-96 h-14 border-3 border-blue-600 mb-0 p-4 text-lg font-medium shadow-lg focus:border-blue-800 focus:ring-4 focus:ring-blue-200"
                      value={busca}
                      onChange={(e) => setBusca(e.target.value)}
                    />
                    <p className="text-sm text-blue-600 text-center mt-2">
                      Busca instantânea em nossa base completa
                    </p>
                  </div>
                </div>
                <table className="w-full border border-blue-500 text-base rounded-xl overflow-hidden">
                  <thead>
                    <tr className="bg-blue-800 text-white">
                      <th className="border border-blue-500 px-6 py-4 w-1/3 text-left font-semibold">Modelo do Aparelho</th>
                      <th className="border border-blue-500 px-6 py-4 w-2/3 text-left font-semibold">Película 3D Compatível</th>
                    </tr>
                  </thead>
                  <tbody>
                    {peliculasLoading ? (
                      <tr>
                        <td colSpan={2} className="border border-blue-500 px-6 py-8 text-center text-gray-600">
                          <div className="flex items-center justify-center gap-2">
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                            Carregando películas...
                          </div>
                        </td>
                      </tr>
                    ) : exibidosPeliculas.length > 0 ? (
                      exibidosPeliculas.map((item: any, i: number) => (
                        <tr key={item.id || i} className="odd:bg-white even:bg-blue-50">
                          <td className="border border-blue-500 px-6 py-4 font-medium text-gray-800">{item.modelo}</td>
                          <td className="border border-blue-500 px-6 py-4 text-gray-700">{item.compatibilidade}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={2} className="border border-blue-500 px-6 py-8 text-center text-gray-600">
                          {busca ? `Nenhuma película encontrada para "${busca}"` : 'Nenhuma película disponível'}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
                
                {!isVIP && peliculasData.length > 0 && (
                  <div className="mt-6 p-4 bg-black border-2 border-yellow-400 rounded-xl text-center">
                    <p className="text-lg font-semibold text-white mb-2">
                      🔒 {peliculasMessage}
                    </p>
                    <p className="text-sm text-gray-300 mb-3">
                      Desbloqueie TODOS os modelos! Base completa + atualizações diárias com novos lançamentos
                    </p>
                    <div className="flex justify-center">
                      <a
                        href="/checkout-vip"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-yellow-400 text-black px-8 py-3 rounded-full font-semibold hover:bg-yellow-300 transition text-lg"
                      >
                        ⭐ Assinar VIP - R$ 7,70/mês
                      </a>
                    </div>
                  </div>
                )}
                <div className="w-full flex flex-col md:flex-row justify-center items-center gap-4 mt-8">
                  <Image src="/pelicula shoppe1.webp" alt="Shopee 1" width={200} height={300} className="rounded-xl shadow-md" />
                  <Image src="/pelicula shoppe 2.webp" alt="Shopee 2" width={200} height={300} className="rounded-xl shadow-md" />
                  <Image src="/pelicula 3 shopee.webp" alt="Shopee 3" width={200} height={300} className="rounded-xl shadow-md" />
                </div>
                <div className="flex justify-center mt-6">
                  <a href="https://shopee.com.br" target="_blank" rel="noopener noreferrer" className="bg-orange-600 hover:bg-orange-700 text-white font-bold px-8 py-4 rounded-full text-lg">
                    VER PELÍCULAS NA SHOPEE
                  </a>
                </div>
              </div>
            )}

            {categoriaSelecionada === "Capas Compatíveis 2025" && (
              <div className="w-full bg-white p-6 rounded-xl shadow-lg border border-blue-300 mb-8">
                <h2 className="text-4xl font-extrabold text-blue-900 text-center mb-2">Capas Compatíveis 2025</h2>
                <div className="flex justify-center mb-4">
                  <ArrowDown className="animate-bounce text-yellow-500 w-6 h-6" />
                </div>
                <div className="flex flex-col items-center mb-6">
                  <div className="bg-gradient-to-r from-blue-100 to-blue-50 p-4 rounded-xl mb-4 border-2 border-blue-200">
                    <p className="text-blue-800 font-semibold text-center mb-2">
                      🔍 Digite o modelo do seu aparelho abaixo:
                    </p>
                    <Input
                      placeholder="Ex: A54, iPhone 14, Redmi Note 12..."
                      className="w-full md:w-96 h-14 border-3 border-blue-600 mb-0 p-4 text-lg font-medium shadow-lg focus:border-blue-800 focus:ring-4 focus:ring-blue-200"
                      value={buscaCapas}
                      onChange={(e) => setBuscaCapas(e.target.value)}
                    />
                    <p className="text-sm text-blue-600 text-center mt-2">
                      Busca instantânea em nossa base completa
                    </p>
                  </div>
                </div>
                <table className="w-full border border-blue-500 text-base rounded-xl overflow-hidden">
                  <thead>
                    <tr className="bg-blue-800 text-white">
                      <th className="border border-blue-500 px-6 py-4 w-1/3 text-left font-semibold">Modelo do Aparelho</th>
                      <th className="border border-blue-500 px-6 py-4 w-2/3 text-left font-semibold">Capa Compatível</th>
                    </tr>
                  </thead>
                  <tbody>
                    {exibidosCapas.map((item: any, i: number) => (
                      <tr key={i} className="odd:bg-white even:bg-blue-50">
                        <td className="border border-blue-500 px-6 py-4 font-medium text-gray-800">{item.modelo}</td>
                        <td className="border border-blue-500 px-6 py-4 text-gray-700">{item.marca}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {categoriaSelecionada === "Telas Compatíveis" && (
              <div className="w-full bg-white p-6 rounded-xl shadow-lg border border-blue-300 mb-8">
                <h2 className="text-4xl font-extrabold text-blue-900 text-center mb-2">Telas Compatíveis</h2>
                <div className="flex justify-center mb-4">
                  <ArrowDown className="animate-bounce text-yellow-500 w-6 h-6" />
                </div>
                <div className="flex flex-col items-center mb-6">
                  <div className="bg-gradient-to-r from-blue-100 to-blue-50 p-4 rounded-xl mb-4 border-2 border-blue-200">
                    <p className="text-blue-800 font-semibold text-center mb-2">
                      🔍 Digite o modelo do seu aparelho abaixo:
                    </p>
                    <Input
                      placeholder="Ex: A54, iPhone 14, Redmi Note 12..."
                      className="w-full md:w-96 h-14 border-3 border-blue-600 mb-0 p-4 text-lg font-medium shadow-lg focus:border-blue-800 focus:ring-4 focus:ring-blue-200"
                      value={buscaTelas}
                      onChange={(e) => setBuscaTelas(e.target.value)}
                    />
                    <p className="text-sm text-blue-600 text-center mt-2">
                      Busca instantânea em nossa base completa
                    </p>
                  </div>
                </div>
                <table className="w-full border border-blue-500 text-base rounded-xl overflow-hidden">
                  <thead>
                    <tr className="bg-blue-800 text-white">
                      <th className="border border-blue-500 px-6 py-4 w-1/3 text-left font-semibold">Modelo do Aparelho</th>
                      <th className="border border-blue-500 px-6 py-4 w-2/3 text-left font-semibold">Tela Compatível</th>
                    </tr>
                  </thead>
                  <tbody>
                    {exibidosTelas.map((item: any, i: number) => (
                      <tr key={i} className="odd:bg-white even:bg-blue-50">
                        <td className="border border-blue-500 px-6 py-4 font-medium text-gray-800">{item.modelo}</td>
                        <td className="border border-blue-500 px-6 py-4 text-gray-700">{item.compatibilidade}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="w-full flex flex-col md:flex-row justify-center items-center gap-4 mt-8">
                  <a href="https://telaprimeexpress.com/products/sm-a21s-premier-ori-preto?_pos=1&_sid=9696df1f6&_ss=r" target="_blank" rel="noopener noreferrer">
                    <img src="/a21s.jpeg" alt="Samsung A21S - Tela Prime" width={200} height={300} className="rounded-xl shadow-md hover:scale-105 transition-transform" />
                  </a>
                  <a href="https://telaprimeexpress.com/products/ip-11-pro-max-troca-ci-oled-preto?_pos=1&_sid=27d78e086&_ss=r" target="_blank" rel="noopener noreferrer">
                    <img src="/11 pro max olled.jpeg" alt="iPhone 11 Pro Max OLED - Tela Prime" width={200} height={300} className="rounded-xl shadow-md hover:scale-105 transition-transform" />
                  </a>
                  <a href="https://telaprimeexpress.com/products/sm-a14-4g-com-aro-select-preto?_pos=3&_sid=ba3b42fec&_ss=r" target="_blank" rel="noopener noreferrer">
                    <img src="/a14.jpeg" alt="Samsung A14 4G - Tela Prime" width={200} height={300} className="rounded-xl shadow-md hover:scale-105 transition-transform" />
                  </a>
                </div>
                <div className="flex justify-center mt-6">
                  <a href="https://telaprimeexpress.com/" target="_blank" rel="noopener noreferrer" className="bg-blue-800 hover:bg-blue-900 text-white font-bold px-8 py-4 rounded-full text-lg">
                    VER NA TELA PRIME EXPRESS
                  </a>
                </div>
              </div>
            )}

            {categoriaSelecionada === "Baterias Compatíveis" && (
              <div className="w-full bg-white p-6 rounded-xl shadow-lg border border-blue-300 mb-8">
                <h2 className="text-4xl font-extrabold text-blue-900 text-center mb-2">Baterias Compatíveis</h2>
                <div className="flex justify-center mb-4">
                  <ArrowDown className="animate-bounce text-yellow-500 w-6 h-6" />
                </div>
                <div className="flex flex-col items-center mb-6">
                  <div className="bg-gradient-to-r from-blue-100 to-blue-50 p-4 rounded-xl mb-4 border-2 border-blue-200">
                    <p className="text-blue-800 font-semibold text-center mb-2">
                      🔍 Digite o modelo do seu aparelho abaixo:
                    </p>
                    <Input
                      placeholder="Ex: A54, iPhone 14, Redmi Note 12..."
                      className="w-full md:w-96 h-14 border-3 border-blue-600 mb-0 p-4 text-lg font-medium shadow-lg focus:border-blue-800 focus:ring-4 focus:ring-blue-200"
                      value={buscaBaterias}
                      onChange={(e) => setBuscaBaterias(e.target.value)}
                    />
                    <p className="text-sm text-blue-600 text-center mt-2">
                      Busca instantânea em nossa base completa
                    </p>
                  </div>
                </div>
                <table className="w-full border border-blue-500 text-base">
                  <thead>
                    <tr className="bg-blue-800 text-white">
                      <th className="border border-blue-500 px-6 py-4 w-1/3 text-left">Modelo do Aparelho</th>
                      <th className="border border-blue-500 px-6 py-4 w-2/3 text-left">Bateria Compatível</th>
                    </tr>
                  </thead>
                  <tbody>
                    {exibidosBaterias.map((item: any, i: number) => (
                      <tr key={i}>
                        <td className="border border-blue-500 px-6 py-4 font-medium">{item.modelo}</td>
                        <td className="border border-blue-500 px-6 py-4">{item.compatibilidade}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {categoriaSelecionada === "Conectores Type-C" && (
              <div className="w-full bg-white p-6 rounded-xl shadow-lg border border-blue-300 mb-8">
                <h2 className="text-4xl font-extrabold text-blue-900 text-center mb-2">Conectores Type-C Compatíveis</h2>
                <div className="flex justify-center mb-4">
                  <ArrowDown className="animate-bounce text-yellow-500 w-6 h-6" />
                </div>
                
                <div className="overflow-x-auto">
                  <table className="w-full border-2 border-black">
                    <thead>
                      <tr className="bg-gray-300">
                        <th className="border-2 border-black px-6 py-4 text-center font-bold text-lg">CELULARES COMPATÍVEIS</th>
                        <th className="border-2 border-black px-6 py-4 text-center font-bold text-lg">FOTO DO CONECTOR</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="bg-white">
                        <td className="border-2 border-black px-6 py-6 align-top">
                          <div className="font-medium text-black leading-relaxed">
                            A20 A21S A30 A40 A50 A60 A70 M20 M30 A31 A51 A71 S10 LITE A22 A50S A30S A13 A12 M51 A51S A32 M31 A12 A40 A70S M40 M62 NOTE 10 LITE
                          </div>
                        </td>
                        <td className="border-2 border-black px-6 py-6 text-center align-middle">
                          <img 
                            src="/conector a 20.webp" 
                            alt="Conector Type-C A20" 
                            className="w-80 h-auto object-contain mx-auto"
                          />
                        </td>
                      </tr>
                      
                      <tr className="bg-white">
                        <td className="border-2 border-black px-6 py-6 align-top">
                          <div className="font-medium text-black leading-relaxed">
                            A20S A21 LG K41S K61S K61 MOTO E7 E7 POWER E20 E30 E22 E32 E40 G50 5G ONE FUSION
                          </div>
                        </td>
                        <td className="border-2 border-black px-6 py-6 text-center align-middle">
                          <img 
                            src="/conector a20s.webp" 
                            alt="Conector Type-C A20S" 
                            className="w-80 h-auto object-contain mx-auto"
                          />
                        </td>
                      </tr>
                      
                      <tr className="bg-white">
                        <td className="border-2 border-black px-6 py-6 align-top">
                          <div className="font-medium text-black leading-relaxed">
                            A52 A72 A52s A72 A82 A33 A73 A54 A34
                          </div>
                        </td>
                        <td className="border-2 border-black px-6 py-6 text-center align-middle">
                          <img 
                            src="/conector a52.webp" 
                            alt="Conector Type-C A52" 
                            className="w-80 h-auto object-contain mx-auto"
                          />
                        </td>
                      </tr>
                      
                      <tr className="bg-white">
                        <td className="border-2 border-black px-6 py-6 align-top">
                          <div className="font-medium text-black leading-relaxed">
                            CONECTOR DE CARGA MOTO G7 POWER G10 G20 G30 G50 G9 POWER G9 PLAY G9 ONE FUSION PLUS G8 POWER K51 / ONE MACRO / ONE POWER / G STILUS 2021 /
                          </div>
                        </td>
                        <td className="border-2 border-black px-6 py-6 text-center align-middle">
                          <img 
                            src="/conector de carga moto g10.webp" 
                            alt="Conector Moto G10" 
                            className="w-80 h-auto object-contain mx-auto"
                          />
                        </td>
                      </tr>
                      
                      <tr className="bg-white">
                        <td className="border-2 border-black px-6 py-6 align-top">
                          <div className="font-medium text-black leading-relaxed">
                            CARGA TIPO C MOTO G7 PLAY A02S A03S A11 G8 G9 PLUS G51 G41 G31 ONE VISION G60 G60S ONE ACTION / ONE VISION / MOTO GPOWER / G PLAY 2021
                          </div>
                        </td>
                        <td className="border-2 border-black px-6 py-6 text-center align-middle">
                          <img 
                            src="/conector de carga moto g7 play.webp" 
                            alt="Conector Moto G7 Play" 
                            className="w-80 h-auto object-contain mx-auto"
                          />
                        </td>
                      </tr>
                      
                      <tr className="bg-white">
                        <td className="border-2 border-black px-6 py-6 align-top">
                          <div className="font-medium text-black leading-relaxed">
                            LG K50s K51S K50
                          </div>
                        </td>
                        <td className="border-2 border-black px-6 py-6 text-center align-middle">
                          <img 
                            src="/conector de carga lg k 50.webp" 
                            alt="Conector LG K50" 
                            className="w-80 h-auto object-contain mx-auto"
                          />
                        </td>
                      </tr>
                      
                      <tr className="bg-white">
                        <td className="border-2 border-black px-6 py-6 align-top">
                          <div className="font-medium text-black leading-relaxed">
                            S10 / S10 PLUS / S10+ / S10E / S20 / S20 Plus / S20 Ultra / S20 FE / Note 10 / Note 10 Plus Tipo C
                          </div>
                        </td>
                        <td className="border-2 border-black px-6 py-6 text-center align-middle">
                          <img 
                            src="/conector de carga s10.webp" 
                            alt="Conector S10" 
                            className="w-80 h-auto object-contain mx-auto"
                          />
                        </td>
                      </tr>
                      
                      <tr className="bg-white">
                        <td className="border-2 border-black px-6 py-6 align-top">
                          <div className="font-medium text-black leading-relaxed">
                            XIAOMI REDMI NOTE 11 4G / REDMI NOTE 11S / REDMI NOTE 11E / REDMI 10C / NOTE 12 5G / NOTE 12 PRO 5G / POCO X5 / X5 PRO
                          </div>
                        </td>
                        <td className="border-2 border-black px-6 py-6 text-center align-middle">
                          <img 
                            src="/conector de carga redimi note 11 4g.webp" 
                            alt="Conector Xiaomi Note 11" 
                            className="w-80 h-auto object-contain mx-auto"
                          />
                        </td>
                      </tr>
                      
                      <tr className="bg-white">
                        <td className="border-2 border-black px-6 py-6 align-top">
                          <div className="font-medium text-black leading-relaxed">
                            XIAOMI NOTE 7 / NOTE 7 PRO / NOTE 8 / NOTE 8 PRO / NOTE 9 / NOTE 9 PRO / NOTE 9S / NOTE 10 / NOTE 10 PRO
                          </div>
                        </td>
                        <td className="border-2 border-black px-6 py-6 text-center align-middle">
                          <img 
                            src="/conector de carga xiomi note 7.png" 
                            alt="Conector Xiaomi Note 7" 
                            className="w-80 h-auto object-contain mx-auto"
                          />
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {categoriaSelecionada === "Conectores V8" && (
              <div className="w-full bg-white p-6 rounded-xl shadow-lg border border-blue-300 mb-8">
                <h2 className="text-4xl font-extrabold text-blue-900 text-center mb-2">Conectores V8 Compatíveis</h2>
                <div className="flex justify-center mb-4">
                  <ArrowDown className="animate-bounce text-yellow-500 w-6 h-6" />
                </div>
                
                <div className="overflow-x-auto">
                  <table className="w-full border-2 border-black">
                    <thead>
                      <tr className="bg-gray-300">
                        <th className="border-2 border-black px-6 py-4 text-center font-bold text-lg">CELULARES COMPATÍVEIS</th>
                        <th className="border-2 border-black px-6 py-4 text-center font-bold text-lg">FOTO DO CONECTOR</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="bg-white">
                        <td className="border-2 border-black px-6 py-6 align-top">
                          <div className="font-medium text-black leading-relaxed">
                            XIAOMI REDMI 12C / A1 A2 / A1 PLUS / A2 PLUS / 9A / 9C / 9T / 10A / 8A / Poco C3
                            SAMSUNG NORMAL / A01 / A03 / A03 CORE
                            LG K12 K12 PLUS K12 PRIME K40 K40S Q60 K22 K22 PLUS
                          </div>
                        </td>
                        <td className="border-2 border-black px-6 py-6 text-center align-middle">
                          <Image 
                            src="/conector de carga redimi 12 c.webp" 
                            alt="Conector V8 Xiaomi Samsung LG" 
                            width={320}
                            height={200}
                            className="w-80 h-auto object-contain mx-auto"
                          />
                        </td>
                      </tr>
                      
                      <tr className="bg-white">
                        <td className="border-2 border-black px-6 py-6 align-top">
                          <div className="font-medium text-black leading-relaxed">
                            MOTOROLA MOTO E6i / E6 / E4 / E4 PLUS / E5 / E5 PLUS / G4 PLAY / G5 POWER LITE
                            Lenovo a850, a850, a820, a800, a650, a660, a720, a820, e580
                          </div>
                        </td>
                        <td className="border-2 border-black px-6 py-6 text-center align-middle">
                          <Image 
                            src="/conector de carga moto e 6i.webp" 
                            alt="Conector V8 Motorola Lenovo" 
                            width={320}
                            height={200}
                            className="w-80 h-auto object-contain mx-auto"
                          />
                        </td>
                      </tr>
                      
                      <tr className="bg-white">
                        <td className="border-2 border-black px-6 py-6 align-top">
                          <div className="font-medium text-black leading-relaxed">
                            SAMSUNG A02 / A01 J8 Novo - J6 Novo - J4 J300 j4 core
                            J7 Duo - J5 Pro - J7 Pro - J1 - J2 - J5 Prime - J5 Prime
                            G570 - J7 Prime G610 - A10 - A10 s
                          </div>
                        </td>
                        <td className="border-2 border-black px-6 py-6 text-center align-middle">
                          <Image 
                            src="/conector de carga a02.jpeg" 
                            alt="Conector V8 Samsung A05 J series" 
                            width={320}
                            height={200}
                            className="w-80 h-auto object-contain mx-auto"
                          />
                        </td>
                      </tr>
                      
                      <tr className="bg-white">
                        <td className="border-2 border-black px-6 py-6 align-top">
                          <div className="font-medium text-black leading-relaxed">
                            G530 - G531 - G355 - G355 - G7102 - G7102 - G6102
                            G570 - J7 Meta J7 G5 - G Meta G516 - core plus - S3 - S3 - S4
                          </div>
                        </td>
                        <td className="border-2 border-black px-6 py-6 text-center align-middle">
                          <Image 
                            src="/conector de carga g530.webp" 
                            alt="Conector V8 Samsung G series" 
                            width={320}
                            height={200}
                            className="w-80 h-auto object-contain mx-auto"
                          />
                        </td>
                      </tr>                     
                      
                      <tr className="bg-white">
                        <td className="border-2 border-black px-6 py-6 align-top">
                          <div className="font-medium text-black leading-relaxed">
                            Moto G1 - Moto E1 - Moto E4 - Moto E4 Plus / Lenovo S7 - S500 - S650 - A2106 - A2105 - S90 - S850 - S880 - P780
                            T/ Tablets Diversos - moto g5 - moto g6 - moto e5 plus
                          </div>
                        </td>
                        <td className="border-2 border-black px-6 py-6 text-center align-middle">
                          <Image 
                            src="/conector de carga moto g1.webp" 
                            alt="Conector V8 Moto G E Lenovo" 
                            width={320}
                            height={200}
                            className="w-80 h-auto object-contain mx-auto"
                          />
                        </td>
                      </tr>
                      
                      <tr className="bg-white">
                        <td className="border-2 border-black px-6 py-6 align-top">
                          <div className="font-medium text-black leading-relaxed">
                            K10 - K8 - K5 - K4 - D377 - H815 - H522 - H522 - K8 K326 - Nexus 4 / linha 2016 / LG Nexus 5 D820 D821 Nitro g5 F850 Optimus 3d P920
                          </div>
                        </td>
                        <td className="border-2 border-black px-6 py-6 text-center align-middle">
                          <Image 
                            src="/conector de carga k10.webp" 
                            alt="Conector V8 LG K series H series" 
                            width={320}
                            height={200}
                            className="w-80 h-auto object-contain mx-auto"
                          />
                        </td>
                      </tr>
                      
                      <tr className="bg-white">
                        <td className="border-2 border-black px-6 py-6 align-top">
                          <div className="font-medium text-black leading-relaxed">
                            Moto G4 - Moto E2 - Moto XT / Sony M2 Aqua
                          </div>
                        </td>
                        <td className="border-2 border-black px-6 py-6 text-center align-middle">
                          <Image 
                            src="/conector de carga g4.webp" 
                            alt="Conector V8 Moto G4 E2 Sony" 
                            width={320}
                            height={200}
                            className="w-80 h-auto object-contain mx-auto"
                          />
                        </td>
                      </tr>
                        
                      <tr className="bg-white">
                        <td className="border-2 border-black px-6 py-6 align-top">
                          <div className="font-medium text-black leading-relaxed">
                            Tablet DL - Multilaser - Navicity (modelo 1 padrão universal)
                          </div>
                        </td>
                        <td className="border-2 border-black px-6 py-6 text-center align-middle">
                          <Image 
                            src="/conector de carga tablet dl.png" 
                            alt="Conector V8 Tablets universais" 
                            width={320}
                            height={200}
                            className="w-80 h-auto object-contain mx-auto"
                          />
                        </td>
                      </tr>
                      
                      <tr className="bg-white">
                        <td className="border-2 border-black px-6 py-6 align-top">
                          <div className="font-medium text-black leading-relaxed">
                            Tablets Diversos / Gps Diversos / V3
                          </div>
                        </td>
                        <td className="border-2 border-black px-6 py-6 text-center align-middle">
                          <Image 
                            src="/conector de carga tablet v3.webp" 
                            alt="Conector V8 Tablets GPS" 
                            width={320}
                            height={200}
                            className="w-80 h-auto object-contain mx-auto"
                          />
                        </td>
                      </tr>
                      
                      <tr className="bg-white">
                        <td className="border-2 border-black px-6 py-6 align-top">
                          <div className="font-medium text-black leading-relaxed">
                            Moto G2
                          </div>
                        </td>
                        <td className="border-2 border-black px-6 py-6 text-center align-middle">
                          <Image 
                            src="/conector de carga moto g2.webp" 
                            alt="Conector V8 Moto G2" 
                            width={320}
                            height={200}
                            className="w-80 h-auto object-contain mx-auto"
                          />
                        </td>
                      </tr>
                      
                      <tr className="bg-white">
                        <td className="border-2 border-black px-6 py-6 align-top">
                          <div className="font-medium text-black leading-relaxed">
                            S6812 - J105 - J210 - G130 - G313 - J110 - J120 - S5360 - I8262 - S7272 - I739 - I759 - I9128 - S6352 - S6312 - E7 - A8 A300 - A800F
                          </div>
                        </td>
                        <td className="border-2 border-black px-6 py-6 text-center align-middle">
                          <Image 
                            src="/conector de carga  s6812.png" 
                            alt="Conector V8 Samsung série S G J" 
                            width={320}
                            height={200}
                            className="w-80 h-auto object-contain mx-auto"
                          />
                        </td>
                      </tr>                                      
                                          
                      <tr className="bg-white">
                        <td className="border-2 border-black px-6 py-6 align-top">
                          <div className="font-medium text-black leading-relaxed">
                            SAMSUNG A10s / M10 / M15 / Moto E5 Play / E5C / g k11 / k11
                          </div>
                        </td>
                        <td className="border-2 border-black px-6 py-6 text-center align-middle">
                          <Image 
                            src="/conector de carga a10s.webp" 
                            alt="Conector V8 Samsung A10s M10 M15 Moto E5" 
                            width={320}
                            height={200}
                            className="w-80 h-auto object-contain mx-auto"
                          />
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="w-full flex justify-center mb-8">
              <Image src="/telas-compativeis-banner.jpg" alt="Divisor de Seções" width={800} height={80} className="rounded-xl shadow-md" />
            </div>

            <div className="relative">
              <div className="w-full bg-white p-6 rounded-xl shadow-lg border border-blue-300">
                <h2 className="text-4xl font-extrabold text-blue-900 text-center mb-2">Telas Compatíveis</h2>
                <div className="flex justify-center mb-4">
                  <ArrowDown className="animate-bounce text-yellow-500 w-6 h-6" />
                </div>
                <div className="flex flex-col items-center mb-6">
                  <div className="bg-gradient-to-r from-blue-100 to-blue-50 p-4 rounded-xl mb-4 border-2 border-blue-200">
                    <p className="text-blue-800 font-semibold text-center mb-2">
                      🔍 Digite o modelo do seu aparelho abaixo:
                    </p>
                    <Input
                      placeholder="Ex: A54, iPhone 14, Redmi Note 12..."
                      className="w-full md:w-96 h-14 border-3 border-blue-600 mb-0 p-4 text-lg font-medium shadow-lg focus:border-blue-800 focus:ring-4 focus:ring-blue-200"
                      value={buscaTelas}
                      onChange={(e) => setBuscaTelas(e.target.value)}
                    />
                    <p className="text-sm text-blue-600 text-center mt-2">
                      Busca instantânea em nossa base completa
                    </p>
                  </div>
                </div>
                <table className="w-full border border-blue-500 text-base rounded-xl overflow-hidden">
                  <thead>
                    <tr className="bg-blue-800 text-white">
                      <th className="border border-blue-500 px-6 py-4 w-1/3 text-left font-semibold">Modelo do Aparelho</th>
                      <th className="border border-blue-500 px-6 py-4 w-2/3 text-left font-semibold">Tela Compatível</th>
                    </tr>
                  </thead>
                  <tbody>
                    {exibidosTelas.map((item: any, i: number) => (
                      <tr key={i} className="odd:bg-white even:bg-blue-50">
                        <td className="border border-blue-500 px-6 py-4 font-medium text-gray-800">{item.modelo}</td>
                        <td className="border border-blue-500 px-6 py-4 text-gray-700">{item.compatibilidade}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="w-full flex flex-col md:flex-row justify-center items-center gap-4 mt-8">
                  <a href="https://telaprimeexpress.com/products/sm-a21s-premier-ori-preto?_pos=1&_sid=9696df1f6&_ss=r" target="_blank" rel="noopener noreferrer">
                    <img src="/a21s.jpeg" alt="Samsung A21S - Tela Prime" width={200} height={300} className="rounded-xl shadow-md hover:scale-105 transition-transform" />
                  </a>
                  <a href="https://telaprimeexpress.com/products/ip-11-pro-max-troca-ci-oled-preto?_pos=1&_sid=27d78e086&_ss=r" target="_blank" rel="noopener noreferrer">
                    <img src="/11 pro max olled.jpeg" alt="iPhone 11 Pro Max OLED - Tela Prime" width={200} height={300} className="rounded-xl shadow-md hover:scale-105 transition-transform" />
                  </a>
                  <a href="https://telaprimeexpress.com/products/sm-a14-4g-com-aro-select-preto?_pos=3&_sid=ba3b42fec&_ss=r" target="_blank" rel="noopener noreferrer">
                    <img src="/a14.jpeg" alt="Samsung A14 4G - Tela Prime" width={200} height={300} className="rounded-xl shadow-md hover:scale-105 transition-transform" />
                  </a>
                </div>
                <div className="flex justify-center mt-6">
                  <a href="https://telaprimeexpress.com/" target="_blank" rel="noopener noreferrer" className="bg-blue-800 hover:bg-blue-900 text-white font-bold px-8 py-4 rounded-full text-lg">
                    VER NA TELA PRIME EXPRESS
                  </a>
                </div>
              </div>
            </div>
          </section>

          <div className="space-y-6">
            <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-200 max-w-sm mx-auto">
              <h3 className="text-xl font-bold text-center text-gray-800 mb-4">O que dizem nossos usuários</h3>
              
              <div className="space-y-4">
                <div className="bg-gray-50 p-4 rounded-lg border-l-4 border-gray-400">
                  <p className="text-sm text-gray-700 italic">"Cara, salvou minha vida! Não erro mais película aqui na loja"</p>
                  <p className="text-xs text-gray-600 font-semibold mt-2">- João Silva, Caxias</p>
                </div>
                
                <div className="bg-gray-50 p-4 rounded-lg border-l-4 border-gray-400">
                  <p className="text-sm text-gray-700 italic">"Agora não preciso mais ficar perguntando pro cliente qual o modelo dele rsrs"</p>
                  <p className="text-xs text-gray-600 font-semibold mt-2">- Maria Santos, Juazeiro</p>
                </div>
                
                <div className="bg-gray-50 p-4 rounded-lg border-l-4 border-gray-400">
                  <p className="text-sm text-gray-700 italic">"Muito bom mesmo, uso todo dia na assistência"</p>
                  <p className="text-xs text-gray-600 font-semibold mt-2">- Carlos Lima, Belo Horizonte</p>
                </div>
              </div>
            </div>

            <div className="bg-black text-white rounded-xl p-6 text-center shadow-lg max-w-sm mx-auto">
              <h2 className="text-2xl font-bold text-yellow-400 mb-2">Lista VIP Mensal</h2>
              <Image
                src="/lista-vip.png"
                alt="Imagem Lista VIP"
                width={700}
                height={800}
                className="mx-auto mb-2 rounded-md"
              />
              <p className="text-lg font-semibold mb-1">Tenha acesso a 100% da nossa lista</p>
              <p className="text-sm text-gray-300 mb-3">Sistema integrado com Supabase - Seguro e confiável</p>
              <p className="text-xl text-green-400 font-bold mb-1">Apenas R$ 7,70/mês</p>
              {!isLoggedIn ? (
                <a
                  href="/checkout-vip"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 bg-yellow-400 text-black font-bold py-2 px-6 rounded-full hover:bg-yellow-300 transition inline-block"
                >
                  Adquira já
                </a>
              ) : (
                <a
                  href="/checkout-vip"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 bg-yellow-400 text-black font-bold py-2 px-6 rounded-full hover:bg-yellow-300 transition inline-block"
                >
                  Adquira já
                </a>
              )}
              
              <div className="mt-3">
                <a
                  href="/como-funciona"
                  className="bg-gradient-to-r from-green-600 to-green-700 text-white px-5 py-2 rounded-full font-semibold hover:from-green-700 hover:to-green-800 transition-all duration-300 inline-block animate-pulse shadow-lg"
                >
                  VIP grátis disponível para novos clientes
                </a>
              </div>
            </div>

            <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white rounded-xl p-6 text-center shadow-md max-w-sm mx-auto">
              <h3 className="text-xl font-bold mb-2">Promoção por Tempo Limitado</h3>
              <p className="text-base font-medium">
                Na sua <strong>primeira compra</strong> no site 
                <a href="https://telaprimeexpress.com" target="_blank" className="text-cyan-300 font-bold underline mx-1">
                  telaprimeexpress.com
                </a>
                você ganha <strong>1 mês de acesso VIP</strong> totalmente grátis!
              </p>
              <p className="text-sm mt-3 text-blue-100">*Oferta válida apenas para novos clientes</p>
              <a
                href="/como-funciona"
                className="inline-block text-base underline font-bold text-cyan-300 hover:text-cyan-200 transition mt-3"
              >
                Saiba como funciona
              </a>
            </div>

            <div className="h-[750px]"></div>

            <div className="bg-gradient-to-br from-orange-500 to-orange-600 text-white rounded-xl p-6 text-center shadow-lg max-w-sm mx-auto">
              <h3 className="text-xl font-bold mb-2">🔥 OFERTA IMPERDÍVEL!</h3>
              <h4 className="text-base font-semibold mb-3">Tela Samsung Galaxy A32 4G Com Aro</h4>
              
              <div className="flex justify-center mb-4">
                <img 
                  src="/a32.jpeg" 
                  alt="Tela Samsung A32" 
                  className="w-32 h-48 object-cover rounded-2xl shadow-md"
                />
              </div>
              
              <div className="bg-white rounded-lg p-3 mb-3">
                <p className="text-xs line-through opacity-80 text-gray-500">De R$ 89,90</p>
                <p className="text-2xl font-bold text-orange-600">R$ 84,90</p>
                <span className="bg-green-500 text-white px-2 py-1 rounded-full text-xs font-bold">
                  ECONOMIZE R$ 5,00
                </span>
              </div>
              
              <div className="bg-yellow-400 text-black rounded-lg p-2 mb-3">
                <p className="text-xs font-bold">COMPRE E GANHE:</p>
                <p className="text-sm font-extrabold">1 MÊS LISTA VIP GRÁTIS</p>
              </div>
              
              <a 
                href="https://telaprimeexpress.com/collections/promocao-do-dia/products/sm-a32-4g-com-aro-lcd-preto" 
                target="_blank" 
                rel="noopener noreferrer"
                className="block w-full bg-white text-orange-600 font-bold py-2 px-4 rounded-full hover:bg-gray-100 transition-all duration-300 text-center text-sm hover:scale-105 hover:shadow-lg transform animate-pulse hover:animate-none"
              >
                COMPRAR COM DESCONTO
              </a>
              
              <p className="text-xs mt-2 opacity-75">
                ✅ Qualidade premium garantida<br/>
                🚚 Entrega rápida para todo Brasil
              </p>
            </div>
          </div>
        </main>

        <footer className="mt-6 text-center text-sm text-gray-600">
          <p>
            Sistema powered by Supabase - Confira nossa loja de telas:{" "}
            <a href="https://telaprimeexpress.com" target="_blank" className="text-blue-800 underline">Tela Prime Express</a>
          </p>
        </footer>
      </div>
      
      {message.text && (
        <div className={`fixed top-20 left-1/2 transform -translate-x-1/2 z-40 p-4 rounded-lg shadow-lg ${
          message.type === 'error' ? 'bg-red-500 text-white' : 'bg-green-500 text-white'
        }`}>
          {message.text}
        </div>
      )}
      
      <LoginModal 
        show={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        message={message}
        setMessage={setMessage}
      />
      
      <RegisterModal 
        show={showRegisterModal}
        onClose={() => setShowRegisterModal(false)}
        message={message}
        setMessage={setMessage}
      />
      
      <ForgotPasswordModal 
        show={showForgotModal}
        onClose={() => setShowForgotModal(false)}
        message={message}
        setMessage={setMessage}
      />

      {showBackToTop && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-6 right-6 z-50 bg-blue-800 hover:bg-blue-900 text-white p-3 rounded-full shadow-lg transition-all duration-300 hover:scale-110"
          aria-label="Voltar ao topo"
        >
          <ArrowDown className="w-6 h-6 rotate-180" />
        </button>
      )}
    </div>
  );
}