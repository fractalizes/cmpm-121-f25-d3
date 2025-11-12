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
// ===      CLASSES / TYPE / INTERFACES      === //
// ============================================= //

class Player {
  private location: { latitude: number; longitude: number };
  constructor(
    private inv: number,
    private highest: number,
  ) {
    // default location if cannot retrieve player's current location
    this.location = CLASSROOM_LOCATION;
  }

  markLocation() {
    leaflet.marker([this.location.latitude, this.location.longitude])
      .addTo(map)
      .bindPopup("This is you!")
      .openPopup();
    leaflet.circle([this.location.latitude, this.location.longitude], {
      radius: 13,
    })
      .addTo(map)
      .openPopup();
  }

  retrieveGeo(): Promise<GeolocationCoordinates> {
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

  getLocation() {
    return this.location;
  }

  setLocation(coords: { latitude: number; longitude: number }) {
    this.location = coords;
  }

  getInv() {
    return this.inv;
  }

  setInv(points: number) {
    this.inv = points;
  }

  getHighest() {
    return this.highest;
  }

  setHighest(points: number) {
    this.highest = points;
  }
}

// ============================================= //
// ===               FUNCTIONS               === //
// ============================================= //

// add caches to the map by cell numbers
function spawnCache(i: number, j: number) {
  // convert cell numbers into lat/lng bounds
  const origin = player.getLocation();
  const bounds = leaflet.latLngBounds([
    [origin.latitude + i * TILE_DEGREES, origin.longitude + j * TILE_DEGREES],
    [
      origin.latitude + (i + 1) * TILE_DEGREES,
      origin.longitude + (j + 1) * TILE_DEGREES,
    ],
  ]);

  // add a rectangle to the map to represent the cache
  const rect = leaflet.rectangle(bounds, { color: "#00A354" });
  rect.addTo(map);

  if (!cacheValues.has(`${i},${j}`)) {
    cacheValues.set(
      `${i},${j}`,
      luck([i, j].toString()) >= 0.5 ? 1 : 0,
    );
  }

  const radius = 3;
  if (i <= radius && i >= -radius && j <= radius && j >= -radius) { // if user is within range
    rect.on("click", () => {
      pickUpToken(i, j);
    });
  } else {
    rect.bindPopup(outOfRange);
  }
}

function pickUpToken(i: number, j: number) {
  const pointValue = cacheValues.get(`${i},${j}`)!;

  if (player.getInv() === 0) {
    player.setInv(pointValue);
    cacheValues.set(`${i},${j}`, 0);
    statusPanelDiv.innerHTML = `
      You have picked up a <b>${player.getInv()}</b>-point cache.<br>
      Place it at a cache with the same value!
    `;
  } else {
    if (pointValue === 0) {
      statusPanelDiv.innerHTML = `
        Tokens merged!<br>
        The current token at <i>(${i},${j})</i> is now worth <b>${
        cacheValues.get(`${i},${j}`)
      } </b> points.
      `;
    } else if (player.getInv() !== pointValue) {
      statusPanelDiv.innerHTML = `
        You cannot merge the token at <i>(${i},${j})</i> because that has a value of ${pointValue}!<br>
        Currently, you are holding a <b>${player.getInv()}</b>-point token, please place this at a token with the same value.
      `;
    } else {
      cacheValues.set(`${i},${j}`, pointValue * 2);
      const newValue = cacheValues.get(`${i},${j}`)!;
      if (newValue > player.getHighest()) {
        player.setHighest(newValue);
      }
      player.setInv(0);
      statusPanelDiv.innerHTML = `
        Cache merged!<br>
        The current token at <i>(${i},${j})</i> is now worth <b>${newValue} </b> points.
      `;
    }
  }
}

function outOfRange() {
  const popupDiv = document.createElement("div");
  popupDiv.innerHTML = `
    <div>This cell is too far away! Move closer to it to interact with it!<br>
    <button id="confirm">ok</button>
  `;
  const confirmButton = popupDiv.querySelector(
    "#confirm",
  )! as HTMLButtonElement;
  confirmButton.addEventListener("click", () => {
    popupDiv.remove();
  });
  return popupDiv;
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

const player: Player = new Player(0, 0);

// save cache location points
const cacheValues = new Map<string, number>();

// gameplay parameters
const GAMEPLAY_ZOOM_LEVEL = 19;
const TILE_DEGREES = 1e-4;
const NEIGHBORHOOD_SIZE = 8;

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

player.retrieveGeo()
  .then((coords) => {
    player.setLocation({
      latitude: coords.latitude,
      longitude: coords.longitude,
    });
    map.setView([coords.latitude, coords.longitude], 15);
  })
  .catch((error) => {
    alert("[ERROR] " + error.message);
  })
  .finally(() => {
    player.markLocation();
  });

for (let i = -NEIGHBORHOOD_SIZE; i < NEIGHBORHOOD_SIZE; i++) {
  for (let j = -NEIGHBORHOOD_SIZE * 4; j < NEIGHBORHOOD_SIZE * 4; j++) {
    spawnCache(i + 0.5, j + 0.5);
  }
}
