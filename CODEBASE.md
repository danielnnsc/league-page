# League Page Codebase Overview

This document provides context for developers working on the Fantasy Football League Page application.

## Tech Stack

- **Framework**: SvelteKit (Svelte 3)
- **Build Tool**: Vite
- **UI Components**: Svelte Material UI (SMUI) v6.0.0-beta.13
- **Deployment**: Vercel
- **Data Source**: Sleeper API

## Project Structure

```
src/
├── lib/
│   ├── Records/                 # Records page components
│   │   ├── index.svelte         # Main container, handles tab switching
│   │   ├── AllTimeRecords.svelte    # All-time records display
│   │   ├── PerSeasonRecords.svelte  # Per-season records display
│   │   ├── RecordsAndRankings.svelte # Tables and bar graphs
│   │   └── RecordTeam.svelte    # Team info display helper
│   ├── BarChart.svelte          # Bar chart component
│   ├── Bar.svelte               # Individual bar component
│   ├── stores.js                # Svelte stores
│   └── utils/
│       ├── helper.js            # Re-exports helper functions
│       ├── leagueInfo.js        # League configuration
│       ├── dataClasses.js       # Data class exports
│       ├── Classes/
│       │   └── records.js       # Records class definition
│       └── helperFunctions/
│           ├── leagueRecords.js     # Fetches/processes league records
│           ├── universalFunctions.js # Utility functions (generateGraph, etc.)
│           ├── leagueData.js        # League data fetching
│           ├── leagueBrackets.js    # Playoff bracket handling
│           └── ...
├── routes/
│   └── records/
│       ├── +page.svelte         # Records route page
│       └── +page.js             # Records page data loader
└── theme/                       # SMUI theme configuration
```

## Key Data Flow

### Records Page

1. **Data Loading** (`+page.js`):
   - Calls `getLeagueRecords()` to fetch all historical data
   - Data is cached in localStorage and Svelte stores

2. **Data Structure** (`leagueRecords.js`):
   - Returns `{ regularSeasonData, playoffData }`
   - Each contains: `leagueManagerRecords`, `leagueRosterRecords`, `leagueWeekHighs`, `leagueWeekLows`, `allTimeBiggestBlowouts`, `allTimeClosestMatchups`, etc.

3. **Component Hierarchy**:
   ```
   Records/index.svelte
   ├── Handles "Regular Season" / "Playoffs" tab switching
   ├── Handles "All-Time Records" / "Season Records" switching
   └── Passes data to:
       ├── AllTimeRecords.svelte
       │   └── RecordsAndRankings.svelte
       │       ├── DataTable (records tables)
       │       └── BarChart.svelte
       └── PerSeasonRecords.svelte
   ```

### Manager Records vs Roster Records

- **Manager Records** (`leagueManagerRecords`): Keyed by `managerID` (Sleeper user ID), aggregates all-time stats across seasons
- **Roster Records** (`leagueRosterRecords`): Keyed by `rosterID`, tracks per-season stats

## Important Classes

### Records Class (`src/lib/utils/Classes/records.js`)

Stores and processes league records:

```javascript
class Records {
    leagueManagerRecords = {}  // All-time manager stats
    leagueRosterRecords = {}   // Per-season roster stats
    seasonWeekRecords = []     // Weekly records per season
    leagueWeekRecords = []     // All-time weekly records
    // ... more fields
}
```

Key methods:
- `updateManagerRecord(managers, recordsData)` - Adds wins/losses/points to manager totals
- `addLeagueWeekRecord(entry)` - Adds weekly scoring entry
- `finalizeAllTimeRecords()` - Sorts and computes final rankings
- `returnRecords()` - Returns processed data for display

## Svelte Reactivity Patterns

### Important: Reactive Statement Dependencies

Svelte only tracks variables **directly referenced** in reactive statements, not those accessed inside called functions.

**Problem Pattern:**
```javascript
$: result = someFunction(depA)  // Only tracks depA

function someFunction(a) {
    return a + depB + depC;  // depB, depC changes won't trigger reactivity!
}
```

**Solution:**
```javascript
$: result = someFunction(depA, depB, depC)  // Explicitly list all dependencies

function someFunction(a, _b, _c) {
    return a + depB + depC;  // Now changes to depB, depC trigger updates
}
```

### Each Block Keys

When switching between data sources (e.g., regular season vs playoffs), add keys to `{#each}` blocks to force proper DOM updates:

```svelte
{#each items as item, ix (item.id + contextKey)}
    <!-- content -->
{/each}
```

## Sleeper API Integration

### Key Endpoints Used

- `https://api.sleeper.app/v1/league/{leagueId}` - League info
- `https://api.sleeper.app/v1/league/{leagueId}/rosters` - Roster data
- `https://api.sleeper.app/v1/league/{leagueId}/matchups/{week}` - Weekly matchups
- `https://api.sleeper.app/v1/state/nfl` - Current NFL state

### Data Processing

1. **Regular Season**: Processed in `processRegularSeason()` - uses roster settings for wins/losses
2. **Playoffs**: Processed in `processPlayoffs()` - calculates wins/losses from bracket matchups
3. **Consolation Games**: Tracked separately, not counted in playoff records (3rd/5th place games excluded)

## Local Storage Caching

Records are cached in localStorage under the key `"records"`:
- On page load, cached data is returned with `stale: true`
- A background refresh fetches fresh data
- This provides fast initial loads while keeping data current

## Common Bug Areas

1. **Reactivity Issues**: Components not updating when switching tabs - ensure all dependencies are tracked
2. **Playoff Data Processing**: `processPlayoffs()` handles bracket data differently than regular season
3. **Manager ID vs Roster ID**: Some components expect one or the other - check which is being passed
4. **Console.log in Templates**: `{console.log(...)}` renders `undefined` to the DOM - use `{@debug}` instead

## Development Commands

```bash
npm install          # Install dependencies
npm run dev          # Start dev server (localhost:5173)
npm run build        # Production build
npm run preview      # Preview production build
```

## Deployment

The app is deployed on Vercel. Push to master to trigger automatic deployment.

Live URL: https://league-page-seven-orcin.vercel.app/
