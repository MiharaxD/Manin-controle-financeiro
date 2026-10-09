# Manin

Controle financeiro pessoal em português, mobile-first, com Next.js, TypeScript strict e Supabase. O app separa consumo, compromissos e fluxo de caixa, evitando duplicar a despesa no pagamento de faturas.

## O que está implementado

- Cadastro, login por e-mail/senha, confirmação de conta e recuperação de acesso com Supabase Auth.
- Dashboard mensal com comparação, receitas, consumo, fluxo líquido, faturas, parcelas futuras, previsões, categorias e orçamentos.
- Lançamento rápido de despesa, receita ou transferência, com sugestões de categoria pelo histórico do estabelecimento, cartão, parcelas, previsão e recorrência.
- Edição, reutilização, busca e filtros por datas, categoria, tipo, cartão, pagamento e estado. Paginação de 30 registros.
- Exclusão com desfazer. O banco permite restauração por 10 minutos; o aviso da interface oferece a ação por 12 segundos.
- Contas próprias e transferências sem efeito nos indicadores de receita/despesa.
- Cartões com limite opcional, últimos quatro dígitos opcionais, fechamento e vencimento. Faturas anteriores/futuras, parcelas, categorias de toda a fatura e pagamentos parciais/integrais.
- Recorrências a cada 1–12 meses, custo mensal/anual equivalente, histórico, conciliação manual, edição de preço, pausa e cancelamento.
- Categorias personalizadas, um nível de subcategorias, cor, ícone e posição. Orçamentos gerais ou por categoria, acompanhados mês a mês.
- Relatórios de seis meses, despesas por categoria e valores realizados em recorrências. Gráficos carregados sob demanda.
- Exportação completa em JSON, lançamentos em CSV e exclusão de todos os dados financeiros.
- Temas claro/escuro persistidos, interface desktop/celular, safe areas, PWA, ícones e página offline sem dados.

## Iniciar localmente

Requisitos: Node.js 22+ e pnpm 11.25.0. Versões das dependências estão fixadas no projeto e no lockfile.

```sh
pnpm install --frozen-lockfile
pnpm dev
```

Abra `http://localhost:3000`. Sem Supabase configurado, a página orienta a configuração. A demonstração está em `http://localhost:3000/demo` **somente com `pnpm dev`**.

Os dados fictícios ficam em memória e no `sessionStorage` da aba, com chave própria. Não são enviados ao Supabase e não existem em produção. “Reiniciar” restaura a demonstração.

Nesta máquina, se pnpm não estiver no PATH, o executável disponibilizado pelo Codex fica em `C:\Users\YURI\.cache\codex-runtimes\codex-primary-runtime\dependencies\bin\fallback\pnpm.cmd`.

## Conectar Supabase

1. Crie um projeto no Supabase e copie **Project URL** e **publishable key** na opção Connect. Não use `service_role` ou secret key.
2. No SQL Editor, aplique os arquivos de `supabase/migrations/` em ordem de nome, uma única vez cada. Alternativamente, use Supabase CLI com `supabase link` e `supabase db push`.
3. Copie `.env.example` para `.env.local` e preencha:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sua-chave-publicavel
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

4. Em **Authentication > URL Configuration**, defina o Site URL e cadastre as URLs de retorno do ambiente: `http://localhost:3000/auth/callback` e `http://localhost:3000/auth/callback?next=/login?mode=update`. Em produção, repita com seu domínio HTTPS. Use URLs exatas para produção.
5. Habilite o provedor de e-mail, confirmação de e-mail e senha mínima de 10 caracteres. Configure SMTP para entrega fora das restrições do serviço de e-mail de teste.
6. Para confirmação e recuperação independentes do navegador que pediu o link, personalize os templates de e-mail:

**Confirm signup**:

```html
<a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email"
  >Confirmar conta</a
>
```

**Reset password**:

```html
<a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery"
  >Recuperar acesso</a
>
```

O retorno `/auth/callback` também suporta o fluxo PKCE com código. Nunca remova a validação de sessão no servidor.

7. Reinicie o servidor, crie uma conta e confirme o e-mail. Categorias iniciais e duas contas vazias são criadas no primeiro acesso autenticado; nenhuma transação de demonstração é inserida.

### Geração automática de recorrências

Ao abrir/atualizar o app, o banco gera ocorrências vencidas até a data atual de São Paulo. A operação preserva o dia âncora e não gera duplicatas, inclusive se uma ocorrência foi excluída.

Para geração mesmo com o app fechado, habilite **pg_cron** em Database > Extensions e execute `supabase/schedule.sql` como administrador. A rotina roda diariamente às 06:15 UTC (03:15 em São Paulo). A função administrativa não pode ser chamada por usuários do app. Após uma pausa, revise a próxima data antes de reativar: o período vencido será processado.

Cobranças geradas são registros conforme o calendário cadastrado, sem integração bancária que confirme o débito. Use “Previsão” quando uma cobrança ainda não for efetiva e concilie uma cobrança manual com a recorrência correspondente.

## Regras de dinheiro e calendário

