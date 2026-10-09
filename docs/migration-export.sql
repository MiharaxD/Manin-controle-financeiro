-- Exportação SOMENTE DE LEITURA da versão anterior do Manin.
-- No SQL Editor do seu Supabase, substitua o UUID abaixo pelo ID da SUA conta
-- em Authentication > Users. Não use email e não remova o filtro de proprietário.
-- Copie o valor completo da coluna backup para um arquivo UTF-8 .json.
-- Nenhuma tabela, função, conta ou registro é alterado por esta consulta.
WITH owner AS (
  SELECT id FROM auth.users WHERE id = 'SUBSTITUA_PELO_UUID_DA_SUA_CONTA'::uuid
)
SELECT jsonb_build_object(
  'version',1,'exported_at',now(),
  'accounts',COALESCE((SELECT jsonb_agg(a) FROM public.accounts a WHERE a.user_id=owner.id),'[]'::jsonb),
  'categories',COALESCE((SELECT jsonb_agg(c) FROM public.categories c WHERE c.user_id=owner.id),'[]'::jsonb),
  'cards',COALESCE((SELECT jsonb_agg(c) FROM public.cards c WHERE c.user_id=owner.id),'[]'::jsonb),
  'transactions',COALESCE((SELECT jsonb_agg(t) FROM public.transactions t WHERE t.user_id=owner.id),'[]'::jsonb),
  'installments',COALESCE((SELECT jsonb_agg(i) FROM public.installments i WHERE i.user_id=owner.id),'[]'::jsonb),
  'invoice_payments',COALESCE((SELECT jsonb_agg(p) FROM public.invoice_payments p WHERE p.user_id=owner.id),'[]'::jsonb),
  'recurrences',COALESCE((SELECT jsonb_agg(r) FROM public.recurrences r WHERE r.user_id=owner.id),'[]'::jsonb),
  'budgets',COALESCE((SELECT jsonb_agg(b) FROM public.budgets b WHERE b.user_id=owner.id),'[]'::jsonb)
) AS backup
FROM owner;
