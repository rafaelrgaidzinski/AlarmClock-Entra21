// ============================================================
//  app.js  —  AlarmClock frontend (módulos funcionais)
//
//  Organização:
//    1. ApiClient      — todas as chamadas HTTP ao servidor
//    2. TimeUtils      — funções puras de tempo/data
//    3. WeatherModule  — lógica e DOM do clima
//    4. ClockModule    — relógio e disparo de alarmes
//    5. MessageModule  — saudação personalizada
//    6. ConfigModule   — tela de configurações
//    7. AlarmModule    — tela de alarmes (lista + novo)
//    8. init()         — ponto de entrada da aplicação
// ============================================================

const API_BASE_URL = "http://localhost:3001";

// ─── 1. ApiClient ─────────────────────────────────────────────────────────────
// Módulo responsável por TODA comunicação com o servidor.
// Nenhum outro módulo usa fetch() diretamente.

const ApiClient = (() => {
  async function request(path, options = {}) {
    const response = await fetch(`${API_BASE_URL}${path}`, options);
    if (!response.ok) throw new Error(`API error: ${response.status} on ${path}`);
    return response.json();
  }

  return {
    getWeather: (city) => request(`/weather?city=${encodeURIComponent(city)}`),
    getTime: () => request("/time"),
    getDate: () => request("/date"),
    getMessage: () => request("/message"),
    getConfig: () => request("/config"),
    saveConfig: (params) =>
      request(`/config?${params}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      }),
    getAlarms: () => request("/alarms"),
    createAlarm: (params) =>
      request(`/alarms?${params}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      }),
    deleteAlarm: (position) =>
      request(`/alarms?position=${position}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
      }),
    toggleAlarm: (position, isActive) =>
      request(`/alarms?position=${position}&isActive=${isActive}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
      }),
  };
})();

// ─── 2. TimeUtils ─────────────────────────────────────────────────────────────
// Funções puras — sem efeitos colaterais, sem DOM.
// Fácil de testar isoladamente.

const TimeUtils = (() => {
  function toSeconds(timeString) {
    const [h = 0, m = 0, s = 0] = String(timeString).split(":").map(Number);
    return h * 3600 + m * 60 + s;
  }

  function incrementTime(timeList) {
    const next = [...timeList.map(Number)];
    next[2] += 1;
    if (next[2] >= 60) {
      next[2] = 0;
      next[1] += 1;
    }
    if (next[1] >= 60) {
      next[1] = 0;
      next[0] += 1;
    }
    if (next[0] >= 24) {
      next[0] = 0;
    }
    return next.map((v) => String(v).padStart(2, "0"));
  }

  function isNewHour(timeList) {
    return timeList[1] === "00" && timeList[2] === "00";
  }

  function isMidnight(timeList) {
    return timeList[0] === "00" && timeList[1] === "00" && timeList[2] === "00";
  }

  function toTwelveHour(hours) {
    const h = Number(hours);
    return h > 12 ? String(h - 12).padStart(2, "0") : hours;
  }

  function validateAndFormatHour(rawInput, isAm) {
    const parts = String(rawInput).split(":");
    const [rawH, rawM = "00"] = parts;

    if (!rawH || Number(rawH) > 11) return null;

    const h = String(rawH).padStart(2, "0");
    const m = Number(rawM) > 59 ? null : String(rawM).padStart(2, "0");
    if (!m) return null;

    if (!isAm && h === "00") return `12:${m}`;
    return `${h}:${m}`;
  }

  return { toSeconds, incrementTime, isNewHour, isMidnight, toTwelveHour, validateAndFormatHour };
})();

// ─── 3. WeatherModule ─────────────────────────────────────────────────────────
// Responsável por exibir o clima e atualizar automaticamente.

