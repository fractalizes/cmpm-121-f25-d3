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
      radius: 23,
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

type latLong = { latitude: number; longitude: number };
type cellId = { i: number; j: number };

// ============================================= //
// ===               FUNCTIONS               === //
// ============================================= //

function notify(name: string) {
  bus.dispatchEvent(new Event(name));
}

function latlongToIJ(coords: latLong) {
  return {
    i: player.getLocation().latitude / (coords.latitude * TILE_DEGREES),
    j: coords.longitude / (player.getLocation().longitude * TILE_DEGREES),
  };
}

function ijToLatLong(gridCell: cellId) {
  return {
    latitude: player.getLocation().latitude - gridCell.j * TILE_DEGREES,
    longitude: player.getLocation().longitude + gridCell.i * TILE_DEGREES,
  };
}

function createTokenMarker(points: number) {
  return leaflet.divIcon({
    className: "",
    html: `
      <div style="font-size:20px"> ${tokenIcons[points - 1]} </div>
    `,
  });
}

function createGrid(cell: cellId) {
  // convert cell numbers into lat/lng bounds
  const origin = player.getLocation();
  const bounds = leaflet.latLngBounds([
    [
      origin.latitude + cell.i * TILE_DEGREES,
      origin.longitude + cell.j * TILE_DEGREES,
    ],
    [
      origin.latitude + (cell.i + 1) * TILE_DEGREES,
      origin.longitude + (cell.j + 1) * TILE_DEGREES,
    ],
  ]);
  const rect = leaflet.rectangle(bounds, {
    color: "#00A354",
  });
  rect.addTo(map);

  // if user is within range
  const radius = 3;
  if (
    cell.i <= radius && cell.i >= -radius &&
    cell.j <= radius && cell.j >= -radius
  ) {
    rect.addEventListener("click", () => {
      interactToken({ i: cell.i, j: cell.j });
    });
  } else {
    rect.bindPopup(outOfRange);
  }
}

function updateTokens() {
  for (const marker of tokens) {
    map.removeLayer(marker);
  }
  tokens.splice(0, tokens.length);
  for (let i = -NEIGHBORHOOD_SIZE; i < NEIGHBORHOOD_SIZE; i++) {
    for (let j = -NEIGHBORHOOD_SIZE * 4; j < NEIGHBORHOOD_SIZE * 4; j++) {
      spawnToken({ i: i + 0.5, j: j + 0.5 });
    }
  }
}

// add tokens to the map by cell numbers
function spawnToken(cell: cellId) {
  // convert cell numbers into lat/lng bounds
  const origin = player.getLocation();

  const key = `${cell.i},${cell.j}`;
  if (!tokenValues.has(key)) {
    // Initialize only if not already set
    tokenValues.set(key, luck(key) <= CACHE_SPAWN_PROBABILITY ? 1 : 0);
  }
  const value = tokenValues.get(key)!;
  if (value > 0) {
    const tokenMarker = leaflet.marker([
      origin.latitude + (cell.i + 0.75) * TILE_DEGREES,
      origin.longitude + (cell.j + 0.25) * TILE_DEGREES,
    ]);
    tokenMarker
      .addTo(map)
      .setIcon(createTokenMarker(value));
    tokens.push(tokenMarker);

    // if user is within range
    const radius = 3;
    if (
      cell.i <= radius && cell.i >= -radius &&
      cell.j <= radius && cell.j >= -radius
    ) {
      tokenMarker.addEventListener("click", () => {
        interactToken({ i: cell.i, j: cell.j });
      });
    } else {
      tokenMarker.bindPopup(outOfRange);
    }
  }
}

function interactToken(gridCell: cellId) {
  const pointValue = tokenValues.get(`${gridCell.i},${gridCell.j}`)!;

  if (player.getInv() === 0 && pointValue > 0) {
    player.setInv(pointValue);
    tokenValues.set(`${gridCell.i},${gridCell.j}`, 0);
    statusPanelDiv.innerHTML = `
      You have picked up a <b>${player.getInv()}</b>-point token.<br>
      Place it at a token with the same value!
    `;
  } else if (player.getInv() > 0) {
    if (pointValue === 0) {
      tokenValues.set(`${gridCell.i},${gridCell.j}`, player.getInv());
      statusPanelDiv.innerHTML = `
        You have placed the ${player.getInv()}-point token at <i>(${gridCell.i},${gridCell.j})</i>
      `;
      player.setInv(0);
    } else if (player.getInv() !== pointValue) {
      statusPanelDiv.innerHTML = `
        You cannot merge the token at <i>(${gridCell.i},${gridCell.j})</i> because that has a value of ${pointValue}!<br>
        Currently, you are holding a <b>${player.getInv()}</b>-point token, please place this at a token with the same value.
      `;
    } else {
      tokenValues.set(`${gridCell.i},${gridCell.j}`, pointValue * 2);
      const newValue = tokenValues.get(`${gridCell.i},${gridCell.j}`)!;
      if (newValue > player.getHighest()) {
        player.setHighest(newValue);
      }
      player.setInv(0);
      statusPanelDiv.innerHTML = `
        Token merged!<br>
        The current token at <i>(${gridCell.i},${gridCell.j})</i> is now worth <b>${newValue} </b> points.
      `;
    }
  } else {
    statusPanelDiv.innerHTML = `
      Please pick up a valid token!
    `;
  }
  notify("token-changed");
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
const tokenIcons = ["🔴", "🟠", "🟡", "🟢", "🔵", "🟣"];

// save token location points
const tokenValues = new Map<string, number>();
const tokens: leaflet.Marker[] = [];

const bus = new EventTarget();
bus.addEventListener("token-changed", updateTokens);

// gameplay parameters
const GAMEPLAY_ZOOM_LEVEL = 19;
const TILE_DEGREES = 1e-4;
const NEIGHBORHOOD_SIZE = 8;
const CACHE_SPAWN_PROBABILITY = 0.2;

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
    console.log(coords);
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
    for (let i = -NEIGHBORHOOD_SIZE; i < NEIGHBORHOOD_SIZE; i++) {
      for (let j = -NEIGHBORHOOD_SIZE * 4; j < NEIGHBORHOOD_SIZE * 4; j++) {
        createGrid({ i: i + 0.5, j: j + 0.5 });
        spawnToken({ i: i + 0.5, j: j + 0.5 });
      }
    }
  });
