# Estado do projeto

## Objetivo e estado atual

Controle financeiro pessoal em português, com identidade visual inspirada na UI de Persona 5, temas claro/escuro e PWA. Em 2026-10-09, Supabase foi substituído por armazenamento local no navegador, sem cadastro ou backend financeiro. A interface abre diretamente em `/`; `/login/` explica o espaço local.

IndexedDB guarda contas, categorias, apelidos de cartões, lançamentos, parcelas, pagamentos, recorrentes, tipos e orçamentos. O espaço pessoal começa com configurações vazias, sem registros financeiros fictícios. Demonstração isolada em `/demo/` somente durante desenvolvimento. O primeiro acesso e o aviso persistente explicam dispositivo/navegador, perda dos dados e necessidade de backup.

## Sistemas principais

Next.js exportado como site estático, TypeScript strict e centavos inteiros. Visual e regras de consumo/compromissos/caixa preservados. Lançamentos novos têm só despesa/receita; transferências antigas permanecem no histórico/backups, sem edição/reutilização. Recorrentes e crédito compartilham a tela Recorrentes. Cartão contém apenas apelido/ID interno; novos créditos seguem o mês da compra e parcelas consecutivas. Tipos iniciais: Assinatura, Seguro, Plano, Conta, Mensalidade e Outros; tipos personalizados nas Preferências. Mutações e geração de recorrências usam transações atômicas locais; outras abas recebem avisos. Geração ocorre com o app aberto, sem agendamento remoto.

Backup JSON v3 inclui registros, tipos personalizados e vínculos. Importação valida o arquivo inteiro, exige confirmação de substituição e compara a revisão atual antes de gravar. Arquivo inválido, confirmação obsoleta ou falha de escrita preserva os dados anteriores. Backups v2 e exportações completas v1 antigas são aceitos. IndexedDB/envelope antigo migra atomicamente para v2: remove os metadados do cadastro do cartão, preserva IDs, parcelas, datas, competências e pagamentos; recorrentes antigas recebem Outros. `docs/migration-export.sql` oferece exportação legada somente de leitura; nenhum banco remoto foi acessado ou modificado.

Google Drive opcional: GIS, escopo único `drive.appdata`, conta confirmada por `about.get`, token apenas em memória. Envios manuais diretos ao Google; conclusão exige confirmação de ID/tamanho/metadados pela API. Restauração do Drive passa pela mesma validação e confirmação. A data confirmada fica vinculada ao conjunto local. Sem cliente OAuth, o app informa a configuração pendente e mantém JSON local disponível.

`pnpm build` gera `out/` e o manifesto dos arquivos públicos offline. Depois da primeira abertura e instalação do service worker em HTTPS/localhost, a versão estática abre e opera sem servidor ou internet. Desenvolvimento não guarda chunks sujeitos a hot reload. `vercel.json` prepara publicação estática; não há rotas financeiras ou funções do Manin.

## Repositório

GitHub: [MiharaxD/Manin-controle-financeiro](https://github.com/MiharaxD/Manin-controle-financeiro). Branch principal: `main`.

Publicação: [Manin na Vercel](https://manin-controle-financeiro.vercel.app/). Cliente OAuth público configurado em `.env.local` e em `NEXT_PUBLIC_GOOGLE_CLIENT_ID` no ambiente Production da Vercel. Em 2026-10-09, a recompilação local passou e o redeploy `3QPutrAvYtSNg3YZXcbC5igCBsCX` foi confirmado como Ready/Current. O site atualizado apresenta a opção Conectar Google Drive; a versão anterior em cache precisou de uma segunda recarga para receber a atualização, sem limpar IndexedDB.

A simplificação de cartões/recorrentes, tipos personalizados e backup v3 está implementada e verificada no projeto local; ainda não foi enviada ao GitHub/Vercel. A produção acima corresponde à publicação anterior com armazenamento local/Drive.

## Verificações reais em 2026-10-09

- 48 testes de domínio, persistência/concorrência, isolamento pessoal/demo, backup/restauração/migração, arquivos inválidos, falha de gravação e calendário aprovados. Incluem crédito por mês da compra, fevereiro bissexto/dezembro, catálogo de tipos, migração antiga íntegra/recusada, metadados de cartão recusados e recuperação de arquivos v2 no Drive por respostas controladas, sem conexão real.
- 18 testes de interface verificados em desktop e viewport de iPhone no Chromium: 14 fluxos existentes e 4 novos de tipos personalizados, criação inline de apelido, troca crédito/Pix, despesa recorrente, filtros, persistência e backup v3. Ajustes nos seletores dos testes novos foram verificados em execuções direcionadas.
- 2 testes offline aprovados na compilação final, em desktop e viewport de iPhone, com o servidor próprio desligado: recarga, CRUD/desfazer, apelido/parcelas/pagamento, criação de tipo personalizado e recorrente no crédito, relatórios e exportação/restauração JSON v3. Cache contém somente arquivos públicos do app.
- 115 verificações visuais aprovadas em 1440/390/320px, ambos os temas, texto a 200%, valores longos, foco/menus, gráficos, navegação inferior e redução de movimento. Cobrem a página unificada e o formulário de recorrente com criação inline de apelido em texto ampliado. Capturas em `artifacts/redesign/`.
- Typecheck, lint, build estático e `git diff --check` aprovados. Dependências, variáveis e chamadas funcionais do Supabase removidas. Consultar README para repetir os comandos.

## Dependências externas e limites

Cliente OAuth público fornecido e configurado. Autorização da conta Google, envio e restauração reais continuam pendentes da ação da pessoa. Nenhuma conexão ou conclusão real de backup foi simulada. Publicação HTTPS concluída; Safari em iPhone físico ainda precisa ser verificado.

IndexedDB pertence à origem, navegador e dispositivo. Limpeza do site, navegação privada ou mudança/perda do dispositivo pode remover os dados. Backups JSON não são criptografados pelo Manin e têm limite de 20 MB/100 mil registros. Drive é cópia manual, sem sincronização. Se houver dados remotos antigos, exportar antes de desligar o serviço; o app não faz essa operação automaticamente.
