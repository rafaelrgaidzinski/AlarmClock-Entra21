const { AlarmService, MAX_ALARMS } = require("../server/server");
const { FakeFileRepository } = require("./helpers/fakeFileRepository");

const ALARMS_PATH = "../files/alarms.json";

function makeAlarm(hour = "06:30", description = "Acordar") {
  return { isActive: true, hour, isAm: true, description };
}

describe("AlarmService", () => {
  describe("getAll", () => {
    test("retorna lista vazia quando o arquivo não existe", async () => {
      const service = new AlarmService(new FakeFileRepository());
      await expect(service.getAll()).resolves.toEqual([]);
    });

    test("retorna os alarmes existentes", async () => {
      const repo = new FakeFileRepository({ [ALARMS_PATH]: [makeAlarm()] });
      const service = new AlarmService(repo);
      const alarms = await service.getAll();
      expect(alarms).toHaveLength(1);
      expect(alarms[0].description).toBe("Acordar");
    });
  });

  describe("create", () => {
    test("adiciona um novo alarme à lista", async () => {
      const repo = new FakeFileRepository();
      const service = new AlarmService(repo);
      const result = await service.create(makeAlarm("07:00", "Café"));
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({ hour: "07:00", description: "Café" });
    });

    test("acumula vários alarmes", async () => {
      const repo = new FakeFileRepository();
      const service = new AlarmService(repo);
      await service.create(makeAlarm("07:00"));
      const result = await service.create(makeAlarm("08:00"));
      expect(result).toHaveLength(2);
    });

    test("lança erro ao exceder o limite máximo de alarmes", async () => {
      const full = Array.from({ length: MAX_ALARMS }, () => makeAlarm());
      const repo = new FakeFileRepository({ [ALARMS_PATH]: full });
      const service = new AlarmService(repo);
      await expect(service.create(makeAlarm())).rejects.toThrow(/Maximum number of alarms/);
    });
  });

  describe("remove", () => {
    test("remove o alarme na posição informada", async () => {
      const repo = new FakeFileRepository({
        [ALARMS_PATH]: [makeAlarm("06:00", "A"), makeAlarm("07:00", "B")],
      });
      const service = new AlarmService(repo);
      const result = await service.remove(0);
      expect(result).toHaveLength(1);
      expect(result[0].description).toBe("B");
    });

    test("lança erro quando o arquivo de alarmes não existe", async () => {
      const service = new AlarmService(new FakeFileRepository());
      await expect(service.remove(0)).rejects.toThrow(/Alarms file not found/);
    });
  });

  describe("updateActiveStatus", () => {
    test("ativa/desativa o alarme na posição informada", async () => {
      const repo = new FakeFileRepository({ [ALARMS_PATH]: [makeAlarm()] });
      const service = new AlarmService(repo);
      const result = await service.updateActiveStatus(0, false);
      expect(result[0].isActive).toBe(false);
    });
  });
});
