// This script demonstrates some simple things one can do with leaflet.js


var map = L.map('map').setView([29.766,-95.359], 11);   

// set a tile layer to be CartoDB tiles 
var CartoDBTiles = L.tileLayer('http://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',{
  attribution: 'Map Data &copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> Contributors, Map Tiles &copy; <a href="http://cartodb.com/attributions">CartoDB</a>'
});

// add these tiles to our map
map.addLayer(CartoDBTiles);

// set data layer as global variable so we can use it in the layer control below
var FamilyIncomeGeoJSON;

// use jQuery get geoJSON to grab geoJson layer, parse it, then plot it on the map using the plotDataset function
$.getJSON( "data/family_income.geojson", function( data ) {
    var dataset = data;
    // draw the dataset on the map
    plotDataset(dataset);
    //create the sidebar with links to fire polygons on the map
    createListForClick(dataset);
});

// function to plot the dataset passed to it
function plotDataset(dataset) {
    FamilyIncomeGeoJSON = L.geoJson(dataset, {
        style: FamilyIncomeStyle,
        onEachFeature: FamilyIncomeOnEachFeature
    }).addTo(map);

    // create layer controls
    createLayerControls(); 
}

// function that sets the style of the geojson layer
var FamilyIncomeStyle = function (feature, latlng) {

    var calc = calculatePercentage(feature);

    var style = {
        weight: 1,
        opacity: .25,
        color: 'grey',
        fillOpacity: fillOpacity(calc.percentage),
        fillColor: fillColorPercentage(calc.percentage)
    };

    return style;

}

function calculatePercentage(feature) {
    var output = {};
    var numerator = parseFloat(feature.properties.Less_than_25000);
    var denominator = parseFloat(feature.properties.Total);
    var percentage = ((numerator/denominator) * 100).toFixed(0);
    output.numerator = numerator;
    output.denominator = denominator;
    output.percentage = percentage;
    return output;    
}

// function that fills polygons with color based on the data
function fillColorPercentage(d) {
    return d > 40 ? '#B107C1' :
           d > 30 ? '#E469F0' :
           d > 20 ? '#E684F0' :
           d > 10 ? '#ECA4F3' :
           d > 0 ? '#F2C7F6' :
                   '#edf8e9';
}

// function that sets the fillOpacity of layers -- if % is 0 then make polygons transparent
function fillOpacity(d) {
    return d == 0 ? 0.0 :
                    0.75;
}

// empty L.popup so we can fire it outside of the map
var popup = new L.Popup();

// set up a counter so we can assign an ID to each layer
var count = 0;

// on each feature function that loops through the dataset, binds popups, and creates a count
var FamilyIncomeOnEachFeature = function(feature,layer){
    var calc = calculatePercentage(feature);

    // let's bind some feature properties to a pop up with an .on("click", ...) command. We do this so we can fire it both on and off the map
    layer.on("click", function (e) {
        var bounds = layer.getBounds();
        var popupContent = "<strong>Total Population:</strong> " + calc.denominator + "<br /><strong>Population Family Income less than 25,000:</strong> " + calc.numerator + "<br /><strong>Percentage Population Family Income Less than 25,000:</strong> " + calc.percentage + "%";
        popup.setLatLng(bounds.getCenter());
        popup.setContent(popupContent);
        map.openPopup(popup);
    });

    // we'll now add an ID to each layer so we can fire the popup outside of the map
    layer._leaflet_id = 'FamilyIncomeLayerID' + count;
    count++;

}


function createLayerControls(){
    // add in layer controls
    var baseMaps = {
        "CartoDB Basemap": CartoDBTiles,
    };

    var overlayMaps = {
        "Percentage Family Income Less than 25,000": FamilyIncomeGeoJSON,
    };

    // add control
    L.control.layers(baseMaps, overlayMaps).addTo(map);
    
}




// add in a legend to make sense of it all
// create a container for the legend and set the location

var legend = L.control({position: 'bottomright'});

