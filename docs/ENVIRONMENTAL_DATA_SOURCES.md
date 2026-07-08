# TrueLine Environmental Data Source Audit

This document records the Phase 2B source decisions for weather and ballpark
intelligence. It should be reviewed before changing providers or production
licensing.

## Weather Sources

| Source | Type | Coverage and history | Rate limits | Licensing and viability |
| --- | --- | --- | --- | --- |
| National Weather Service API | Official United States government source | Forecasts, observations, and alerts for United States locations. It does not provide one consistent global contract for Toronto. | The public limit is not published. NWS describes it as generous for typical use and returns an error when exceeded. | Open government data, free for any purpose. Strong long-term United States source, but a second provider is still required for Rogers Centre. |
| Environment and Climate Change Canada GeoMet | Official Canadian government source | Canadian observations, forecasts, climate, and geospatial products. | Product-specific; clients must follow service guidance. | Open government data with attribution requirements. Viable for Toronto, but combining two national weather schemas would add normalization and operating complexity. |
| Open-Meteo Forecast API | Free and paid global source | Global hourly forecasts with temperature, humidity, dew point, pressure, precipitation, cloud cover, visibility, wind, and gusts. Historical reanalysis is available back to 1940. | Public non-commercial service: 10,000 calls/day with no uptime guarantee. Paid customer service removes the daily limit. | Public endpoint is CC BY 4.0 and non-commercial only. Paid customer or self-hosted deployment supports commercial production. The response contract is stable across public and customer endpoints. |
| Tomorrow.io | Paid global source | Forecast, historical, timeline, precipitation, and severe-weather products. | Plan-specific. | Commercial contract and service-level options make it a viable future production provider. |
| Visual Crossing | Paid global source | Forecasts plus more than 50 years of hourly and daily historical weather. | Plan-specific. | Commercially licensed alternative with a straightforward historical contract. |
| SportsDataIO / Sportradar | Paid sports-specific source | Game-linked weather and stadium context alongside sports feeds. | Contract-specific. | Operationally convenient, but creates unnecessary coupling between sports and atmospheric data if used as the only weather source. |

### Weather Decision

Phase 2B uses Open-Meteo through a vendor-neutral `WeatherProvider`.

Reasons:

- One hourly schema covers every current MLB venue, including Toronto.
- The required atmospheric fields are available in one request.
- Game-time forecast selection is deterministic.
- Historical weather is available for future backtesting.
- The public and paid endpoints use the same response contract.
- Replay recording can preserve the raw hourly response and normalized profile.

Production must use an appropriately licensed Open-Meteo customer endpoint,
self-hosted Open-Meteo, or another commercial `WeatherProvider`. The free
public endpoint is suitable only for non-commercial development.

Recommended cache duration:

- More than 12 hours before first pitch: 30 minutes.
- Within 12 hours of first pitch: 10 minutes.
- Indoor or confirmed closed-roof game: 1 hour.
- Historical/replay payload: immutable.

Weather confidence is highest near game time and after roof status is known.
Forecast uncertainty and missing atmospheric fields reduce the normalized
confidence score. Indoor games set `weatherApplicable=false` and remain neutral
rather than treating missing outside weather as a model defect.

## Ballpark Sources

| Source | Type | Coverage and history | Rate limits | Licensing and viability |
| --- | --- | --- | --- | --- |
| MLB Stats API venue endpoint | Official MLB source | Venue name, coordinates, elevation, field azimuth, dimensions, roof type, surface, and capacity. Historical venue records can be requested by season where available. | No published public quota. Requests should be cached aggressively. | MLB content terms apply. The endpoint is already used by the application and is the strongest source for current physical venue metadata. |
| MLB Baseball Savant Statcast Park Factors | Official MLB public analytics source | Yearly and rolling park factors. The leaderboard defines 100 as league average and supports handedness and environmental views. Statcast-era history is available. | No published public API quota. The leaderboard is a public web product rather than a documented API contract. | High baseball relevance and long-term value, but the HTML-embedded data contract may change. Raw responses must be replayable and parsing must fail neutrally. |
| FanGraphs park factors | Free public analytics source | Multi-year park factors and historical tables. | No formal public API guarantee. | Useful validation source, but automated redistribution and scraping terms require review before production use. |
| SportsDataIO / Sportradar | Paid sports-specific source | Stadium metadata and selected game/environment fields. | Contract-specific. | Viable vendor implementations, especially if service guarantees are required. |
| Curated internal venue registry | Internal fallback | Stable physical metadata and last known factors. | No external limit. | Reliable fallback, but values require a documented update process and should never silently masquerade as live data. |

### Ballpark Decision

Phase 2B combines:

1. MLB Stats API venue metadata for physical park attributes.
2. MLB Baseball Savant three-year rolling park factors for baseball outcomes.

The three-year rolling view is selected because park effects are noisy in a
single partial season. The provider records raw venue and Savant responses for
replay. Missing or changed Savant markup returns neutral factors while
preserving official venue metadata.

Recommended cache duration:

- MLB venue metadata: 7 days.
- Baseball Savant rolling factors: 24 hours.
- Normalized game ballpark profile: 24 hours.
- Replay payload: immutable.

## Replay And Provider Rules

Weather and ballpark providers must:

- Implement live, replay, and mock modes.
- Return normalized domain models.
- Record raw source payloads alongside normalized output.
- Never expose vendor response shapes outside the provider layer.
- Return neutral unavailable profiles when source data is missing.
- Use the shared `CacheProvider`.
- Keep prediction calculations in deterministic rating utilities or services.
- Keep React components limited to rendering completed profiles.

## Selected Phase 2B Sequence

1. Implement weather models, ratings, providers, service, replay, and tests.
2. Integrate weather into the normalized game and Prediction Engine.
3. Implement MLB venue and Baseball Savant ballpark providers.
4. Integrate ballpark ratings through configurable model and Data Quality
   weights.
5. Expose compact weather and park summaries in existing cards.

## References

- [National Weather Service API](https://www.weather.gov/documentation/services-web-api)
- [Open-Meteo Forecast API](https://open-meteo.com/en/docs)
- [Open-Meteo pricing and limits](https://open-meteo.com/en/pricing)
- [Open-Meteo historical weather](https://open-meteo.com/en/docs/historical-weather-api)
- [MLB Statcast Park Factors](https://baseballsavant.mlb.com/leaderboard/statcast-park-factors)
- [MLB Statcast Venue Park Factors](https://baseballsavant.mlb.com/leaderboard/statcast-venue)
- [SportsDataIO MLB API](https://sportsdata.io/developers/api-documentation/mlb)
- [Sportradar MLB API](https://developer.sportradar.com/baseball/reference/mlb-overview)
