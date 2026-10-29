# Colaqui — Design do aplicativo pessoal de venda multicanal

Data: 2026-10-29

Status: aguardando aprovação do proprietário

## 1. Intenção

O Colaqui será um aplicativo web pessoal para cadastrar uma coisa usada uma única vez e conduzir sua publicação em diferentes canais de venda. O aplicativo será a fonte central das informações do item, das fotos e do estado de cada anúncio.

O produto existe para reduzir a repetição de preencher título, descrição, preço, fotos e condição em vários sites. Ele não será um marketplace próprio e não participará da compra ou do pagamento.

## 2. Usuário e cenário principal

- Há um único proprietário do sistema.
- O proprietário anuncia somente seus próprios bens usados.
- Cada produto é, por padrão, uma unidade única.
- O primeiro país/site suportado será o Brasil (`MLB` no Mercado Livre).
- Mercado Livre poderá receber anúncios automaticamente pela API oficial.
- A integração automática com a OLX ficará desabilitada até que a conta e o plano tenham acesso à API oficial.
- Enjoei e Facebook Marketplace usarão publicação assistida: o Colaqui prepara o conteúdo, permite copiar os campos, abre o destino e registra o resultado informado pelo proprietário.
- Quando um item for vendido, o sistema ajudará a encerrar os outros anúncios para evitar uma segunda venda do mesmo item.

## 3. Objetivos

1. Manter um catálogo pessoal central de produtos usados.
2. Armazenar e ordenar fotos sem acoplar a aplicação ao provedor de objetos.
3. Publicar, atualizar, pausar e encerrar anúncios automaticamente onde houver API oficial autorizada.
4. Oferecer um fluxo assistido claro para plataformas sem API pública adequada.
5. Mostrar, por produto e por canal, o estado atual, a URL do anúncio, o último processamento e eventuais erros.
6. Evitar venda duplicada de um item único.
7. Manter credenciais e segredos fora do repositório público.
8. Entregar um repositório simples de executar localmente e simples de abrir no Cursor.

## 4. Não objetivos

- Comprar produtos.
- Criar carrinho, checkout, pagamentos ou logística próprios.
- Atender vários vendedores, lojas ou organizações.
- Raspar dados de marketplaces.
- Automatizar login, CAPTCHA ou controles privados de Facebook Marketplace ou Enjoei.
- Contornar limitações comerciais ou técnicas das APIs.
- Criar aplicativos móveis nativos no primeiro produto.
- Sincronizar mensagens de compradores no primeiro produto.
- Fazer precificação automática por inteligência artificial no primeiro produto.

## 5. Antiobjetivos

O projeto será considerado malsucedido mesmo que funcione tecnicamente se:

- colocar a conta do proprietário em risco por usar automação não autorizada;
- publicar um produto duas vezes no mesmo canal por falta de idempotência;
- vender a mesma unidade em mais de um canal sem alertar e iniciar o encerramento dos demais anúncios;
- exigir manutenção de uma arquitetura distribuída desnecessária para um único usuário;
- armazenar tokens, senhas ou chaves no Git;
- perder fotos quando o provedor de armazenamento for trocado.

## 6. Restrições e escolhas confirmadas

- Linguagem: TypeScript.
- Runtime do servidor: Node.js.
- Interface e servidor web: Next.js com App Router.
- Banco de dados: PostgreSQL.
- ORM e migrações: Prisma.
- Fotos: API compatível com S3, usando MinIO em desenvolvimento e podendo usar Amazon S3 ou outro serviço compatível em produção.
- Licença: MIT.
- Visibilidade do repositório: pública.
- Repositório: `https://github.com/lorenzzoapatatt/colaqui`.
- Caminho local: `C:\Users\loren\source\repos\lorenzzoapatatt\colaqui`.
- Idioma inicial da interface: português do Brasil.
- Escopo da primeira entrega: todos os critérios da seção 23, a estrutura de configuração da OLX sem ativação real e o endurecimento mínimo necessário para operar com segurança. A integração OLX ativa e a escolha de hospedagem dependem de acesso e decisões externas.

