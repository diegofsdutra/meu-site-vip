# 🗄️ Scripts SQL para Supabase - Tela Prime Express

Este diretório contém todos os scripts SQL necessários para configurar o banco de dados Supabase completo com integração ao Mercado Pago.

## 📁 Arquivos e Ordem de Execução

### 🚀 Setup Rápido (Recomendado)
```sql
00-setup-master.sql    # ⭐ EXECUTE ESTE PARA SETUP COMPLETO
```

### 📝 Scripts Individuais (Para entendimento)
```sql
01-create-tables.sql        # Criação das tabelas e índices
02-triggers-and-functions.sql   # Triggers e funções para automação
03-row-level-security.sql   # Políticas de segurança RLS
```

### 🧹 Manutenção
```sql
99-cleanup.sql         # Limpeza e manutenção (USE COM CUIDADO!)
```

## ⚡ Instalação Rápida

### 1. Acesse o Supabase Dashboard
- Faça login em [supabase.com](https://supabase.com)
- Acesse seu projeto
- Vá para **SQL Editor**

### 2. Execute o Setup Master
```sql
-- Copie e cole o conteúdo completo de:
00-setup-master.sql
```

### 3. Aguarde a Conclusão
- O script pode levar 30-60 segundos
- Verifique se não há erros na saída
- Deve aparecer "🎉 SETUP SUPABASE CONCLUÍDO COM SUCESSO! 🎉"

## 🏗️ Estrutura do Banco Criada

### 📋 Tabelas Principais

#### `profiles`
- Perfis de usuário integrados com Supabase Auth
- Campos VIP (is_vip, vip_expires_at)
- Criação automática via trigger

#### `usuarios_vip` 
- Registros de assinaturas VIP
- Compatibilidade com sistema existente
- Histórico completo de planos

#### `vip_payments`
- Histórico detalhado de pagamentos
- Dados completos do webhook Mercado Pago
- Controle de processamento

### ⚙️ Automações Implementadas

#### ✅ Triggers Automáticos
- **Criação de perfil**: Automaticamente criado quando usuário se registra
- **Ativação VIP**: Automaticamente ativado quando pagamento é aprovado
- **Update timestamps**: Campos updated_at atualizados automaticamente

#### 🔧 Funções Úteis
- `calculate_vip_duration()` - Calcula duração baseada no valor pago
- `activate_vip_after_payment()` - Ativação automática de VIP
- `check_user_vip_status()` - Verificar status VIP completo
- `deactivate_expired_vips()` - Desativar VIPs expirados
- `get_vip_report()` - Relatório completo de VIPs e receita

### 🔒 Segurança (RLS)

#### Row Level Security Ativado
- **Usuários**: Veem apenas seus próprios dados
- **Service Role**: Acesso completo (para webhooks)
- **Admin**: Acesso administrativo via função `is_admin()`

#### Políticas Configuradas
- Perfis: Usuários podem ver/editar apenas o próprio
- VIP Records: Acesso apenas aos próprios registros
- Pagamentos: Histórico pessoal protegido

## 🔄 Fluxo de Integração Mercado Pago

### 1. Webhook Recebe Notificação
```javascript
POST /api/webhook/mercado_pago
```

### 2. Trigger Automático Ativa VIP
```sql
-- Quando payment_status = 'approved':
activate_vip_after_payment() → 
  ✓ Atualiza profiles.is_vip = true
  ✓ Define profiles.vip_expires_at
  ✓ Cria registro em usuarios_vip
  ✓ Marca payment como processed
```

### 3. Usuário Acessa VIP Imediatamente
- Status atualizado em tempo real
- Sem intervenção manual necessária

## 📊 Monitoramento e Relatórios

### Verificar Status Geral
```sql
SELECT * FROM get_vip_report();
```

### VIPs Ativos
```sql
SELECT * FROM vips_ativos;
```

### Histórico de Pagamentos
```sql
SELECT * FROM historico_pagamentos;
```

### Verificar VIPs Expirando
```sql
SELECT * FROM get_vips_expiring_soon(7); -- próximos 7 dias
```

## 🛠️ Funções para Desenvolvimento

### Status VIP de um Usuário
```sql
SELECT * FROM check_user_vip_status('usuario@email.com');
```

### Ativar VIP Manualmente
```sql
SELECT * FROM activate_vip_manually(
  'usuario@email.com',  -- email
  30,                   -- dias
  'Ativação manual'     -- observações
);
```

### Desativar VIPs Expirados
```sql
SELECT * FROM deactivate_expired_vips();
```

## 🎯 Funções para API Frontend

### Para Usuários Autenticados
```sql
-- Ver próprio status VIP
SELECT * FROM get_my_vip_status();

-- Ver próprio histórico de pagamentos  
SELECT * FROM get_my_payment_history();

-- Ver próprias informações VIP
SELECT * FROM my_vip_info;
```

## ⚠️ Manutenção e Limpeza

### Limpeza Segura (Recomendada)
```sql
-- Usar função built-in:
SELECT * FROM cleanup_old_data(365); -- manter últimos 365 dias
```

### Limpeza Manual (Avançada)
```sql
-- Execute o script:
99-cleanup.sql
-- CUIDADO: Leia os comentários antes de executar!
```

## 🔍 Troubleshooting

### Pagamento Não Processou
```sql
-- Verificar pagamentos não processados
SELECT * FROM vip_payments 
WHERE payment_status = 'approved' 
  AND processed = false;

-- Reprocessar manualmente
UPDATE vip_payments 
SET processed = false, processing_attempts = 0
WHERE payment_id = 'PAYMENT_ID_AQUI';
```

### VIP Não Ativou
```sql
-- Verificar se usuário existe
SELECT * FROM profiles WHERE email = 'usuario@email.com';

-- Verificar pagamentos do usuário
SELECT * FROM vip_payments WHERE user_id = 'USER_UUID_AQUI';

-- Ativar manualmente se necessário
SELECT * FROM activate_vip_manually('usuario@email.com', 30);
```

### Dados Inconsistentes
```sql
-- Verificar inconsistências
SELECT p.email, p.is_vip, COUNT(uv.id) as registros_vip
FROM profiles p
LEFT JOIN usuarios_vip uv ON p.email = uv.email 
WHERE p.is_vip = true
GROUP BY p.email, p.is_vip
HAVING COUNT(uv.id) = 0;
```

## 📈 Performance

### Índices Criados Automaticamente
- `profiles(email)` - Busca por email
- `profiles(is_vip)` - Filtro de VIPs
- `usuarios_vip(email, pagamento_aprovado, data_expiraca)` - Busca VIP ativo
- `vip_payments(user_id, payment_status)` - Histórico de pagamentos

### Otimizações Recomendadas
```sql
-- Executar periodicamente:
ANALYZE profiles;
ANALYZE usuarios_vip; 
ANALYZE vip_payments;

-- Reindexar se necessário:
REINDEX TABLE profiles;
```

## 🚀 Próximos Passos

Após executar os scripts SQL:

1. **Configurar .env.local** com credenciais do Supabase
2. **Configurar webhook** no dashboard do Mercado Pago
3. **Testar fluxo completo** de pagamento
4. **Configurar cron job** para desativar VIPs expirados (opcional)

## 📞 Suporte

Em caso de problemas:

1. Verifique os logs do Supabase
2. Execute `SELECT * FROM get_vip_report()` para diagnóstico
3. Use o script `99-cleanup.sql` para verificações
4. Consulte a documentação do Supabase para RLS

---

**⚡ Setup completo em menos de 2 minutos!**
Execute `00-setup-master.sql` e tenha todo o sistema funcionando automaticamente.