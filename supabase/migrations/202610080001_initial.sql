-- Manin: no privileged key is needed by the application.
create table public.profiles (id uuid primary key references auth.users(id) on delete cascade);
create table public.accounts (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (length(name) between 1 and 60), unique(user_id, id)
);
create table public.categories (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check(length(name) between 1 and 60), icon text not null default 'circle',
  color text not null check(color ~ '^#[0-9a-fA-F]{6}$'), parent_id uuid, position integer not null default 0 check(position between 0 and 999),
  unique(user_id,id), foreign key(user_id,parent_id) references public.categories(user_id,id), check(parent_id is distinct from id)
);
create table public.cards (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check(length(name) between 1 and 60), institution text not null default '' check(length(institution)<=60),
  color text not null check(color ~ '^#[0-9a-fA-F]{6}$'), limit_cents integer check(limit_cents between 1 and 2000000000),
  last_four text not null default '' check(last_four ~ '^([0-9]{4})?$'), closing_day integer not null check(closing_day between 1 and 31),
  due_day integer not null check(due_day between 1 and 31), unique(user_id,id)
);
create table public.recurrences (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check(length(name) between 1 and 80), amount_cents integer not null check(amount_cents between 1 and 2000000000),
  category_id uuid not null, payment_method text not null check(payment_method in ('pix','debit','cash','credit')),
  card_id uuid, account_id uuid, interval_months integer not null check(interval_months between 1 and 12),
  next_date date not null check(next_date between '2000-01-01' and '2100-12-31'), anchor_day integer not null check(anchor_day between 1 and 31),
  status text not null default 'active' check(status in ('active','paused','cancelled')), unique(user_id,id),
  foreign key(user_id,category_id) references public.categories(user_id,id), foreign key(user_id,card_id) references public.cards(user_id,id),
  foreign key(user_id,account_id) references public.accounts(user_id,id),
  check((payment_method='credit' and card_id is not null and account_id is null) or (payment_method<>'credit' and account_id is not null and card_id is null))
);
create table public.transactions (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check(kind in ('expense','income','transfer')), amount_cents integer not null check(amount_cents between 1 and 2000000000),
  purchase_date date not null check(purchase_date between '2000-01-01' and '2100-12-31'), description text not null default '' check(length(description)<=120),
  merchant text not null default '' check(length(merchant)<=100), category_id uuid, payment_method text not null check(payment_method in ('pix','debit','cash','credit')),
  card_id uuid, account_id uuid, destination_account_id uuid, installments_count integer not null default 1 check(installments_count between 1 and 60 and installments_count<=amount_cents),
  status text not null default 'actual' check(status in ('actual','planned')), recurrence_id uuid, occurrence_date date,
  deleted_at timestamptz, created_at timestamptz not null default now(), unique(user_id,id), unique(user_id,recurrence_id,occurrence_date),
  foreign key(user_id,category_id) references public.categories(user_id,id), foreign key(user_id,card_id) references public.cards(user_id,id),
  foreign key(user_id,account_id) references public.accounts(user_id,id), foreign key(user_id,destination_account_id) references public.accounts(user_id,id),
  foreign key(user_id,recurrence_id) references public.recurrences(user_id,id),
  check((payment_method='credit' and kind='expense' and card_id is not null and account_id is null) or (payment_method<>'credit' and account_id is not null and card_id is null and installments_count=1)),
  check((kind='transfer' and destination_account_id is not null and destination_account_id<>account_id and category_id is null) or (kind<>'transfer' and category_id is not null and destination_account_id is null)),
  check((recurrence_id is null and occurrence_date is null) or (recurrence_id is not null and occurrence_date is not null and kind='expense' and installments_count=1))
);
create table public.installments (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  transaction_id uuid not null, card_id uuid not null, number integer not null check(number between 1 and 60),
  amount_cents integer not null check(amount_cents between 1 and 2000000000), billing_month date not null check(extract(day from billing_month)=1), due_date date not null,
  unique(transaction_id,number), foreign key(user_id,transaction_id) references public.transactions(user_id,id) on delete cascade,
  foreign key(user_id,card_id) references public.cards(user_id,id), check(date_trunc('month',due_date)::date=billing_month)
);
create table public.invoice_payments (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  card_id uuid not null, billing_month date not null check(extract(day from billing_month)=1),
  amount_cents integer not null check(amount_cents between 1 and 2000000000), paid_date date not null check(paid_date between '2000-01-01' and '2100-12-31'), account_id uuid not null,
  foreign key(user_id,card_id) references public.cards(user_id,id), foreign key(user_id,account_id) references public.accounts(user_id,id)
);
create table public.budgets (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  month date not null check(extract(day from month)=1), category_id uuid, amount_cents integer not null check(amount_cents between 1 and 2000000000),
  foreign key(user_id,category_id) references public.categories(user_id,id)
);
create unique index budgets_scope on public.budgets(user_id,month,coalesce(category_id,'00000000-0000-0000-0000-000000000000'::uuid));
create index transactions_date on public.transactions(user_id,purchase_date desc,id) where deleted_at is null;
create index transactions_category on public.transactions(user_id,category_id,purchase_date) where deleted_at is null;
create index transactions_merchant on public.transactions(user_id,lower(merchant));
create index installments_invoice on public.installments(user_id,card_id,billing_month);
create index payments_month on public.invoice_payments(user_id,paid_date);
create index payments_invoice on public.invoice_payments(user_id,card_id,billing_month);
create index recurrences_due on public.recurrences(user_id,next_date) where status='active';

