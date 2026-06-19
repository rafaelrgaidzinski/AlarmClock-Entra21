const { FileRepository } = require("../server/server");
const fs = require("fs");
const os = require("os");
const path = require("path");

describe("FileRepository", () => {
  const repo = new FileRepository();
  let tmpDir;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "alarmclock-"));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  test("write seguido de read devolve o mesmo conteúdo", async () => {
    const file = path.join(tmpDir, "data.txt");
    await repo.write(file, "olá mundo");
    await expect(repo.read(file)).resolves.toBe("olá mundo");
  });

  test("exists indica corretamente a presença do arquivo", async () => {
    const file = path.join(tmpDir, "config.json");
    expect(repo.exists(file)).toBe(false);
    await repo.write(file, "{}");
    expect(repo.exists(file)).toBe(true);
  });

  test("writeJson e readJson fazem o round-trip de um objeto", async () => {
    const file = path.join(tmpDir, "obj.json");
    const data = { name: "Rafael", alarms: [1, 2, 3] };
    await repo.writeJson(file, data);
    await expect(repo.readJson(file)).resolves.toEqual(data);
  });

  test("read lança erro quando o arquivo não existe", async () => {
    const file = path.join(tmpDir, "missing.txt");
    await expect(repo.read(file)).rejects.toThrow(/Failed to read file/);
  });
});
