# Decisões

## Dados no dispositivo

Decisão: substituir Supabase por IndexedDB e publicar o Next.js como site estático.
Motivo: dados financeiros precisam funcionar sem conta, servidor financeiro ou conexão depois da primeira abertura.
Consequência: a origem/dispositivo/navegador define o espaço. Limpeza do navegador, mudança de origem ou perda do dispositivo exige recuperação por backup; não há sincronização automática.

## Integridade e backup

Decisão: gravações relacionadas e restauração são transações atômicas; backup `manin-backup` versão 3 inclui todo o conjunto, tipos de recorrentes e IDs.
Motivo: impedir perdas parciais, referências quebradas e sobrescrita de alterações feitas em outra aba.
Consequência: validação completa antes de substituir, confirmação com contagem/origem/data e revisão esperada. Parser reconhece backups locais/Drive v2 e o exportador completo v1 antigo; desconhecidos, parciais ou mistura de proprietários são recusados. Limite de 20 MB/100 mil registros garante backups restauráveis. JSON não executa conteúdo e não é criptografado pelo Manin.

## Crédito e recorrentes simplificados

Decisão: por pedido do usuário, cartões guardam só apelido e novas compras/parcelas seguem o mês da compra, com meses seguintes consecutivos. Recorrentes e apelidos compartilham a tela Recorrentes, com criação de apelido dentro dos formulários. Tipos iniciais e personalizados são geridos nas Preferências.
Consequência: nenhum cadastro de banco, dígitos, limite, fechamento ou vencimento. Migração atômica valida o formato anterior, remove esses metadados e preserva IDs/parcelas/pagamentos/competências. Recorrentes antigas ficam em Outros até edição. Transferências saem dos novos lançamentos; registros antigos são históricos sem edição/reutilização, preservados nos backups e fora dos totais financeiros.

## Google Drive manual

Decisão: token OAuth em memória e somente `drive.appdata`; backups na pasta privada do app. Conta confirmada por `about.get`.
Motivo: menor acesso possível e nenhum servidor intermediário do Manin.
Consequência: conectar não envia; envio manual exige confirmação de ID/tamanho/metadados pela API. Expiração exige nova ação. Falta de cliente OAuth mantém JSON local disponível e apresenta instruções reais.

## Demonstração isolada

Decisão: dados fictícios em outro conjunto IndexedDB, somente em desenvolvimento.
Motivo: testar os fluxos sem misturar exemplos com registros pessoais.
Consequência: produção não cria demonstração; backup com origem demo não pode substituir dados pessoais.

## Identidade visual

Decisão: direção inspirada na UI de Persona 5, preto `#0B0B0D`, papel `#F4F0E7`, vermelho `#FF1828`, Anton/Inter locais com OFL.
Consequência: somente decoração tem inclinação/recorte/textura. Valores, tabelas e campos horizontais; estados financeiros separados da marca; gráficos e legendas compartilham cores e escalas imediatas. Os dois temas mantêm a composição e redução de movimento.

## Ferramentas

Node 22+, versões fixadas e lockfile; TypeScript 6/ESLint 9 enquanto os plugins do Next.js exigirem estas versões. Não atualizar ferramentas principais isoladamente.