-- Only SELECT is granted directly. Consistent writes use guarded, atomic RPCs.
do $$ declare tab text; begin
  foreach tab in array array['profiles','accounts','categories','cards','recurrences','transactions','installments','invoice_payments','budgets'] loop
    execute format('alter table public.%I enable row level security',tab);
    execute format('create policy own_rows on public.%I for select to authenticated using ((select auth.uid()) = %I)',tab,case when tab='profiles' then 'id' else 'user_id' end);
    execute format('revoke all on public.%I from anon, authenticated',tab);
    execute format('grant select on public.%I to authenticated',tab);
  end loop;
end $$;

create function public.actor() returns uuid language plpgsql set search_path=public,pg_temp as $$
declare u uuid:=auth.uid(); begin
  if u is null then raise exception 'Autenticação necessária.' using errcode='42501'; end if;
  perform pg_advisory_xact_lock(hashtextextended(u::text,0)); return u;
end $$;
create function public.calendar_date(m date,d integer) returns date language sql immutable set search_path=public,pg_temp as $$
  select date_trunc('month',m)::date + (least(d,extract(day from (date_trunc('month',m)+interval '1 month - 1 day'))::integer)-1);
$$;
create function public.first_invoice(p date,closing integer,due integer) returns date language plpgsql immutable set search_path=public,pg_temp as $$
declare m date:=date_trunc('month',p)::date; begin
  if extract(day from p)>closing then m:=(m+interval '1 month')::date; end if;
  if due<=closing then m:=(m+interval '1 month')::date;
  elsif public.calendar_date(m,due)<=public.calendar_date(m,closing) then m:=(m+interval '1 month')::date; end if;
  return m;
end $$;
create function public.rebuild_installments(tid uuid,uid uuid) returns void language plpgsql set search_path=public,pg_temp as $$
declare t public.transactions; c public.cards; first_m date; idx integer; base integer; rest integer; begin
  select * into strict t from public.transactions where id=tid and user_id=uid;
  delete from public.installments where transaction_id=tid and user_id=uid;
  if t.payment_method<>'credit' then return; end if;
  select * into strict c from public.cards where id=t.card_id and user_id=uid;
  first_m:=public.first_invoice(t.purchase_date,c.closing_day,c.due_day);
  base:=t.amount_cents/t.installments_count; rest:=t.amount_cents%t.installments_count;
  for idx in 0..t.installments_count-1 loop
    insert into public.installments(user_id,transaction_id,card_id,number,amount_cents,billing_month,due_date)
    values(uid,tid,c.id,idx+1,base+case when idx<rest then 1 else 0 end,(first_m+make_interval(months=>idx))::date,public.calendar_date((first_m+make_interval(months=>idx))::date,c.due_day));
  end loop;