## 7. Abordagens consideradas

### 7.1 Monólito modular com worker no mesmo repositório — escolhida

O Next.js fornece a interface e os endpoints HTTP. Módulos de domínio separam produtos, mídia, anúncios e integrações. Um processo Node.js separado consome tarefas em segundo plano, mas compartilha os mesmos módulos, banco e repositório.

Vantagens:

- implantação e desenvolvimento simples;
- fronteiras de módulo claras sem criar vários serviços;
- publicações e repetições não bloqueiam requisições web;
- adequado a um único proprietário e ainda preparado para integrações assíncronas.

Trade-off: web e worker precisam ser iniciados como dois processos, embora venham do mesmo código e da mesma imagem de aplicação.

### 7.2 Next.js e API completamente separados

Usaria Next.js somente na interface e Fastify ou NestJS em uma aplicação de API independente, além do worker.

Vantagem: separação operacional forte e possibilidade de vários clientes futuros.

Desvantagem: duplica configuração, contratos, implantação e observabilidade sem benefício proporcional para um aplicativo pessoal.

### 7.3 Serverless com serviços gerenciados

Usaria funções serverless, PostgreSQL gerenciado, S3 e fila externa.

Vantagem: pouca administração de servidor.

Desvantagem: tarefas longas, repetições, OAuth, webhooks e execução local com MinIO ficam mais complexos; também introduz mais fornecedores e custos recorrentes.

## 8. Arquitetura escolhida

```text
Navegador
   |
   v
Next.js (UI + Route Handlers)
   |             |                         |
   |             |                         +--> URLs/tarefas assistidas
   |             |                              Enjoei e Facebook
   |             |
   |             +--> Fila PostgreSQL --> Worker Node.js
   |                                      |             |
   v                                      v             v
PostgreSQL + Prisma                 Mercado Livre      OLX*
   |
   +--> metadados de fotos

MinIO/S3 <-- objetos das fotos

* somente quando a conta tiver acesso oficial
```

Será usado um monólito modular. As regras de negócio não ficarão em componentes React nem diretamente nos Route Handlers. A interface HTTP chamará serviços de aplicação; esses serviços usarão repositórios Prisma, armazenamento de objetos e conectores de canal por interfaces explícitas.

## 9. Organização proposta do repositório

```text
colaqui/
├── src/
│   ├── app/                         # páginas e Route Handlers do Next.js
│   ├── components/                  # componentes visuais compartilhados
│   ├── modules/
│   │   ├── auth/                    # acesso do proprietário
│   │   ├── products/                # catálogo e ciclo de vida do item
│   │   ├── media/                   # upload, ordem e remoção de fotos
│   │   ├── listings/                # estado multicanal e encerramento
│   │   └── integrations/
│   │       ├── core/                # contrato comum dos conectores
│   │       ├── mercadolivre/        # conector por API
│   │       ├── olx/                 # conector por API, desabilitado por padrão
│   │       ├── enjoei/              # pacote de publicação assistida
│   │       └── facebook/            # pacote de publicação assistida
│   ├── infrastructure/
│   │   ├── db/                      # Prisma e repositórios
│   │   ├── jobs/                    # fila baseada em PostgreSQL
│   │   ├── storage/                 # adaptador S3/MinIO
│   │   ├── crypto/                  # proteção de tokens
│   │   └── observability/           # logs estruturados
│   └── worker/                      # processo de tarefas assíncronas
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   └── seed.ts
├── tests/
├── docs/
├── public/
├── docker-compose.yml
├── Dockerfile
└── .env.example
```

Não será criado um monorepo com vários gerenciadores de pacote. Web e worker compartilharão um único `package.json`, configuração TypeScript e árvore de módulos.

## 10. Modelo de domínio e dados

### Owner

Representa o único proprietário e permite proteger uma instalação exposta à internet.

Campos principais: `id`, `email`, `passwordHash`, `createdAt`, `updatedAt`.

### Product

É a fonte central do item físico.

