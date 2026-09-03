// Flag de migração controlada do player para youtube-nocookie.com.
// SEPARADA da flag de teste (YOUTUBE_NOCOOKIE_MIGRATION_TEST).
// Inicia DESLIGADA. Migração só ativa manualmente — rollback imediato ao desligar.

const MIGRATION_FLAG_KEY = 'YOUTUBE_NOCOOKIE_MIGRATION_CONTROLLED';

export function isMigrationEnabled() {
  if (typeof localStorage === 'undefined') return false;
  return localStorage.getItem(MIGRATION_FLAG_KEY) === '1';
}

export function setMigrationEnabled(on) {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(MIGRATION_FLAG_KEY, on ? '1' : '0');
}

export function getMigrationFlagKey() {
  return MIGRATION_FLAG_KEY;
}

// Retorna o valor bruto persistido em localStorage (null = chave não existe = DEFAULT OFF)
export function getMigrationFlagRawValue() {
  if (typeof localStorage === 'undefined') return null;
  return localStorage.getItem(MIGRATION_FLAG_KEY);
}

// Remove a chave do localStorage — reverte para DEFAULT OFF (remove a chave, não escreve '0')
export function clearMigrationFlag() {
  if (typeof localStorage === 'undefined') return;
  localStorage.removeItem(MIGRATION_FLAG_KEY);
}