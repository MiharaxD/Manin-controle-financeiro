# Arquitetura

- Next.js App Router com `output: export`: `out/` contém apenas arquivos públicos estáticos. Sem rotas financeiras, autenticação ou backend.
- `src/components/local-app.tsx` abre o conjunto local antes de montar as telas; `app.tsx` coordena navegação e dados, `forms.tsx` usa sugestões locais. Layout e componentes em `views/` preservados.
- `src/lib/finance.ts` e `engine.ts`: dinheiro/calendário, indicadores, mutações e recorrências puros. Compartilhados entre dados pessoais, demonstração e testes.
- `src/lib/local-store.ts`: IndexedDB `manin-device-v1`, object store `datasets`, chaves `local`/`demo`. Um registro contém dados, ID do conjunto, revisão e metadados locais. Leitura/modificação/gravação em uma transação serializada; falha aborta integralmente. BroadcastChannel avisa outras abas.
- `records.ts`: valida campos, dinheiro, datas, referências e invariantes completos. `backup.ts`: JSON v2, validação inteira e conversão do exportador antigo v1. Restauração compara revisão após confirmação e substitui atomicamente; não mescla.
- `backups.tsx`: arquivo local e Drive passam pela mesma confirmação, com origem/data/contagem. `google-drive.ts`: GIS token model, único escopo `drive.appdata`, email por `about.get`, uploads/downloads diretos ao Google. Tokens apenas em memória; metadados confirmados ficam localmente. Sem envio automático.
- `demo.ts`: dados fictícios separados; rota e inicialização de demonstração só em desenvolvimento. Dados pessoais começam com configurações vazias, nunca com lançamentos fictícios.
- `globals.css`: identidade preto/papel/vermelho, fontes locais, responsividade e redução de movimento. Radix mantém foco dos modais.
- `public/sw.js` + `scripts/create-offline-manifest.mjs`: cache por versão somente de arquivos públicos exportados, inclusive chunks de relatórios. Não cacheiam JSON financeiro, Drive ou OAuth. Registro desativado em desenvolvimento; uso offline verificado na compilação estática.
- `scripts/serve-static.mjs`: serve `out/` localmente, sem tratar registros. `vercel.json` configura hospedagem estática. `Iniciar-Manin.cmd` mantém o início Windows sem depender de npm no terminal.
- Testes: domínio, IndexedDB via fake-indexeddb, parser/migração e invariantes; navegador em desktop/celular; teste offline desliga seu servidor próprio. Drive usa respostas controladas em testes, sem alegar conexão real.
- `docs/migration-export.sql`: consulta legada somente de leitura, filtrada por proprietário; nunca é executada automaticamente. Nenhum banco remoto foi alterado.