const WeatherModule = (() => {
  const WEATHER_UPDATE_INTERVAL_MS = 15 * 60 * 1000;

  const CONDITION_ICONS = {
    storm: { src: "./assets/icons/storm_icon.png", alt: "Storm" },
    snow: { src: "./assets/icons/snow_icon.png", alt: "Snow" },
    cloud: { src: "./assets/icons/overcast_icon.png", alt: "Cloudy" },
    fog: { src: "./assets/icons/overcast_icon.png", alt: "Foggy" },
    hail: { src: "./assets/icons/scattered_showers_icon.png", alt: "Hail" },
    clear_day: { src: "./assets/icons/clear_weather_icon.png", alt: "Clear day" },
    none_day: { src: "./assets/icons/clear_weather_icon.png", alt: "Clear day" },
    clear_night: { src: "./assets/icons/night_icon.png", alt: "Clear night" },
    none_night: { src: "./assets/icons/night_icon.png", alt: "Clear night" },
    rain: { src: "./assets/icons/showers_icon.png", alt: "Rainy" },
    cloudly_day: { src: "./assets/icons/clouds_icon.png", alt: "Partly cloudy day" },
    cloudly_night: { src: "./assets/icons/clouds_night_icon.png", alt: "Partly cloudy night" },
  };

  const elements = {
    tempMin: document.getElementById("tempMin"),
    tempMax: document.getElementById("tempMax"),
    tempNow: document.getElementById("tempNow"),
    weatherImage: document.querySelector(".clImagemPrevisaoDoTempo"),
  };

  let cachedWeather = {};

  function formatTemp(value, scale) {
    if (scale === "F") return (Number(value) * 1.8 + 32).toFixed(1) + " °F";
    if (scale === "K") return (Number(value) + 273.15).toFixed(2) + " °K";
    return value + " °C";
  }

  function render(weather, scale = "C") {
    elements.tempMin.value = "Min: " + formatTemp(weather.tempMin, scale);
    elements.tempMax.value = "Max: " + formatTemp(weather.tempMax, scale);
    elements.tempNow.value = "Now: " + formatTemp(weather.tempNow, scale);

    const icon = CONDITION_ICONS[weather.conditionSlug];
    if (icon) {
      const img = document.createElement("img");
      img.className = "clIconeTempo";
      img.src = icon.src;
      img.alt = icon.alt;
      elements.weatherImage.replaceChildren(img);
    }

    cachedWeather = weather;
  }

  async function refresh(city, scale) {
    const freshWeather = await ApiClient.getWeather(city);
    const hasChanged = Object.keys(freshWeather).some(
      (key) => freshWeather[key] !== cachedWeather[key]
    );
    if (hasChanged) render(freshWeather, scale);
  }

  function startAutoRefresh(city, scale) {
    setInterval(() => refresh(city, scale), WEATHER_UPDATE_INTERVAL_MS);
  }

  return { render, startAutoRefresh };
})();

// ─── 4. ClockModule ───────────────────────────────────────────────────────────
// Responsável pelo relógio em tempo real e disparo de alarmes.

const ClockModule = (() => {
  const elements = {
    time: document.getElementById("horaCerta"),
    alarmButton: document.getElementById("idBtnAlarme"),
    alarmButtonText: document.getElementById("idTextBtnAlarm"),
    alarmDescription: document.getElementById("description"),
  };

  let timeList = [];
  let alarmRinging = false;
  let audio = null;
  let activeAlarms = [];
  let activeAlarmsInSeconds = [];
  let hourFormat = "24";
  let tickIntervalId = null;

  function setAlarms(alarmList, format) {
    hourFormat = format;
    activeAlarms = getActiveAlarms(alarmList);
    activeAlarmsInSeconds = computeAlarmsInSeconds(activeAlarms);
  }

  function getActiveAlarms(alarmList) {
    return [...alarmList]
      .filter((a) => a.isActive)
      .sort((a, b) => toAlarmSeconds(a) - toAlarmSeconds(b));
  }

  function toAlarmSeconds({ hour, isAm }) {
    const [h, m] = hour.split(":").map(Number);
    if (isAm) return h * 3600 + m * 60;
    return h === 12 ? h * 3600 + m * 60 : (h + 12) * 3600 + m * 60;
  }

  function computeAlarmsInSeconds(alarmList) {
    return alarmList.map(toAlarmSeconds);
  }

  async function tick() {
    if (timeList.length === 0) {
      const { time } = await ApiClient.getTime();
      timeList = time.split(":");
    }

    timeList = TimeUtils.incrementTime(timeList);

    if (TimeUtils.isMidnight(timeList)) {
      const { date } = await ApiClient.getDate();
      document.getElementById("hoje").value = date;
    }

    if (TimeUtils.isNewHour(timeList)) {
      const { time } = await ApiClient.getTime();
      timeList = time.split(":");
      const { message } = await ApiClient.getMessage();
      document.getElementById("msn").value = message;
    }

    const displayList = [...timeList];
    if (hourFormat === "12") displayList[0] = TimeUtils.toTwelveHour(displayList[0]);
    elements.time.value = displayList.join(":");

    checkAlarms();
  }

  function checkAlarms() {
    if (alarmRinging) return;

    const nowInSeconds = TimeUtils.toSeconds(timeList.join(":"));
    activeAlarmsInSeconds.forEach((alarmSeconds, index) => {
      if (alarmSeconds === nowInSeconds) ringAlarm(index);
    });
  }

  function ringAlarm(index) {
    alarmRinging = true;
    audio = new Audio("./assets/sound/universal_pic_tune.mp3");
    audio.loop = true;
    audio.play();
    elements.alarmButtonText.textContent = "Turn Alarm Off";
    elements.alarmDescription.value = activeAlarms[index]?.description ?? "";
  }

  function stopAlarm() {
    if (!alarmRinging) return;
    audio.pause();
    alarmRinging = false;
    elements.alarmButtonText.textContent = "Set Alarm";
    elements.alarmDescription.value = "";
  }

  function isRinging() {
    return alarmRinging;
  }

  function start() {
    if (tickIntervalId !== null) {
      clearInterval(tickIntervalId);  // limpa o relógio anterior, se existir
    }
    tickIntervalId = setInterval(tick, 1000);
  }

  return { start, setAlarms, stopAlarm, isRinging };
})();

