# AlarmClock — Entra21 (Refatoração com Clean Code)

Projeto da disciplina de **Clean Code**. Consiste na refatoração de uma
aplicação web de relógio com alarmes, originalmente desenvolvida no curso
Entra21, aplicando os princípios de código limpo estudados em aula.

**Integrantes:** Rafael Ronsoni Gaidzinski · William Espindola Cardoso · Thiago Meller

- Branch `original` — versão antiga do projeto, antes da refatoração.
- Branch `main` — versão refatorada (este conteúdo).

---

## 1. Descrição do software e principais funcionalidades

O **AlarmClock** é uma aplicação web de relógio com despertador. É composta por
um **frontend** (a tela, em HTML/CSS/JavaScript) e um **backend** (servidor em
Node.js com Express), que se comunicam por uma API REST. O servidor também
consome a API externa **HG Brasil** (previsão do tempo) e persiste dados em
arquivos JSON.

Principais funcionalidades:

- **Relógio em tempo real** com data formatada.
- **Gerenciamento de alarmes** — criação, listagem, ativação/desativação e
  remoção de até 6 alarmes, cada um com horário e descrição.
- **Disparo de alarme** com áudio no horário configurado.
- **Previsão do tempo** (temperatura mínima, máxima e atual, com ícone).
- **Atualização automática do clima** a cada 15 minutos.
- **Saudação personalizada** (bom dia/tarde/noite) com base no nome, gênero e
  horário do pôr do sol.
- **Configurações do usuário** — formato de hora (12h/24h), escala de
  temperatura (°C/°F/°K), cidade, gênero e nome.

---

## 2. Análise dos principais problemas detectados (code smells)

A análise do código original identificou diversos *code smells* relevantes,
agrupados por categoria:

| # | Code smell | Onde |
|---|------------|------|
| 1 | **Credencial exposta** — chave de API escrita no código-fonte público | `server.js` |
| 2 | **Configuração ausente** — `.gitignore` não protegia segredos | `.gitignore` |
| 3 | **Nomenclatura inconsistente** — mistura de português e inglês | `server.js`, `index.html`, JSONs |
| 4 | **Nomes problemáticos** — classes CSS com acento | `style.css` |
| 5 | **Nomes não descritivos** — `store`, `counter`, `getClima` | `index.html` |
| 6 | **God file / classe-deus** — um arquivo de 570+ linhas fazendo tudo | `server.js` |
| 7 | **Mistura de responsabilidades** — HTML + CSS + 700 linhas de JS juntos | `index.html` |
| 8 | **Estado global** — dezenas de variáveis globais no frontend | `index.html` |
| 9 | **Código duplicado** — mesmo trecho repetido para ler/escrever alarmes | `server.js` |
| 10 | **Duplicação de chamadas** — `fetch` repetido em vários pontos | `index.html` |
| 11 | **Estilos duplicados** — regras quase idênticas para dois campos | `style.css` |
| 12 | **Números/strings mágicas** — `6`, mensagens de status sem nome | `server.js` |
| 13 | **Valores repetidos** — cores, sombras e fontes repetidas | `style.css` |
| 14 | **Tratamento de erro frágil** — comparação de strings de retorno | `server.js` |
| 15 | **Sintaxe obsoleta** — uso de `var` em todo o projeto | `server.js`, `index.html` |
| 16 | **Inconsistência de dados** — chaves dos JSON em português/misto | `alarms.json`, `config.json` |
| 17 | **Dependência inútil** — pacote `fs` (nativo do Node) no `package.json` | `package.json` |
| 18 | **Configuração incompleta** — sem metadados nem scripts de execução | `package.json` |

---

## 3. Estratégias de refatoração utilizadas

| Code smell(s) | Estratégia / técnica | Ferramenta |
|---------------|----------------------|------------|
| 6, 9, 12, 14, 15 | Backend reescrito em **classes com responsabilidade única (SRP)** e **injeção de dependência** | Programação Orientada a Objetos (ES6) |
| 5, 7, 8, 10, 15 | Frontend reorganizado em **módulos isolados** com **ponto de entrada único** | Revealing Module Pattern (IIFE) |
| 9 | Trecho duplicado extraído para método reutilizável | Princípio DRY |
| 12 | Valores fixos extraídos para **constantes nomeadas** | — |
| 14 | Erros tratados com **try/catch** e exceções | — |
| 1, 2 | Chave de API movida para **variáveis de ambiente** | dotenv + .gitignore |
| 4, 11, 13 | **Variáveis CSS** e classes sem acento; regra unificada | CSS Custom Properties |
| 3, 16 | **Padronização de nomes** em inglês (código e dados) | — |
| 17, 18 | package.json corrigido (dependências, metadados, scripts) | npm |

