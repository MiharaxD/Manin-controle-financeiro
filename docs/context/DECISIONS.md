# Decisões ativas

- **Dados só no dispositivo.** IndexedDB + Next.js exportado estático, sem backend financeiro.
  - Por quê: funcionar sem conta, servidor ou conexão após a primeira abertura.
  - Proíbe: rotas de API, funções serverless, banco remoto, sincronização automática. Recuperação é só por backup.

- **Gravação e restauração atômicas.** Uma transação IndexedDB por operação; restauração substitui o conjunto inteiro (sem mesclar) após confirmação com origem/data/contagem e revisão esperada.
  - Por quê: evitar perdas parciais, referências quebradas e sobrescrever mudanças de outra aba.
  - Exige: validação completa antes de gravar; falha preserva o registro anterior. Arquivo desconhecido, parcial ou com proprietários misturados é recusado.

- **Backup `manin-backup` v3.** Inclui todo o conjunto, tipos de recorrentes e IDs; lê v2 e o exportador completo v1.
  - Exige: limite de 20 MB / 100 mil registros; novo formato de dados precisa continuar lendo backups antigos.

- **Cartão = só apelido (pedido do usuário).** Compras no crédito começam no mês da compra; parcelas em meses consecutivos.
  - Proíbe: banco, dígitos, limite, fechamento ou vencimento no cadastro; mostrar `due_date` como vencimento bancário.
  - Exige: migração preserva IDs, parcelas, pagamentos e competências antigas sem recalcular.

- **Recorrentes e apelidos na mesma tela; tipos nas Preferências.** Criação de apelido/tipo dentro do formulário. Recorrentes antigas sem tipo ficam em Outros.

- **Transferências descontinuadas.** Novos lançamentos só despesa/receita.
  - Exige: transferências antigas preservadas no histórico e backup, sem edição/reutilização e fora dos totais.

- **Google Drive manual e mínimo.** Token OAuth só em memória, escopo único `drive.appdata`, conta via `about.get`.
  - Proíbe: envio automático, servidor intermediário, guardar token.
  - Exige: envio só é concluído com ID/tamanho/metadados confirmados pela API; sem cliente OAuth o JSON local segue disponível.

- **Demonstração isolada.** Conjunto IndexedDB `demo` separado, só em desenvolvimento.
  - Proíbe: criar demo em produção; backup com origem demo substituir dados pessoais.

- **Identidade visual inspirada em Persona 5.** Preto `#0B0B0D`, papel `#F4F0E7`, vermelho `#FF1828`; Anton/Inter locais (OFL).
  - Exige: só decoração inclina/recorta/tem textura; valores, tabelas e campos horizontais; estados financeiros separados da cor da marca; mesma composição nos dois temas; respeitar redução de movimento.
  - Hierarquia: sombra dura, recorte vermelho e etiqueta de papel só no herói da tela (`.month-card`); painéis secundários planos (borda fina + régua preta no título); métricas em faixa única.
  - Cabeçalho em uma linha (título, mês, avisos, ações), sem sobretítulo nem breadcrumb. Um botão primário por tela: Recorrentes/Orçamentos usam o próprio, e "Lançamento" vira ícone secundário.
  - Início separa Consumo (compras, crédito incluso) de Caixa (entrou − saiu pago = fluxo); nunca empilhar receitas, consumo e fluxo como se fossem uma conta.
  - Celular: Início, Transações, + central, Recorrentes e "Mais" (Orçamentos, Relatórios, Preferências).

- **Ferramentas fixadas.** Node 22+, versões exatas e lockfile; TypeScript 6 / ESLint 9 enquanto os plugins do Next.js exigirem.
  - Proíbe: atualizar ferramenta principal isoladamente.