end $$;
create function public.has_payment(tid uuid,uid uuid) returns boolean language sql set search_path=public,pg_temp as $$
 select exists(select 1 from public.installments i join public.invoice_payments p on p.user_id=i.user_id and p.card_id=i.card_id and p.billing_month=i.billing_month where i.transaction_id=tid and i.user_id=uid);
$$;
create function public.bootstrap() returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare u uuid:=public.actor(); names text[]:=array['Alimentação','Mercado','Transporte','Moradia','Saúde','Lazer','Jogos','Tecnologia','Compras','Educação','Serviços Digitais','Outros'];
icons text[]:=array['utensils','cart','car','home','heart','sparkles','game','laptop','bag','book','cloud','circle'];
colors text[]:=array['#d88652','#739d76','#7294b5','#aa91b9','#c77d8a','#bba35d','#8c85b7','#709ba1','#bc9272','#87a468','#678b9f','#939b91']; n integer; begin
  insert into public.profiles(id) values(u) on conflict do nothing;
  if not found then return; end if;
  insert into public.accounts(user_id,name) values(u,'Conta principal'),(u,'Carteira');
  for n in 1..12 loop insert into public.categories(user_id,name,icon,color,position) values(u,names[n],icons[n],colors[n],n); end loop;
end $$;

create function public.save_transaction(p jsonb) returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare u uuid:=public.actor(); tid uuid:=coalesce((p->>'id')::uuid,gen_random_uuid()); rid uuid:=(p->>'recurrence_id')::uuid;
old public.transactions; r public.recurrences; d date:=(p->>'purchase_date')::date; occurrence date:=(p->>'occurrence_date')::date; begin
  select * into old from public.transactions where id=tid;
  if found then
    if old.user_id<>u then raise exception 'Registro indisponível.' using errcode='42501'; end if;
    if coalesce((p->>'make_recurring')::boolean,false) and old.recurrence_id is not null then
      if old.kind=p->>'kind' and old.amount_cents=(p->>'amount_cents')::integer and old.purchase_date=d and old.description=coalesce(p->>'description','') and old.merchant=coalesce(p->>'merchant','') and old.category_id=(p->>'category_id')::uuid and old.payment_method=p->>'payment_method' and old.card_id is not distinct from (p->>'card_id')::uuid and old.account_id is not distinct from (p->>'account_id')::uuid and old.status=p->>'status' then return tid; end if;
      raise exception 'A recorrência já foi criada. Edite o lançamento existente.';
    end if;
    if old.deleted_at is not null or public.has_payment(tid,u) then raise exception 'Compra excluída ou vinculada a uma fatura com pagamento. Histórico preservado.'; end if;
    if old.recurrence_id is not null and (rid is distinct from old.recurrence_id or occurrence is distinct from old.occurrence_date) then raise exception 'O vínculo da ocorrência deve ser preservado.'; end if;
  end if;
  if coalesce((p->>'make_recurring')::boolean,false) then
    if old.id is not null or rid is not null or p->>'kind'<>'expense' or (p->>'installments_count')::integer<>1 then raise exception 'Recorrência exige uma nova despesa sem parcelas.'; end if;
    rid:=gen_random_uuid(); occurrence:=d;
    insert into public.recurrences(id,user_id,name,amount_cents,category_id,payment_method,card_id,account_id,interval_months,next_date,anchor_day,status)
    values(rid,u,coalesce(nullif(p->>'merchant',''),nullif(p->>'description',''),'Despesa recorrente'),(p->>'amount_cents')::integer,(p->>'category_id')::uuid,p->>'payment_method',(p->>'card_id')::uuid,(p->>'account_id')::uuid,1,public.calendar_date((date_trunc('month',d)+interval '1 month')::date,extract(day from d)::integer),extract(day from d)::integer,'active');
  elsif rid is not null then
    select * into r from public.recurrences where id=rid and user_id=u for update;
    if not found then raise exception 'Recorrência indisponível.'; end if;
    if old.id is null then
      if r.status<>'active' or occurrence<>r.next_date then raise exception 'Selecione a próxima ocorrência ativa para conciliar.'; end if;
      update public.recurrences set next_date=public.calendar_date((date_trunc('month',r.next_date)+make_interval(months=>r.interval_months))::date,r.anchor_day) where id=rid;
    end if;
  end if;
  insert into public.transactions(id,user_id,kind,amount_cents,purchase_date,description,merchant,category_id,payment_method,card_id,account_id,destination_account_id,installments_count,status,recurrence_id,occurrence_date)
  values(tid,u,p->>'kind',(p->>'amount_cents')::integer,d,coalesce(p->>'description',''),coalesce(p->>'merchant',''),(p->>'category_id')::uuid,p->>'payment_method',(p->>'card_id')::uuid,(p->>'account_id')::uuid,(p->>'destination_account_id')::uuid,(p->>'installments_count')::integer,p->>'status',rid,occurrence)
  on conflict(id) do update set kind=excluded.kind,amount_cents=excluded.amount_cents,purchase_date=excluded.purchase_date,description=excluded.description,merchant=excluded.merchant,category_id=excluded.category_id,payment_method=excluded.payment_method,card_id=excluded.card_id,account_id=excluded.account_id,destination_account_id=excluded.destination_account_id,installments_count=excluded.installments_count,status=excluded.status;
  perform public.rebuild_installments(tid,u); return tid;