// ─── 5. MessageModule ─────────────────────────────────────────────────────────
// Responsável pela saudação personalizada.

const MessageModule = (() => {
  const element = document.getElementById("msn");

  async function refresh() {
    const { message } = await ApiClient.getMessage();
    element.value = message;
  }

  return { refresh };
})();

// ─── 6. ConfigModule ──────────────────────────────────────────────────────────
// Responsável por ler e salvar as configurações do usuário.

const ConfigModule = (() => {
  const elements = {
    hourFormatInputs: document.querySelectorAll("input[name='formatoHora']"),
    tempScaleInputs: document.querySelectorAll("input[name='escalaTemp']"),
    genderInputs: document.querySelectorAll("input[name='sexo']"),
    cityField: document.getElementById("idCidade"),
    nameField: document.getElementById("idNome"),
    saveButton: document.getElementById("idBtnSalvar"),
    feedbackOutput: document.getElementById("idMessageSettings"),
  };

  elements.saveButton.addEventListener("click", handleSave);

  function loadIntoForm(config) {
    selectRadio(elements.hourFormatInputs, config.hourFormat);
    selectRadio(elements.tempScaleInputs, config.temperatureScale);
    selectRadio(elements.genderInputs, config.gender);
    elements.cityField.value = config.city ?? "";
    elements.nameField.value = config.name ?? "";
  }

  function selectRadio(inputs, value) {
    inputs.forEach((input) => {
      input.checked = input.value === value;
    });
  }

  function readFromForm() {
    return new URLSearchParams({
      hourFormat: getCheckedValue(elements.hourFormatInputs),
      temperatureScale: getCheckedValue(elements.tempScaleInputs),
      city: elements.cityField.value,
      gender: getCheckedValue(elements.genderInputs),
      name: elements.nameField.value,
    }).toString();
  }

  function getCheckedValue(inputs) {
    return [...inputs].find((i) => i.checked)?.value ?? "";
  }

  async function handleSave() {
    try {
      const params = readFromForm();
      await ApiClient.saveConfig(params);
      showFeedback("Settings saved successfully!", 5000);
      await init(); // re-initializes the app with the new config
    } catch (err) {
      showFeedback(err.message);
    }
  }

  function showFeedback(message, autoClearMs = 0) {
    elements.feedbackOutput.value = message;
    if (autoClearMs > 0) {
      setTimeout(() => {
        elements.feedbackOutput.value = "";
      }, autoClearMs);
    }
  }

  async function load() {
    try {
      const config = await ApiClient.getConfig();
      loadIntoForm(config);
      return config;
    } catch {
      return null;
    }
  }

  // Populates the form when the user opens the settings screen
  document.body.addEventListener("click", async (event) => {
    if (event.target.id === "idIconeConfiguracao") {
      await load();
    }
  });

  return { load };
})();

// ─── 7. AlarmModule ───────────────────────────────────────────────────────────
// Responsável pela tela de listagem e criação de alarmes.

