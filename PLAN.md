# D3: Stacks!

# Game Design Vision

This is a game where you walk around your area and collect stacks. Combine stacks with the same color to double it and so on. It is sort of like 2048, but you play it in the real world with your cell phone. Alternatively, you can try it on your computer with directional inputs. Knock yourself out!

# Technologies

- Languages: TypeScript, HTML, CSS
- Deployment Automation: GitHub Actions, GitHub Pages
- Built using Deno and Vite

# Assignments

## D3.a: Core Mechanics (token collection and crafting)

- Player can see cells on the map in their generated area
- Player can pick up at most one token from a cell, and picking it up removes it from the cell
- If the player is holding a token...
  - they can see the value of their token
  - they can place it onto a cell containing the same token value to create a new token that is double its original value

### Steps

- [x] copy `main.ts` to `reference.ts` for future reference
- [x] delete everything in `main.ts`
- [x] put a basic leaflet map on the screen
- [x] draw the player's location on the map
- [x] draw a rectangle representing one cell on the map
- [x] use loops to draw a whole grid of cells on the map
- [x] remove the cell player picks up a token from that cell
- [x] display value of token player is currently holding
- [x] detect when the player has a token of equal value of a cell
- [x] double the value of token in cell when token of equal value is placed on that cell
- [x] can only interact with nearby cells (~three cells away)

## D3.b: Core Mechanics (movement and progression)

- Player can move themselves around the map and see cells wherever they choose to go
- Player can only interact with cells near their current location
- Cells should not remember their state once loaded off the screen
- Crafting now increases the token's values
- Win condition should be present once player reaches certain crafting threshold

## Steps

- [x] general housekeeping/cleaning for `main.ts` from last assignment
- [x] make cells only generate token value of either 0 or 1
- [x] draw a circle around player to show what cells they can interact with
- [x] if a cell has value, draw the value of its token on the rectangle
- [x] player can drop a token in their inventory on a cell that has no value
- [x] create new interface/type for modeling grid cells
- [x] create function that maps latitude-longitude to cell id
- [x] create function that takes cell id and returns as latitude-longitude
- [ ] create buttons for player movement (up, down, left, right)
- [ ] player should now be able to move across map using movement buttons
- [ ] regenerate cells when map fires moveend event
- [ ] cells are now drawn across the entirety of map
- [ ] create win event when player reaches win condition threshold
