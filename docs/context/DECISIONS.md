# Decisões

## Arquitetura pequena

Decisão: Next.js com rotas de servidor e Supabase; sem ORM e sem serviço intermediário.
Motivo: uma pessoa precisa de sincronização, não de infraestrutura de ERP.
Consequência: mutações financeiras atômicas ficam em funções PostgreSQL com autenticação e RLS.

## Demonstração isolada

Decisão: `/demo` só existe em desenvolvimento e usa dados fictícios locais.
Motivo: validar os fluxos sem credenciais, sem confundir com dados reais.
Consequência: produção exige Supabase e autenticação; dados reais nunca vão ao armazenamento local nem ao cache do service worker.

## Identidade visual

Decisão: direção inspirada na UI de Persona 5, com preto `#0B0B0D`, papel `#F4F0E7` e vermelho `#FF1828`, títulos Anton, corpo Inter, faixas angulares e sombras sólidas. Fontes locais com licenças OFL.
Motivo: dar personalidade ao Manin preservando a leitura financeira.
Consequência: somente camadas decorativas recebem inclinação, recorte ou textura. Valores tabulares, tabelas e campos permanecem horizontais. Marca e estados financeiros têm tokens separados; gráficos e legendas compartilham cores e exibem escalas sem animação. Cores personalizadas dos cartões ficam em detalhes de identificação. Ambos os temas usam a mesma composição, com navegação inferior que mede sua altura no celular e respeito a `prefers-reduced-motion`.

## Compatibilidade das ferramentas

Decisão: Node 22+, versões fixadas e lockfile; TypeScript 6 e ESLint 9 são compatíveis com os plugins instalados do Next.js 16.4.
Motivo: os plugins ainda restringem as versões principais de TypeScript/ESLint.
Consequência: avaliar uma atualização conjunta das ferramentas quando esses plugins suportarem as versões novas; não atualizar versões isoladas no chute.