Campos principais:

- `id` UUID;
- `title`;
- `description`;
- `condition` como enumeração controlada;
- `priceCents` em inteiro;
- `categoryHint` opcional;
- `brand` opcional;
- `locationText` e `postalCode` opcionais;
- `quantity`, inicialmente sempre `1`;
- `status`: `DRAFT`, `READY`, `LISTED`, `RESERVED`, `SOLD`, `ARCHIVED`;
- `soldAt` opcional;
- timestamps.

### ProductPhoto

Campos principais: `id`, `productId`, `objectKey`, `bucket`, `mimeType`, `sizeBytes`, `width`, `height`, `checksum`, `sortOrder` e timestamps.

O banco guarda metadados; o conteúdo binário fica somente no armazenamento de objetos.

### ChannelConnection

Registra a configuração de um canal.

Campos principais:

- `platform`: `MERCADO_LIVRE`, `OLX`, `ENJOEI`, `FACEBOOK_MARKETPLACE`;
- `mode`: `API` ou `ASSISTED`;
- `status`: `DISCONNECTED`, `CONNECTED`, `ACTION_REQUIRED`, `DISABLED`;
- tokens de acesso e atualização criptografados, quando aplicável;
- expiração do token;
- metadados não secretos em JSONB;
- timestamps.

Não haverá mais de uma conexão por plataforma na primeira versão.

### Listing

Relaciona um produto a um canal.

Campos principais:

- `id`, `productId`, `platform`;
- `mode`;
- `status`: `DRAFT`, `READY`, `PUBLISHING`, `ACTIVE`, `PAUSED`, `SOLD`, `CLOSING`, `CLOSED`, `ERROR`, `ACTION_REQUIRED`;
- `channelPriceCents` opcional para permitir preço diferente por canal;
- `externalId` e `externalUrl` opcionais;
- `platformCategoryId` opcional;
- `platformData` JSONB apenas para atributos específicos do canal;
- `publishedProductVersion` e `publishedSnapshotHash` para detectar conteúdo desatualizado;
- `lastSyncedAt`, `lastErrorCode`, `lastErrorMessage`;
- timestamps;
- restrição única por `productId + platform`.

### ListingAttempt

Histórico auditável de publicação, atualização, pausa, encerramento e consulta.

Campos principais: `id`, `listingId`, `operation`, `status`, `idempotencyKey`, `requestSummary`, `responseSummary`, `errorCode`, `errorMessage`, `startedAt`, `finishedAt`.

Segredos, tokens e dados pessoais desnecessários serão removidos dos resumos.

### AssistedTask

Representa uma ação manual pendente no Enjoei ou Facebook.

Campos principais: `id`, `listingId`, `type`, `status`, `preparedPayload` JSONB, `destinationUrl`, `completedAt` e timestamps.

### Sale

Registra a origem e o resultado da venda sem presumir que toda venda ocorreu em um canal integrado.

Campos principais: `id`, `productId`, `sourceType` (`LISTING`, `OFFLINE`, `OTHER`), `sourceListingId` opcional, `status` (`RESERVED`, `PAID`, `CANCELLED`, `REFUNDED`), `externalOrderId` opcional, `reservedAt`, `paidAt`, `cancelledAt` e timestamps.

## 11. Contrato dos conectores

Todos os canais implementarão uma interface interna conceitualmente equivalente a:

```ts
interface ListingConnector {
  capabilities(): ConnectorCapabilities;
  validate(product: ProductForListing): Promise<ValidationResult>;
  prepare(product: ProductForListing): Promise<PreparedListing>;
  publish?(input: PublishListingInput): Promise<PublishResult>;
  update?(input: UpdateListingInput): Promise<UpdateResult>;
  close?(input: CloseListingInput): Promise<CloseResult>;
  getStatus?(input: GetListingStatusInput): Promise<RemoteListingStatus>;
}
```

Os recursos opcionais serão anunciados por `capabilities()`. A aplicação não presumirá que todo canal consegue publicar, atualizar ou consultar estado automaticamente.

