# TrueLine Environmental Intelligence

Environmental Intelligence normalizes game-time weather and ballpark context
without changing the public Prediction Engine interface. It uses deterministic
ratings, provider abstraction, replay fixtures, caching, and neutral
degradation.

Source selection and licensing are documented in
[ENVIRONMENTAL_DATA_SOURCES.md](ENVIRONMENTAL_DATA_SOURCES.md).

## Weather Architecture

```text
Open-Meteo, replay, or mock provider
  -> WeatherService
  -> WeatherProfile
  -> normalized Game
  -> PredictionEngine and UI
```

`WeatherProfile` includes:

- Temperature, humidity, pressure, calculated air density, dew point, cloud
  cover, and visibility.
- Wind speed, gusts, compass direction, direction relative to home plate,
  headwind, tailwind, and crosswind components.
- Rain probability, hourly intensity, delay probability, cancellation
  probability, and storm risk.
- Roof status, indoor/outdoor state, and whether weather applies.
- Run, home-run, strikeout, fly-ball, ground-ball, offense, pitching,
  confidence, and severity ratings.

Weather mode is selected through `WEATHER_MODE=live|replay|mock`.

## Ballpark Architecture

```text
MLB venue metadata + Baseball Savant factors
  -> live, replay, or mock BallparkProvider
  -> BallparkService
  -> BallparkProfile
  -> normalized Game
  -> PredictionEngine and UI
```

`BallparkProfile` includes:

- Name, altitude, coordinates, field azimuth, dimensions, roof type, surface,
  and league.
- Run, home run, singles, doubles, triples, strikeout, walk, BABIP, left-handed
  home run, and right-handed home run factors.
- Nullable future fields for foul territory, ground balls, and fly balls.
- Derived hitter, pitcher, power, speed, and overall park ratings.
- Historical confidence based on the rolling sample size.

Ballpark mode is selected through `BALLPARK_MODE=live|replay|mock`.

## Deterministic Weather Calculations

### Air Density

Air density uses temperature, surface pressure, and dew point:

```text
vapor pressure =
  6.112 * exp((17.67 * dew point C) / (dew point C + 243.5))

air density =
  dry air pressure / (287.05 * temperature K) +
  vapor pressure / (461.495 * temperature K)
```

Lower density is more favorable to ball carry.

### Relative Wind

Open-Meteo wind direction describes where wind originates. The implementation
converts it to the direction the wind travels and compares that bearing with
the MLB venue azimuth.

```text
forward component = cos(relative angle) * wind speed
lateral component = sin(relative angle) * wind speed
```

Positive forward wind is a tailwind toward center field. Negative forward wind
is a headwind. The lateral component determines left-to-right,
right-to-left, or crosswind classification.

### Weather Ratings

All ratings are clamped from `0` to `100`, with `50` neutral.

```text
run environment =
  temperature score * 0.35 +
  inverse air-density score * 0.30 +
  net tailwind score * 0.25 +
  humidity score * 0.10

home-run environment =
  inverse air-density score * 0.40 +
  net tailwind score * 0.35 +
  temperature score * 0.25
```

Offense combines run and home-run environment. Pitching is its inverse.
Strikeout environment is the inverse of run environment. Fly-ball environment
combines home-run and run conditions; ground-ball environment is its inverse.

Delay and cancellation probability combine precipitation probability,
precipitation intensity, and WMO thunderstorm or shower codes. These are model
risk indicators, not official postponement forecasts.

Weather confidence combines field completeness and forecast horizon. Indoor or
closed-roof games receive neutral environmental ratings and full data quality
because outside weather is correctly not applicable.

## Deterministic Ballpark Calculations

Baseball Savant defines `100` as league average.

```text
factor rating = clamp(50 + (park factor - 100) * 1.5, 0, 100)

hitter friendly =
  rating(average(run factor, home run factor))

pitcher friendly = 100 - hitter friendly

power friendly =
  rating(average(overall HR, left HR, right HR))

speed friendly =
  rating(average(single, double, triple factors))

overall park =
  hitter friendly * 0.50 +
  power friendly * 0.30 +
  speed friendly * 0.20
```

Historical confidence scales with the three-year rolling plate-appearance
sample and remains zero when Savant factors are unavailable.

## Prediction Engine Integration

Environmental inputs do not alter home-versus-away win probability directly.
Doing so would incorrectly assume that hitter-friendly weather favors the home
team.

They adjust the projected total-run environment:

```text
environment score =
  normalized weather run environment * 0.60 +
  normalized overall park rating * 0.40

projected total adjustment =
  environment score * maximum 1.5 runs
```

The sportsbook total, or neutral `8.6` fallback, remains the baseline.

Weather and ballpark data also:

- Add explainable run-environment and delay-risk reasons.
- Contribute to Data Quality.
- Cap confidence when applicable environmental inputs are missing.
- Appear in developer diagnostics through source and availability records.

## Cache Strategy

- Weather profile: 10 minutes.
- Indoor/closed-roof weather: 1 hour.
- Ballpark profile: 24 hours.
- MLB venue metadata and normalized park result share the ballpark cache.
- Baseball Savant pages are shared in memory by season and batting side.
- Replay fixtures are immutable local files.

## Graceful Degradation

- Missing weather coordinates return a neutral unavailable profile.
- Missing Open-Meteo data does not stop slate generation.
- Indoor or closed-roof games return `Weather Not Applicable`.
- Missing Savant factors preserve MLB venue metadata with neutral factors.
- Missing MLB venue data returns a neutral unavailable ballpark profile.
- Prediction generation always continues.

## Current Limitations

- Retractable-roof open/closed status is not reliably exposed before every game;
  unknown status remains explicit.
- Delay and cancellation probabilities are deterministic indicators, not
  official club or league decisions.
- Baseball Savant park-factor data is embedded in a public leaderboard page,
  not a documented API contract.
- Foul-territory, ground-ball, and fly-ball park factors remain null.
- Open-Meteo's public endpoint is not licensed for commercial production.
- Weather and park effects adjust projected runs but are not historically
  calibrated.
