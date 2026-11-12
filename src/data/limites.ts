/** Tamanhos máximos dos campos de texto, conforme o modelo lógico (VARCHAR/CHAR). */
export const LIMITE = {
  perfil_nome: 30,
  perfil_descricao: 300,
  login: 40,
  email_institucional: 40,
  nome_completo: 75,
  contato_principal: 40,
  forma_contato: 50,
  local_nome: 75,
  local_bloco: 50,
  local_sala: 55,
  local_descricao: 100,
  tipo_nome: 75,
  identificacao_patrimonial: 100,
  marca: 50,
  modelo: 50,
  numero_serie: 40,
  titulo: 50,
  descricao_chamado: 300,
  comentario: 50,
  procedimentos_realizados: 55,
  materiais_utilizados: 75,
  orientacoes_fornecidas: 75,
  solucao_aplicada: 50,
  historico_descricao: 300,
  mensagem: 80,
} as const;

/** Corta o texto no limite do campo (o formulário já impede, isto é a garantia final). */
export function caber(texto: string, limite: number): string {
  return texto.length > limite ? texto.slice(0, limite) : texto;
}
