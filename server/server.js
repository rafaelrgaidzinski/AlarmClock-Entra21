require("dotenv").config();
const express = require("express");
const cors = require("cors");
const axios = require("axios").default;
const removeAccents = require("remove-accents");
const fs = require("fs/promises");
const fse = require("fs");

// ─── Constants ────────────────────────────────────────────────────────────────

const SERVER_PORT = process.env.PORT || 3001;
const API_KEY = process.env.HG_BRASIL_API_KEY;
const ALARMS_FILE_PATH = "../files/alarms.json";
const CONFIG_FILE_PATH = "../files/config.json";
const MAX_ALARMS = 6;

const VALID_HOUR_FORMATS = ["12", "24"];
const VALID_TEMPERATURE_SCALES = ["C", "F", "K"];
const VALID_GENDERS = ["Mr", "Mrs"];

const CITIES_WOEID = [
  { city: "criciuma", woeid: 455856 },
  { city: "curitibanos", woeid: 456168 },
  { city: "imarui", woeid: 459654 },
  { city: "palhoca", woeid: 460341 },
  { city: "maravilha", woeid: 460067 },
];

// ─── FileRepository ───────────────────────────────────────────────────────────
// Responsible for all file I/O operations.

class FileRepository {
  async read(path) {
    try {
      return await fs.readFile(path, { encoding: "utf8" });
    } catch (err) {
      throw new Error(`Failed to read file: ${err.message}`);
    }
  }

  async write(path, content) {
    try {
      await fs.writeFile(path, content);
    } catch (err) {
      throw new Error(`Failed to write file: ${err.message}`);
    }
  }

  exists(path) {
    return fse.existsSync(path);
  }

  async readJson(path) {
    const content = await this.read(path);
    return JSON.parse(content);
  }

  async writeJson(path, data) {
    await this.write(path, JSON.stringify(data));
  }
}

// ─── AlarmService ─────────────────────────────────────────────────────────────
// Responsible for all alarm CRUD operations.

class AlarmService {
  constructor(fileRepository) {
    this.fileRepository = fileRepository;
  }

  async getAll() {
    if (!this.fileRepository.exists(ALARMS_FILE_PATH)) {
      return [];
    }
    return await this.fileRepository.readJson(ALARMS_FILE_PATH);
  }

  async create({ isActive, hour, isAm, description }) {
    const alarms = this.fileRepository.exists(ALARMS_FILE_PATH)
      ? await this.fileRepository.readJson(ALARMS_FILE_PATH)
      : [];

    if (alarms.length >= MAX_ALARMS) {
      throw new Error(`Maximum number of alarms (${MAX_ALARMS}) already registered.`);
    }

    const newAlarm = { isActive, hour, isAm, description };
    alarms.push(newAlarm);
    await this.fileRepository.writeJson(ALARMS_FILE_PATH, alarms);
    return alarms;
  }

  async remove(position) {
    const alarms = await this._loadExistingAlarms();
    alarms.splice(position, 1);
    await this.fileRepository.writeJson(ALARMS_FILE_PATH, alarms);
    return alarms;
  }

  async updateActiveStatus(position, isActive) {
    const alarms = await this._loadExistingAlarms();
    alarms[position].isActive = isActive;
    await this.fileRepository.writeJson(ALARMS_FILE_PATH, alarms);
    return alarms;
  }

  async _loadExistingAlarms() {
    if (!this.fileRepository.exists(ALARMS_FILE_PATH)) {
      throw new Error("Alarms file not found.");
    }
    return await this.fileRepository.readJson(ALARMS_FILE_PATH);
  }
}

// ─── ConfigService ────────────────────────────────────────────────────────────
// Responsible for reading and saving user configuration.

class ConfigService {
  constructor(fileRepository) {
    this.fileRepository = fileRepository;
  }

  async get() {
    return await this.fileRepository.readJson(CONFIG_FILE_PATH);
  }

  async save({ hourFormat, temperatureScale, city, gender, name }) {
    this._validate({ hourFormat, temperatureScale, city, gender, name });

    const config = {
      hourFormat,
      temperatureScale,
      city,
      gender,
      name,
    };

    await this.fileRepository.writeJson(CONFIG_FILE_PATH, config);
    return config;
  }

  _validate({ hourFormat, temperatureScale, city, gender, name }) {
    if (!VALID_HOUR_FORMATS.includes(hourFormat)) {
      throw new Error("Please provide a valid time format (12 or 24).");
    }
    if (!VALID_TEMPERATURE_SCALES.includes(temperatureScale)) {
      throw new Error("Please provide a valid temperature scale (C, F or K).");
    }
    if (!VALID_GENDERS.includes(gender)) {
      throw new Error("Please provide a valid gender (Mr or Mrs).");
    }
    if (!city) {
      throw new Error("City field is required.");
    }
    if (!name) {
      throw new Error("Name field is required.");
    }
  }
}

