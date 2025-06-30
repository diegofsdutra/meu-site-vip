-- Verificação do Setup do Supabase
-- Execute este script no SQL Editor para verificar se tudo está configurado corretamente


-- ============================================================================
-- 1. VERIFICAR SE AS TABELAS EXISTEM
-- ============================================================================

SELECT 'Verificando tabelas existentes...' as status;

SELECT table_name, table_type 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('profiles', 'vip_payments', 'usuarios_vip')
ORDER BY table_name;


-- ============================================================================  
-- 2. VERIFICAR SE RLS ESTÁ HABILITADO
-- ============================================================================

SELECT 'Verificando Row Level Security...' as status;

SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename IN ('profiles', 'vip_payments', 'usuarios_vip')
ORDER BY tablename;


-- ============================================================================
-- 3. VERIFICAR POLÍTICAS RLS
-- ============================================================================

SELECT 'Verificando políticas RLS...' as status;

SELECT 
  schemaname,
  tablename,
  policyname,
  cmd as permissions
FROM pg_policies 
WHERE tablename IN ('profiles', 'vip_payments', 'usuarios_vip')
ORDER BY tablename, policyname;


-- ============================================================================
-- 4. VERIFICAR TRIGGERS
-- ============================================================================

SELECT 'Verificando triggers...' as status;

SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_timing,
  action_statement
FROM information_schema.triggers 
WHERE event_object_table IN ('profiles', 'vip_payments', 'usuarios_vip', 'users')
  OR trigger_name LIKE '%profile%'
ORDER BY event_object_table, trigger_name;


-- ============================================================================
-- 5. VERIFICAR FUNÇÕES PERSONALIZADAS
-- ============================================================================

SELECT 'Verificando funções personalizadas...' as status;

SELECT 
  proname as function_name,
  pronargs as num_args,
  prorettype::regtype as return_type
FROM pg_proc 
WHERE proname IN (
  'create_profile_for_user',
  'activate_vip_on_payment', 
  'update_updated_at_column',
  'get_my_vip_status',
  'is_admin'
)
ORDER BY proname;


-- ============================================================================
-- 6. VERIFICAR SE AUTH.USERS TEM O TRIGGER
-- ============================================================================

SELECT 'Verificando trigger na tabela auth.users...' as status;

SELECT 
  t.tgname as trigger_name,
  c.relname as table_name,
  p.proname as function_name
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE c.relname = 'users' 
  AND c.relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'auth')
  AND t.tgname LIKE '%profile%';


-- ============================================================================
-- 7. VERIFICAR USUÁRIOS EXISTENTES (SAMPLE)
-- ============================================================================

SELECT 'Verificando usuários existentes (sample)...' as status;

-- Contar usuários na tabela auth
SELECT 
  'auth.users' as table_name,
  COUNT(*) as total_records
FROM auth.users;

-- Contar profiles
SELECT 
  'profiles' as table_name,
  COUNT(*) as total_records  
FROM profiles;

-- Verificar se números batem
SELECT 
  CASE 
    WHEN (SELECT COUNT(*) FROM auth.users) = (SELECT COUNT(*) FROM profiles)
    THEN '✅ Número de usuários e profiles coincide'
    ELSE '❌ Usuários e profiles não coincidem - trigger pode não estar funcionando'
  END as trigger_status;


-- ============================================================================
-- 8. TESTAR CRIAÇÃO DE PERFIL (SIMULAÇÃO)
-- ============================================================================

SELECT 'Para testar o sistema:' as instrucoes;
SELECT '1. Vá para seu site' as passo_1;
SELECT '2. Crie uma nova conta' as passo_2; 
SELECT '3. Execute: SELECT * FROM profiles ORDER BY created_at DESC LIMIT 5;' as passo_3;
SELECT '4. Execute: SELECT email, created_at FROM auth.users ORDER BY created_at DESC LIMIT 5;' as passo_4;


-- ============================================================================
-- 9. VERIFICAR CONFIGURAÇÕES AUTH NO SUPABASE
-- ============================================================================

SELECT 'IMPORTANTE: Verificar no painel do Supabase:' as config_manual;
SELECT 'Authentication > Settings > Confirm email = DESABILITADO' as config_1;
SELECT 'Authentication > Providers > Email > Confirm email = DESABILITADO' as config_2;


-- ============================================================================
-- 10. RESUMO FINAL
-- ============================================================================

SELECT '============================================================================' as divisor;
SELECT 'RESUMO DA VERIFICAÇÃO' as titulo;
SELECT '============================================================================' as divisor2;

-- Verificação das tabelas principais
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles')
    THEN '✅ Tabela profiles existe'
    ELSE '❌ Tabela profiles não existe'
  END as check_profiles;

SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'vip_payments') 
    THEN '✅ Tabela vip_payments existe'
    ELSE '❌ Tabela vip_payments não existe'
  END as check_vip_payments;

-- Verificação do trigger
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_trigger t
      JOIN pg_class c ON t.tgrelid = c.oid
      WHERE c.relname = 'users' 
        AND c.relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'auth')
        AND t.tgname = 'create_profile_trigger'
    )
    THEN '✅ Trigger de criação de perfil está ativo'
    ELSE '❌ Trigger de criação de perfil não encontrado'
  END as check_trigger;

-- Verificação do RLS
SELECT 
  CASE 
    WHEN (SELECT rowsecurity FROM pg_tables WHERE tablename = 'profiles') = true
    THEN '✅ RLS habilitado na tabela profiles'  
    ELSE '❌ RLS não habilitado na tabela profiles'
  END as check_rls;

SELECT '============================================================================' as fim;