## 12. Fluxos principais

### 12.1 Cadastro

1. O proprietário cria um produto em rascunho.
2. Envia e ordena as fotos.
3. Preenche os dados comuns.
4. O sistema valida os requisitos mínimos gerais.
5. O produto passa para `READY`.

### 12.2 Publicação automática

1. O proprietário escolhe Mercado Livre ou um futuro canal com API.
2. O conector valida categoria e atributos obrigatórios.
3. A aplicação cria ou atualiza `Listing` e enfileira uma tarefa com chave idempotente.
4. O worker publica o anúncio.
5. O resultado e o identificador externo são persistidos.
6. Falhas transitórias são repetidas com atraso crescente e limite definido; falhas de validação exigem ação do proprietário.

Na primeira versão do Mercado Livre, o conector será específico para o Brasil e para itens usados de quantidade única. A interface pesquisará categorias e carregará dinamicamente atributos, tipos de anúncio e modalidades de entrega permitidos pela API; não haverá uma lista de categorias codificada manualmente. O proprietário escolherá somente entre opções aceitas para aquele produto e conta.

### 12.3 Publicação assistida

1. O proprietário escolhe Enjoei ou Facebook Marketplace.
2. O conector gera título, descrição, preço, checklist e links de fotos.
3. A tela apresenta botões de cópia, compartilhamento móvel quando suportado, download individual e download de todas as fotos em um pacote ZIP, e abre a página oficial de criação do anúncio em nova aba.
4. O proprietário conclui a publicação diretamente na plataforma.
5. De volta ao Colaqui, informa a URL do anúncio ou marca a tarefa como concluída.
6. O `Listing` passa a `ACTIVE`, mas seu estado remoto não é presumido nem raspado.

### 12.4 Item vendido

1. Uma notificação oficial pode indicar pedido em um canal com API, ou o proprietário registra uma venda em um anúncio, fora das plataformas ou em outro canal.
2. Um pedido criado mas ainda não pago coloca o produto em `RESERVED`. O sistema tenta pausar anúncios automáticos e cria alertas urgentes para os canais assistidos, reduzindo o risco de venda dupla sem declarar a venda definitiva.
3. Pagamento confirmado coloca a venda em `PAID` e o produto em `SOLD` em uma transação de banco.
4. O sistema enfileira o encerramento dos anúncios ativos com API.
5. Para Enjoei e Facebook, cria tarefas assistidas de encerramento.
6. Pedido não pago cancelado remove a reserva, mas não reativa anúncios externos automaticamente; o proprietário recebe uma ação para revisar e reativar com segurança.
7. Cancelamento ou reembolso depois do pagamento não republica o item automaticamente e passa a exigir decisão explícita do proprietário.
8. O painel mantém um alerta até que todos os canais estejam `CLOSED` ou `SOLD`.

### 12.5 Edição após publicação

Alterações no produto não serão enviadas silenciosamente. A interface mostrará quais anúncios ficaram desatualizados e permitirá sincronizar canais automáticos ou gerar novamente o pacote assistido.

Título, descrição, fotos, condição, categoria, marca, localização e preço-base participam da versão publicável do produto. Cada publicação guarda a versão e um hash do conteúdo enviado. Um preço específico de canal sobrevive a mudanças do preço-base e, nesse canal, a mudança do preço-base não substitui nem invalida automaticamente o preço sobrescrito.

### 12.6 Arquivamento e reabertura

- Um produto com anúncio ativo não poderá ser arquivado diretamente; primeiro deverá iniciar o encerramento dos anúncios.
- Arquivamento será lógico e reversível enquanto as fotos ainda estiverem no período de retenção.
- Reverter uma marcação `SOLD` exigirá uma ação explícita e registro do motivo.
- Reabertura nunca reativará anúncios externos automaticamente; ela criará ações de revisão por canal.

## 13. Fila e processamento assíncrono

A fila usará o próprio PostgreSQL para evitar Redis em um aplicativo pessoal. A biblioteca exata poderá ser decidida na etapa de planejamento; `pg-boss` é a opção inicial preferida por oferecer repetição, agendamento e exclusão mútua sobre PostgreSQL.

