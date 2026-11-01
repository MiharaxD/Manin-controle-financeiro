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

- **Recorrentes e apelidos na mesma tela, em abas ("Assinaturas e contas" × "Cartões"); tipos nas Preferências.** Criação de apelido/tipo dentro do formulário. Recorrentes antigas sem tipo ficam em Outros.

- **Transferências descontinuadas.** Novos lançamentos só despesa/receita.
  - Exige: transferências antigas preservadas no histórico e backup, sem edição/reutilização e fora dos totais.

- **Google Drive manual e mínimo.** Token OAuth só em memória, escopo único `drive.appdata`, conta via `about.get`.
  - Proíbe: envio automático, servidor intermediário, guardar token.
  - Exige: envio só é concluído com ID/tamanho/metadados confirmados pela API; sem cliente OAuth o JSON local segue disponível.

- **Demonstração isolada.** Conjunto IndexedDB `demo` separado, só em desenvolvimento.
  - Proíbe: criar demo em produção; backup com origem demo substituir dados pessoais.

- **Identidade "Máximo P5" (menu de pausa de Persona 5, pedido do usuário).** Campo vermelho `#E60012` com retícula, preto `#0D0D0D`, branco, ciano `#22E1FF` como cursor/seleção; escuro troca campo por preto e placas pretas por vermelho. Anton (display), Archivo variável (texto/números), Abril Fatface (só letras de recorte); todas locais (OFL).
  - Exige: títulos de tela e logo em letras de recorte (`Ransom`) com texto acessível oculto; cunha preta + fresta branca fixas à esquerda; painéis brancos sobre placa girada, título em tarja; linhas como faixas do menu (leve rotação, ciano no hover/foco); campos e valores sem inclinação; estados financeiros separados da cor da marca; valor colorido nunca direto sobre placa vermelha (no escuro, o Caixa do mês usa tarja preta).
  - Movimento: varredura diagonal na troca de tela, entrada carimbada com stagger (~0,3–0,45 s), seletor do menu salta para o item ativo; janelas saem jogando a placa para a direita e drenando o campo (no celular a aba desce); tudo desligado por `prefers-reduced-motion`. Animações de entrada sem atraso parado no primeiro quadro em elementos clicáveis (o Playwright os considera estáveis antes da hora).
  - Cabeçalho: ferramentas no topo, título em recorte, carimbo do mês e ação principal com estouro. Um botão primário por tela: Recorrentes (aba Assinaturas)/Orçamentos usam o próprio, e "Lançamento" vira só o estouro. No desktop, ao rolar, uma barra fina fixa repete título, mês e ação principal (rótulos diferentes dos da barra grande para não duplicar nomes acessíveis).
  - Início abre com "Ainda dá pra gastar" (orçamento geral − consumo) e a próxima cobrança; depois separa Consumo (compras, crédito incluso) de Caixa; nunca empilhar receitas, consumo e fluxo como se fossem uma conta.
  - Vocabulário único em todas as telas: **Entrou** (receitas), **Consumo**, **Saiu (pago)** (sem crédito + faturas pagas), **Sobrou no mês** (entrou − saiu pago, nunca "saldo"). Nos gráficos consumo é listrado, nunca o vermelho da marca.
  - Lançamento: frase rápida no topo (`parseQuickEntry`) preenche os campos e Enter salva; barra de salvar fixa com "Salvar e lançar outro"; campos raros em "Mais detalhes".
  - Celular: Início, Transações, + central, Recorrentes e "Mais" (Orçamentos, Relatórios, Preferências). No Início, painéis com `preview` começam recolhidos e a ordem visual segue o DOM; valores das linhas ficam na linha do nome.

- **Ferramentas fixadas.** Node 22+, versões exatas e lockfile; TypeScript 6 / ESLint 9 enquanto os plugins do Next.js exigirem.
  - Proíbe: atualizar ferramenta principal isoladamente.
