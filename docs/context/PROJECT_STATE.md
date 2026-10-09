# Estado do projeto

## Objetivo e estado atual

Controle financeiro pessoal em português, com identidade visual inspirada na UI de Persona 5, temas claro/escuro e PWA. Em 2026-10-09, Supabase foi substituído por armazenamento local no navegador, sem cadastro ou backend financeiro. A interface abre diretamente em `/`; `/login/` explica o espaço local.

IndexedDB guarda contas, categorias, cartões, lançamentos, parcelas, pagamentos, recorrências e orçamentos. O espaço pessoal começa com configurações vazias, sem registros financeiros fictícios. Demonstração isolada em `/demo/` somente durante desenvolvimento. O primeiro acesso e o aviso persistente explicam dispositivo/navegador, perda dos dados e necessidade de backup.

## Sistemas principais

Next.js exportado como site estático, TypeScript strict e centavos inteiros. Telas, visual e regras de consumo/compromissos/caixa preservados. Mutações e geração de recorrências usam transações atômicas locais; outras abas recebem avisos de atualização. Recorrências são processadas com o app aberto, sem agendamento remoto.

Backup JSON v2 inclui todos os registros e vínculos. Importação valida o arquivo inteiro, exige confirmação de substituição e compara a revisão atual antes de gravar. Arquivo inválido, confirmação obsoleta ou falha de escrita preserva os dados anteriores. O exportador completo v1 da versão com Supabase também é aceito sem trocar IDs. `docs/migration-export.sql` oferece exportação legada somente de leitura; nenhum banco remoto foi acessado ou modificado.

Google Drive opcional: GIS, escopo único `drive.appdata`, conta confirmada por `about.get`, token apenas em memória. Envios manuais diretos ao Google; conclusão exige confirmação de ID/tamanho/metadados pela API. Restauração do Drive passa pela mesma validação e confirmação. A data confirmada fica vinculada ao conjunto local. Sem cliente OAuth, o app informa a configuração pendente e mantém JSON local disponível.

`pnpm build` gera `out/` e o manifesto dos arquivos públicos offline. Depois da primeira abertura e instalação do service worker em HTTPS/localhost, a versão estática abre e opera sem servidor ou internet. Desenvolvimento não guarda chunks sujeitos a hot reload. `vercel.json` prepara publicação estática; não há rotas financeiras ou funções do Manin.

## Repositório

GitHub: [MiharaxD/Manin-controle-financeiro](https://github.com/MiharaxD/Manin-controle-financeiro). Branch principal: `main`.

## Verificações reais em 2026-10-09

- 38 testes de domínio, persistência/concorrência, isolamento pessoal/demo, backup/restauração/migração, arquivos inválidos, falha de gravação e calendário aprovados. Incluem respostas controladas da API do Drive, sem conexão real.
- 14 testes de interface aprovados em desktop e viewport de iPhone no Chromium: CRUD, parcelas/pagamentos, recorrências, orçamentos, filtros, relatórios, temas, exportação, confirmação/cancelamento e isolamento entre navegadores.
- 2 testes offline aprovados na compilação final, em desktop e viewport de iPhone, com o servidor próprio desligado: recarga, criação/edição/exclusão/desfazer, cartão/parcelas/pagamento, relatórios e exportação/restauração JSON. Cache contém somente arquivos públicos do app.
- 115 verificações visuais aprovadas em 1440/390/320px, ambos os temas, texto a 200%, valores longos, foco/menus, gráficos, navegação inferior e redução de movimento. Capturas em `artifacts/redesign/`; telas de armazenamento/backup também conferidas em 320px com texto ampliado, sem rolagem horizontal.
- Typecheck, lint, build estático e `git diff --check` aprovados. Dependências, variáveis e chamadas funcionais do Supabase removidas. Consultar README para repetir os comandos.

## Dependências externas e limites

Cliente OAuth Google não fornecido: autorização, envio e restauração com uma conta real continuam pendentes. Nenhuma conexão ou conclusão real de backup foi simulada. Publicação HTTPS e Safari em iPhone físico também aguardam ambiente externo.

IndexedDB pertence à origem, navegador e dispositivo. Limpeza do site, navegação privada ou mudança/perda do dispositivo pode remover os dados. Backups JSON não são criptografados pelo Manin e têm limite de 20 MB/100 mil registros. Drive é cópia manual, sem sincronização. Se houver dados remotos antigos, exportar antes de desligar o serviço; o app não faz essa operação automaticamente.
