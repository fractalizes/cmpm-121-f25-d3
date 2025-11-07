# D3: Stacks!

# Game Design Vision

This is a game where you walk around your area and collect stacks. Combine stacks with the same number to double it and so on. It is sort of like 2048, but you play it in the real world with your cell phone. Knock yourself out!

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
