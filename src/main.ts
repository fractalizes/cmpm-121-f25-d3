// ============================================= //
// ===            LIBRARIES / CSS            === //
// ============================================= //

// @deno-types="npm:@types/leaflet"
import leaflet from "leaflet";

import "leaflet/dist/leaflet.css"; // supporting style for Leaflet
import "./style.css"; // student-controlled page style

import "./_leafletWorkaround.ts"; // fixes for missing leaflet images
import luck from "./_luck.ts"; // luck function

// ============================================= //
// ===               FUNCTIONS               === //
// ============================================= //

function getPlayerLocation(): Promise<GeolocationCoordinates> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("GeoLocation not supported"));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => resolve(position.coords),
      (error) => reject(error),
    );
  });
}

function markLocation(coords: { latitude: number; longitude: number }) {
  leaflet.marker([coords.latitude, coords.longitude])
    .addTo(map)
    .bindPopup("This is you!")
    .openPopup();
}

// add caches to the map by cell numbers
function spawnCache(i: number, j: number) {
  // convert cell numbers into lat/lng bounds
  const origin = playerLocation;
  const bounds = leaflet.latLngBounds([
    [origin.latitude + i * TILE_DEGREES, origin.longitude + j * TILE_DEGREES],
    [
      origin.latitude + (i + 1) * TILE_DEGREES,
      origin.longitude + (j + 1) * TILE_DEGREES,
    ],
  ]);

  // add a rectangle to the map to represent the cache
  const rect = leaflet.rectangle(bounds);
  rect.addTo(map);

  rect.bindPopup(() => {
    if (!cacheValues.has(`${i},${j}`)) {
      cacheValues.set(
        `${i},${j}`,
        2 ** Math.floor(luck([i, j, "initialValue"].toString()) * 11),
      );
    }
    const pointValue = cacheValues.get(`${i},${j}`);

    // The popup offers a description and button
    const popupDiv = document.createElement("div");
    popupDiv.innerHTML = `
      <div>There is a cache here at <i>(${i},${j})</i>.
      It has a value of <b><span id="value">${pointValue}</span></b>.</div>
      <button id="poke">pick up!</button>
    `;

    const valueSpan = popupDiv.querySelector<HTMLSpanElement>("#value")!;
    const pokeButton = popupDiv.querySelector<HTMLButtonElement>("#poke")!;

    // when button clicked, either:
    //  - remove cache when picked up and inventory empty
    //  - tell user cache does not match value
    //  - double the placed caches value and remove cache from inventory
    pokeButton.addEventListener("click", () => {
      if (playerPoints === 0) {
        playerPoints = pointValue!;
        statusPanelDiv.innerHTML = `
          You have picked up a <b>${playerPoints}</b>-point cache.<br>
          Place it at a cache with the same value!
        `;
        popupDiv.remove();
        rect.remove();
      } else if (playerPoints !== pointValue) {
        statusPanelDiv.innerHTML = `
          You cannot merge the cache at <i>(${i},${j})</i> because that has a value of ${pointValue}!<br>
          Currently, you are holding a <b>${playerPoints}</b>-point cache, please place this at a cache with the same value.
        `;
      } else {
        cacheValues.set(`${i},${j}`, pointValue * 2);
        playerPoints = 0;
        valueSpan.innerHTML = cacheValues.get(`${i},${j}`)!.toString();
        console.log(cacheValues.get(`${i},${j}`));
        statusPanelDiv.innerHTML = `
          Cache merged!<br>
          The current cache at <i>(${i},${j})</i> is now worth <b>${valueSpan.innerHTML}</b> points.
        `;
        rect.closePopup().openPopup(); // refresh display
      }
    });

    return popupDiv;
  });
}

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

// ============================================= //
// ===               VARIABLES               === //
// ============================================= //

const CLASSROOM_LOCATION = {
  latitude: 36.997936938057016,
  longitude: -122.05703507501151,
};

// default location if cannot retrieve player's current location
let playerLocation: { latitude: number; longitude: number } =
  CLASSROOM_LOCATION;

// save cache location points
const cacheValues = new Map<string, number>();

// gameplay parameters
const GAMEPLAY_ZOOM_LEVEL = 19;
const TILE_DEGREES = 1e-4;
const NEIGHBORHOOD_SIZE = 8;
const CACHE_SPAWN_PROBABILITY = 0.1;

let playerPoints = 0;

// ============================================= //
// ===            GAME GENERATION            === //
// ============================================= //

const map = leaflet.map(mapDiv, { // element with id "map" is defined in index.html
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

// populate the map with a background tile layer
leaflet
  .tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution:
      '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  })
  .addTo(map);

getPlayerLocation()
  .then((coords) => {
    playerLocation = { latitude: coords.latitude, longitude: coords.longitude };
    map.setView([coords.latitude, coords.longitude], 15);
  })
  .catch((error) => {
    alert("[ERROR] " + error.message);
  })
  .finally(() => {
    markLocation(playerLocation!);

    for (let i = -NEIGHBORHOOD_SIZE; i < NEIGHBORHOOD_SIZE; i++) {
      for (let j = -NEIGHBORHOOD_SIZE; j < NEIGHBORHOOD_SIZE; j++) {
        if (luck([i, j].toString()) < CACHE_SPAWN_PROBABILITY) {
          spawnCache(i, j); // spawn cache at (i,j) if lucky enough
        }
      }
    }
  });
