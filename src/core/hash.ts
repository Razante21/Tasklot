/**
 * Hash de senha para a DEMONSTRAÇÃO (cabe nos 25 caracteres de CREDENCIAL.senha_hash).
 * Não é seguro para produção: no banco real a senha deve ser conferida no
 * servidor com bcrypt/argon2, que precisam de pelo menos 60 caracteres.
 */
export function hashSenha(senha: string, login: string): string {
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193;
  const texto = `${login.toLowerCase()}::${senha}`;
  for (let r = 0; r < 512; r++) {
    for (let i = 0; i < texto.length; i++) {
      const c = texto.charCodeAt(i);
      h1 = Math.imul(h1 ^ c, 0x01000193) >>> 0;
      h2 = Math.imul(h2 ^ (c + r), 0x5bd1e995) >>> 0;
    }
  }
  return `d1$${h1.toString(16).padStart(8, '0')}${h2.toString(16).padStart(8, '0')}`; // 19 caracteres
}
