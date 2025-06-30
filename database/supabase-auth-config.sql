-- ============================================================================
-- CONFIGURAÇÕES DE AUTENTICAÇÃO VIA SQL
-- Execute este script no SQL Editor do Supabase
-- ============================================================================

-- ATENÇÃO: Algumas configurações só podem ser feitas no painel web do Supabase
-- Este script faz o que é possível via SQL

-- ============================================================================
-- 1. CONFIGURAÇÕES QUE PODEM SER FEITAS VIA SQL
-- ============================================================================

-- Desabilitar confirmação de email (se possível via SQL)
-- NOTA: Esta configuração normalmente precisa ser feita no painel web
UPDATE auth.config 
SET 
  enable_signup = true,
  enable_confirmations = false
WHERE true;

-- Verificar configurações atuais
SELECT * FROM auth.config;

-- ============================================================================
-- 2. CONFIGURAR SITE_URL E REDIRECT_URLS (se possível)
-- ============================================================================

-- Tentar configurar site_url
INSERT INTO auth.config (site_url) 
VALUES ('https://seu-site.vercel.app')
ON CONFLICT (site_url) DO UPDATE SET site_url = EXCLUDED.site_url;

-- ============================================================================
-- 3. VERIFICAR SE AS TABELAS AUTH ESTÃO CORRETAS
-- ============================================================================

-- Verificar estrutura da tabela auth.users
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_schema = 'auth' 
  AND table_name = 'users'
ORDER BY ordinal_position;

-- ============================================================================
-- 4. CONFIGURAÇÕES ALTERNATIVAS VIA ENVIRONMENT
-- ============================================================================

-- Estas configurações devem ser feitas via variáveis de ambiente ou painel:
SELECT 'CONFIGURAÇÕES QUE DEVEM SER FEITAS NO PAINEL WEB:' as aviso;
SELECT '1. Authentication > Settings > Confirm email = false' as config_1;
SELECT '2. Authentication > Settings > Enable signup = true' as config_2;
SELECT '3. Authentication > Providers > Email > Confirm email = false' as config_3;

-- ============================================================================
-- 5. VERIFICAR SE AUTH ESTÁ FUNCIONANDO
-- ============================================================================

-- Contar usuários existentes
SELECT 
  'Total de usuários na auth.users:' as info,
  COUNT(*) as total
FROM auth.users;

-- Verificar últimos usuários registrados
SELECT 
  id,
  email,
  email_confirmed_at,
  created_at,
  raw_user_meta_data->>'name' as name
FROM auth.users 
ORDER BY created_at DESC 
LIMIT 5;

-- ============================================================================
-- 6. TESTAR TRIGGER DE CRIAÇÃO DE PERFIL
-- ============================================================================

-- Verificar se existe discrepância entre auth.users e profiles
WITH auth_count AS (
  SELECT COUNT(*) as auth_total FROM auth.users
),
profile_count AS (
  SELECT COUNT(*) as profile_total FROM profiles  
)
SELECT 
  auth_total,
  profile_total,
  CASE 
    WHEN auth_total = profile_total THEN '✅ Números coincidem - Trigger funcionando'
    ELSE '❌ Discrepância encontrada - Verificar trigger'
  END as status
FROM auth_count, profile_count;

-- Listar usuários sem perfil (se houver)
SELECT 
  u.id,
  u.email,
  u.created_at
FROM auth.users u
LEFT JOIN profiles p ON u.id = p.id
WHERE p.id IS NULL;

-- ============================================================================
-- 7. FUNÇÃO PARA TESTAR REGISTRO MANUAL (PARA DEBUG)
-- ============================================================================

-- Função para simular criação de usuário (APENAS PARA TESTE)
CREATE OR REPLACE FUNCTION test_user_creation()
RETURNS TEXT AS $$
DECLARE
  test_result TEXT;
BEGIN
  -- Esta função é apenas para teste - NÃO usar em produção
  
  test_result := 'Trigger de criação de perfil está ativo: ';
  
  -- Verificar se trigger existe
  IF EXISTS (
    SELECT 1 FROM pg_trigger t
    JOIN pg_class c ON t.tgrelid = c.oid
    WHERE c.relname = 'users' 
      AND c.relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'auth')
      AND t.tgname = 'create_profile_trigger'
  ) THEN
    test_result := test_result || '✅ SIM';
  ELSE
    test_result := test_result || '❌ NÃO';
  END IF;
  
  RETURN test_result;
