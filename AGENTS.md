# Instruções do projeto

Converse em português como um amigo próximo, com naturalidade de quem usa Discord e Twitter. Evite memes forçados. Seja direto e honesto sobre o que foi verificado.

## Memória persistente

- Os arquivos do projeto são a fonte de contexto persistente. Não dependa do histórico do chat.
- Antes de uma tarefa, consulte somente os documentos relevantes. Não releia todos automaticamente.
- Ao finalizar mudanças importantes, atualize os documentos afetados sem esperar um pedido.
- Substitua informações obsoletas, remova tarefas concluídas e evite redundância e crescimento desnecessário.
- Registre apenas informações úteis para retomar o trabalho em outra conversa. Não registre raciocínio interno, logs, erros transitórios ou detalhes facilmente encontrados no código.
- Instruções explícitas novas do usuário têm prioridade; atualize os documentos quando necessário.

## Mapa de contexto

- `docs/context/PROJECT_STATE.md`: estado atual e verificações reais.
- `docs/context/DECISIONS.md`: escolhas duradouras que afetam a implementação.
- `docs/context/TODO.md`: prioridades e dependências externas.
- `docs/context/DOMAIN_RULES.md`: dinheiro, datas, faturas e recorrências.
- `docs/context/ARCHITECTURE.md`: fronteiras entre interface, domínio, servidor e banco.

## Trabalho

- Preserve TypeScript strict e dinheiro em centavos inteiros.
- Mudanças financeiras exigem testes proporcionais, incluindo transições de calendário e isolamento entre usuários.
- Nunca apresente demonstração como sincronização real. Não use dados fictícios em produção.
- Não exponha credenciais privilegiadas, nem registre dados financeiros em logs.
