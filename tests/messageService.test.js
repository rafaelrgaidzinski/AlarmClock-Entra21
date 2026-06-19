const { MessageService, ClockService } = require("../server/server");

// Usa o ClockService real para as conversões, mas com getFormattedTime fixo,
// permitindo controlar o horário e testar cada saudação.
function clockFixedAt(timeNow) {
  const real = new ClockService();
  return {
    getFormattedTime: () => timeNow,
    formatWithHourStyle: (fmt, time) => real.formatWithHourStyle(fmt, time),
    convertTimeToSeconds: (time) => real.convertTimeToSeconds(time),
  };
}

const config = {
  city: "Criciúma",
  name: "Rafael",
  hourFormat: "24",
  gender: "Mr",
};

const weather = { sunset: "06:00:00", sunrise: "06:00:00" };

function buildWith(timeNow) {
  const configService = { get: async () => config };
  const weatherService = { getByCity: async () => weather };
  const service = new MessageService(configService, weatherService, clockFixedAt(timeNow));
  return service.buildGreeting();
}

describe("MessageService.buildGreeting", () => {
  test("retorna string vazia quando não há configuração", async () => {
    const service = new MessageService(
      { get: async () => null },
      { getByCity: async () => weather },
      clockFixedAt("10:00:00")
    );
    await expect(service.buildGreeting()).resolves.toBe("");
  });

  test("manhã: antes do meio-dia", async () => {
    await expect(buildWith("08:00:00")).resolves.toMatch(/^Good Morning Mr\. Rafael/);
  });

  test("tarde: entre meio-dia e o início da noite", async () => {
    // sunset 06:00 + 8h = 14:00 -> 13:00 ainda é tarde
    await expect(buildWith("13:00:00")).resolves.toMatch(/^Good Afternoon Mr\. Rafael/);
  });

  test("noite: até o limite do pôr do sol ajustado", async () => {
    // eveningStart 14:00, sunsetInSeconds 06:00 + 12h = 18:00 -> 16:00 é "evening"
    await expect(buildWith("16:00:00")).resolves.toMatch(/^Good Evening Mr\. Rafael/);
  });

  test("madrugada/noite alta: inclui o horário do nascer do sol", async () => {
    // depois de 18:00 -> "Good Night" com sunrise
    await expect(buildWith("20:00:00")).resolves.toMatch(/Good Night Mr\. Rafael.*sun rises/);
  });
});