Requisitos:

- idempotência por operação, produto, canal e versão relevante;
- repetição somente para erros transitórios;
- atraso crescente com aleatoriedade;
- limite de tentativas;
- possibilidade de repetição manual;
- desligamento gracioso do worker;
- histórico em `ListingAttempt` separado das tabelas internas da fila.

## 14. Fotos e armazenamento

- O cliente enviará as fotos ao servidor ou por URLs pré-assinadas, conforme definido no plano técnico.
- O adaptador usará AWS SDK para S3 e aceitará endpoint customizado, habilitando MinIO.
- Chaves de objeto serão opacas e não conterão nome pessoal ou título do produto.
- Serão aceitos inicialmente JPEG, PNG e WebP, com limites explícitos de quantidade e tamanho.
- Orientação EXIF será normalizada e metadados EXIF serão removidos das versões processadas.
- Originais poderão ser preservados; miniaturas e versões para exibição serão derivadas.
- O fluxo assistido fornecerá arquivos processados adequados ao upload e um pacote ZIP; links assinados isolados não serão considerados entrega suficiente.
- Remoção de produto fará exclusão lógica primeiro. A coleta definitiva de objetos órfãos será uma tarefa separada e recuperável.
- URLs públicas permanentes não serão exigidas. A aplicação gerará URLs assinadas, exceto quando uma API de canal exigir URL temporariamente acessível.

## 15. Interface

### Páginas iniciais

1. **Entrar** — acesso do proprietário.
2. **Painel** — produtos por estado, tarefas pendentes, erros e anúncios que precisam ser encerrados.
3. **Novo/editar produto** — campos comuns, preço e gerenciador ordenável de fotos.
4. **Detalhe do produto** — resumo central e um cartão por canal.
5. **Publicação assistida** — dados preparados, botões de cópia, fotos e checklist.
6. **Integrações** — estado de Mercado Livre, OLX, Enjoei e Facebook.
7. **Histórico** — tentativas e erros de sincronização.

A interface será responsiva, pois fotografar e publicar a partir do celular é um cenário importante, embora o primeiro produto seja web.

## 16. Autenticação e segurança

Decisão do projeto: mesmo sendo pessoal, o aplicativo terá autenticação de proprietário porque OAuth e webhooks podem exigir uma instalação publicamente acessível.

O primeiro acesso exibirá uma criação de proprietário somente quando a tabela `Owner` estiver vazia. Depois disso, essa rota ficará permanentemente indisponível. Haverá alteração de senha autenticada na interface e recuperação administrativa por comando local que exige acesso ao ambiente e uma variável secreta; não haverá recuperação por e-mail na primeira versão.

- senha armazenada somente como hash resistente;
- sessão em cookie `HttpOnly`, `Secure` em produção e `SameSite=Lax`;
- proteção CSRF nas mutações aplicáveis;
- rate limiting no login e endpoints públicos;
- validação de entrada com esquemas TypeScript em todas as fronteiras;
- tokens OAuth criptografados no banco com chave fornecida por variável de ambiente;
- verificação de assinatura/segredo de webhooks quando a plataforma oferecer;
- redirecionamentos OAuth validados por estado e PKCE quando suportado;
- logs sem tokens, senhas, cookies ou payloads sensíveis;
- `.env`, credenciais e dados reais excluídos pelo `.gitignore`;
- `.env.example` somente com nomes e valores seguros de exemplo.

## 17. API e validação

Route Handlers do Next.js serão usados para:

- CRUD de produtos e fotos;
- comandos de publicação e encerramento;
- conclusão de tarefas assistidas;
- OAuth callbacks;
- webhooks oficiais;
- consulta de estado do painel.

Os endpoints não exporão diretamente modelos Prisma. Entradas e saídas terão esquemas próprios, e valores monetários serão representados em centavos inteiros.

## 18. Execução e implantação

### Desenvolvimento local

