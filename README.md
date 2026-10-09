# Manin

Controle financeiro pessoal em português, com Next.js exportado como site estático, TypeScript strict e dados locais em **IndexedDB**. Sem cadastro, autenticação ou banco remoto. O visual, as telas e os indicadores de consumo, compromissos e caixa foram preservados.

## Iniciar

Requisitos para desenvolver/compilar: Node.js 22+ e pnpm 11.25.0.

```sh
pnpm install --frozen-lockfile
pnpm dev
```

No Windows desta máquina, dentro da pasta do projeto, também funciona:

```powershell
.\Iniciar-Manin.cmd
```

O iniciador usa o Node já instalado pelo Codex sem depender de npm no terminal. As dependências precisam estar instaladas. Se necessário, o pnpm desta máquina está em C:\Users\YURI\.cache\codex-runtimes\codex-primary-runtime\dependencies\bin\fallback\pnpm.cmd.

Abra http://localhost:3000 para seu espaço pessoal. Ele começa sem lançamentos, cartões, pagamentos, recorrentes ou orçamentos fictícios. Existem apenas categorias, tipos de recorrentes e duas contas vazias editáveis para facilitar o primeiro registro.

A demonstração em /demo/ existe somente em desenvolvimento e usa outro conjunto de dados, separado do pessoal. Um backup marcado como demonstração não pode substituir dados pessoais. A publicação não cria registros fictícios.

## Seus dados e o uso offline

- Dados financeiros ficam no dispositivo, navegador e **origem** usados: domínio, protocolo e porta. localhost:3000 e outro domínio/porta são espaços distintos.
- IndexedDB grava operações relacionadas em uma transação atômica. Abas da mesma origem consultam o mesmo conjunto, com gravações serializadas e avisos de atualização. Não há sincronização entre dispositivos.
- Limpar os dados do site/navegador, perder o dispositivo, usar navegação privada ou trocar de navegador/origem pode remover os dados ou impedir o acesso. Faça backups regulares.
- Se o armazenamento falhar, o app informa o erro; não anuncia um salvamento nem substitui registros existentes por um conjunto vazio.
- Depois da primeira abertura online da **versão publicada** e instalação do service worker, a interface e todos os arquivos necessários são guardados para abrir, recarregar, consultar e editar offline. Dados continuam no IndexedDB, nunca no cache público de arquivos.
- Sem internet, o Google Drive fica indisponível, mas o cadastro de registros e exportação/restauração JSON local continuam funcionando.
- Desenvolvimento com pnpm dev não guarda os arquivos que mudam durante hot reload. Teste abertura offline com a compilação estática abaixo.
- A versão instalada depende de HTTPS ou localhost e suporte a IndexedDB/service worker. Não abra out/index.html por file://; é necessário carregar o site por uma origem válida na primeira vez.

## Compilar e publicar sem backend

```sh
pnpm build
pnpm start
```

pnpm build gera out/ e o manifesto versionado dos arquivos offline. pnpm start serve esses arquivos locais. Qualquer hospedagem estática HTTPS pode servir out/; não há rotas financeiras, API do Manin ou funções de servidor.

vercel.json configura a saída estática. Manter o domínio é importante: mudar a origem cria outro espaço local. Antes de publicar uma atualização em outro domínio, exporte o backup.

No iPhone, abra a publicação HTTPS no Safari, espere a primeira abertura e adicione à Tela de Início pelo menu Compartilhar. Validação em aparelho físico continua necessária.

## O que funciona

Dashboard mensal; despesas e receitas; criação, edição, consulta, busca/filtros e exclusão com desfazer; categorias/subcategorias, contas, apelidos de cartões, parcelas e pagamentos; recorrentes com pausa, cancelamento, histórico e conciliação; orçamentos; relatórios de seis meses; temas claro/escuro; CSV; backup/restauração JSON; backup manual opcional no Drive.

Em **Recorrentes**, compras que se repetem e apelidos de cartões ficam juntos. Cada recorrente tem um tipo (Assinatura, Seguro, Plano, Conta, Mensalidade ou Outros) e pagamento por crédito, Pix, débito ou dinheiro. No crédito, escolha um apelido ou crie um ali mesmo, sem perder o formulário. Cartões guardam somente ID interno e apelido: nenhum campo de banco, número, dígitos, limite ou ciclo bancário.

Em **Preferências → Tipos de recorrentes**, crie, renomeie ou exclua tipos personalizados. Um tipo em uso só pode ser excluído depois de trocado nas recorrentes. Os filtros separam tipo e pagamento. Tipo descreve a recorrente; categoria continua organizando os gastos e orçamentos.

