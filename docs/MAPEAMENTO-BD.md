# Tasklot · Como o sistema usa o banco de dados

O MVP grava os dados no navegador (localStorage), mas **nas mesmas 21 tabelas do
modelo lógico entregue** ("Lógico Principal Finalizado", brModelo). Os nomes de
tabelas e campos estão iguais aos do modelo, em `src/data/tabelas.ts`. Quando o banco
MySQL estiver funcionando, troca-se só `src/data/db.ts`.

## Onde cada tabela é usada

| Tabela | Arquivo que lê/grava | Para quê |
| --- | --- | --- |
| PERFIL | `services/permissoes.service.ts` | Perfis de acesso; a tela de Permissões cria perfis novos (UC15) |
| PERMISSAO | `services/permissoes.service.ts` | As 12 funções do sistema; `codigo` (INTEGER) é traduzido em `core/labels.ts` (`CODIGO_PERMISSAO`) |
| Perfil_Permissao_autoriza | `services/permissoes.service.ts` | Matriz da tela 35: uma linha = o perfil pode aquela função |
| CREDENCIAL | `services/auth.service.ts`, `usuarios.service.ts` | Login (e-mail), hash da senha, último acesso e situação |
| USUARIO | `services/usuarios.service.ts` | Cadastro, perfil (`FK_PERFIL`), credencial (`FK_CREDENCIAL`) |
| LOCAL | `services/locais.service.ts` | Locais com bloco, sala, descrição e situação (ativo/inativo) |
| TIPO_EQUIPAMENTO | `services/equipamentos.service.ts` | Tipos usados no cadastro de equipamentos e nos indicadores |
| EQUIPAMENTO | `services/equipamentos.service.ts` | Patrimônio, código interno, marca, modelo, série, situação |
| Equipamento_local_localiza | `services/equipamentos.service.ts` | Onde o aparelho está. Mudou de sala → nova linha; o local atual é a linha mais recente (o histórico fica guardado) |
| CHAMADO | `data/operacoes.ts`, `services/chamados.service.ts` | Protocolo (T-0148), título, descrição, datas, local |
| STATUS_CHAMADO | `data/operacoes.ts` | Cada mudança de status cria uma linha ligada ao chamado; o status atual é a mais recente |
| PRIORIDADE | `data/operacoes.ts` | Prioridade do chamado (nome e nível 1/2/3) |
| HISTORICO_CHAMADO | `data/operacoes.ts` | Cada evento: abertura, atribuição, status, atendimento, mensagem, reabertura (com motivo), confirmação |
| hist_chamado_mantem | `data/operacoes.ts` | Liga cada evento ao seu chamado |
| Hist_Status_status | `data/operacoes.ts` | Liga o evento ao status que ele gerou (sequência de mudanças, RF06) |
| ATENDIMENTO | `data/operacoes.ts` | Comentário, procedimentos, materiais, orientações e solução (RF17) |
| Usuario_chama_solicita | `data/operacoes.ts` | Quem abriu o chamado |
| NOTIFICACAO | `services/notificacoes.service.ts` | Mensagem, envio, leitura, situação do envio e tipo |
| Ususario_Not_recebe | `services/notificacoes.service.ts` | Quem recebe |
| Notifica_Chama_gera | `services/notificacoes.service.ts` | Sobre qual chamado |
| Hist_Notifica_origina | `services/notificacoes.service.ts` | Qual evento do histórico gerou o aviso |

### Como as FKs do modelo foram interpretadas

Algumas chaves estrangeiras do modelo ficam "do lado contrário" do que seria comum.
O sistema usa o modelo como está, com este significado:

| FK no modelo | Significado usado no sistema |
| --- | --- |
| `USUARIO.FK_ATENDIMENTO_id_atendimento` | Atendimento **atual** do técnico (o último que ele registrou) |
| `USUARIO.FK_HISTORICO_CHAMADO_id_historico` | **Último** evento registrado pelo usuário |
| `CHAMADO.FK_ATENDIMENTO_id_atendimento` | Atendimento **atual** do chamado (o mais recente) |
| `EQUIPAMENTO.FK_CHAMADO_id_chamado` | **Último** chamado aberto para o aparelho |
| `STATUS_CHAMADO.FK_CHAMADO_id_chamado` | Uma linha por mudança de status do chamado |
| `PRIORIDADE.FK_CHAMADO_id_chamado` | Prioridade do chamado (uma linha por definição) |

Essas FKs aceitam vazio no sistema (ex.: usuário que nunca atendeu, chamado ainda sem
atendimento), porque um chamado nasce antes de ter atendimento e um usuário é cadastrado
antes de registrar qualquer evento.

## Complementos (o que a documentação pede e o modelo não tem onde guardar)

Ficam separados em `complementos` (`src/data/tabelas.ts`), para o grupo saber
exatamente o que incluir no banco numa próxima versão:

| Complemento | Requisito | Sugestão para o banco |
| --- | --- | --- |
| `chamado_responsavel` | RF04, RF06: responsável do chamado | Coluna `FK_RESPONSAVEL_id_usuario` em CHAMADO |
| `chamado_equipamento` | RF02, RF07: aparelho de **cada** chamado (o modelo só guarda o último chamado do aparelho) | Coluna `FK_EQUIPAMENTO_id_equipamento` em CHAMADO |
| `historico_autor` | RF06: quem fez cada ação | Coluna `FK_USUARIO_id_usuario` em HISTORICO_CHAMADO |
| `historico_atendimento` | RF17: atendimentos anteriores do mesmo chamado | Coluna `FK_ATENDIMENTO_id_atendimento` em HISTORICO_CHAMADO |
| `AUDITORIA` | RNF10: auditoria de cadastros | Tabela AUDITORIA (id, data_hora, id_usuario, acao, registro, detalhe) |

## Tamanhos dos campos

Os formulários respeitam os tamanhos do modelo (`src/data/limites.ts`) e mostram
um contador, por exemplo: título 50, descrição 300, comentário 50, procedimentos 55,
materiais 75, orientações 75, solução 50, e-mail 40, nome 75.

## Pontos de atenção para o banco real

- Campos de data estão como `DATE` no modelo; o sistema guarda data **e hora**
  (o UC06 pede o horário). No MySQL, use `DATETIME`.
- `senha_hash VARCHAR(25)`: o MVP usa um hash curto só para demonstração. Hash seguro
  (bcrypt) precisa de 60 caracteres e deve ser feito no servidor.
- O modelo não tem `UNIQUE`; o sistema impede duplicidade de e-mail, identificação,
  patrimônio, código interno e número de série na validação (RNF08).
