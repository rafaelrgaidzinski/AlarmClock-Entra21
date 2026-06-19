# Changelog

Todas as mudanças relevantes deste projeto são documentadas neste arquivo.

O formato segue o [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/),
e este projeto adota o [Versionamento Semântico](https://semver.org/lang/pt-BR/).

## [2.0.0] - 2026-06-18

Refatoração completa do projeto aplicando princípios de Clean Code. O
comportamento da aplicação para o usuário final permanece o mesmo; todas as
mudanças são internas, de organização e qualidade do código.

### Added

- Programação Orientada a Objetos no backend: classes `FileRepository`,
  `AlarmService`, `ConfigService`, `WeatherService`, `ClockService`,
  `MessageService` e `App`, cada uma com responsabilidade única.
- Injeção de dependência nos serviços (ex.: `AlarmService` recebe um
  `FileRepository`; `WeatherService` recebe o cliente HTTP), facilitando os testes.
- Organização do frontend em 7 módulos isolados (padrão Revealing Module / IIFE):
  `ApiClient`, `TimeUtils`, `WeatherModule`, `ClockModule`, `MessageModule`,
  `ConfigModule` e `AlarmModule`.
- Ponto de entrada único no frontend (função `init()`).
- Variáveis de ambiente com `dotenv`; arquivos `.env` e `.env.example`.
- Variáveis CSS (`:root`) para cores, sombras e fontes reutilizáveis.
- Regra de estilo compartilhada `.clInputTexto` para os campos de cidade e nome.
- Suíte de testes unitários com Jest (44 testes, ~68% de cobertura de statements).
- Integração de linter (ESLint) e formatador (Prettier).
- Integração contínua com GitHub Actions (lint + testes a cada push/PR).
- Git Hook de pré-commit com Husky (lint + testes antes de cada commit).
- Exportação das classes em `server.js` e guarda de inicialização
  (`if (require.main === module)`), tornando o módulo testável.
- Arquivos `CHANGELOG.md` e `README.md` detalhado.

### Changed

- Substituição de todas as ocorrências de `var` por `const` e `let`.
- Padronização da nomenclatura para o inglês em variáveis, funções e
  propriedades (ex.: `isAtivo` → `isActive`, `formatoHora` → `hourFormat`).
- Extração de números e textos "mágicos" para constantes nomeadas
  (ex.: `MAX_ALARMS`, caminhos de arquivo, listas de valores válidos).
- Tratamento de erros com `try/catch` e exceções, no lugar de comparações de
  strings de retorno.
- Separação do JavaScript do `index.html` para um arquivo `app.js` externo.
- Chaves dos arquivos `files/alarms.json` e `files/config.json` traduzidas
  para o inglês, alinhando-as ao backend.
- Nomes de classes CSS reescritos sem acento
  (`.clTemperaturaMáxima` → `.clTemperaturaMaxima`;
  `.clTelaConfiguração` → `.clTelaConfiguracao`).
- Eliminação de código duplicado na leitura/escrita de alarmes
  (método privado `_loadExistingAlarms`).
- `package.json` reescrito com metadados, scripts e dependências corretas.

### Removed

- Dependência incorreta `fs` do `package.json` (o módulo `fs` é nativo do Node.js).
- Importação duplicada do `axios` dentro de uma função.
- Variáveis globais do frontend (substituídas pelo encapsulamento em módulos).

### Fixed

- Padronização de igualdade estrita (`===`) em comparações sensíveis.

### Security

- Remoção da chave de API que estava exposta diretamente no código-fonte; ela
  passou a ser lida de um arquivo `.env`, que é ignorado pelo controle de versão
  (`.gitignore`).

## [1.0.0] - 2024

### Added

- Versão original do projeto AlarmClock, desenvolvida no curso Entra21
  (disponível no branch `original`). Aplicação web de relógio com alarmes,
  previsão do tempo, saudação personalizada e configurações do usuário.

[2.0.0]: https://github.com/rafaelrgaidzinski/AlarmClock-Entra21/compare/original...main
[1.0.0]: https://github.com/rafaelrgaidzinski/AlarmClock-Entra21/tree/original
