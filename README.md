# Middle Management

A daily word game about finding the valuable letter in the middle. Complete ten word challenges, build a score from the day’s letter key, and compare your result on the leaderboard.

## Game modes

- **Daily game** — Play ten challenges. Each word has a one-minute timer, and the game waits for you before moving to the next challenge.
- **Multiplayer** — Play five rounds in Solo, Offline, or Online mode. Multiplayer uses the day’s letter key and has no timer.
- **Friend leagues** — The button is present as a coming-soon feature.

## Scoring

For an odd-length word, the middle letter’s value is the score. For an even-length word, the score is the average of the two middle letters. The controller lets the game owner set the 26 letter values and ten daily challenges for each date in India Standard Time.

Words are checked against the game’s bundled word list and a free online dictionary lookup. Category challenges use the categories and accepted answers bundled with the game.

## Run locally

Requirements: Node.js 20 or newer.

```sh
node server.js
```

Then open:

- Game: <http://127.0.0.1:8766/>
- Controller: <http://127.0.0.1:8766/controller>

The server uses Node.js built-in modules and does not require `npm install`.

## Controller password

For local development, the server creates a random password and stores it in `.mm_admin_password` the first time it starts. Keep this file private and do not commit it.

For a hosted server, set the `MM_ADMIN_PASSWORD` environment variable to a strong private password. The controller is available at `/controller` on the same host as the game.

## Hosting

This project includes a Node.js backend. GitHub can store the source code, but GitHub Pages only serves static files and cannot run `server.js`. To use the controller, shared leaderboard, or online multiplayer, deploy the app as a Node.js web service. Configure the host to bind `HOST=0.0.0.0`; the service should provide `PORT`.

The app stores daily settings in `daily-config.json` and player/leaderboard data in `social-data.json`. These files are intentionally excluded from Git. A host needs persistent storage for them if you want settings and scores to survive restarts and redeploys. Online multiplayer rooms are held in memory and end when the server restarts.

## Project files

- `index.html` — Public game interface and client-side game logic.
- `controller.html` — Password-protected daily challenge and letter-key editor.
- `server.js` — Web server, controller API, dictionary validation, leaderboard, and online multiplayer API.
- `.gitignore` — Excludes local passwords and runtime data from Git.

## Prototype status

Middle Management is a prototype. The friend league feature is not active yet. Before a broad public launch, configure persistent data storage and review the controller’s security and public leaderboard protections.
