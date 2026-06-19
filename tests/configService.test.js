const path = require("path");
const { ConfigService } = require("../server/server");
const { FakeFileRepository } = require("./helpers/fakeFileRepository");

const CONFIG_PATH = path.join(__dirname, "..", "files", "config.json");

function validConfig(overrides = {}) {
  return {
    hourFormat: "24",
    temperatureScale: "C",
    city: "Criciúma",
    gender: "Mr",
    name: "Rafael",
    ...overrides,
  };
}

describe("ConfigService", () => {
  describe("save (válido)", () => {
    test("grava e retorna a configuração válida", async () => {
      const repo = new FakeFileRepository();
      const service = new ConfigService(repo);
      const result = await service.save(validConfig());
      expect(result).toMatchObject({ city: "Criciúma", name: "Rafael" });
      expect(repo.exists(CONFIG_PATH)).toBe(true);
    });
  });

  describe("save (inválido)", () => {
    const service = new ConfigService(new FakeFileRepository());

    test("rejeita formato de hora inválido", async () => {
      await expect(service.save(validConfig({ hourFormat: "48" }))).rejects.toThrow(/time format/);
    });

    test("rejeita escala de temperatura inválida", async () => {
      await expect(service.save(validConfig({ temperatureScale: "X" }))).rejects.toThrow(
        /temperature scale/
      );
    });

    test("rejeita gênero inválido", async () => {
      await expect(service.save(validConfig({ gender: "Dr" }))).rejects.toThrow(/gender/);
    });

    test("rejeita cidade vazia", async () => {
      await expect(service.save(validConfig({ city: "" }))).rejects.toThrow(/City/);
    });

    test("rejeita nome vazio", async () => {
      await expect(service.save(validConfig({ name: "" }))).rejects.toThrow(/Name/);
    });
  });

  describe("get", () => {
    test("retorna a configuração salva", async () => {
      const repo = new FakeFileRepository({ [CONFIG_PATH]: validConfig() });
      const service = new ConfigService(repo);
      const config = await service.get();
      expect(config.name).toBe("Rafael");
      expect(config.hourFormat).toBe("24");
    });
  });
});
