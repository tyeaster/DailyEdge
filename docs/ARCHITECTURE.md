# DailyEdge Architecture

DailyEdge uses a feature-first frontend architecture with typed models, service boundaries, and replaceable providers. The goal is for the product experience to stay stable while data sources evolve from mock data to live APIs.

## UI Layer

The UI layer renders the Daily Slate dashboard and receives typed view models. Components should focus on display, interaction, responsive layout, and reusable presentation patterns.

React components should not call APIs directly because direct calls create vendor coupling, duplicate loading and error behavior, make replay testing harder, and force UI changes whenever data providers change.

## Service Layer

The service layer is the application boundary for data access. It decides which provider to use, applies caching or fallback behavior, and returns normalized data to features.

Current examples include:

- `getDailySlate()` for the homepage view model.
- `OddsService` for odds provider selection, odds retrieval, replay support, and cache usage.

Services should be the only place where provider selection happens.

## Provider Layer

Providers are interchangeable data source implementations. They translate external or mock data into DailyEdge domain models.

Provider responsibilities:

- Fetch or load source data.
- Normalize source-specific fields into shared models.
- Hide vendor-specific details from services and UI components.
- Fail clearly so services can decide how to fall back.

## Mock Provider

The mock provider serves realistic local MLB data. It supports product development, local testing, and UI iteration when live integrations are unavailable or intentionally disabled.

Mock data should remain structurally close to live data so replacing sources does not require component changes.

## Live MLB Provider

The live MLB provider retrieves today's schedule data and normalizes games, teams, venues, statuses, times, and probable pitchers into shared MLB models.

The homepage continues to consume the daily slate service rather than importing this provider directly.

## Future Providers

Future odds, weather, and injury providers should live behind provider interfaces and service-layer selection.

Expected provider families:

- Odds providers: OddsPipe, The Odds API, SportsDataIO, Pinnacle, FanDuel, DraftKings.
- Weather providers: stadium-level forecast and alert sources.
- Injury providers: official MLB injury feeds, news providers, or paid sports data vendors.

## Data Flow

```text
React component
  -> feature service
  -> domain service
  -> provider interface
  -> mock, replay, or live provider
  -> normalized model
  -> view model
  -> React component
```

This keeps DailyEdge fast to iterate on while preserving a clean path to production data.
