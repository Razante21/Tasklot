/**
 * RNF16 · Testes das funções que o documento pede para testar:
 * autenticação, cadastro de usuários e equipamentos, abertura de chamados,
 * atualização de status, registro de soluções e controle de permissões.
 * Rodar com: npm test
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { tabelas, transacao } from '@/data/db';
import { entrar, usuarioLogado } from '@/services/auth.service';
import {
  abrirChamado,
  assumir,
  chamadosDoSolicitante,
  confirmarSolucao,
  moverChamado,
  obterChamado,
  reabrir,
  registrarAtendimento,
  validarAtendimento,
  validarNovoChamado,
} from '@/services/chamados.service';
import { criarEquipamento, excluirEquipamento, validarEquipamento } from '@/services/equipamentos.service';
import { definirSituacaoLocal, excluirLocal, listarLocais } from '@/services/locais.service';
import { notificacoesDe } from '@/services/notificacoes.service';
import { criarPerfil, matrizAtual, pode, salvarMatriz, validarMatriz } from '@/services/permissoes.service';
import { criarUsuario, definirSituacaoUsuario, excluirUsuario, validarUsuario } from '@/services/usuarios.service';
import { listarAuditoria } from '@/services/auditoria.service';
import { bancoNovo, entrarComo, ID } from './ajuda';

beforeEach(bancoNovo);

describe('Autenticação (RF01 / UC01)', () => {
  it('entra com e-mail e senha e descobre o perfil sozinho', () => {
    const r = entrar('suporte@fatec.sp.gov.br', 'tasklot');
    expect(r.ok).toBe(true);
    expect(usuarioLogado()?.perfilNome).toBe('Equipe de TI');
  });

  it('FS001: recusa senha errada sem dizer qual campo errou', () => {
    const r = entrar('professor@fatec.sp.gov.br', 'errada');
    expect(r.ok).toBe(false);
    expect(r.erros.geral).toMatch(/E-mail ou senha incorretos/);
  });

  it('FS002: bloqueia usuário inativo', () => {
    const r = entrar('jorge.pereira@fatec.sp.gov.br', 'tasklot');
    expect(r.ok).toBe(false);
    expect(r.erros.geral).toMatch(/inativo/);
  });

  it('guarda a senha como hash que cabe em CREDENCIAL.senha_hash (25)', () => {
    tabelas().CREDENCIAL.forEach((c) => {
      expect(c.senha_hash).not.toContain('tasklot');
      expect(c.senha_hash.length).toBeLessThanOrEqual(25);
    });
  });
});

describe('Chamados (RF02, RF04, RF06, RF17, RF18)', () => {
  it('abre chamado com protocolo e status inicial Aberto, e avisa a TI', () => {
    entrarComo(ID.carlos);
    const c = abrirChamado({ titulo: 'Mouse quebrado', descricao: 'O mouse do PC 3 não clica.', prioridade: 'baixa', localId: '1', equipamentoId: '' });
    expect(c.protocolo).toBe('T-0154');
    expect(c.status).toBe('aberto');
    expect(chamadosDoSolicitante(ID.carlos).some((x) => x.protocolo === 'T-0154')).toBe(true);
    expect(notificacoesDe(ID.rafael)[0].texto).toContain('T-0154');
    // tabelas do modelo preenchidas
    const t = tabelas();
    expect(t.STATUS_CHAMADO.some((s) => s.FK_CHAMADO_id_chamado === c.id && s.nome === 'Aberto')).toBe(true);
    expect(t.Usuario_chama_solicita.some((s) => s.fk_CHAMADO_id_chamado === c.id && s.fk_USUARIO_id_usuario === ID.carlos)).toBe(true);
  });

  it('UC02 FS001/FS002: não cria sem dados obrigatórios ou com local inválido', () => {
    const erros = validarNovoChamado({ titulo: '', descricao: 'curta', prioridade: '', localId: '9', equipamentoId: '' });
    expect(Object.keys(erros).sort()).toEqual(['descricao', 'localId', 'prioridade', 'titulo']);
  });

  it('fluxo completo: assumir → resolver com solução → confirmar → reabrir com motivo', () => {
    entrarComo(ID.rafael);
    assumir('T-0146');
    expect(obterChamado('T-0146')!.status).toBe('em_andamento');
    expect(obterChamado('T-0146')!.responsavelId).toBe(ID.rafael);

    const c = obterChamado('T-0146')!;
    const semSolucao = { status: 'resolvido' as const, comentario: '', procedimentos: '', materiais: '', orientacoes: '', solucao: '' };
    expect(validarAtendimento(c, semSolucao).solucao).toBeDefined(); // UC17 FS001

    registrarAtendimento('T-0146', { ...semSolucao, procedimentos: 'Senha redefinida', orientacoes: 'Trocar a senha no 1º acesso', solucao: 'Senha redefinida' });
    const resolvido = obterChamado('T-0146')!;
    expect(resolvido.status).toBe('resolvido');
    expect(resolvido.eventos[resolvido.eventos.length - 1].atendimento?.orientacoes).toBe('Trocar a senha no 1º acesso');
    expect(resolvido.encerradoEm).not.toBeNull();

    entrarComo(ID.carlos);
    confirmarSolucao('T-0146');
    expect(obterChamado('T-0146')!.status).toBe('fechado');

    expect(reabrir('T-0146', 'curto')).toMatch(/motivo/); // UC18 FS002
    expect(reabrir('T-0146', 'Voltou a pedir senha nova hoje cedo.')).toBeNull();
    const reaberto = obterChamado('T-0146')!;
    expect(reaberto.status).toBe('aberto');
    expect(reaberto.encerradoEm).toBeNull();
    expect(reaberto.eventos.some((e) => e.tipo === 'atendimento' || e.tipo === 'status')).toBe(true); // atendimento anterior preservado
  });

  it('UC06 FS001: impede transição inválida e UC18 FS001: só reabre encerrado', () => {
    entrarComo(ID.rafael);
    const c = obterChamado('T-0148')!; // em andamento
    const r = validarAtendimento(c, { status: 'aberto', comentario: 'x', procedimentos: '', materiais: '', orientacoes: '', solucao: '' });
    expect(r.status).toMatch(/só é possível/);
    expect(reabrir('T-0148', 'Um motivo qualquer bem longo')).toMatch(/só vale/);
  });

  it('arrastar no quadro (moverChamado): Aberto → Em andamento atribui a quem arrastou', () => {
    entrarComo(ID.rafael);
    expect(moverChamado('T-0153', 'em_andamento')).toBeNull();
    const c = obterChamado('T-0153')!;
    expect(c.status).toBe('em_andamento');
    expect(c.responsavelId).toBe(ID.rafael);
  });

  it('arrastar no quadro: Resolvido exige solução, mas qualquer coluna é permitida (como no Trello)', () => {
    entrarComo(ID.rafael);
    expect(moverChamado('T-0148', 'resolvido')).toMatch(/solução/i);
    expect(obterChamado('T-0148')!.status).toBe('em_andamento');
    expect(moverChamado('T-0148', 'resolvido', 'Cabo trocado')).toBeNull();
    expect(obterChamado('T-0148')!.status).toBe('resolvido');

    expect(moverChamado('T-0148', 'fechado')).toBeNull();
    expect(obterChamado('T-0148')!.status).toBe('fechado');
    expect(moverChamado('T-0148', 'aberto')).toBeNull(); // volta para a fila
    const c = obterChamado('T-0148')!;
    expect(c.status).toBe('aberto');
    expect(c.encerradoEm).toBeNull();
    expect(moverChamado('T-0137', 'em_andamento')).toBeNull(); // fechado → em andamento
    expect(obterChamado('T-0137')!.status).toBe('em_andamento');
  });

  it('respeita os tamanhos do modelo (comentário VARCHAR(50))', () => {
    const c = obterChamado('T-0148')!;
    const r = validarAtendimento(c, { status: 'em_andamento', comentario: 'x'.repeat(51), procedimentos: '', materiais: '', orientacoes: '', solucao: '' });
    expect(r.comentario).toMatch(/50/);
  });
});

describe('Cadastros (RF09–RF14, RNF08, RNF09)', () => {
  it('impede e-mail duplicado e identificação não numérica', () => {
    const e = validarUsuario({ nome: 'Ana Souza', email: 'professor@fatec.sp.gov.br', identificacao: 'A12', formaContato: 'Ramal', contato: '200', perfilId: '1', ativo: true });
    expect(e.email).toMatch(/Já existe/);
    expect(e.identificacao).toBeDefined();
  });

  it('cria usuário com credencial e inativa sem apagar histórico', () => {
    entrarComo(ID.rafael);
    const u = criarUsuario({ nome: 'Ana Souza', email: 'ana.souza@fatec.sp.gov.br', identificacao: '123', formaContato: 'Ramal', contato: '230', perfilId: '1', ativo: true });
    expect(tabelas().CREDENCIAL.some((c) => c.login === 'ana.souza@fatec.sp.gov.br')).toBe(true);
    expect(entrar('ana.souza@fatec.sp.gov.br', 'tasklot').ok).toBe(true);
    entrarComo(ID.rafael);
    expect(definirSituacaoUsuario(u.id, false)).toBeNull();
    expect(definirSituacaoUsuario(u.id, false)).toMatch(/já está inativo/); // UC13 FS001
    expect(excluirUsuario(ID.carlos)).toBe(false); // tem chamados: só pode inativar (RNF09)
    expect(excluirUsuario(u.id)).toBe(true); // sem vínculos: pode excluir (RF14)
    expect(tabelas().CREDENCIAL.some((c) => c.login === 'ana.souza@fatec.sp.gov.br')).toBe(false);
  });

  it('não exclui equipamento com chamados (orienta inativar) e exclui sem vínculos', () => {
    entrarComo(ID.rafael);
    expect(excluirEquipamento(1)).toBe(false);
    const novo = criarEquipamento({ patrimonio: 'PAT-09999', codigoInterno: '', tipoId: '2', marca: 'Dell', modelo: 'X', serie: 'S-1', localId: '1', situacao: 'operacional' });
    expect(excluirEquipamento(novo.id)).toBe(true);
    expect(validarEquipamento({ patrimonio: 'PAT-00201', codigoInterno: '', tipoId: '1', marca: 'a', modelo: '', serie: '', localId: '1', situacao: 'operacional' }).patrimonio).toMatch(/já está/);
  });

  it('local com chamados não é excluído, mas pode ser inativado e some da abertura', () => {
    entrarComo(ID.rafael);
    expect(excluirLocal(2)).toBe(false);
    expect(definirSituacaoLocal(2, false)).toBeNull();
    expect(listarLocais().some((l) => l.id === 2)).toBe(false);
    expect(listarLocais(true).some((l) => l.id === 2)).toBe(true);
  });

  it('registra auditoria das alterações (RNF10)', () => {
    entrarComo(ID.rafael);
    definirSituacaoLocal(3, false);
    expect(listarAuditoria()[0].registro).toBe('Local · Lab 04');
  });
});

describe('Permissões (RF15 / UC15)', () => {
  it('aplica as permissões pelo perfil', () => {
    expect(pode('ver_fila', { perfilId: 3 } as never)).toBe(true);
    expect(pode('ver_fila', { perfilId: 1 } as never)).toBe(false);
    expect(pode('editar_cadastros', { perfilId: 4 } as never)).toBe(false);
  });

  it('FS001: recusa regra incompatível', () => {
    const m = matrizAtual();
    m[4].excluir_cadastros = true;
    expect(validarMatriz(m)[0]).toMatch(/Cadastrar e editar/);
    expect(salvarMatriz(m).length).toBeGreaterThan(0);
  });

  it('cria perfil novo e salva permissões na tabela associativa', () => {
    entrarComo(ID.rafael);
    expect(criarPerfil('Coordenação', 'Coordenadores de curso')).toBeNull();
    const id = tabelas().PERFIL.find((p) => p.nome === 'Coordenação')!.id_perfil;
    const m = matrizAtual();
    m[id].ver_indicadores = true;
    expect(salvarMatriz(m)).toEqual([]);
    expect(pode('ver_indicadores', { perfilId: id } as never)).toBe(true);
  });
});

describe('Confiabilidade (RNF15)', () => {
  it('desfaz tudo se a operação falhar no meio', () => {
    const antes = tabelas().LOCAL.length;
    expect(() =>
      transacao(() => {
        tabelas().LOCAL.push({ id_local: 99, nome: 'X', bloco: 'Z', sala: '', descricao: '', situacao: 'ativo' });
        throw new Error('falhou');
      }),
    ).toThrow('falhou');
    expect(tabelas().LOCAL.length).toBe(antes);
  });
});
