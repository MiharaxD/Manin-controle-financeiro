-- Aggregate the entire invoice, independently of transaction pagination.
create function public.invoice_categories(cid uuid,m date) returns jsonb language sql stable security invoker set search_path=public,pg_temp as $$
  select coalesce(jsonb_agg(c order by total desc),'[]'::jsonb) from (
    select t.category_id,sum(i.amount_cents) as total
    from public.installments i join public.transactions t on t.id=i.transaction_id
    where i.card_id=cid and i.billing_month=m and t.deleted_at is null and t.status='actual'
      and t.purchase_date<=(now() at time zone 'America/Sao_Paulo')::date
    group by t.category_id
  ) c;
$$;
revoke all on function public.invoice_categories(uuid,date) from public,anon,authenticated;
grant execute on function public.invoice_categories(uuid,date) to authenticated;
