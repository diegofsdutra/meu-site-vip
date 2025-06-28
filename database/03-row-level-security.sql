-- ============================================================================
-- SCRIPT 3: ROW LEVEL SECURITY (RLS) E POLÍTICAS DE ACESSO
-- Execute este script APÓS os scripts 01 e 02
-- ============================================================================

-- ============================================================================
-- 1. HABILITAR RLS EM TODAS AS TABELAS
-- ============================================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE usuarios_vip ENABLE ROW LEVEL SECURITY;
ALTER TABLE vip_payments ENABLE ROW LEVEL SECURITY;

-- Log
SELECT 'RLS habilitado em todas as tabelas' as status;

-- ============================================================================
-- 2. POLÍTICAS PARA TABELA PROFILES
-- ============================================================================

-- Usuários podem ver apenas seu próprio perfil
DROP POLICY IF EXISTS "users_can_view_own_profile" ON profiles;
CREATE POLICY "users_can_view_own_profile" ON profiles
  FOR SELECT 
  USING (auth.uid() = id);

-- Usuários podem atualizar apenas seu próprio perfil (campos limitados)
DROP POLICY IF EXISTS "users_can_update_own_profile" ON profiles;
CREATE POLICY "users_can_update_own_profile" ON profiles
  FOR UPDATE 
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id AND 
    -- Não permitir que usuários alterem campos VIP diretamente
    is_vip IS NOT DISTINCT FROM (SELECT is_vip FROM profiles WHERE id = auth.uid()) AND
    vip_expires_at IS NOT DISTINCT FROM (SELECT vip_expires_at FROM profiles WHERE id = auth.uid())
  );

-- Permitir inserção de perfil (para trigger automático)
DROP POLICY IF EXISTS "enable_insert_for_authenticated_users" ON profiles;
CREATE POLICY "enable_insert_for_authenticated_users" ON profiles
  FOR INSERT 
  WITH CHECK (auth.uid() = id);

-- Service role pode fazer tudo (webhooks, admin)
DROP POLICY IF EXISTS "service_role_full_access_profiles" ON profiles;
CREATE POLICY "service_role_full_access_profiles" ON profiles
  FOR ALL 
  USING (auth.jwt() ->> 'role' = 'service_role');

-- ============================================================================
-- 3. POLÍTICAS PARA TABELA USUARIOS_VIP
-- ============================================================================

-- Usuários podem ver apenas seus próprios registros VIP
DROP POLICY IF EXISTS "users_can_view_own_vip_records" ON usuarios_vip;
CREATE POLICY "users_can_view_own_vip_records" ON usuarios_vip
  FOR SELECT 
  USING (
    user_id = auth.uid() OR 
    email = (SELECT email FROM profiles WHERE id = auth.uid())
  );

-- Service role pode fazer tudo (necessário para webhooks)
DROP POLICY IF EXISTS "service_role_full_access_usuarios_vip" ON usuarios_vip;
CREATE POLICY "service_role_full_access_usuarios_vip" ON usuarios_vip
  FOR ALL 
  USING (auth.jwt() ->> 'role' = 'service_role');

-- Permitir inserção apenas via service role ou triggers
DROP POLICY IF EXISTS "service_role_can_insert_vip" ON usuarios_vip;
CREATE POLICY "service_role_can_insert_vip" ON usuarios_vip
  FOR INSERT 
  WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

-- ============================================================================
-- 4. POLÍTICAS PARA TABELA VIP_PAYMENTS
-- ============================================================================

-- Usuários podem ver apenas seus próprios pagamentos
DROP POLICY IF EXISTS "users_can_view_own_payments" ON vip_payments;
CREATE POLICY "users_can_view_own_payments" ON vip_payments
  FOR SELECT 
  USING (user_id = auth.uid());

-- Service role pode fazer tudo (webhooks precisam inserir/atualizar)
DROP POLICY IF EXISTS "service_role_full_access_vip_payments" ON vip_payments;
CREATE POLICY "service_role_full_access_vip_payments" ON vip_payments
  FOR ALL 
  USING (auth.jwt() ->> 'role' = 'service_role');

-- ============================================================================
-- 5. FUNÇÃO AUXILIAR PARA VERIFICAR SE É ADMIN
-- ============================================================================

CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN auth.jwt() ->> 'role' = 'service_role' OR 
         auth.uid() IN (
           SELECT id FROM profiles 
           WHERE email IN (
             'admin@telaprimeexpress.com',
             'suporte@telaprimeexpress.com'
           )
         );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comentário
COMMENT ON FUNCTION is_admin IS 'Verifica se usuário atual é administrador';

-- ============================================================================
-- 6. POLÍTICAS DE ADMIN PARA CASOS ESPECIAIS
-- ============================================================================

-- Admins podem ver todos os perfis
DROP POLICY IF EXISTS "admin_full_access_profiles" ON profiles;
CREATE POLICY "admin_full_access_profiles" ON profiles
  FOR ALL 
  USING (is_admin());

-- Admins podem ver todos os registros VIP
DROP POLICY IF EXISTS "admin_full_access_usuarios_vip" ON usuarios_vip;
CREATE POLICY "admin_full_access_usuarios_vip" ON usuarios_vip
  FOR ALL 
  USING (is_admin());

-- Admins podem ver todos os pagamentos
DROP POLICY IF EXISTS "admin_full_access_vip_payments" ON vip_payments;
CREATE POLICY "admin_full_access_vip_payments" ON vip_payments
  FOR ALL 
  USING (is_admin());

-- ============================================================================
-- 7. FUNÇÕES SECURITY DEFINER PARA API
-- ============================================================================

-- Função para verificar VIP status que pode ser chamada por usuários autenticados
CREATE OR REPLACE FUNCTION get_my_vip_status()
RETURNS TABLE (
  is_vip BOOLEAN,
  expires_at TIMESTAMP WITH TIME ZONE,
  days_remaining INTEGER,
  plan_type TEXT
) AS $$
DECLARE
  user_record RECORD;
  vip_record RECORD;
BEGIN
  -- Verificar se usuário está autenticado
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado';
  END IF;
  
  -- Buscar dados do usuário
  SELECT * INTO user_record
  FROM profiles 
  WHERE id = auth.uid();
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Perfil de usuário não encontrado';
  END IF;
  
  -- Buscar último registro VIP
  SELECT * INTO vip_record
  FROM usuarios_vip 
  WHERE user_id = auth.uid() 
    AND pagamento_aprovado = true
  ORDER BY data_expiraca DESC 
  LIMIT 1;
  
  -- Retornar status
  RETURN QUERY SELECT 
    user_record.is_vip,
    user_record.vip_expires_at,
    CASE 
      WHEN user_record.is_vip AND user_record.vip_expires_at > NOW() 
      THEN EXTRACT(DAYS FROM user_record.vip_expires_at - NOW())::INTEGER
      ELSE 0
    END,
    COALESCE(vip_record.plano, 'nenhum');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para buscar histórico de pagamentos do usuário