// using a function, create a div element for the legend and return that div
legend.onAdd = function (map) {

    // a method in Leaflet for creating new divs and setting classes
    var div = L.DomUtil.create('div', 'legend'),
        amounts = [0, 10, 20, 30, 40, 50];

        div.innerHTML += '<p>Percentage Population<br />With Family Income<br />Less than 25,000</p>';

        for (var i = 0; i < amounts.length; i++) {
            div.innerHTML +=
                '<i style="background:' + fillColorPercentage(amounts[i] + 1) + '"></i> ' +
                amounts[i] + (amounts[i + 1] ? '% &ndash;' + amounts[i + 1] + '%<br />' : '% +<br />');
        }

    return div;
};


// add the legend to the map
legend.addTo(map);



// function to create a list in the right hand column with links that will launch the pop-ups on the map
function createListForClick(dataset) {
    // use d3 to select the div and then iterate over the dataset appending a list element with a link for clicking and firing
    // first we'll create an unordered list ul elelemnt inside the <div id='list'></div>. The result will be <div id='list'><ul></ul></div>

    //d3.select("#list").append('h1').text('List of Census Tracts in Brooklyn');


    var ULs = d3.select("#list")
                .append("ul");


    // now that we have a selection and something appended to the selection, let's create all of the list elements (li) with the dataset we have 
    
    ULs.selectAll("li")
        .data(dataset.features)
        .enter()
        .append("li")
        .html(function(d) { 
            return '<a href="#">' + "Block Group " + d.properties.BLKGRP + ", Census Tract " + d.properties.TRACT + '</a>'; 
        })
        .on('click', function(d, i) {
            console.log(d.properties.BLKGRP);  //******
            console.log(i);
            var leafletId = 'FamilyIncomeLayerID' + i;
            map._layers[leafletId].fire('click');
        });


}


// lets add data from the API now
// set a global variable to use in the D3 scale below
// use jQuery geoJSON to grab data from API
$.getJSON( "http://mycity.houstontx.gov/cohgis/rest/services/PD/Neighborhood_Services_wm/MapServer/8/query?outFields=*&where=1%3D1", function( data ) {
    var dataset = data;
    // draw the dataset on the map
    plotAPIData(dataset);

});

// create a leaflet layer group to add your API dots to so we can add these to the map
var apiLayerGroup = L.layerGroup();

// since these data are not geoJson, we have to build our dots from the data by hand
function plotAPIData(dataset) {
    // set up D3 ordinal scle for coloring the dots just once
    var ordinalScale = setUpD3Scale(dataset);
    //console.log(ordinalScale("Noise, Barking Dog (NR5)"));


    // loop through each object in the dataset and create a circle marker for each one using a jQuery for each loop
    $.each(dataset, function( index, value ) {

        // check to see if lat or lon is undefined or null
        if ((typeof value.latitude !== "undefined" || typeof value.longitude !== "undefined") || (value.latitude && value.longitude)) {
            // create a leaflet lat lon object to use in L.circleMarker
            var latlng = L.latLng(value.latitude, value.longitude);
     
            var apiMarker = L.circleMarker(latlng, {
                stroke: false,
                fillColor: ordinalScale(value.NAME),
                fillOpacity: 1,
                radius: 5
            });

            // bind a simple popup so we know what the noise complaint is
            apiMarker.bindPopup(value.NAME);

            // add dots to the layer group
            apiLayerGroup.addLayer(apiMarker);

        }

    });

    apiLayerGroup.addTo(map);

}

function setUpD3Scale(dataset) {
    //console.log(dataset);
    // create unique list of names
    // first we need to create an array of names
    var NAME = [];

    // loop through names and add to names array
    $.each(dataset, function( index, value ) {
        NAME.push(value.NAME);
    });

    // use underscore to create a unique array
    var NAMEUnique = _.uniq(NAME);

    // create a D3 ordinal scale based on that unique array as a domain
    var ordinalScale = d3.scale.category20()
        .domain(NAMEUnique);

    return ordinalScale;

}









