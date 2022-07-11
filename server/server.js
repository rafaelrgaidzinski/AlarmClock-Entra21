const express = require("express");
const cors = require("cors");
const { default: axios } = require("axios");
const { log } = require("console");
const removeAccents = require("remove-accents");
const fs = require("fs/promises");

const app = express();

const porta = 3001;
app.listen(porta, function(){
    console.log(`Servidor rodando na porta ${porta}`);
});

app.use(function(req, resp, next){
    resp.header("Access-Control-Allow-Origin", "*");

    app.use(cors());
    next();
});

app.get("/clima", async function(req, resp) {

    var city = req.query.cidade;

    var weather = await getClima(city);
    
    resp.json(weather);
});

app.get("/horaCerta", function(req, resp) {

   var horaCerta = getHoraCerta();

   resp.json(horaCerta);
});

app.get("/hoje", function(req, resp) {

    var hoje = getHoje();

    resp.json(hoje);
});

app.post("/config", async function(req, resp) {

    var hourFormat = req.query.formatoHora;
    var temperatureScale = req.query.escalaTemperatura;
    var city = req.query.cidade;
    var gender = req.query.genero;
    var name = req.query.nome;

    var status = await postConfig(hourFormat, temperatureScale, city, gender, name);
    
    resp.json(status);
});

app.get("/config", async function(req, resp) {

    var settings = await getConfig();

    resp.json(settings);

});

app.get("/message", async function(req, resp) {

    var message = await getMessage();

    resp.json(message);

});

async function getMessage() {

    var message = "";

    var settings = await getConfig();
    var city = settings.value.cidade;
    var name = settings.value.nome;
    var format = settings.value.formatoHora;
    var gender = settings.value.genero;

    var weather = await getClima(city);
    var timeSunrise = weather.sunrise.replace(/[^\d:]/g, '');
    var timeSunset = weather.sunset.replace(/[^\d:]/g, '');

    var timeSunsetInSeconds = convertHourToSeconds(timeSunset);
    var timeSunsetMinusFourHours = (convertHourToSeconds(timeSunset) - (4 * 3600));

    var timeNow = getHoraCerta();
    var hourFormated = getHourFormat(format, timeNow.horaCerta);
    var seconds = convertHourToSeconds(timeNow.horaCerta);
    console.log(seconds);

    if ((seconds >= convertHourToSeconds("00:00:00")) && (seconds <= convertHourToSeconds("11:59:59"))) {
        message = `Good Morning ${gender}. ${name}, it's ${hourFormated}`;
    } else if ((seconds >= convertHourToSeconds("12:00:00")) && (seconds <= timeSunsetMinusFourHours)) {
        message = `Good Afternoon ${gender}. ${name}, it's ${hourFormated}`;
    } else if ((seconds >= (timeSunsetMinusFourHours + 1)) && (seconds <= timeSunsetInSeconds)) {
        message = `Good Evening ${gender}. ${name}, it's ${hourFormated}`;
    } else if ((seconds >= (timeSunsetInSeconds + 1)) && (seconds <= convertHourToSeconds("23:59:59"))) {
        message = `Good Night ${gender}. ${name}, it's ${hourFormated} tomorrow the sun will rises at ${timeSunrise} am`;
    }

    var response = {mensagem: message};

    return response;
}

function getHourFormat(format, time) {

    var hourFormated = "";
    var timeList = String(time).split(":");

    if (format == 12) {

        if (timeList[0] > 12) {
            timeList[0] = timeList[0] - 12;
            if (timeList[0] < 10) {
                timeList[0] = "0" + timeList[0];
            }
            hourFormated = timeList[0] + ":" + timeList[1] + ":" + timeList[2] + " pm";
        } else {
            if (timeList[0] < 10) {
                timeList[0] = "0" + timeList[0];
            }
            hourFormated = timeList[0] + ":" + timeList[1] + ":" + timeList[2] + " am";
        }

    } else {

        if ((timeList[1] == "00") && (timeList[2] == "00")) {
            hourFormated = time + " o'Clock";
        } else {
            hourFormated = time + " hours";
        }
        
    }

    return hourFormated;

}

function convertHourToSeconds(time) {

    const timeList = String(time).split(":");
    let seconds = 0;
    console.log(timeList);

    if(timeList[2]) {
        seconds = Number((timeList[0] * 3600) + (timeList[1] * 60) + (timeList[2] * 1));
    } else if (timeList[1]) {
        seconds = Number((timeList[0] * 3600) + (timeList[1] * 60));
    } else {
        seconds = Number((timeList[0] * 3600));
    }

    console.log(seconds);
    
    return seconds;
}

async function getConfig() {

    var configStatus;
    var configMessage;
    var configValue;
    var settings;

    const file = await readFile();
    
    try {
        configValue = JSON.parse(file);
        configStatus = 0;
        configMessage = "Arquivo lido com sucesso!";
        settings = {status: configStatus, mensagem: configMessage, value: configValue};
    } catch (err) {
        configStatus = 2;
        configMessage = file;
        settings = {status: configStatus, mensagem: configMessage};
    }

    return settings;
}