Detalhamento completo das mudanças no arquivo [CHANGELOG.md](./CHANGELOG.md).

---

## 4. Testes implementados e cobertura

A suíte de testes foi construída com **Jest**. A escolha de Orientação a
Objetos com injeção de dependência no backend tornou as classes testáveis de
forma isolada (sem tocar no disco nem na rede, usando *fakes* e *mocks*).

São **44 testes**, distribuídos em 6 arquivos na pasta `tests/`:

- `clockService.test.js` — formatação de hora/data e conversões (lógica pura).
- `alarmService.test.js` — CRUD de alarmes e limite máximo, com repositório falso.
- `configService.test.js` — validação e leitura/escrita de configurações.
- `weatherService.test.js` — resolução de cidade e clima, com cliente HTTP simulado.
- `fileRepository.test.js` — leitura/escrita real em arquivos temporários.
- `messageService.test.js` — todas as faixas da saudação (manhã/tarde/noite).

**Cobertura atingida** (acima da meta de ~50%):

| Métrica | Cobertura |
|---------|-----------|
| Statements | ~68% |
| Branches | ~89% |
| Functions | ~64% |
| Lines | ~67% |

Para executar os testes:

```bash
npm test              # roda a suíte
npm run test:coverage # roda a suíte e gera o relatório de cobertura
```

---

## 5. Linter e estilização do código

O projeto usa **ESLint** (linter) e **Prettier** (formatador), integrados em
três etapas:

1. **No projeto** — configuração em `.eslintrc.json` e `.prettierrc.json`, com
   scripts `npm run lint` e `npm run format`.
2. **Git Hook (pré-commit)** — via **Husky** (`.husky/pre-commit`), o lint e os
   testes rodam automaticamente antes de cada commit.
3. **CI/CD** — via **GitHub Actions** (`.github/workflows/ci.yml`), o lint e os
   testes rodam a cada push e pull request para a `main`.

```bash
npm run lint      # verifica o código
npm run lint:fix  # corrige automaticamente o que for possível
npm run format    # aplica a formatação do Prettier
```

---

## 6. Instalação e execução

**Pré-requisitos:** Node.js 18+ e npm.

```bash
# 1. Instalar as dependências
npm install

# 2. Criar o arquivo .env a partir do modelo e preencher a chave da API
cp .env.example .env
#    edite o .env e informe sua HG_BRASIL_API_KEY

# 3. Iniciar o servidor
npm start
```

Em seguida, abra o `index.html` no navegador.

> **Observação sobre o `index.html`:** o conteúdo HTML em si não muda com a
> refatoração. Para concluí-la no frontend:
> - substitua o bloco `<script>` embutido por `<script src="app.js"></script>`
>   no final do `<body>`;
> - atualize as classes com acento (`clTemperaturaMáxima` →
>   `clTemperaturaMaxima`; `clTelaConfiguração` → `clTelaConfiguracao`);
> - adicione a classe `clInputTexto` aos campos de cidade e nome.

---

## 7. Estrutura do projeto

```
.
├── app.js                      # JavaScript do frontend (7 módulos)
├── server/
│   └── server.js               # backend em classes (POO)
├── css/
│   └── style.css               # variáveis CSS + classes sem acento
├── files/
│   ├── alarms.json             # alarmes (chaves em inglês)
│   └── config.json             # configurações (chaves em inglês)
├── tests/                      # suíte de testes (Jest)
│   ├── helpers/fakeFileRepository.js
│   ├── clockService.test.js
│   ├── alarmService.test.js
│   ├── configService.test.js
│   ├── weatherService.test.js
│   ├── fileRepository.test.js
│   └── messageService.test.js
├── .github/workflows/ci.yml    # integração contínua (lint + testes)
├── .husky/pre-commit           # Git Hook (lint + testes)
├── .eslintrc.json              # configuração do ESLint
├── .prettierrc.json            # configuração do Prettier
├── .env.example                # modelo de variáveis de ambiente
├── .gitignore
├── package.json
├── CHANGELOG.md
└── README.md
```