- Valores em centavos inteiros; cada registro pode ter até R$ 20 milhões.
- A soma das parcelas é sempre o valor original. Centavos de resto são distribuídos nas primeiras parcelas.
- Consumo contabiliza a compra efetiva inteira na data da compra; parcelas não repetem esse consumo.
- Crédito entra no fluxo de caixa quando um pagamento de fatura é registrado. Transferências próprias ficam fora de receita/despesa.
- Previsões e compras com data futura não compõem os indicadores realizados, nem faturas confirmadas antes da compra.
- A compra no dia do fechamento pertence ao ciclo que está fechando. A competência é o mês de vencimento. Datas inexistentes usam o último dia do mês, com recuperação do dia âncora nos meses seguintes.
- “Fluxo líquido” é o movimento registrado do mês, **não o saldo bancário**. Não há importação bancária nem saldo inicial nesta versão.
- Editar/excluir compra com qualquer pagamento na fatura relacionada é bloqueado para preservar a liquidação. Compras ainda sem pagamento podem ser corrigidas, refazendo parcelas na mesma operação.
- Os dias de fechamento/vencimento de um cartão com compras são imutáveis nesta versão. Para outro ciclo, cadastre outro cartão.
- Orçamentos por categoria contabilizam exatamente a categoria selecionada; subcategorias têm limites próprios. O geral inclui todas.
- Recorrências previstas aparecem como estimativa e não são somadas novamente às transações realizadas. Preços passados permanecem nas cobranças já geradas.

## Segurança e persistência

RLS limita a leitura ao proprietário em todas as tabelas. Escrita direta nas tabelas financeiras é negada; as funções de banco verificam o usuário, referências e invariantes. Chaves estrangeiras compostas impedem relações entre registros de usuários diferentes. Mutações relacionadas são atômicas e serializadas por usuário; IDs estáveis permitem repetir um envio sem duplicar compras ou pagamentos.

Servidor e cliente usam validação. O servidor verifica a assinatura da sessão, valida a origem das mutações e não registra dados financeiros em logs. Nenhuma chave privilegiada é usada pelo app. O service worker permite cache apenas de ícones e uma página offline neutra; páginas autenticadas, respostas de API e registros financeiros não são cacheados. Exportações CSV neutralizam fórmulas em textos fornecidos pelo usuário.

JSON exporta também parcelas, pagamentos e lançamentos marcados como excluídos, preservando os vínculos. CSV inclui somente lançamentos não excluídos. A exportação é um backup; a importação desse arquivo não foi implementada.

Excluir todos os dados remove os registros financeiros do proprietário em uma operação atômica, inclusive os marcados como excluídos. A conta Auth permanece; contas/categorias iniciais vazias são recriadas no próximo carregamento. Não há exclusão da identidade Auth pelo app.

Os dois dispositivos leem e escrevem no mesmo banco. Ao voltar para a aba, reconectar ou tocar em Atualizar, os dados são consultados novamente. Não há edição offline nem atualização em tempo real enquanto uma tela fica parada.

## Testar

```sh
pnpm test
pnpm typecheck
pnpm lint
pnpm exec playwright install chromium
pnpm test:e2e
pnpm build
```

- Testes de domínio: centavos, divisões, fechamento, fevereiro, virada de ano, totais, pagamento, exclusão/restauração, recorrências, transferências e exportação.
- Testes de banco: executam a migration em PostgreSQL via PGlite e simulam `auth.uid()`, usuários e papéis do Supabase. Verificam RLS, escrita indevida, referências cruzadas, operações e idempotência. Isso não substitui testar Auth/SMTP no serviço hospedado.
- Testes de interface: desktop e tamanho de iPhone em Chromium. Cobrem registro/edição/busca/exclusão/desfazer, cartão/parcelas/fatura/pagamento, recorrência/orçamento/exportação/tema, configuração, manifest e tela de 320px.

O servidor de desenvolvimento existente é reutilizado; se necessário, os testes iniciam um. Capturas ficam em `artifacts/` e falhas em `test-results/`, ambos ignorados pelo Git.

## Publicar na Vercel e instalar no iPhone

1. Coloque este diretório em um repositório Git próprio e importe na Vercel. Selecione o preset **Next.js**, Node 22+ e pnpm. O build é `pnpm build`.
2. Configure as três variáveis de ambiente da seção Supabase; `NEXT_PUBLIC_APP_URL` deve ser o domínio HTTPS final. O retorno de autenticação usa a origem da página atual.
3. Aplique as migrations no Supabase usado em produção. Atualize Site URL, redirect URLs e templates de e-mail para esse domínio.
4. Publique e teste cadastro, confirmação, login, recuperação, criação de lançamento e acesso à mesma conta em outro dispositivo. Confira isolamento usando duas contas diferentes.
5. No Safari do iPhone, abra o domínio HTTPS, toque em Compartilhar > **Adicionar à Tela de Início**. Abra pelo ícone e entre na sua conta.

O manifest, os ícones e o modo standalone estão preparados. A instalação e o comportamento do teclado/safe areas ainda precisam ser conferidos em um iPhone físico. `/demo` retorna 404 em produção. Sem configuração Supabase, produção exibe a orientação de conexão, sem dados fictícios.

## Limites desta entrega

Sem credenciais fornecidas, Supabase hospedado, envio de e-mail, sincronização entre dispositivos e publicação Vercel não foram verificados. Não há Open Finance, push, sincronização offline, importação de backup, contas bancárias com saldo inicial ou correção de compras já liquidadas.

A memória operacional está em `AGENTS.md` e `docs/context/`, com estado atual, decisões, pendências, arquitetura e regras de domínio. Ela deve ser mantida pequena e atualizada junto com mudanças relevantes.

Referências oficiais utilizadas: [Next.js App Router](https://nextjs.org/docs/app/getting-started/installation), [PWA](https://nextjs.org/docs/app/guides/progressive-web-apps), [Supabase SSR Auth](https://supabase.com/docs/guides/auth/server-side/creating-a-client) e [Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security) e [Supabase Cron](https://supabase.com/docs/guides/cron/quickstart).
