// Repositório de arquivos falso (em memória) para os testes.
// Implementa a mesma interface do FileRepository real, sem tocar no disco.
class FakeFileRepository {
  constructor(initial = {}) {
    this.store = new Map(Object.entries(initial));
  }

  exists(path) {
    return this.store.has(path);
  }

  async read(path) {
    if (!this.store.has(path)) throw new Error(`Failed to read file: ${path}`);
    return JSON.stringify(this.store.get(path));
  }

  async write(path, content) {
    this.store.set(path, JSON.parse(content));
  }

  async readJson(path) {
    if (!this.store.has(path)) throw new Error(`Failed to read file: ${path}`);
    return this.store.get(path);
  }

  async writeJson(path, data) {
    this.store.set(path, data);
  }
}

module.exports = { FakeFileRepository };