Novas compras no crédito entram no mês da compra; parcelas seguintes entram nos meses seguintes. O total da compra continua sendo consumo na data da compra. Registrar um pagamento afeta o caixa e reduz o crédito em aberto sem contar a compra duas vezes. Os meses representam sua organização no Manin, sem acompanhar fechamento ou vencimento do banco.

Atualização dos dados existentes é automática e atômica. Apelidos, IDs, compras, parcelas, pagamentos e competências antigas são preservados; informações antigas do cadastro do cartão são removidas. Recorrentes antigas recebem o tipo Outros, editável pela pessoa. Transferências antigas permanecem identificadas no histórico e nos backups, fora dos gastos/receitas, sem opção de criar, editar ou reutilizar uma transferência.

A versão anterior exigia conta. Agora a página /login/ explica o espaço local; o app em / abre diretamente e apresenta o aviso de armazenamento no primeiro acesso.

## Backup JSON

Em Preferências, use Exportar JSON. O arquivo contém format: manin-backup, version: 3, dataset_id, source, exported_at e data com accounts, categories, cards, transactions, installments, payments, recurrences, recurrence_types e budgets. Inclui lançamentos excluídos, tipos personalizados e o mês inicial de cada compra no crédito, sem trocar IDs ou perder relações. Backups locais/Drive v2 e exportações completas v1 antigas também são aceitos: o conteúdo antigo é validado antes da migração e mantém as competências e pagamentos originais.

Em Restaurar arquivo JSON, selecione o arquivo. O app valida **todo** o conteúdo, inclusive tipos, centavos inteiros, datas, IDs duplicados, referências, hierarquia, parcelas/total/calendário, pagamentos e ocorrências. Versões desconhecidas, conteúdo extra, arquivo truncado ou vínculos inválidos são recusados.

Antes de substituir, o app apresenta origem, data, quantidade de registros e confirmação explícita. A restauração substitui o conjunto inteiro; não mescla dados. Cancelar ou falhar mantém os dados atuais intactos. Se outra aba alterar os dados após a confirmação ser preparada, a restauração é recusada para revisar a substituição.

O limite é 20 MB e 100 mil registros no conjunto. Novas gravações que tornariam o conjunto impossível de restaurar são canceladas. Não há execução de JavaScript, HTML ou comandos presentes no JSON. Textos são exibidos como texto.

Backups contêm informações financeiras sensíveis e **não são criptografados pelo Manin**. Proteja o arquivo e o acesso ao dispositivo/conta Google. Não há conteúdo financeiro em logs do app.

CSV exporta os lançamentos não excluídos, neutraliza fórmulas de planilha e é útil para consulta, mas não substitui o backup JSON completo.

## Google Drive opcional

O JSON local funciona sem configuração. Se o cliente OAuth não estiver configurado, Preferências mostra instruções e não simula conexão/envio.

1. Crie um projeto no Google Cloud Console e habilite **Google Drive API**.
2. Em Google Auth Platform, configure Branding, Audience e Data Access para a tela de consentimento. Durante testes, inclua os emails das pessoas autorizadas como usuários de teste.
3. Use apenas o escopo https://www.googleapis.com/auth/drive.appdata. O email exibido é consultado pelo campo user.emailAddress de drive.about.get, sem pedir acesso adicional ao perfil ou email.
4. Em Clients, crie um cliente OAuth 2.0 do tipo **Web application**.
5. Cadastre as **Authorized JavaScript origins** exatas: http://localhost:3000 para desenvolvimento e o domínio HTTPS da publicação, sem caminhos. Adicione a origem da prévia se for testá-la em outra porta.
6. Copie .env.example para .env.local e preencha somente:

```dotenv
NEXT_PUBLIC_GOOGLE_CLIENT_ID=seu-id-publico.apps.googleusercontent.com
```

7. Reinicie o desenvolvimento ou refaça pnpm build/publicação: a variável pública faz parte da compilação. Não coloque client secret, service account ou chaves privadas no frontend.

Em Preferências: Conectar Google Drive → conferir a conta conectada → Enviar backup agora. **Conectar não envia nada.** O envio é manual, direto do navegador ao Google, e só é anunciado como concluído depois de a API confirmar ID, tamanho e metadados do arquivo. A data confirmada e a conta ficam registradas localmente.

Listar backups mostra apenas arquivos do Manin na appDataFolder privada, invisível na interface normal do Drive. Restaurar backup do Drive baixa, valida e pede a mesma confirmação de substituição do JSON local. Nenhuma operação automática sincroniza, mescla ou envia dados. Desconectar apenas elimina a autorização da sessão no app; não apaga dados locais nem arquivos no Drive.