end $$;

create function public.save_entity(entity text,p jsonb) returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare u uuid:=public.actor(); eid uuid:=coalesce((p->>'id')::uuid,gen_random_uuid()); c public.cards; parent uuid:=(p->>'parent_id')::uuid; begin
  case entity
    when 'card' then
      select * into c from public.cards where id=eid;
      if found and c.user_id<>u then raise exception 'Registro indisponível.' using errcode='42501'; end if;
      if c.id is not null and (c.closing_day<>(p->>'closing_day')::integer or c.due_day<>(p->>'due_day')::integer) and exists(select 1 from public.transactions where card_id=eid) then raise exception 'Não é possível alterar datas de um cartão que já tem compras. Cadastre outro cartão para o novo ciclo.'; end if;
      insert into public.cards(id,user_id,name,institution,color,limit_cents,last_four,closing_day,due_day)
      values(eid,u,p->>'name',coalesce(p->>'institution',''),p->>'color',(p->>'limit_cents')::integer,coalesce(p->>'last_four',''),(p->>'closing_day')::integer,(p->>'due_day')::integer)
      on conflict(id) do update set name=excluded.name,institution=excluded.institution,color=excluded.color,limit_cents=excluded.limit_cents,last_four=excluded.last_four,closing_day=excluded.closing_day,due_day=excluded.due_day where cards.user_id=u;
    when 'account' then
      insert into public.accounts(id,user_id,name) values(eid,u,p->>'name') on conflict(id) do update set name=excluded.name where accounts.user_id=u;
    when 'category' then
      if parent is not null and (parent=eid or not exists(select 1 from public.categories where id=parent and user_id=u and parent_id is null) or exists(select 1 from public.categories where parent_id=eid)) then raise exception 'Use apenas um nível de subcategorias, sem ciclos.'; end if;
      insert into public.categories(id,user_id,name,icon,color,parent_id,position) values(eid,u,p->>'name',p->>'icon',p->>'color',parent,(p->>'position')::integer)
      on conflict(id) do update set name=excluded.name,icon=excluded.icon,color=excluded.color,parent_id=excluded.parent_id,position=excluded.position where categories.user_id=u;
    when 'budget' then
      insert into public.budgets(id,user_id,month,category_id,amount_cents) values(eid,u,(p->>'month')::date,(p->>'category_id')::uuid,(p->>'amount_cents')::integer)
      on conflict(id) do update set month=excluded.month,category_id=excluded.category_id,amount_cents=excluded.amount_cents where budgets.user_id=u;
    when 'recurrence' then
      insert into public.recurrences(id,user_id,name,amount_cents,category_id,payment_method,card_id,account_id,interval_months,next_date,anchor_day,status)
      values(eid,u,p->>'name',(p->>'amount_cents')::integer,(p->>'category_id')::uuid,p->>'payment_method',(p->>'card_id')::uuid,(p->>'account_id')::uuid,(p->>'interval_months')::integer,(p->>'next_date')::date,(p->>'anchor_day')::integer,p->>'status')
      on conflict(id) do update set name=excluded.name,amount_cents=excluded.amount_cents,category_id=excluded.category_id,payment_method=excluded.payment_method,card_id=excluded.card_id,account_id=excluded.account_id,interval_months=excluded.interval_months,next_date=excluded.next_date,anchor_day=excluded.anchor_day,status=excluded.status where recurrences.user_id=u;
    else raise exception 'Entidade inválida.';
  end case;
  if not found then raise exception 'Registro indisponível.' using errcode='42501'; end if;
  return eid;
