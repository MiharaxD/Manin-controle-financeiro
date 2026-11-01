# Estado atual

## Entregue
- Controle financeiro pessoal em português, site estático Next.js com dados em IndexedDB, PWA offline, temas claro/escuro. Sem conta, backend ou banco remoto (Supabase removido).
- Espaço pessoal começa vazio (só categorias, tipos de recorrentes e duas contas editáveis). Demonstração isolada em `/demo/` apenas em desenvolvimento.
- Cartões só com apelido; crédito segue o mês da compra com parcelas consecutivas. Recorrentes e apelidos na tela Recorrentes; tipos personalizados nas Preferências. Lançamentos novos só despesa/receita; transferências antigas ficam como histórico.
- Backup JSON v3 (lê v1/v2) com restauração atômica e confirmada. Google Drive manual (`drive.appdata`), sem sincronização.
- `main` está em dia com `origin/main` (GitHub `MiharaxD/Manin-controle-financeiro`), incluindo a simplificação de cartões/recorrentes e backup v3.
- Produção: https://manin-controle-financeiro.vercel.app/ com `NEXT_PUBLIC_GOOGLE_CLIENT_ID` em Production. Se a versão publicada já contém a simplificação de cartões/backup v3: (não verificado).

## Pendências (ordem de prioridade)
1. Confirmar que o deploy da Vercel corresponde ao `main` atual.
2. Validar com conta Google real: autorização, envio e restauração pelo Drive (depende da pessoa; nunca simular).
3. Validar instalação, armazenamento, teclado e offline no Safari de um iPhone físico.
4. Se ainda houver dados no Supabase antigo, exportar (`docs/migration-export.sql`) e conferir a restauração local antes de desligá-lo.
5. Depois: atualizar TypeScript/ESLint juntos quando os plugins do Next.js suportarem.

## Limitações conhecidas
- Dados presos à origem + navegador + dispositivo; limpeza do site, navegação privada ou troca de dispositivo perde tudo sem backup.
- Backup não é criptografado pelo Manin; limite de 20 MB / 100 mil registros.
- Recorrências só são geradas com o app aberto; não há agendamento.
- Atualização do service worker às vezes exige uma segunda recarga.