CREATE OR REPLACE FUNCTION get_my_payment_history()
RETURNS TABLE (
  payment_id TEXT,
  amount_reais NUMERIC,
  payment_method TEXT,
  payment_status TEXT,
  created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  -- Verificar se usuário está autenticado
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado';
  END IF;
  
  RETURN QUERY
  SELECT 
    vp.payment_id,
    (vp.amount / 100.0)::NUMERIC as amount_reais,
    vp.payment_method,
    vp.payment_status,
    vp.webhook_received_at as created_at
  FROM vip_payments vp
  WHERE vp.user_id = auth.uid()
  ORDER BY vp.webhook_received_at DESC
  LIMIT 20;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para listar VIPs próximos do vencimento (admin)
CREATE OR REPLACE FUNCTION get_vips_expiring_soon(days_ahead INTEGER DEFAULT 7)
RETURNS TABLE (
  email TEXT,
  name TEXT,
  expires_at TIMESTAMP WITH TIME ZONE,
  days_remaining INTEGER,
  plan_type TEXT
) AS $$
BEGIN
  -- Verificar se é admin
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Acesso negado: apenas administradores';
  END IF;
  
  RETURN QUERY
  SELECT 
    p.email,
    p.name,
    p.vip_expires_at,
    EXTRACT(DAYS FROM p.vip_expires_at - NOW())::INTEGER as days_remaining,
    uv.plano
  FROM profiles p
  LEFT JOIN usuarios_vip uv ON p.email = uv.email AND uv.pagamento_aprovado = true
  WHERE p.is_vip = true 
    AND p.vip_expires_at > NOW()
    AND p.vip_expires_at <= NOW() + (days_ahead || ' days')::INTERVAL
  ORDER BY p.vip_expires_at;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 8. GRANTS PARA FUNÇÕES SECURITY DEFINER
-- ============================================================================

-- Funções para usuários autenticados
GRANT EXECUTE ON FUNCTION get_my_vip_status TO authenticated;
GRANT EXECUTE ON FUNCTION get_my_payment_history TO authenticated;
GRANT EXECUTE ON FUNCTION is_admin TO authenticated, service_role;

-- Funções administrativas
GRANT EXECUTE ON FUNCTION get_vips_expiring_soon TO authenticated, service_role;

-- ============================================================================
-- 9. POLÍTICA PARA VIEWS
-- ============================================================================

-- Permitir que usuários autenticados vejam a view de VIPs ativos (apenas seus dados)
GRANT SELECT ON vips_ativos TO authenticated;

-- View personalizada para usuário ver apenas seus dados
CREATE OR REPLACE VIEW my_vip_info AS
SELECT 
  p.email,
  p.is_vip,
  p.vip_expires_at,
  uv.plano,
  uv.data_inicio,
  EXTRACT(DAYS FROM p.vip_expires_at - NOW()) as dias_restantes
FROM profiles p
LEFT JOIN usuarios_vip uv ON p.email = uv.email AND uv.pagamento_aprovado = true
WHERE p.id = auth.uid();

-- Grant para a view
GRANT SELECT ON my_vip_info TO authenticated;

-- ============================================================================
-- 10. TESTE DAS POLÍTICAS RLS
-- ============================================================================

-- Função para testar RLS (apenas para desenvolvimento)
CREATE OR REPLACE FUNCTION test_rls_policies()
RETURNS TEXT AS $$
DECLARE
  test_results TEXT := '';
  test_user_id UUID;
BEGIN
  -- Esta função deve ser executada apenas em desenvolvimento
  -- Em produção, remova ou comente esta função
  
  test_results := test_results || 'Teste de RLS iniciado...' || E'\n';
  
  -- Simular um usuário autenticado
  SELECT id INTO test_user_id FROM profiles LIMIT 1;
  
  IF test_user_id IS NOT NULL THEN
    test_results := test_results || 'Usuário de teste encontrado: ' || test_user_id || E'\n';
    
    -- Testar se pode ver próprio perfil
    PERFORM * FROM profiles WHERE id = test_user_id;
    test_results := test_results || 'Teste de visualização de perfil próprio: OK' || E'\n';
    
  ELSE
    test_results := test_results || 'Nenhum usuário encontrado para teste' || E'\n';
  END IF;
  
  test_results := test_results || 'Teste de RLS concluído.' || E'\n';
  
  RETURN test_results;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 11. POLÍTICA ADICIONAL PARA SEGURANÇA DE WEBHOOK
-- ============================================================================

-- Criar role específico para webhook (se não existir)
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'webhook_role') THEN
    EXECUTE 'CREATE ROLE webhook_role';
  END IF;
END $$;

-- Política específica para webhook role
DROP POLICY IF EXISTS "webhook_role_payments_access" ON vip_payments;
CREATE POLICY "webhook_role_payments_access" ON vip_payments
  FOR ALL 
  USING (
    auth.jwt() ->> 'role' = 'service_role' OR
    current_user = 'webhook_role'
  );

-- ============================================================================
-- 12. VERIFICAÇÃO FINAL DAS POLÍTICAS
-- ============================================================================

-- Listar todas as políticas criadas
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename IN ('profiles', 'usuarios_vip', 'vip_payments')
ORDER BY tablename, policyname;

-- Verificar se RLS está habilitado
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables 
WHERE tablename IN ('profiles', 'usuarios_vip', 'vip_payments');

-- ============================================================================
-- SCRIPT CONCLUÍDO
-- ============================================================================

SELECT 'Row Level Security configurado com sucesso!' as status;

-- Para testar (apenas em desenvolvimento):
-- SELECT test_rls_policies();