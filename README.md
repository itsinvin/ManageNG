# ManageNG

A sleek, feature-rich mod manager for **BeamNG.drive** built with Rust (Tauri) and React.

ManageNG feels like a natural extension of the game — dark UI, signature orange accents, and tools that actually make mod management easier.

![ManageNG](https://img.shields.io/badge/BeamNG-Mod%20Manager-ff6600?style=for-the-badge)

## Features

### Dashboard
- Overview of installed mods, active/inactive counts, and storage usage
- Storage breakdown by category (mods, cache, temp)
- Game version detection and user folder path display

### Smart Mod Management
- **Auto-detects** BeamNG user folders (Windows, Linux, macOS) including 0.37+ `current` layout
- Toggle mods on/off via `db.json` — no file deletion required
- Search bar with filters for broken, outdated, and update-available mods
- Enable/disable all mods in one click

### Profile System
- Save and switch between mod setups (Vanilla, Rock Crawling, Multiplayer, custom)
- Apply a profile to instantly enable the right mods
- Save current active mods into any profile

### Built-in Repository Browser
- Browse and download mods from [beamng.com/resources](https://www.beamng.com/resources/)
- Search, paginate, and install directly into your mods folder

### Performance Tools
- **Deep Clean** — clear cache, temp, shader, and backup folders
- **Conflict Detection** — scan active mods for overlapping game files with severity ratings
- **Update Checker** — surface mods with available updates

## Prerequisites

- [Rust](https://rustup.rs/) (1.77+)
- [Node.js](https://nodejs.org/) (18+)
- Platform-specific [Tauri prerequisites](https://tauri.app/start/prerequisites/)

### Linux
```bash
sudo apt update
sudo apt install libwebkit2gtk-4.1-dev librsvg2-dev patchelf
```

### Windows
- Microsoft C++ Build Tools
- WebView2 (included on Windows 10/11)

## Getting Started

```bash
# Install frontend dependencies
npm install

# Run in development mode
npm run tauri dev

# Build for production
npm run tauri build
```

## Project Structure

```
├── src/                    # React frontend (TypeScript)
│   ├── components/         # UI components per feature tab
│   ├── styles/             # BeamNG-inspired theme
│   └── api.ts              # Tauri IPC bindings
└── src-tauri/              # Rust backend
    └── src/
        ├── beamng/         # Core mod management logic
        │   ├── paths.rs    # User folder auto-detection
        │   ├── mods.rs     # Mod scanning & toggling
        │   ├── conflicts.rs
        │   ├── cleanup.rs
        │   └── repository.rs
        ├── profiles.rs     # Profile system
        └── commands.rs     # Tauri command handlers
```

## How It Works

ManageNG follows BeamNG's official [version information](https://documentation.beamng.com/support/version/) guidelines for locating the user folder. Mod enable/disable state is managed through the game's `mods/db.json` file — the same mechanism the in-game Mod Manager uses. Restart BeamNG after making changes for them to take effect.

## License

MIT