const AlarmModule = (() => {
  const listContainer = document.querySelector(".clInfoAlarme");
  const hourField = document.getElementById("idHora");
  const descField = document.getElementById("idDescrição");
  const saveButton = document.getElementById("idBtnSaveNewAlarm");
  const feedbackOutput = document.getElementById("idMessageNewAlarm");
  const alarmButton = document.getElementById("idBtnAlarme");

  let periodIsAm = true;
  let alarmsList = [];

  // AM/PM radio listeners
  document.getElementById("idAm").addEventListener("change", () => {
    periodIsAm = true;
  });
  document.getElementById("idPm").addEventListener("change", () => {
    periodIsAm = false;
  });

  // Main alarm button: stop alarm OR navigate to alarm list
  alarmButton.addEventListener("click", () => {
    if (ClockModule.isRinging()) {
      ClockModule.stopAlarm();
    } else {
      const url = location.href;
      location.href = "#idTelaAlarme";
      history.replaceState(null, null, url);
    }
  });

  saveButton.addEventListener("click", handleSaveNewAlarm);

  // Delegated click handler for toggle and remove buttons in the list
  document.body.addEventListener("click", async (event) => {
    const el = event.target;

    if (el.className === "clAlarm") {
      const position = Number(el.value);
      const updatedAlarms = await ApiClient.toggleAlarm(position, !alarmsList[position].isActive);
      renderList(updatedAlarms);
    }

    if (el.className === "clBtnRemover") {
      const position = Number(el.value);
      const updatedAlarms = await ApiClient.deleteAlarm(position);
      renderList(updatedAlarms);
    }
  });

  async function handleSaveNewAlarm() {
    const hour = TimeUtils.validateAndFormatHour(hourField.value, periodIsAm);

    if (!hour) {
      showFeedback("Please enter a valid time between 00:00 and 11:59", 5000);
      return;
    }

    const params = new URLSearchParams({
      isActive: true,
      hour,
      isAm: periodIsAm,
      description: descField.value,
    }).toString();

    try {
      const updatedAlarms = await ApiClient.createAlarm(params);
      renderList(updatedAlarms);
      resetForm();
      const url = location.href;
      location.href = "#idTelaAlarme";
      history.replaceState(null, null, url);
    } catch (err) {
      showFeedback(err.message, 5000);
    }
  }

  function renderList(newAlarmsList) {
    alarmsList = newAlarmsList;
    listContainer.replaceChildren();

    newAlarmsList.forEach((alarm, index) => {
      const wrapper = document.createElement("div");
      wrapper.className = "clAlarme";

      const label = document.createElement("label");
      label.className = "checkbox";

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.id = `idAlarm${index}`;
      checkbox.className = "clAlarm";
      checkbox.value = index;
      checkbox.checked = alarm.isActive;

      const checkSpan = document.createElement("span");
      label.append(checkbox, checkSpan);

      const timeLabel = document.createElement("label");
      timeLabel.htmlFor = `idAlarm${index}`;
      timeLabel.className = "clLabelHora";
      timeLabel.textContent = alarm.hour + (alarm.isAm ? " am" : " pm");

      const desc = document.createElement("p");
      desc.textContent = alarm.description;

      const removeBtn = document.createElement("button");
      removeBtn.textContent = "Remove";
      removeBtn.className = "clBtnRemover";
      removeBtn.value = index;

      wrapper.append(label, timeLabel, desc, removeBtn);
      listContainer.appendChild(wrapper);
    });

    // Keeps the clock module in sync with active alarms
    // (config will be read from a shared state in a real app)
    ClockModule.setAlarms(newAlarmsList, "24");
  }

  function resetForm() {
    hourField.value = "";
    descField.value = "";
    feedbackOutput.value = "";
    document.getElementById("idAm").checked = true;
    periodIsAm = true;
  }

  function showFeedback(message, autoClearMs = 0) {
    feedbackOutput.value = message;
    if (autoClearMs > 0) {
      setTimeout(() => {
        feedbackOutput.value = "";
      }, autoClearMs);
    }
  }

  async function load() {
    const alarms = await ApiClient.getAlarms();
    renderList(alarms);
    return alarms;
  }

  return { load, renderList };
})();

// ─── 8. init ──────────────────────────────────────────────────────────────────
// Ponto de entrada único. Carrega tudo na ordem certa.

async function init() {
  const config = await ConfigModule.load();
  const city = config?.city ?? "";
  const scale = config?.temperatureScale ?? "C";
  const format = config?.hourFormat ?? "24";

  const [weather, alarms] = await Promise.all([
    ApiClient.getWeather(city).catch(() => null),
    ApiClient.getAlarms(),
  ]);

  if (weather) WeatherModule.render(weather, scale);
  WeatherModule.startAutoRefresh(city, scale);

  const { date } = await ApiClient.getDate();
  document.getElementById("hoje").value = date;
  await MessageModule.refresh();

  AlarmModule.renderList(alarms);
  ClockModule.setAlarms(alarms, format);
  ClockModule.start();
}

document.addEventListener("DOMContentLoaded", init);
