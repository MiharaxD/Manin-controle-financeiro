# Estado atual

## Entregue
- Controle financeiro pessoal em português, site estático Next.js com dados em IndexedDB, PWA offline, temas claro/escuro. Sem conta, backend ou banco remoto (Supabase removido).
- Espaço pessoal começa vazio (só categorias, tipos de recorrentes e duas contas editáveis). Demonstração isolada em `/demo/` apenas em desenvolvimento.
- Cartões só com apelido; crédito segue o mês da compra com parcelas consecutivas. Recorrentes e apelidos na tela Recorrentes; tipos personalizados nas Preferências. Lançamentos novos só despesa/receita; transferências antigas ficam como histórico.
- Backup JSON v3 (lê v1/v2) com restauração atômica e confirmada. Google Drive manual (`drive.appdata`), sem sincronização. O menu lateral mostra a data do último backup (export JSON guardado em `localStorage` `manin-last-backup-<modo>` + recibos do Drive) e avisa após 14 dias.
- Interface no estilo menu de pausa de Persona 5 (claro e escuro) com animações de entrada, troca de tela, seleção e fechamento de janelas: herói Consumo × Caixa, filtros de Transações recolhidos com chips e lista agrupada por dia, "Mais" no celular.
- Produção: https://manin.vercel.app/ (projeto Vercel `manin-controle-financeiro`, time `mihara1`), com `NEXT_PUBLIC_GOOGLE_CLIENT_ID` em Production. Push no `main` do GitHub `MiharaxD/Manin-controle-financeiro` publica sozinho; as URLs `*-mihara1.vercel.app` exigem login da Vercel.

## Pendências (ordem de prioridade)
1. Validar com conta Google real: autorização, envio e restauração pelo Drive (depende da pessoa; nunca simular).
2. Validar instalação, armazenamento, teclado e offline no Safari de um iPhone físico.
3. Se ainda houver dados no Supabase antigo, exportar (`docs/migration-export.sql`) e conferir a restauração local antes de desligá-lo.
4. Depois: atualizar TypeScript/ESLint juntos quando os plugins do Next.js suportarem.

## Limitações conhecidas
- Next.js 16.4.0 tem vulnerabilidade conhecida; em `next dev` o selo de segurança do Next fica sobre a barra inferior e quebra os e2e/`test:visual` no perfil iPhone (desktop e offline passam). Atualizar exige pedido explícito e manter TypeScript/ESLint juntos.
- Nesta máquina o Playwright não tem o Chromium baixado; os testes rodaram com `channel: "msedge"`.
- O teste "backup completo preserva IDs…" (`tests/local-store.test.ts`) depende da data atual: quando o dia passa das cobranças da demonstração, `generateDue` cria ocorrências e a comparação falha.
- Exportar CSV não conta como backup no status; só JSON e Drive.
- Dados presos à origem + navegador + dispositivo; limpeza do site, navegação privada ou troca de dispositivo perde tudo sem backup.
- Backup não é criptografado pelo Manin; limite de 20 MB / 100 mil registros.
- Recorrências só são geradas com o app aberto; não há agendamento.
- Atualização do service worker às vezes exige uma segunda recarga.