end $$;

create function public.pay_invoice(p jsonb) returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare u uuid:=public.actor(); pid uuid:=coalesce((p->>'id')::uuid,gen_random_uuid()); cid uuid:=(p->>'card_id')::uuid; m date:=(p->>'billing_month')::date; amount integer:=(p->>'amount_cents')::integer; total bigint; paid bigint; old public.invoice_payments; begin
  select * into old from public.invoice_payments where id=pid;
  if found then
    if old.user_id<>u or old.card_id<>cid or old.billing_month<>m or old.amount_cents<>amount or old.paid_date<>(p->>'paid_date')::date or old.account_id<>(p->>'account_id')::uuid then raise exception 'Pagamento já existe com outros dados.'; end if;
    return pid;
  end if;
  if (p->>'paid_date')::date>(now() at time zone 'America/Sao_Paulo')::date then raise exception 'Pagamento deve ter data efetiva, até hoje.'; end if;
  select coalesce(sum(i.amount_cents),0) into total from public.installments i join public.transactions t on t.id=i.transaction_id where i.user_id=u and i.card_id=cid and i.billing_month=m and t.deleted_at is null and t.status='actual' and t.purchase_date<=(now() at time zone 'America/Sao_Paulo')::date;
  select coalesce(sum(amount_cents),0) into paid from public.invoice_payments where user_id=u and card_id=cid and billing_month=m;
  if amount is null or amount<=0 or amount>total-paid then raise exception 'Valor excede o saldo da fatura.'; end if;
  insert into public.invoice_payments(id,user_id,card_id,billing_month,amount_cents,paid_date,account_id) values(pid,u,cid,m,amount,(p->>'paid_date')::date,(p->>'account_id')::uuid); return pid;
end $$;
create function public.delete_entity(entity text,eid uuid) returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare u uuid:=public.actor(); begin
  case entity
    when 'transaction' then
      if public.has_payment(eid,u) then raise exception 'Compra vinculada a fatura com pagamento; histórico preservado.'; end if;
      update public.transactions set deleted_at=now() where id=eid and user_id=u and deleted_at is null;
    when 'card' then delete from public.cards where id=eid and user_id=u;
    when 'category' then delete from public.categories where id=eid and user_id=u;
    when 'account' then delete from public.accounts where id=eid and user_id=u;
    when 'budget' then delete from public.budgets where id=eid and user_id=u;
    else raise exception 'Entidade inválida.';
  end case;
  if not found then raise exception 'Registro indisponível.'; end if;
