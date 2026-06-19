const { WeatherService } = require("../server/server");

// Cliente HTTP falso: decide a resposta conforme a URL chamada.
function makeFakeHttp({ weather, geoip }) {
  return {
    calls: [],
    async get(url) {
      this.calls.push(url);
      if (url.includes("geoip")) return { data: geoip };
      return { data: weather };
    },
  };
}

const weatherResponse = {
  temp: 20,
  condition_slug: "clear_day",
  sunrise: "06:00:00",
  sunset: "18:00:00",
  forecast: [{ min: 15, max: 25 }],
};

describe("WeatherService", () => {
  test("resolve o woeid de uma cidade conhecida sem chamar o geoip", async () => {
    const http = makeFakeHttp({ weather: weatherResponse, geoip: { woeid: 999 } });
    const service = new WeatherService(http);

    const result = await service.getByCity("Criciúma");

    expect(result).toEqual({
      tempMin: 15,
      tempMax: 25,
      tempNow: 20,
      conditionSlug: "clear_day",
      sunrise: "06:00:00",
      sunset: "18:00:00",
    });
    // só a chamada de clima, nenhuma de geoip
    expect(http.calls.some((u) => u.includes("geoip"))).toBe(false);
  });

  test("usa o geoip para resolver cidade desconhecida", async () => {
    const http = makeFakeHttp({ weather: weatherResponse, geoip: { woeid: 12345 } });
    const service = new WeatherService(http);

    await service.getByCity("CidadeInexistente");

    expect(http.calls.some((u) => u.includes("geoip"))).toBe(true);
    expect(http.calls.some((u) => u.includes("woeid=12345"))).toBe(true);
  });

  test("ignora acentos e maiúsculas ao casar a cidade", async () => {
    const http = makeFakeHttp({ weather: weatherResponse, geoip: { woeid: 0 } });
    const service = new WeatherService(http);

    await service.getByCity("CRICIÚMA");

    // criciuma (woeid 455856) deve ser resolvida localmente, sem geoip
    expect(http.calls.some((u) => u.includes("geoip"))).toBe(false);
    expect(http.calls.some((u) => u.includes("woeid=455856"))).toBe(true);
  });
});
