# Regras financeiras

- Valores positivos em centavos inteiros, até 2 bilhões por registro. Cálculos e divisões usam inteiros.
- Datas de calendário `YYYY-MM-DD`, meses `YYYY-MM-01`. Hoje usa America/Sao_Paulo; datas não passam pelo fuso local.
- Consumo reconhece o valor integral da compra efetiva na data da compra. Parcelas representam compromissos, sem repetir consumo.
- Caixa considera receitas/despesas efetivas sem crédito e pagamentos de faturas pela data de pagamento. Transferências próprias não entram em receita/despesa.
- No dia do fechamento, a compra entra no ciclo que está fechando. Após o fechamento, entra no próximo. Vencimento é posterior ao fechamento; dias inexistentes são limitados ao último dia do mês.
- Competência da fatura é o mês de vencimento. Divisão de parcelas distribui o resto de centavos nas primeiras parcelas.
- Compras com qualquer pagamento de fatura relacionado não podem ser alteradas/excluídas, preservando o histórico liquidado. Corrigir uma compra ainda não paga refaz suas parcelas atomicamente.
- Repetir o mesmo pagamento com o mesmo ID e conteúdo é idempotente. Reutilizar esse ID com valores, conta, cartão ou datas diferentes é recusado sem alterar o histórico.
- Previsões e datas futuras não compõem consumo realizado. Não prometer saldo bancário: saldo mostrado é o fluxo líquido registrado do mês.
- No mês corrente, a comparação de gastos usa os mesmos dias do mês anterior. Meses encerrados usam totais completos.
- Recorrências usam data de origem e dia âncora para voltar ao dia correto após fevereiro. Ocorrências têm unicidade por recorrência/data.
- Gerar cobranças, atualizar próxima data e conciliar uma ocorrência manual acontece na mesma transação IndexedDB. Pausar/cancelar preserva histórico; geração ocorre quando o app é aberto/atualizado, não com ele fechado.
- Backup/restauração preserva IDs, parcelas, pagamentos e ocorrências excluídas. Referências, soma/calendário de parcelas, pagamentos e unicidade são validados antes da substituição integral. Demonstração e dados pessoais nunca compartilham o conjunto.
