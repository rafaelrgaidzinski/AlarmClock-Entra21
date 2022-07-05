const express = require("express");
const cors = require("cors");
const { default: axios } = require("axios");
const { log } = require("console");
var removeAccents = require("remove-accents");

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
    
    var weather = {tempMin: weather.data.forecast[0].min, tempMax: weather.data.forecast[0].max, tempNow: weather.data.temp, 
                    condition_code: weather.data.condition_code, sunrise: weather.data.sunrise, sunset: weather.data.sunset};
    
    resp.json({weather});
});

app.get("/horaCerta", function(req, resp) {

   var horaCerta = getHoraCerta()

   resp.json({horaCerta});

});

app.get("/hoje", function(req, resp) {

    var hoje = getHoje();

    resp.json({hoje});

});

function getHoje() {

    var hoje;
    var today = new Date();

    const options = {weekday: "short", month: "short", day: "numeric", year: "numeric"}

    hoje = today.toLocaleDateString("en-US", {weekday: "short"}) + " ";
    hoje += today.toLocaleDateString("en-US", {month: "short"}) + " ";
    hoje += today.toLocaleDateString("en-US", {day: "numeric"}) + "th, ";
    hoje += today.toLocaleDateString("en-US", {year: "numeric"});

    return hoje
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

    return hora;
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
        url: `https://api.hgbrasil.com/weather?format=json-cors&key=${key}&woeid=${woeid}&fields=only_results,city_name,temp,condition_code,sunrise,sunset,forecast,max,min&array_limit=1`
    }

    var weather = await axios.request(requisition);

    return weather;
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