Tokens OAuth ficam somente em memória, expiram e exigem nova ação da pessoa. A API pode recusar acesso, exigir consentimento ou depender da configuração/publicação do cliente Google. Nenhum envio é feito a um servidor do Manin.

Fontes oficiais: [pasta de dados do app](https://developers.google.com/workspace/drive/api/guides/appdata), [modelo de tokens para navegador](https://developers.google.com/identity/oauth2/web/guides/use-token-model), [OAuth do cliente web](https://developers.google.com/identity/oauth2/web/guides/get-google-api-clientid), [about.get](https://developers.google.com/workspace/drive/api/reference/rest/v3/about/get).

## Migrar dados da versão com Supabase

O projeto removeu dependências, autenticação, rotas e configuração funcionais do Supabase. **Nenhum banco remoto foi acessado, apagado ou modificado.**

Se você já tem dados remotos, exporte antes de desligar o acesso à versão anterior:

- Na versão anterior ainda conectada, entre na sua conta e use Preferências → Exportar JSON. Esse JSON version: 1, com invoice_payments, é aceito pelo importador novo.
- Se a interface anterior não estiver disponível, use docs/migration-export.sql no SQL Editor do seu projeto Supabase. Substitua o UUID pelo ID exato da sua conta em Authentication → Users. A consulta tem apenas SELECT e filtra o proprietário; não remova o filtro. Copie o valor completo da coluna backup para um arquivo JSON UTF-8.
- Abra o Manin local na origem onde pretende usar seus dados, importe o arquivo, confira a confirmação e restaure.
- Confira valores, parcelas, pagamentos e vínculos; exporte um novo backup v2. Só depois decida desligar o serviço antigo. Este projeto não executa essa decisão remotamente.

A migração reconhece as oito tabelas do exportador anterior, valida o proprietário único e conserva IDs. Campos antigos de proprietário/created_at são removidos após validação; não é criada uma conta Auth. Um dump SQL, CSV ou exportação parcial não é um backup JSON compatível.

## Regras financeiras

- Centavos inteiros, positivos, até 2 bilhões por registro. Parcelas somam exatamente a compra; os centavos de resto vão para as primeiras.
- Consumo reconhece a compra efetiva integral na data da compra. Parcelas são compromissos e não repetem consumo.
- Caixa considera receitas/despesas efetivas sem crédito e pagamentos pela data paga. Transferências próprias ficam fora de receita/despesa.
- Previsões e datas futuras ficam fora do realizado. Fluxo líquido registrado não representa saldo bancário.
- Compra no fechamento entra no ciclo que está fechando; competência é o mês de vencimento. Dias inexistentes são limitados ao mês, recuperando a âncora depois de fevereiro.
- Editar/excluir compra com pagamento relacionado é bloqueado; compras sem pagamento refazem parcelas atomicamente. Cartão com compras mantém seus dias de ciclo.
- Recorrências vencidas são geradas quando o app abre, recebe foco, é atualizado ou cruza a data atual. Geração e avanço de calendário são atômicos e idempotentes, inclusive após exclusão de uma ocorrência. Não existe tarefa em segundo plano com o app fechado.
- Pausar/cancelar mantém o histórico. Ao reativar, confira a próxima data: datas vencidas serão processadas. Cobrança gerada por calendário não é confirmação de débito bancário.
- Exclusão com desfazer tem janela de 10 minutos no motor; o aviso oferece a ação por 12 segundos. Exclusão total também remove contas/categorias personalizadas e recria configurações iniciais vazias.

## Verificar

```sh
pnpm test
pnpm typecheck
pnpm lint
pnpm exec playwright install chromium
pnpm test:e2e
pnpm build
pnpm test:offline
pnpm test:visual
```

test:visual usa o servidor de desenvolvimento ativo. test:offline usa a compilação out/ e um servidor próprio, que é **desligado durante o teste**.

Os testes cobrem regras de dinheiro/calendário, crédito pelo mês da compra, tipos personalizados, IndexedDB persistente/atômico, gravações concorrentes, isolamento pessoal/demo/origem, JSON v3 e migrações v1/v2, cancelamento, confirmação obsoleta, dados inválidos, falha de armazenamento e preservação do conjunto atual. Drive é verificado com respostas de API controladas, incluindo envio recusado, confirmação incompleta, acesso negado, expiração, limite, upload retomável e recuperação de arquivos v2. Verificação real do Google depende de cliente OAuth e consentimento; os testes não fingem que uma conta real foi conectada.
