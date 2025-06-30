# Configurações do Supabase para Produção

## ⚠️ IMPORTANTE: Configurações que devem ser feitas no painel do Supabase

### 1. Configuração de Autenticação

**Acesse: Authentication > Settings > Auth**

#### Desabilitar confirmação de email (para permitir registro direto):
```
Site URL: https://seu-site.vercel.app
Additional redirect URLs: https://seu-site.vercel.app/auth/callback
```

#### Configurar Email:
- **Enable email confirmations**: ❌ DESABILITAR
- **Enable email change confirmations**: ❌ DESABILITAR  
- **Secure email change**: ❌ DESABILITAR

### 2. Configuração de Provedores de Autenticação

**Acesse: Authentication > Providers**

#### Email (Provider):
- **Enable email provider**: ✅ HABILITAR
- **Confirm email**: ❌ DESABILITAR
- **Secure email change**: ❌ DESABILITAR

### 3. Configuração de Rate Limiting

**Acesse: Authentication > Rate Limits**

Configure limites adequados para produção:
- **Email signup**: 30 per hour per IP
- **Email signin**: 60 per hour per IP

### 4. Variáveis de Ambiente necessárias

Certifique-se de que estas variáveis estão configuradas na Vercel:

```env
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-anon-key
SUPABASE_SERVICE_ROLE_KEY=sua-service-role-key
```

### 5. Verificar se o trigger está funcionando

Execute no SQL Editor do Supabase:

```sql
-- Verificar se o trigger existe
SELECT * FROM pg_trigger WHERE tgname = 'create_profile_trigger';

-- Verificar se a função existe
SELECT proname FROM pg_proc WHERE proname = 'create_profile_for_user';
```

### 6. Testar o sistema

1. Acesse seu site em produção
2. Tente criar uma nova conta
3. Verifique se o usuário aparece em:
   - Authentication > Users
   - Table Editor > profiles

### 7. Debug em caso de problemas

Se ainda não funcionar, verifique os logs:

```sql
-- Ver logs de erro
SELECT * FROM auth.audit_log_entries 
WHERE created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC;
```

### 8. Configuração adicional para desenvolvimento local

Se quiser testar localmente sem confirmação de email:

1. Vá em Authentication > Settings
2. Em "Site URL" adicione: `http://localhost:3000`
3. Em "Additional redirect URLs" adicione: `http://localhost:3000/auth/callback`

---

## ✅ Checklist de Verificação

- [ ] Email confirmation desabilitado
- [ ] Trigger de criação de perfil ativo
- [ ] RLS configurado
- [ ] Variáveis de ambiente atualizadas na Vercel
- [ ] Teste de registro funcionando
- [ ] Usuários aparecendo na aba Authentication > Users

## 🚨 Se ainda não funcionar

O problema pode estar em:

1. **Cache do navegador**: Limpe o cache e cookies
2. **Deploy da Vercel**: Faça um novo deploy
3. **Variáveis de ambiente**: Verifique se estão corretas
4. **Logs do Supabase**: Verifique na aba Logs do painel

## 📞 Suporte

Se precisar de ajuda, verifique:
- Logs no painel do Supabase
- Console do navegador (F12)
- Logs da Vercel