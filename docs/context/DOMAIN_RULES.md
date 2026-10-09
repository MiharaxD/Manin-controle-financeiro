# Regras financeiras

- Valores positivos em centavos inteiros, até 2 bilhões por registro. Cálculos e divisões usam inteiros.
- Datas de calendário `YYYY-MM-DD`, meses `YYYY-MM-01`. Hoje usa America/Sao_Paulo; datas não passam pelo fuso local.
- Consumo reconhece o valor integral da compra efetiva na data da compra. Parcelas representam compromissos, sem repetir consumo.
- Caixa considera receitas/despesas efetivas sem crédito e pagamentos de faturas pela data de pagamento. Transferências próprias não entram em receita/despesa.
- Novos lançamentos aceitam apenas despesa e receita. Transferências antigas são preservadas no histórico/backups, sem criação, edição ou reutilização; não compõem gastos, receita ou caixa.
- Cartões contêm somente ID interno e apelido. Novas compras no crédito começam no mês da compra; parcelas avançam um mês de cada vez, inclusive em dezembro/fevereiro. Divisão distribui o resto de centavos nas primeiras parcelas.
- `credit_month` registra a primeira competência. Migrar dados antigos preserva competências, datas de parcelas e pagamentos, sem recalcular ciclos antigos. Renomear um apelido não afeta o calendário; alterar valor sem mudar data/cartão/quantidade preserva as datas antigas. `due_date` de novas parcelas é o fim do mês como referência interna, nunca apresentado como vencimento bancário.
- Compras com qualquer pagamento de fatura relacionado não podem ser alteradas/excluídas, preservando o histórico liquidado. Corrigir uma compra ainda não paga refaz suas parcelas atomicamente.
- Repetir o mesmo pagamento com o mesmo ID e conteúdo é idempotente. Reutilizar esse ID com valores, conta, cartão ou datas diferentes é recusado sem alterar o histórico.
- Previsões e datas futuras não compõem consumo realizado. Não prometer saldo bancário: saldo mostrado é o fluxo líquido registrado do mês.
- No mês corrente, a comparação de gastos usa os mesmos dias do mês anterior. Meses encerrados usam totais completos.
- Recorrências usam data de origem e dia âncora para voltar ao dia correto após fevereiro. Ocorrências têm unicidade por recorrência/data.
- Recorrentes exigem um tipo do catálogo local e podem usar crédito/Pix/débito/dinheiro. Tipos são rótulos, separados da categoria financeira; nomes duplicados normalizados são recusados e tipos em uso não podem ser excluídos. Trocar tipo/pagamento/preço afeta as próximas ocorrências, preservando histórico. Tipos personalizados fazem parte do backup completo.
- Gerar cobranças, atualizar próxima data e conciliar uma ocorrência manual acontece na mesma transação IndexedDB. Pausar/cancelar preserva histórico; geração ocorre quando o app é aberto/atualizado, não com ele fechado.
- Backup/restauração preserva IDs, parcelas, pagamentos e ocorrências excluídas. Referências, soma/calendário de parcelas, pagamentos e unicidade são validados antes da substituição integral. Demonstração e dados pessoais nunca compartilham o conjunto.
