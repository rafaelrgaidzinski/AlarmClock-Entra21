const { ClockService } = require("../server/server");

describe("ClockService", () => {
  const clock = new ClockService();

  describe("_pad", () => {
    test("adiciona zero à esquerda em números de um dígito", () => {
      expect(clock._pad(5)).toBe("05");
      expect(clock._pad(0)).toBe("00");
    });

    test("mantém números de dois dígitos", () => {
      expect(clock._pad(12)).toBe("12");
      expect(clock._pad(59)).toBe("59");
    });
  });

  describe("convertTimeToSeconds", () => {
    test("converte uma hora cheia em segundos", () => {
      expect(clock.convertTimeToSeconds("01:00:00")).toBe(3600);
    });

    test("converte minutos e segundos", () => {
      expect(clock.convertTimeToSeconds("00:01:30")).toBe(90);
    });

    test("converte um horário completo", () => {
      expect(clock.convertTimeToSeconds("02:03:04")).toBe(2 * 3600 + 3 * 60 + 4);
    });
  });

  describe("_getDaySuffix", () => {
    test("retorna 'st' para 1, 21 e 31", () => {
      expect(clock._getDaySuffix(1)).toBe("st, ");
      expect(clock._getDaySuffix(21)).toBe("st, ");
      expect(clock._getDaySuffix(31)).toBe("st, ");
    });

    test("retorna 'nd' para 2 e 22", () => {
      expect(clock._getDaySuffix(2)).toBe("nd, ");
      expect(clock._getDaySuffix(22)).toBe("nd, ");
    });

    test("retorna 'rd' para 3 e 23", () => {
      expect(clock._getDaySuffix(3)).toBe("rd, ");
      expect(clock._getDaySuffix(23)).toBe("rd, ");
    });

    test("retorna 'th' para os demais dias", () => {
      expect(clock._getDaySuffix(4)).toBe("th, ");
      expect(clock._getDaySuffix(11)).toBe("th, ");
      expect(clock._getDaySuffix(15)).toBe("th, ");
    });
  });

  describe("formatWithHourStyle", () => {
    test("formato 12h: converte horário da tarde para pm", () => {
      expect(clock.formatWithHourStyle("12", "13:05:09")).toBe("01:05:09 pm");
    });

    test("formato 12h: mantém horário da manhã como am", () => {
      expect(clock.formatWithHourStyle("12", "09:30:00")).toBe("09:30:00 am");
    });

    test("formato 12h: meio-dia continua pm", () => {
      expect(clock.formatWithHourStyle("12", "12:00:00")).toBe("12:00:00 pm");
    });

    test("formato 24h: hora cheia recebe o'Clock", () => {
      expect(clock.formatWithHourStyle("24", "10:00:00")).toBe("10:00:00 o'Clock");
    });

    test("formato 24h: horário com minutos recebe hours", () => {
      expect(clock.formatWithHourStyle("24", "10:30:00")).toBe("10:30:00 hours");
    });
  });

  describe("getCurrentTime / getFormattedTime", () => {
    test("getFormattedTime retorna o padrão HH:MM:SS", () => {
      expect(clock.getFormattedTime()).toMatch(/^\d{2}:\d{2}:\d{2}$/);
    });

    test("getCurrentTime retorna campos com dois dígitos", () => {
      const { hours, minutes, seconds } = clock.getCurrentTime();
      expect(hours).toMatch(/^\d{2}$/);
      expect(minutes).toMatch(/^\d{2}$/);
      expect(seconds).toMatch(/^\d{2}$/);
    });

    test("getFormattedDate retorna uma string não vazia", () => {
      expect(typeof clock.getFormattedDate()).toBe("string");
      expect(clock.getFormattedDate().length).toBeGreaterThan(0);
    });
  });
});
