// @deno-types="npm:@types/leaflet"
import leaflet from "leaflet";

// Style sheets
import "leaflet/dist/leaflet.css"; // supporting style for Leaflet
import "./style.css"; // student-controlled page style

// Fix missing marker images
import "./_leafletWorkaround.ts"; // fixes for missing Leaflet images

// ============================================= //
// ===               FUNCTIONS               === //
// ============================================= //
navigator.geolocation.getCurrentPosition(
  (position) => {
    const { latitude, longitude } = position.coords;
    leaflet.marker([latitude, longitude])
      .addTo(map)
      .bindPopup("You are here!")
      .openPopup();
    map.setView([latitude, longitude], 15);
  },
  (error) => {
    if (error.code === 1) alert("[ERROR] " + error.message);
    else alert("[ERROR] GeoLocation is not supported");
    leaflet.marker([CLASSROOM_LOCATION.latitude, CLASSROOM_LOCATION.longitude])
      .addTo(map)
      .bindPopup("You are here!")
      .openPopup();
  },
);

// ============================================= //
// ===              UI ELEMENTS              === //
// ============================================= //
const controlPanelDiv = document.createElement("div");
controlPanelDiv.id = "controlPanel";
document.body.append(controlPanelDiv);

const mapDiv = document.createElement("div");
mapDiv.id = "map";
document.body.append(mapDiv);

const statusPanelDiv = document.createElement("div");
statusPanelDiv.id = "statusPanel";
document.body.append(statusPanelDiv);

// our classroom location
const CLASSROOM_LOCATION = {
  latitude: 36.997936938057016,
  longitude: -122.05703507501151,
};

// Tunable gameplay parameters
const GAMEPLAY_ZOOM_LEVEL = 19;

// Create the map (element with id "map" is defined in index.html)
const map = leaflet.map(mapDiv, {
  center: leaflet.latLng(
    CLASSROOM_LOCATION.latitude,
    CLASSROOM_LOCATION.longitude,
  ),
  zoom: GAMEPLAY_ZOOM_LEVEL,
  minZoom: GAMEPLAY_ZOOM_LEVEL,
  maxZoom: GAMEPLAY_ZOOM_LEVEL,
  zoomControl: false,
  scrollWheelZoom: false,
});

// Populate the map with a background tile layer
leaflet
  .tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution:
      '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  })
  .addTo(map);
