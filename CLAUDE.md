# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a client-side HTML triathlon athlete search application that uses the World Triathlon API. The project consists of two main files:
- `tridotorg.html` - Complete web application with triathlon athlete search functionality
- `sample-tri-data.json` - Sample API response data from World Triathlon API

## Development Commands

This is a static HTML/CSS/JavaScript application with no build system. To develop and test:

```bash
# Serve the HTML file locally (using any local server)
python3 -m http.server 8000
# or
npx serve .
# or simply open tridotorg.html in a browser
```

## Architecture Overview

### Single Page Application Structure
- **Frontend**: Vanilla HTML, CSS, and JavaScript (no frameworks)
- **API Integration**: World Triathlon API (api.triathlon.org) with API key authentication
- **Styling**: CSS custom properties for light/dark theme support
- **Mapping**: Leaflet.js for interactive world map functionality

### Key Components

1. **Search System** (`tridotorg.html:480-640`)
   - Autocomplete functionality with debounced API calls
   - Keyboard navigation support (arrow keys, enter, escape)
   - Search by athlete name with real-time suggestions

2. **Rankings Display** (`tridotorg.html:642-673`)
   - Two-column layout for men's and women's rankings
   - Fetches top 10 athletes from Olympic rankings (ranking IDs: male=11, female=12)

3. **Map Integration** (`tridotorg.html:717-884`)
   - Interactive world map using Leaflet.js
   - Click countries to search athletes by nationality
   - Uses static ISO country code to triathlon.org country ID mappings

4. **Theme System** (`tridotorg.html:384-407`)
   - CSS custom properties for theming
   - Light/dark mode toggle with localStorage persistence
   - Smooth transitions between themes

### API Integration Patterns

- **Base URL**: `https://api.triathlon.org/v1/`
- **Authentication**: API key in headers (`apikey: 3030d8bd3cf886d0799605e0ef380168`)
- **Main Endpoints**:
  - `/search/athletes` - Search athletes by name or country
  - `/athletes/{id}` - Get detailed athlete information
  - `/rankings/{id}` - Get ranking data
  - `/countries` - Get country list

### Data Flow
1. Search input triggers autocomplete API calls (debounced)
2. Selected athletes fetch detailed profiles via individual API calls
3. Results rendered as cards with profile images, flags, and recent results
4. Map interactions search athletes by country using country ID mappings

## Code Organization

- **Utility Functions**: Debouncing, initials generation, theme switching
- **API Layer**: Centralized fetch functions for athlete data
- **Display Logic**: Card rendering with fallbacks for missing images/data
- **Event Handling**: Search, autocomplete, map interactions, theme toggle

## API Key and Security

The API key is embedded in the client-side code for this demo application. In production, this should be moved to a backend service to avoid exposure.