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
  private origin: { latitude: number; longitude: number };
  private marker: leaflet.Marker;
  private circle: leaflet.Circle;

  constructor(
    private inv: number,
    private highest: number,
  ) {
    // default location if cannot retrieve player's current location
    this.location = CLASSROOM_LOCATION;
    this.origin = this.location;
    this.marker = leaflet.marker([
      this.location.latitude,
      this.location.longitude,
    ]);
    this.circle = leaflet.circle([
      this.location.latitude,
      this.location.longitude,
    ], {
      radius: 23,
    });
  }

  markLocation() {
    this.marker
      .addTo(map)
      .bindPopup("This is you!")
      .openPopup();
    this.circle
      .addTo(map)
      .openPopup();
  }

  updateLocation() {
    this.marker.setLatLng([
      this.location.latitude,
      this.location.longitude,
    ]);
    this.circle.setLatLng([
      this.location.latitude,
      this.location.longitude,
    ]);

    map.panTo(this.marker.getLatLng());
  }

  move(playerDirection: Direction) {
    this.location = {
      latitude: this.location.latitude + (
        playerDirection == "up"
          ? TILE_DEGREES
          : playerDirection == "down"
          ? -TILE_DEGREES
          : 0
      ),
      longitude: this.location.longitude + (
        playerDirection == "left"
          ? -TILE_DEGREES
          : playerDirection == "right"
          ? TILE_DEGREES
          : 0
      ),
    };
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

  getLayers() {
    return { marker: this.marker, circle: this.circle };
  }

  getLocation() {
    return this.location;
  }

  setLocation(coords: { latitude: number; longitude: number }) {
    this.location = coords;
  }

  getOrigin() {
    return this.origin;
  }

  setOrigin(coords: { latitude: number; longitude: number }) {
    this.origin = coords;
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

type Direction = "up" | "down" | "left" | "right";
type LatLong = { latitude: number; longitude: number };
type CellId = { i: number; j: number };

interface MoveButton {
  button: HTMLButtonElement;
  direction: Direction;
}

// ============================================= //
// ===               FUNCTIONS               === //
// ============================================= //

function notify(name: string) {
  bus.dispatchEvent(new Event(name));
}

function latlongToIJ(coords: LatLong) {
  return {
    i: Math.floor(
      (coords.latitude - player.getOrigin().latitude) / TILE_DEGREES,
    ),
    j: Math.floor(
      (coords.longitude - player.getOrigin().longitude) / TILE_DEGREES,
    ),
  };
}

function ijToLatLong(gridCell: CellId) {
  return {
    latitude: player.getOrigin().latitude + gridCell.i * TILE_DEGREES,
    longitude: player.getOrigin().longitude + gridCell.j * TILE_DEGREES,
  };
}

function generateWorld() {
  for (let i = -NEIGHBORHOOD_SIZE; i < NEIGHBORHOOD_SIZE; i++) {
    for (let j = -NEIGHBORHOOD_SIZE; j < NEIGHBORHOOD_SIZE; j++) {
      createGrid({ i: i + 0.5, j: j + 0.5 });
      spawnToken({ i: i + 0.5, j: j + 0.5 });
    }
  }
}

function createTokenMarker(points: number) {
  return leaflet.divIcon({
    className: "",
    html: `
      <div style="font-size:20px"> ${tokenIcons[points - 1]} </div>
    `,
  });
}

function createGrid(cell: CellId) {
  // convert cell numbers into lat/lng bounds
  const { latitude, longitude }: LatLong = ijToLatLong(cell);
  const bounds = leaflet.latLngBounds([
    [latitude, longitude],
    [latitude + TILE_DEGREES, longitude + TILE_DEGREES],
  ]);
  const rect = leaflet.rectangle(bounds, {
    color: "#00A354",
  });
  rect.addTo(map);

  // if user is within range
  const playerCell = latlongToIJ(player.getLocation());
  const dx = cell.i - playerCell.i;
  const dy = cell.j - playerCell.j;
  const distance = Math.abs(dx) + Math.abs(dy); // manhattan distance
  if (distance <= 3) {
    rect.addEventListener("click", () => {
      interactToken({ i: cell.i, j: cell.j });
    });
  } else {
    rect.bindPopup(outOfRange);
  }
}

function updateGrid() {
  map.eachLayer((layer) => {
    if (
      !(layer === player.getLayers().marker) &&
      !(layer === player.getLayers().circle) &&
      (layer instanceof leaflet.Rectangle ||
        layer instanceof leaflet.Marker)
    ) {
      map.removeLayer(layer);
    }
  });

  // recreate grid and tokens
  generateWorld();
}

// add tokens to the map by cell numbers
function spawnToken(cell: CellId) {
  const { latitude, longitude }: LatLong = ijToLatLong(cell);

  const key = `${cell.i},${cell.j}`;
  if (!tokenValues.has(key)) {
    // Initialize only if not already set
    tokenValues.set(key, luck(key) <= CACHE_SPAWN_PROBABILITY ? 1 : 0);
  }
  const value = tokenValues.get(key)!;
  if (value > 0) {
    const tokenMarker = leaflet.marker([
      latitude + 0.75 * TILE_DEGREES,
      longitude + 0.25 * TILE_DEGREES,
    ]);
    tokenMarker
      .addTo(map)
      .setIcon(createTokenMarker(value));
    tokens.push(tokenMarker);

    // if user is within range
    const playerCell = latlongToIJ(player.getLocation());
    const dx = cell.i - playerCell.i;
    const dy = cell.j - playerCell.j;
    const distance = Math.abs(dx) + Math.abs(dy); // manhattan distance
    if (distance <= 3) {
      tokenMarker.addEventListener("click", () => {
        interactToken({ i: cell.i, j: cell.j });
      });
    } else {
      tokenMarker.bindPopup(outOfRange);
    }
  }
}

function updateTokens() {
  for (const marker of tokens) {
    map.removeLayer(marker);
  }
  tokens.splice(0, tokens.length);
  for (let i = -NEIGHBORHOOD_SIZE; i < NEIGHBORHOOD_SIZE; i++) {
    for (let j = -NEIGHBORHOOD_SIZE; j < NEIGHBORHOOD_SIZE; j++) {
      spawnToken({ i: i + 0.5, j: j + 0.5 });
    }
  }
}

function interactToken(gridCell: CellId) {
  const pointValue = tokenValues.get(`${gridCell.i},${gridCell.j}`)!;

  if (player.getInv() === 0 && pointValue > 0) {
    player.setInv(pointValue);
    tokenValues.set(`${gridCell.i},${gridCell.j}`, 0);
    statusPanelDiv.innerHTML = `
      You have picked up a ${tokenIcons[pointValue - 1]} token.<br>
      Place it at a token with the same value!
    `;
  } else if (player.getInv() > 0) {
    if (pointValue === 0) {
      tokenValues.set(`${gridCell.i},${gridCell.j}`, player.getInv());
      statusPanelDiv.innerHTML = `
        You have dropped the ${tokenIcons[player.getInv() - 1]} token.
      `;
      player.setInv(0);
    } else if (player.getInv() !== pointValue) {
      statusPanelDiv.innerHTML = `
        You cannot merge these two tokens because that token has a value of ${
        tokenIcons[pointValue - 1]
      }!<br>
        Currently, you are holding a ${
        tokenIcons[player.getInv() - 1]
      } token, please place this at a token with the same value.
      `;
    } else {
      tokenValues.set(`${gridCell.i},${gridCell.j}`, pointValue + 1);
      const newValue = tokenValues.get(`${gridCell.i},${gridCell.j}`)!;
      if (newValue > player.getHighest()) {
        player.setHighest(newValue);
      }
      player.setInv(0);
      statusPanelDiv.innerHTML = `
        Token merged! This token is now worth ${tokenIcons[pointValue]} points.
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

const upButton: MoveButton = {
  button: document.createElement("button"),
  direction: "up",
};
upButton.button.innerHTML = "↑";

const downButton: MoveButton = {
  button: document.createElement("button"),
  direction: "down",
};
downButton.button.innerHTML = "↓";

const leftButton: MoveButton = {
  button: document.createElement("button"),
  direction: "left",
};
leftButton.button.innerHTML = "←";

const rightButton: MoveButton = {
  button: document.createElement("button"),
  direction: "right",
};
rightButton.button.innerHTML = "→";

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

const moveButtons = [upButton, downButton, leftButton, rightButton];

const bus = new EventTarget();
bus.addEventListener("token-changed", updateTokens);
bus.addEventListener("location-changed", () => {
  player.updateLocation();
  updateGrid();
});

// gameplay parameters
const GAMEPLAY_ZOOM_LEVEL = 19;
const TILE_DEGREES = 1e-4;
const NEIGHBORHOOD_SIZE = 32;
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
    const latLong: LatLong = {
      latitude: coords.latitude,
      longitude: coords.longitude,
    };
    player.setLocation(latLong);
    player.setOrigin(latLong);
    map.setView([coords.latitude, coords.longitude], 15);
  })
  .catch((error) => {
    alert("[ERROR] " + error.message);
  })
  .finally(() => {
    player.markLocation();
    generateWorld();
  });

moveButtons.forEach((moveButton) => {
  moveButton.button.id = `${moveButton.direction}Button`;
  document.body.append(moveButton.button);
  moveButton.button.addEventListener("click", () => {
    player.move(moveButton.direction);
    notify("location-changed");
  });
});
