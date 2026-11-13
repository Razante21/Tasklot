# Tasklot

Sistema web de chamados de suporte de TI — Projeto Integrador do curso de
Desenvolvimento de Software Multiplataforma (DSM), Fatec Indaiatuba.

MVP em **HTML, CSS e TypeScript com Vite**, seguindo as telas do Figma, os
requisitos do documento do PI (RF01–RF19, RNF01–RNF18) e o **modelo lógico do
banco de dados** entregue (21 tabelas, mesmos nomes de tabelas e campos).

## Como rodar

Precisa do Node.js 20.19 ou mais novo.

```bash
npm install
npm run dev       # abre em http://localhost:5173
npm test          # testes automáticos das regras (RNF16)
npm run build     # confere os tipos e gera a pasta dist/
npm run preview   # serve a versão de produção (dist/)
```

## Contas para testar e apresentar

Senha inicial de todas: `tasklot`. O perfil é descoberto pelo sistema no login (UC01).

| E-mail                          | Perfil         | Abre em            |
| ------------------------------- | -------------- | ------------------ |
| professor@fatec.sp.gov.br       | Professor      | Meus chamados      |
| administracao@fatec.sp.gov.br   | Administração  | Meus chamados      |
| suporte@fatec.sp.gov.br         | Equipe de TI   | Fila de chamados   |
| gestao@fatec.sp.gov.br          | Gestão         | Indicadores        |
| jorge.pereira@fatec.sp.gov.br   | (inativo)      | mostra o bloqueio de usuário inativo |

Para preparar uma apresentação: entre como Equipe de TI → Meu perfil →
**Voltar aos dados iniciais**.

## Organização das pastas

```
src/
├── main.ts                Ponto de entrada: decide qual tela mostrar
├── app/                   Estrutura: roteador, lista de rotas, menu e moldura
├── core/                  Peças sem regra de negócio
│   ├── types.ts           "Visões" usadas pelas telas (Chamado, Usuario, Local...)
│   ├── labels.ts          Textos, status, prioridades, códigos de permissão
│   ├── dom.ts             html`` com escape automático, formulários e erros
│   ├── format.ts · csv.ts · hash.ts
├── data/                  Banco de dados
│   ├── tabelas.ts         AS 21 TABELAS DO MODELO LÓGICO (+ complementos)
│   ├── limites.ts         Tamanhos VARCHAR do modelo
│   ├── operacoes.ts       Gravação de chamado/status/histórico/atendimento/notificação
│   ├── seed.ts            Dados iniciais (fictícios)
│   └── db.ts              localStorage, transação "tudo ou nada", backup
├── services/              Regras de negócio (uma por assunto)
│   ├── auth · permissoes · usuarios · locais · equipamentos
│   └── chamados · notificacoes · auditoria
├── components/            Campos, ícones, selos, toast/modal, sino, tabela de chamados
├── pages/                 Uma pasta por área, um arquivo por tela
└── styles/                tokens (cores/fontes do Figma), base, layout, componentes, telas
tests/                     Testes automáticos (Vitest)
docs/MAPEAMENTO-BD.md      Como cada tabela do modelo é usada
```

**Regra da organização:** telas (`pages/`) só falam com os serviços (`services/`),
e só os serviços (via `data/`) mexem nas tabelas. Para ligar o MySQL real, troca-se
`data/db.ts` e as telas continuam iguais.

## Requisitos × código

| Requisito | Onde |
| --- | --- |
| RF01 Acessar plataforma | `pages/auth/login.page.ts`, `services/auth.service.ts` |
| RF02 Abrir chamado · RF03 Reutilizar histórico | `pages/chamados/novo-chamado.page.ts` ("Reutilizar" também no detalhe) |
| RF04 Acompanhar · RF05 Visualizar · RF06 Atualizar status · RF17 Atendimento · RF18 Reabrir | `pages/chamados/detalhe.page.ts`, `services/chamados.service.ts` |
| RF07 Locais e aparelhos · RF10 Equipamentos | `pages/locais/`, `pages/equipamentos/` |
| RF08 Histórico | `pages/historico/historico.page.ts` |
| RF09 Usuários · RF11–RF14 Consultar, editar, inativar, excluir sem vínculos | `pages/usuarios/`, `pages/locais/`, `pages/equipamentos/` |
| RF15 Perfis e permissões | `pages/permissoes/permissoes.page.ts` |
| RF16 Filtros e indicadores | `pages/fila/fila.page.ts`, `pages/indicadores/indicadores.page.ts` |
| RF19 Notificações | `components/notificacoes.ts`, `services/notificacoes.service.ts` |
| RNF04 Contingência | aviso "Sistema fora do ar?" no login |
| RNF06 Responsividade | `styles/layout.css` (menu vira gaveta, tabelas viram cartões) |
| RNF08 Validação · RNF09 Integridade | `validar*()` e `excluir*()` nos serviços |
| RNF10 Auditoria | `services/auditoria.service.ts`, tela Auditoria |
| RNF11 Backup e recuperação | Meu perfil → Cópia de segurança |
| RNF15 Confiabilidade | `transacao()` em `data/db.ts` desfaz tudo se algo falhar |
| RNF16 Testabilidade | `tests/servicos.test.ts`, `tests/seguranca.test.ts` |

## Publicar na Vercel

1. Suba a pasta para um repositório no GitHub (sem `node_modules` e `dist`).
2. Na Vercel: **Add New → Project** e escolha o repositório.
3. A Vercel reconhece o Vite sozinha (o `vercel.json` já define o build e a pasta `dist`).
4. **Deploy**.

## Limites desta versão

- Os dados ficam no **navegador** (cada computador tem sua cópia). Use a cópia de
  segurança para guardar ou levar os dados.
- A senha é conferida no navegador, com um hash simples que cabe nos 25 caracteres
  de `CREDENCIAL.senha_hash`. Serve só para demonstração.
- O que a documentação pede e o modelo não tem coluna (responsável do chamado, autor
  de cada evento, aparelho de cada chamado, auditoria) está em `complementos`;
  veja `docs/MAPEAMENTO-BD.md`.
- A sessão vale por 8 horas; depois disso o sistema pede login de novo (pensado
  para os computadores compartilhados do laboratório).
- Ao restaurar uma cópia de segurança, o arquivo é conferido tabela por tabela;
  arquivos danificados ou alterados são recusados sem mudar nada.