END;
$$ LANGUAGE plpgsql;

-- Executar teste
SELECT test_user_creation();

-- ============================================================================
-- 8. SCRIPT PARA CORRIGIR USUÁRIOS EXISTENTES SEM PERFIL
-- ============================================================================

-- Criar perfis para usuários existentes que não têm perfil
INSERT INTO profiles (id, email, name, created_at)
SELECT 
  u.id,
  u.email,
  COALESCE(u.raw_user_meta_data->>'name', split_part(u.email, '@', 1)),
  u.created_at
FROM auth.users u
LEFT JOIN profiles p ON u.id = p.id
WHERE p.id IS NULL;

-- Verificar se a correção funcionou
SELECT 'Usuários corrigidos:' as info, COUNT(*) as total
FROM profiles p
INNER JOIN auth.users u ON p.id = u.id;

-- ============================================================================
-- 9. CONFIGURAÇÕES ESPECÍFICAS DO PROJETO
-- ============================================================================

-- Verificar se todas as tabelas necessárias existem
SELECT 
  table_name,
  CASE 
    WHEN table_name IN ('profiles', 'vip_payments', 'usuarios_vip') THEN '✅'
    ELSE '❌'
  END as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('profiles', 'vip_payments', 'usuarios_vip')
ORDER BY table_name;

-- ============================================================================
-- 10. INSTRUÇÕES FINAIS
-- ============================================================================

SELECT '============================================================================' as divisor;
SELECT 'CONFIGURAÇÕES QUE DEVEM SER FEITAS NO PAINEL WEB DO SUPABASE:' as titulo;
SELECT '============================================================================' as divisor2;

SELECT 'Acesse o painel do Supabase e configure:' as instrucao_1;
SELECT '' as espaco1;
SELECT '1. Authentication > Settings > Auth' as passo_1;
SELECT '   - Enable email confirmations: DESABILITAR' as passo_1a;
SELECT '   - Enable email change confirmations: DESABILITAR' as passo_1b;
SELECT '   - Site URL: https://seu-site.vercel.app' as passo_1c;
SELECT '' as espaco2;
SELECT '2. Authentication > Providers > Email' as passo_2;
SELECT '   - Enable email provider: HABILITAR' as passo_2a;
SELECT '   - Confirm email: DESABILITAR' as passo_2b;
SELECT '' as espaco3;
SELECT '3. Variáveis de ambiente na Vercel:' as passo_3;
SELECT '   - NEXT_PUBLIC_SUPABASE_URL' as passo_3a;
SELECT '   - NEXT_PUBLIC_SUPABASE_ANON_KEY' as passo_3b;
SELECT '   - SUPABASE_SERVICE_ROLE_KEY' as passo_3c;
SELECT '' as espaco4;
SELECT '4. Fazer novo deploy na Vercel após as mudanças' as passo_4;
SELECT '' as espaco5;
SELECT 'RAZÃO: Algumas configurações de auth só podem ser alteradas via painel web' as motivo;

-- ============================================================================
-- VERIFICAÇÃO FINAL
-- ============================================================================

SELECT '============================================================================' as final_divisor;
SELECT 'STATUS ATUAL DO SETUP:' as final_titulo;
SELECT '============================================================================' as final_divisor2;

-- Resumo do que foi configurado via SQL
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles')
    THEN '✅ Tabelas criadas'
    ELSE '❌ Tabelas não criadas'
  END as tabelas;

SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_trigger t
      JOIN pg_class c ON t.tgrelid = c.oid
      WHERE c.relname = 'users' 
        AND c.relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'auth')
        AND t.tgname = 'create_profile_trigger'
    )
    THEN '✅ Trigger de perfil ativo'
    ELSE '❌ Trigger de perfil não encontrado'
  END as trigger_status;

SELECT 
  CASE 
    WHEN (SELECT rowsecurity FROM pg_tables WHERE tablename = 'profiles') = true
    THEN '✅ RLS configurado'
    ELSE '❌ RLS não configurado'
  END as rls_status;

SELECT 'Próximo passo: Configurar no painel web e fazer deploy!' as proximo_passo;