// ─── WeatherService ───────────────────────────────────────────────────────────
// Responsible for fetching weather data from external API.

class WeatherService {
  constructor(httpClient = axios) {
    this.httpClient = httpClient;
  }

  async getByCity(cityName) {
    const woeid = await this._resolveWoeid(cityName);
    return await this._fetchWeather(woeid);
  }

  async _resolveWoeid(cityName) {
    const normalizedCity = removeAccents(String(cityName).toLowerCase());
    const found = CITIES_WOEID.find((entry) => entry.city === normalizedCity);

    if (found) return found.woeid;

    const userLocation = await this._fetchUserLocation();
    return userLocation.woeid;
  }

  async _fetchWeather(woeid) {
    const url = `https://api.hgbrasil.com/weather?format=json-cors&key=${API_KEY}&woeid=${woeid}&fields=only_results,city_name,temp,condition_slug,sunrise,sunset,forecast,max,min&array_limit=1`;
    const { data } = await this.httpClient.get(url);

    return {
      tempMin: data.forecast[0].min,
      tempMax: data.forecast[0].max,
      tempNow: data.temp,
      conditionSlug: data.condition_slug,
      sunrise: data.sunrise,
      sunset: data.sunset,
    };
  }

  async _fetchUserLocation() {
    const url = `https://api.hgbrasil.com/geoip?format=json-cors&key=${API_KEY}&address=remote&precision=false&fields=only_results,woeid`;
    const { data } = await this.httpClient.get(url);
    return data;
  }
}

// ─── ClockService ─────────────────────────────────────────────────────────────
// Responsible for current time and date formatting.

class ClockService {
  getCurrentTime() {
    const now = new Date();
    return {
      hours: this._pad(now.getHours()),
      minutes: this._pad(now.getMinutes()),
      seconds: this._pad(now.getSeconds()),
    };
  }

  getFormattedTime() {
    const { hours, minutes, seconds } = this.getCurrentTime();
    return `${hours}:${minutes}:${seconds}`;
  }

  getFormattedDate() {
    const today = new Date();
    const day = today.getDate();
    const suffix = this._getDaySuffix(day);

    const weekday = today.toLocaleDateString("en-US", { weekday: "short" });
    const month = today.toLocaleDateString("en-US", { month: "short" });
    const year = today.toLocaleDateString("en-US", { year: "numeric" });

    return `${weekday} ${month} ${day}${suffix} ${year}`;
  }

  convertTimeToSeconds(time) {
    const [h = 0, m = 0, s = 0] = String(time).split(":").map(Number);
    return h * 3600 + m * 60 + s;
  }

  formatWithHourStyle(hourFormat, time) {
    const parts = String(time).split(":");
    const [rawHour, minutes, seconds] = parts.map(Number);
    let hour = rawHour;

    if (String(hourFormat) === "12") {
      const period = hour >= 12 ? "pm" : "am";
      if (hour > 12) hour -= 12;
      return `${this._pad(hour)}:${this._pad(minutes)}:${this._pad(seconds)} ${period}`;
    }

    if (minutes === 0 && seconds === 0) return `${time} o'Clock`;
    return `${time} hours`;
  }

  _getDaySuffix(day) {
    if ([1, 21, 31].includes(day)) return "st, ";
    if ([2, 22].includes(day)) return "nd, ";
    if ([3, 23].includes(day)) return "rd, ";
    return "th, ";
  }

  _pad(value) {
    return String(value).padStart(2, "0");
  }
}

// ─── MessageService ───────────────────────────────────────────────────────────
// Responsible for building the personalized greeting message.

class MessageService {
  constructor(configService, weatherService, clockService) {
    this.configService = configService;
    this.weatherService = weatherService;
    this.clockService = clockService;
  }

  async buildGreeting() {
    const config = await this.configService.get().catch(() => null);
    if (!config) return "";

    const { city, name, hourFormat, gender } = config;
    const weather = await this.weatherService.getByCity(city);
    const timeNow = this.clockService.getFormattedTime();
    const formatted = this.clockService.formatWithHourStyle(hourFormat, timeNow);

    const nowInSeconds = this.clockService.convertTimeToSeconds(timeNow);
    const sunsetInSeconds = this.clockService.convertTimeToSeconds(weather.sunset) + 12 * 3600;
    const eveningStart = this.clockService.convertTimeToSeconds(weather.sunset) + 8 * 3600;

    const NOON = this.clockService.convertTimeToSeconds("12:00:00");
    const END_OF_DAY = this.clockService.convertTimeToSeconds("23:59:59");

    if (nowInSeconds < NOON) {
      return `Good Morning ${gender}. ${name}, it's ${formatted}`;
    }
    if (nowInSeconds < eveningStart) {
      return `Good Afternoon ${gender}. ${name}, it's ${formatted}`;
    }
    if (nowInSeconds <= sunsetInSeconds) {
      return `Good Evening ${gender}. ${name}, it's ${formatted}`;
    }
    if (nowInSeconds <= END_OF_DAY) {
      return `Good Night ${gender}. ${name}, it's ${formatted} — tomorrow the sun rises at ${weather.sunrise} am`;
    }

    return "";
  }
}

