# Estado do projeto

## Objetivo atual

Controle financeiro pessoal em português, PWA para iPhone, com identidade visual inspirada na UI de Persona 5 e sincronização via Supabase.

## Estado atual

Versão local funcional com redesign aplicado a todas as telas, login, modais e ícones PWA; temas claro/escuro. Demonstração isolada em `/demo`. Sem Supabase hospedado configurado.

## Sistemas principais

Next.js App Router, TypeScript strict, Supabase Auth/PostgreSQL/RLS; duas migrations. Lançamentos, contas, cartões/faturas/parcelas/pagamentos, recorrências, categorias, orçamentos, relatórios e exportação. Temas claro/escuro e PWA.

## Trabalho em andamento

Redesign concluído e verificado localmente. Integração com Supabase e publicação na Vercel continuam pendentes.

## Repositório

GitHub: [MiharaxD/Manin-controle-financeiro](https://github.com/MiharaxD/Manin-controle-financeiro). Branch principal: `main`.

## Verificações locais

Em 2026-10-09, os 12 testes de domínio/banco, typecheck, lint e build foram aprovados novamente antes do commit inicial. Banco PostgreSQL via PGlite validou isolamento/RLS e operações financeiras.

Em 2026-10-08, 8 testes de interface foram aprovados. Redesign validado com 115 checagens visuais em 1440/390/320px, ambos os temas, fonte a 200%, valores longos, menus, contenção/restauração de foco, espaço acima da navegação inferior e redução de movimento. Gráficos/legendas usam as mesmas cores e escalas imediatas. 54 capturas e relatório em `artifacts/redesign/`; repetir com `pnpm test:visual` e o servidor de desenvolvimento ativo. Cache restrito e página offline testados. Cálculos, consultas e migrations preservados.

A validação anterior da primeira versão confirmou `/demo` com 404 em produção e auditoria de dependências de produção sem vulnerabilidades conhecidas.

## Problemas conhecidos

As seis imagens de referência mencionadas não estavam nos anexos disponíveis; a direção visual seguiu o briefing textual. Credenciais e projeto Supabase não fornecidos: o login local exibe o estado de configuração. Publicação Vercel e verificação no Safari de um iPhone físico dependem do ambiente externo.

## Próximo passo recomendado

Seguir o README para aplicar as migrations, configurar Auth/SMTP e conectar o Supabase; depois publicar na Vercel e validar dois dispositivos.
