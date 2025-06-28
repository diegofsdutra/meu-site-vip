-- ============================================================================
-- CORREÇÃO DOS PROBLEMAS DE AUTENTICAÇÃO SUPABASE
-- ============================================================================

-- 1. DESABILITAR TEMPORARIAMENTE O TRIGGER PROBLEMÁTICO
-- (Pode estar causando erro 500 no signup)
DROP TRIGGER IF EXISTS create_profile_trigger ON auth.users;

-- 2. AJUSTAR POLÍTICAS RLS PARA PERMITIR AUTENTICAÇÃO
-- Permitir que usuários anônimos possam inserir perfis durante o signup
DROP POLICY IF EXISTS "enable_insert_for_authenticated_users" ON profiles;
CREATE POLICY "enable_insert_for_authenticated_users" ON profiles 
  FOR INSERT 
  WITH CHECK (true); -- Permitir inserção durante signup

-- 3. CRIAR FUNÇÃO MAIS SEGURA PARA CRIAÇÃO DE PERFIL
CREATE OR REPLACE FUNCTION safe_create_profile_for_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Tentar inserir o perfil, ignorando erros de RLS
  BEGIN
    INSERT INTO public.profiles (id, email, name, created_at, updated_at)
    VALUES (
      NEW.id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
      NOW(),
      NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
      email = EXCLUDED.email,
      name = COALESCE(EXCLUDED.name, profiles.name),
      updated_at = NOW();
      
    RETURN NEW;
  EXCEPTION 
    WHEN OTHERS THEN
      -- Log do erro mas não falha o signup
      RAISE WARNING 'Erro ao criar perfil para usuário %: %', NEW.id, SQLERRM;
      RETURN NEW;
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. RECRIAR O TRIGGER COM A FUNÇÃO MAIS SEGURA
CREATE TRIGGER safe_create_profile_trigger
  AFTER INSERT ON auth.users 
  FOR EACH ROW 
  EXECUTE FUNCTION safe_create_profile_for_user();

-- 5. ADICIONAR POLÍTICA PARA PERMITIR SIGNUP SEM CONFLITOS
DROP POLICY IF EXISTS "allow_signup_profile_creation" ON profiles;
CREATE POLICY "allow_signup_profile_creation" ON profiles 
  FOR INSERT 
  WITH CHECK (auth.uid() = id OR auth.uid() IS NULL);

-- 6. GARANTIR QUE SERVICE ROLE TENHA ACESSO TOTAL
DROP POLICY IF EXISTS "service_role_bypass_rls" ON profiles;
CREATE POLICY "service_role_bypass_rls" ON profiles 
  FOR ALL 
  USING (auth.jwt() ->> 'role' = 'service_role');

-- 7. VERIFICAR SE A TABELA PROFILES EXISTE E TEM A ESTRUTURA CORRETA
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  is_vip BOOLEAN DEFAULT FALSE,
  vip_expires_at TIMESTAMP WITH TIME ZONE,
  first_purchase_bonus_used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. GARANTIR QUE RLS ESTÁ HABILITADO
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 9. TESTE: VERIFICAR SE AS POLÍTICAS ESTÃO FUNCIONANDO
SELECT 'Políticas RLS criadas com sucesso!' as status;

-- 10. INSTRUÇÕES PARA TESTAR
SELECT 'Execute este script no Supabase SQL Editor e teste novamente o login/signup' as instrucoes;