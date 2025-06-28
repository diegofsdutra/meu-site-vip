-- Row Level Security (RLS) Policies for Supabase
-- Execute estas queries após executar o supabase-setup.sql

-- 1. Habilitar RLS em todas as tabelas
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE vip_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE usuarios_vip ENABLE ROW LEVEL SECURITY;

-- 2. Políticas para tabela PROFILES

-- Usuários podem ver apenas seu próprio perfil
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

-- Usuários podem atualizar apenas seu próprio perfil
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Permitir inserção de perfil (para trigger automático)
CREATE POLICY "Enable insert for authenticated users" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Service role pode fazer tudo (para webhooks e admin)
CREATE POLICY "Service role full access" ON profiles
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- 3. Políticas para tabela VIP_PAYMENTS

-- Usuários podem ver apenas seus próprios pagamentos
CREATE POLICY "Users can view own payments" ON vip_payments
  FOR SELECT USING (user_id = auth.uid());

-- Apenas service role pode inserir pagamentos (webhooks)
CREATE POLICY "Service role can insert payments" ON vip_payments
  FOR INSERT WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

-- Apenas service role pode atualizar pagamentos (webhooks)
CREATE POLICY "Service role can update payments" ON vip_payments
  FOR UPDATE USING (auth.jwt() ->> 'role' = 'service_role');

-- Service role acesso completo
CREATE POLICY "Service role full access payments" ON vip_payments
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- 4. Políticas para tabela USUARIOS_VIP (compatibilidade)

-- Service role pode fazer tudo (usado pelo sistema VIP existente)
CREATE POLICY "Service role full access usuarios_vip" ON usuarios_vip
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Usuários autenticados podem ver registros VIP por email
CREATE POLICY "Authenticated users can view VIP by email" ON usuarios_vip
  FOR SELECT USING (
    auth.uid() IS NOT NULL AND 
    email = (SELECT email FROM profiles WHERE id = auth.uid())
  );

-- 5. Políticas para permitir leitura pública de dados específicos (se necessário)

-- Permitir que API routes leiam dados necessários
-- (comentado por segurança - descomente se necessário)
/*
CREATE POLICY "API can read VIP status" ON usuarios_vip
  FOR SELECT USING (pagamento_aprovado = true);
*/

-- 6. Função auxiliar para verificar se usuário é admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN auth.jwt() ->> 'role' = 'service_role' OR 
         (auth.uid() IN (
           SELECT id FROM profiles WHERE email IN ('admin@telaprimeexpress.com')
         ));
END;
$$ language 'plpgsql' SECURITY DEFINER;

-- 7. Política de admin para casos especiais
CREATE POLICY "Admin full access profiles" ON profiles
  FOR ALL USING (is_admin());

CREATE POLICY "Admin full access vip_payments" ON vip_payments
  FOR ALL USING (is_admin());

CREATE POLICY "Admin full access usuarios_vip" ON usuarios_vip
  FOR ALL USING (is_admin());

-- 8. Função para verificar VIP status (pode ser chamada por usuários autenticados)
CREATE OR REPLACE FUNCTION get_user_vip_status()
RETURNS TABLE (
  is_vip BOOLEAN,
  expires_at TIMESTAMP WITH TIME ZONE,
  plan_type TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.is_vip,
    p.vip_expires_at,
    CASE 
      WHEN p.vip_expires_at > NOW() + INTERVAL '6 months' THEN 'anual'
      WHEN p.vip_expires_at > NOW() + INTERVAL '2 months' THEN 'trimestral'
      ELSE 'mensal'
    END as plan_type
  FROM profiles p
  WHERE p.id = auth.uid();
END;
$$ language 'plpgsql' SECURITY DEFINER;

-- 9. Função para buscar histórico de pagamentos do usuário
CREATE OR REPLACE FUNCTION get_user_payments()
RETURNS TABLE (
  id UUID,
  amount INTEGER,
  payment_method TEXT,
  payment_status TEXT,
  created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    vp.id,
    vp.amount,
    vp.payment_method,
    vp.payment_status,
    vp.created_at
  FROM vip_payments vp
  WHERE vp.user_id = auth.uid()
  ORDER BY vp.created_at DESC
  LIMIT 10;
END;
$$ language 'plpgsql' SECURITY DEFINER;

-- 10. Grants necessários para as funções
GRANT EXECUTE ON FUNCTION get_user_vip_status() TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_payments() TO authenticated;
GRANT EXECUTE ON FUNCTION is_admin() TO authenticated, service_role;

-- Comentários importantes:
-- 1. Service role é usado para webhooks e operações administrativas
-- 2. Authenticated users podem ver apenas seus próprios dados
-- 3. RLS garante isolamento total entre usuários
-- 4. Funções SECURITY DEFINER permitem operações controladas
-- 5. Sempre teste as políticas antes de usar em produção