end $$;
create function public.restore_transaction(eid uuid) returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare u uuid:=public.actor(); begin
  update public.transactions set deleted_at=null where id=eid and user_id=u and deleted_at>now()-interval '10 minutes';
  if not found then raise exception 'Prazo para desfazer encerrado.'; end if;
end $$;

-- Internal generator is not callable by client roles. Each occurrence and cursor update are atomic.
create function public.generate_for_user(uid uuid) returns void language plpgsql set search_path=public,pg_temp as $$
declare r public.recurrences; tid uuid; cutoff date:=(now() at time zone 'America/Sao_Paulo')::date; n integer; begin
  perform pg_advisory_xact_lock(hashtextextended(uid::text,0));
  for r in select * from public.recurrences where user_id=uid and status='active' and next_date<=cutoff for update loop
    n:=0;
    while r.next_date<=cutoff and n<400 loop
      tid:=null;
      insert into public.transactions(user_id,kind,amount_cents,purchase_date,description,merchant,category_id,payment_method,card_id,account_id,installments_count,status,recurrence_id,occurrence_date)
      values(uid,'expense',r.amount_cents,r.next_date,r.name,r.name,r.category_id,r.payment_method,r.card_id,r.account_id,1,'actual',r.id,r.next_date)
      on conflict(user_id,recurrence_id,occurrence_date) do nothing returning id into tid;
      if tid is not null then perform public.rebuild_installments(tid,uid); end if;
      r.next_date:=public.calendar_date((date_trunc('month',r.next_date)+make_interval(months=>r.interval_months))::date,r.anchor_day); n:=n+1;
    end loop;
    update public.recurrences set next_date=r.next_date where id=r.id;
  end loop;
end $$;
create function public.generate_recurring() returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare u uuid:=public.actor(); begin perform public.generate_for_user(u); end $$;
create function public.generate_all_recurring() returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare u uuid; begin
  for u in select distinct user_id from public.recurrences where status='active' and next_date<=(now() at time zone 'America/Sao_Paulo')::date loop perform public.generate_for_user(u); end loop;
end $$;
create function public.clear_data(confirmation text) returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare u uuid:=public.actor(); begin
  if confirmation<>'EXCLUIR' or confirmation is null then raise exception 'Confirmação inválida.'; end if;
  delete from public.invoice_payments where user_id=u;
  delete from public.transactions where user_id=u;
  delete from public.recurrences where user_id=u;
  delete from public.budgets where user_id=u;
  update public.categories set parent_id=null where user_id=u;
  delete from public.categories where user_id=u;
  delete from public.cards where user_id=u;
  delete from public.accounts where user_id=u;
  delete from public.profiles where id=u;
end $$;