// ─── App (Express setup) ──────────────────────────────────────────────────────
// Responsible for wiring routes to services.

class App {
  constructor() {
    this.server = express();
    this.fileRepository = new FileRepository();
    this.alarmService = new AlarmService(this.fileRepository);
    this.configService = new ConfigService(this.fileRepository);
    this.weatherService = new WeatherService();
    this.clockService = new ClockService();
    this.messageService = new MessageService(
      this.configService,
      this.weatherService,
      this.clockService
    );

    this._applyMiddleware();
    this._registerRoutes();
  }

  _applyMiddleware() {
    this.server.use(cors());
    this.server.use((req, res, next) => {
      res.header("Access-Control-Allow-Origin", "*");
      next();
    });
  }

  _registerRoutes() {
    this.server.get("/weather", this._handleGetWeather.bind(this));
    this.server.get("/time", this._handleGetTime.bind(this));
    this.server.get("/date", this._handleGetDate.bind(this));
    this.server.get("/message", this._handleGetMessage.bind(this));

    this.server.get("/config", this._handleGetConfig.bind(this));
    this.server.post("/config", this._handlePostConfig.bind(this));

    this.server.get("/alarms", this._handleGetAlarms.bind(this));
    this.server.post("/alarms", this._handlePostAlarm.bind(this));
    this.server.delete("/alarms", this._handleDeleteAlarm.bind(this));
    this.server.put("/alarms", this._handlePutAlarm.bind(this));
  }

  // ── Route Handlers ──────────────────────────────────────────────────────────

  async _handleGetWeather(req, res) {
    try {
      const weather = await this.weatherService.getByCity(req.query.city);
      res.json(weather);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }

  _handleGetTime(req, res) {
    res.json({ time: this.clockService.getFormattedTime() });
  }

  _handleGetDate(req, res) {
    res.json({ date: this.clockService.getFormattedDate() });
  }

  async _handleGetMessage(req, res) {
    try {
      const message = await this.messageService.buildGreeting();
      res.json({ message });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }

  async _handleGetConfig(req, res) {
    try {
      const config = await this.configService.get();
      res.json(config);
    } catch (err) {
      res.status(404).json({ error: "Configuration not found." });
    }
  }

  async _handlePostConfig(req, res) {
    try {
      const config = await this.configService.save({
        hourFormat: req.query.hourFormat,
        temperatureScale: req.query.temperatureScale,
        city: req.query.city,
        gender: req.query.gender,
        name: req.query.name,
      });
      res.json(config);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  }

  async _handleGetAlarms(req, res) {
    try {
      const alarms = await this.alarmService.getAll();
      res.json(alarms);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }

  async _handlePostAlarm(req, res) {
    try {
      const alarms = await this.alarmService.create({
        isActive: req.query.isActive === "true",
        hour: req.query.hour,
        isAm: req.query.isAm === "true",
        description: req.query.description,
      });
      res.json(alarms);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  }

  async _handleDeleteAlarm(req, res) {
    try {
      const alarms = await this.alarmService.remove(Number(req.query.position));
      res.json(alarms);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  }

  async _handlePutAlarm(req, res) {
    try {
      const alarms = await this.alarmService.updateActiveStatus(
        Number(req.query.position),
        req.query.isActive === "true"
      );
      res.json(alarms);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  }

  start() {
    if (!API_KEY) {
      console.warn(
        "Aviso: HG_BRASIL_API_KEY não definida. Crie um arquivo .env (veja .env.example) " +
          "para que a previsão do tempo funcione."
      );
    }
    this.server.listen(SERVER_PORT, () => {
      console.log(`Server running on port ${SERVER_PORT}`);
    });
  }
}

// ─── Exports ──────────────────────────────────────────────────────────────────
// Exporting the classes makes them importable by the test suite.

module.exports = {
  FileRepository,
  AlarmService,
  ConfigService,
  WeatherService,
  ClockService,
  MessageService,
  App,
  MAX_ALARMS,
  VALID_HOUR_FORMATS,
  VALID_TEMPERATURE_SCALES,
  VALID_GENDERS,
};

// ─── Entry Point ──────────────────────────────────────────────────────────────
// Only start the server when this file is run directly (node server.js),
// not when it is imported by the tests.

if (require.main === module) {
  const app = new App();
  app.start();
}
