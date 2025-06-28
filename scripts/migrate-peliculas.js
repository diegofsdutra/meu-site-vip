#!/usr/bin/env node

/**
 * Script para migrar dados de películas do JSON para Supabase
 * 
 * Para executar:
 * node scripts/migrate-peliculas.js
 * 
 * Ou via npm:
 * npm run migrate-peliculas
 */

const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log(`
🎬 MIGRAÇÃO DE PELÍCULAS PARA SUPABASE
=====================================

Este script irá:
1. Criar a tabela 'peliculas_3d' no Supabase
2. Migrar todos os dados do arquivo JSON
3. Configurar 20% como dados gratuitos e 80% como VIP
4. Criar índices para melhor performance

⚠️  IMPORTANTE: Execute este script apenas UMA VEZ
⚠️  Certifique-se de que o servidor Next.js está rodando (npm run dev)

Dados atuais:
- 490 registros no arquivo JSON
- 98 registros serão gratuitos (20%)
- 392 registros serão VIP (80%)
`);

function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, resolve);
  });
}

async function runMigration() {
  try {
    const confirm = await askQuestion('Deseja continuar com a migração? (s/N): ');
    
    if (confirm.toLowerCase() !== 's') {
      console.log('❌ Migração cancelada pelo usuário');
      rl.close();
      return;
    }

    console.log('🚀 Iniciando migração...');

    // Fazer requisição para a API de migração
    const response = await fetch('http://localhost:3000/api/peliculas', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'migrate',
        adminKey: 'migrate_peliculas_2024'
      })
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.error || 'Erro na migração');
    }

    console.log('✅ MIGRAÇÃO CONCLUÍDA COM SUCESSO!');
    console.log(`📊 Total de registros migrados: ${result.totalInserted}`);
    console.log('');
    console.log('🎯 Próximos passos:');
    console.log('1. Verificar dados no painel do Supabase');
    console.log('2. Testar a busca VIP/não-VIP no site');
    console.log('3. Configurar Row Level Security (RLS) se necessário');
    console.log('');
    console.log('🔗 Painel Supabase: https://supabase.com/dashboard');

  } catch (error) {
    console.error('❌ ERRO NA MIGRAÇÃO:', error.message);
    console.log('');
    console.log('🔧 Soluções possíveis:');
    console.log('1. Certifique-se de que o servidor Next.js está rodando');
    console.log('2. Verifique as credenciais do Supabase');
    console.log('3. Verifique a conexão com internet');
    console.log('4. Execute: npm run dev (em outro terminal)');
  } finally {
    rl.close();
  }
}

// Verificar se fetch está disponível (Node.js 18+)
if (typeof fetch === 'undefined') {
  console.error('❌ Este script requer Node.js 18+ ou instale node-fetch');
  console.log('Upgrade Node.js: https://nodejs.org/');
  process.exit(1);
}

// Executar migração
runMigration();