`docker-compose.yml` fornecerá PostgreSQL e MinIO. O Next.js e o worker poderão rodar pelo gerenciador de pacotes no host para recarga rápida, com opção de executar tudo em contêineres posteriormente.

### Produção

O desenho será compatível com um host Linux ou serviço de contêineres que execute:

- aplicação Next.js;
- worker;
- PostgreSQL gerenciado ou em contêiner;
- S3 compatível.

OAuth e webhooks automáticos exigirão URL HTTPS pública. A escolha do provedor de hospedagem fica fora do primeiro ciclo de implementação; a aplicação não dependerá de Vercel, AWS ou outro provedor específico.

## 19. Observabilidade e recuperação

- logs JSON com identificadores de produto, anúncio, tarefa e tentativa;
- tela de histórico legível pelo proprietário;
- health checks separados para web e worker;
- verificação de conexão com PostgreSQL e armazenamento;
- erros de integração classificados em validação, autenticação, limite, transiente e desconhecido;
- backup do PostgreSQL e política de versionamento/backup do bucket documentados antes da implantação real.

## 20. Testes e qualidade

- testes unitários para regras de estado, idempotência e mapeamentos de plataforma;
- testes de integração com PostgreSQL e MinIO reais em contêineres;
- adaptadores HTTP testados com servidores simulados, nunca com contas reais no CI;
- testes end-to-end dos fluxos de cadastro, publicação assistida e venda;
- lint, verificação de tipos, testes e build no GitHub Actions;
- Prisma migrations aplicadas em banco descartável no CI;
- fixtures sem dados pessoais.

## 21. Entrega incremental

1. Fundação: Next.js, Prisma, PostgreSQL, MinIO, autenticação e CI.
2. Catálogo: produtos, fotos e painel.
3. Publicação assistida: Enjoei e Facebook.
4. Núcleo multicanal: estados, fila, worker, tentativas e encerramento coordenado.
5. Mercado Livre Brasil: OAuth, categorias e atributos dinâmicos, publicação, atualização, notificações, reserva, venda e encerramento.
6. OLX: estrutura e telas de configuração; ativação real somente após acesso oficial.
7. Endurecimento: segurança mínima de produção, observabilidade, backups e documentação de implantação.

Cada etapa deverá manter o repositório executável e testado.

## 22. Decisões deixadas ao plano de implementação

Estas escolhas podem ser feitas pelo construtor sem alterar o produto aprovado:

- gerenciador de pacotes entre `pnpm` e `npm`, com preferência inicial por `pnpm`;
- biblioteca de componentes visuais e estratégia de CSS;
- biblioteca concreta de sessão/autenticação, desde que cumpra os requisitos acima;
- biblioteca concreta da fila PostgreSQL;
- biblioteca de processamento de imagens;
- provedor de testes end-to-end;
- provedor de hospedagem futuro;
- nomes internos de comandos, DTOs e arquivos.

## 23. Critérios de aceite da primeira versão utilizável

1. O proprietário consegue entrar com segurança.
2. Consegue criar, editar, arquivar e visualizar um produto de quantidade única.
3. Consegue enviar, remover e reordenar fotos armazenadas no MinIO/S3.
4. Consegue gerar e concluir publicação assistida para Enjoei e Facebook.
5. Consegue conectar uma conta de teste do Mercado Livre e publicar sem duplicação.
6. Consegue visualizar e repetir uma publicação que falhou.
7. Ao marcar um item como vendido, o sistema inicia o encerramento automático disponível e cria tarefas para os canais assistidos.
8. Nenhum segredo está presente no repositório público ou nos logs.
9. O projeto inicia localmente seguindo somente o README e arquivos de exemplo.
10. Lint, tipos, testes e build passam no CI.
11. Pedidos ainda não pagos reservam o item; somente pagamento confirmado conclui a venda.
12. Vendas offline ou em canais não rastreados podem ser registradas e disparam o mesmo encerramento coordenado.
13. A configuração da OLX existe, mas deixa claro que a ativação depende de acesso oficial.

