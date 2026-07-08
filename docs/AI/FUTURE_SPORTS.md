# Future Sports

This document explains how TrueLine should expand beyond MLB without damaging the current architecture.

Related:

- [`../PRODUCT_BLUEPRINT.md`](../PRODUCT_BLUEPRINT.md)
- [`ENGINEERING_PRINCIPLES.md`](ENGINEERING_PRINCIPLES.md)
- [`ARCHITECTURE_DECISIONS.md`](ARCHITECTURE_DECISIONS.md)

## Expansion Principle

MLB should reach production quality before TrueLine expands seriously into other sports.

Do not use multi-sport ambitions as a reason to weaken MLB quality. Use MLB to prove the architecture, then extract shared abstractions only when real second-sport requirements appear.

## Shared Concepts Across Sports

These concepts should remain shared:

- Game.
- Team.
- Player.
- Odds.
- Market.
- Bet candidate.
- Fair line.
- Edge.
- Expected value.
- Confidence.
- Data quality.
- Provider.
- Service.
- Ranking.
- Calibration.
- Backtesting.
- Odds intelligence.
- Correlation/exposure.

Current shared candidates:

- `src/services/ranking/types.ts`
- `src/services/calibration/types.ts`
- `src/services/backtesting/types.ts`
- `src/models/sports.ts`

## Sport-Specific Concepts

Keep sport-specific logic separate.

MLB-specific:

- Starting pitchers.
- Bullpens.
- Pitch arsenals.
- Batter pitch profiles.
- Park factors.
- Weather impact on batted balls.
- Lineups and batting order.

NFL-specific future examples:

- Quarterback status.
- Offensive line.
- Pace.
- Defensive pressure.
- Weather/wind for passing and kicking.
- Injury reports.

NBA-specific future examples:

- Usage rate.
- Minutes projection.
- Back-to-back/rest.
- Pace.
- Defensive matchup.
- Player availability.

WNBA-specific future examples:

- Same structural concepts as NBA but separate provider and calibration data.

NHL-specific future examples:

- Starting goalie.
- Shot quality.
- Power play.
- Penalty kill.
- Rest.

Soccer-specific future examples:

- Expected goals.
- Lineups.
- Formation.
- Travel.
- Fixture congestion.
- Set pieces.

## Recommended Expansion Order

1. MLB production hardening.
2. WNBA.
3. NFL.
4. NBA.
5. NHL.
6. Soccer.

This matches the existing product blueprint direction.

## Multi-Sport Architecture Target

Future architecture should look like:

```text
src/sports/
  mlb/
    providers/
    services/
    models/
  nba/
    providers/
    services/
    models/
  nfl/
    providers/
    services/
    models/

src/services/ranking/
src/services/calibration/
src/services/backtesting/
src/services/odds-intelligence/
```

Shared engines should remain sport-agnostic where possible. Sport-specific engines should adapt their outputs into shared betting models.

## Expansion Checklist

Before adding a new sport:

- Is MLB Production V1 stable?
- Are persistence and calibration available?
- Does RankingEngine support the market types?
- Are provider contracts ready for the new sport?
- Can replay/mock/live modes be supported?
- Are odds markets available?
- Is historical result data available?
- Can recommendations be explained?
- Are sport-specific models isolated?

## Do Not Do This

Avoid:

- Copying MLB-specific models into shared code.
- Forcing pitcher/batter concepts into other sports.
- Building a new sport without replay/mock support.
- Adding new sport pages before provider and calibration strategy.
- Combining all sports into one generic model too early.

## First Future Sport Recommendation

WNBA is likely the cleanest next sport after MLB because:

- Market structure is simpler than NFL.
- Daily slate size is manageable.
- Player/team prop concepts map well to existing architecture.
- Basketball data has strong precedent for usage/minutes projections.

Still, WNBA should wait until MLB has:

- Persistence.
- Auth.
- Live odds completeness.
- Historical results.
- Calibration.