create function public.snapshot(m date) returns jsonb language plpgsql security invoker set search_path=public,pg_temp as $$
declare cutoff date:=(now() at time zone 'America/Sao_Paulo')::date; result jsonb; begin
  if auth.uid() is null then raise exception 'Autenticação necessária.' using errcode='42501'; end if;
  if extract(day from m)<>1 or m not between '2000-01-01' and '2100-12-01' then raise exception 'Mês inválido.'; end if;
  with months as (select generate_series(m-interval '5 months',m,interval '1 month')::date as month),
  tx as (select * from public.transactions where deleted_at is null and purchase_date>=m-interval '5 months' and purchase_date<m+interval '1 month'),
  totals as (select mo.month,
    coalesce(sum(t.amount_cents) filter(where t.kind='expense' and t.status='actual' and t.purchase_date<=cutoff),0) expense,
    coalesce(sum(t.amount_cents) filter(where t.kind='expense' and t.status='actual' and t.purchase_date<=cutoff and (m<>date_trunc('month',cutoff)::date or extract(day from t.purchase_date)<=extract(day from cutoff))),0) comparable_expense,
    coalesce(sum(t.amount_cents) filter(where t.kind='income' and t.status='actual' and t.purchase_date<=cutoff),0) income,
    coalesce(sum(t.amount_cents) filter(where t.kind='expense' and t.recurrence_id is not null and t.status='actual' and t.purchase_date<=cutoff),0) recurring_expense,
    coalesce(sum(t.amount_cents) filter(where t.kind='income' and t.status='actual' and t.purchase_date<=cutoff),0) cash_in,
    coalesce(sum(t.amount_cents) filter(where t.kind='expense' and t.payment_method<>'credit' and t.status='actual' and t.purchase_date<=cutoff),0)+(select coalesce(sum(p.amount_cents),0) from public.invoice_payments p where p.paid_date>=mo.month and p.paid_date<mo.month+interval '1 month' and p.paid_date<=cutoff) cash_out,
    coalesce(sum(t.amount_cents) filter(where t.kind='expense' and (t.status='planned' or t.purchase_date>cutoff)),0) planned
    from months mo left join tx t on t.purchase_date>=mo.month and t.purchase_date<mo.month+interval '1 month' group by mo.month),
  inv as (select i.card_id,i.billing_month,min(i.due_date) due_date,sum(i.amount_cents) total,
    (select coalesce(sum(p.amount_cents),0) from public.invoice_payments p where p.card_id=i.card_id and p.billing_month=i.billing_month) paid
    from public.installments i join public.transactions t on t.id=i.transaction_id where t.deleted_at is null and t.status='actual' and t.purchase_date<=cutoff group by i.card_id,i.billing_month),
  cat as (select category_id,sum(amount_cents) total from tx where purchase_date>=m and kind='expense' and status='actual' and purchase_date<=cutoff group by category_id)
  select jsonb_build_object('month',m,'today',cutoff,
    'categories',coalesce((select jsonb_agg(c order by position,name) from public.categories c),'[]'::jsonb),
    'accounts',coalesce((select jsonb_agg(a order by name) from public.accounts a),'[]'::jsonb),
    'cards',coalesce((select jsonb_agg(c order by name) from public.cards c),'[]'::jsonb),
    'recurrences',coalesce((select jsonb_agg(r order by next_date) from public.recurrences r),'[]'::jsonb),
    'budgets',coalesce((select jsonb_agg(b) from public.budgets b where month=m),'[]'::jsonb),
    'monthly',coalesce((select jsonb_agg(t order by month) from totals t),'[]'::jsonb),
    'category_totals',coalesce((select jsonb_agg(c order by total desc) from cat c),'[]'::jsonb),
    'invoices',coalesce((select jsonb_agg(jsonb_build_object('card_id',card_id,'billing_month',billing_month,'due_date',due_date,'total',total,'paid',paid,'remaining',total-paid) order by billing_month) from inv),'[]'::jsonb),
    'transactions',coalesce((select jsonb_agg(t) from (select * from tx where purchase_date>=m order by purchase_date desc,created_at desc limit 8) t),'[]'::jsonb)) into result;
  return result;
end $$;

-- Functions default to PUBLIC execute in PostgreSQL: close that default explicitly.
revoke all on function public.actor(), public.calendar_date(date,integer), public.first_invoice(date,integer,integer), public.rebuild_installments(uuid,uuid), public.has_payment(uuid,uuid), public.generate_for_user(uuid), public.generate_all_recurring() from public,anon,authenticated;
revoke all on function public.bootstrap(), public.save_transaction(jsonb), public.save_entity(text,jsonb), public.pay_invoice(jsonb), public.delete_entity(text,uuid), public.restore_transaction(uuid), public.generate_recurring(), public.clear_data(text), public.snapshot(date) from public,anon,authenticated;
grant execute on function public.bootstrap(), public.save_transaction(jsonb), public.save_entity(text,jsonb), public.pay_invoice(jsonb), public.delete_entity(text,uuid), public.restore_transaction(uuid), public.generate_recurring(), public.clear_data(text), public.snapshot(date) to authenticated;