async function readFile() {

    try {
        const file = await fs.readFile("../files/config.json", {encoding: "utf8"});
        return file;
    } catch (err) {
        return err.message;
    }

}

async function postConfig(hourFormat, temperatureScale, city, gender, name) {

    var status = 0;
    var message = "";
    var configObject = {};
    var fileStatus = "";
    var response = {};

    if ((hourFormat != "12") && (hourFormat != "24")) {
        status = 1;
        message = "Por favor informe um formato de hora válido";
    } else if ((temperatureScale != "C") && (temperatureScale != "F") && (temperatureScale != "K")) {
        status = 1;
        message = "Por favor informe uma escala de temperatura válida";
    } else if ((gender != "Mr") && (gender != "Mrs")) {
        status = 1;
        message = "Por favor informe um gênero válido";
    } else if (city == "") {
        status = 1;
        message = "Campo cidade não informado";
    } else if (name == "") {
        status = 1;
        message = "Campo nome não informado";
    } else if (status == 0) {
        configObject = {formatoHora: hourFormat, escalaTemperatura: temperatureScale, cidade: city, genero: gender, nome: name};
        fileStatus = await saveFile(JSON.stringify(configObject));
        
        if(fileStatus != "Arquivo salvo com sucesso!") {
            status = 2;
            message = fileStatus;
        }
    }

    if (status == 0) {
        response = {status: status};
    } else {
        response = {status: status, mensagem: message};
    }

    return response; 
}

async function saveFile(info) {

    try {
        await fs.writeFile("../files/config.json", info);
        var message = "Arquivo salvo com sucesso!";
        return message; 
    } catch (err) {
        return err.message;
    }           
        
};

function getHoje() {

    var hoje;
    var today = new Date();
    var day = today.getDate();
    var posfixed;

    if ((day == 1) || (day == 21) || (day == 31)) {
        posfixed = "st, ";
    } else if ((day == 2) || (day == 22)) {
        posfixed = "nd, ";
    } else if ((day == 3) ||(day == 23)) {
        posfixed = "rd, ";
    } else {
        posfixed = "th, ";
    }

    hoje = today.toLocaleDateString("en-US", {weekday: "short"}) + " ";
    hoje += today.toLocaleDateString("en-US", {month: "short"}) + " ";
    hoje += today.toLocaleDateString("en-US", {day: "numeric"}) + posfixed;
    hoje += today.toLocaleDateString("en-US", {year: "numeric"});

    return {hoje: hoje};
}

function getHoraCerta() {

    var hora;
    var today = new Date();

    if (String(today.getHours()).length == 1) {
        hora = "0" + today.getHours();
    } else {
        hora = today.getHours();
    }

    if(String(today.getMinutes()).length == 1) {
        hora += ":0" + today.getMinutes();
    } else {
        hora += ":" + today.getMinutes();
    }

    if (String(today.getSeconds()).length == 1) {
        hora += ":0" + today.getSeconds();
    } else {
        hora += ":" + today.getSeconds();
    }

    return {horaCerta: hora};
}

async function getClima(city) {

    var woeid;
    const key = "dd71bef5";
    const citiesWOEID = [{cidade:"criciuma", woeid:455856}, {cidade:"curitibanos", woeid:456168}, {cidade:"imarui", woeid:459654}, 
                        {cidade:"palhoca", woeid:460341}, {cidade:"maravilha", woeid: 460067}];
                       
    city = removeAccents(String(city).toLowerCase());
    
    citiesWOEID.forEach(element => {
        if (element.cidade == city){
            woeid = element.woeid;
        }
    });

    if (woeid == undefined) {
        var userLocation = await getUserLocation();
        woeid = userLocation.data.woeid;
    }

    var axios = require("axios").default;

    var requisition = {
        method: "GET",
        url: `https://api.hgbrasil.com/weather?format=json-cors&key=${key}&woeid=${woeid}&fields=only_results,city_name,temp,condition_slug,sunrise,sunset,forecast,max,min,sunrise&array_limit=1`
    }

    var weather = await axios.request(requisition);

    return {tempMin: weather.data.forecast[0].min, tempMax: weather.data.forecast[0].max, tempNow: weather.data.temp, 
            condition_slug: weather.data.condition_slug, sunrise: weather.data.sunrise, sunset: weather.data.sunset};
}

async function getUserLocation(){

    const key = "dd71bef5";

    var axios = require("axios").default;

    var requisition = {
        method: "GET",
        url: `https://api.hgbrasil.com/geoip?format=json-cors&key=${key}&address=remote&precision=false&fields=only_results,woeid`
    }

    var woeidLocation = await axios.request(requisition);

    return woeidLocation;

}

