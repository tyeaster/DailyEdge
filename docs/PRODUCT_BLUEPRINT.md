# TrueLine Product Blueprint

## Document Purpose

This document defines the long-term product vision for TrueLine. It is the master product specification used to evaluate priorities, shape roadmaps, and maintain consistency as the platform expands.

This is not a technical architecture document. It describes what TrueLine should become, who it should serve, what experiences it should provide, and how the product should create durable value.

Individual releases may deliver only part of this vision. Product decisions should still move TrueLine toward the complete platform described here.

## Mission

TrueLine exists to become the most trusted sports betting analytics platform by identifying mispriced betting markets through transparent, explainable predictive models.

TrueLine is not a picks service. It is an analytics platform.

The goal is not simply to predict winners. The goal is to identify market value: situations where the model's estimated probability differs meaningfully from the price offered by sportsbooks.

TrueLine should help users make better decisions by answering three questions:

1. What does the model project?
2. How does that projection differ from the market?
3. Why does the model believe an opportunity exists?

## Product Philosophy

### The Model Is the Product

The quality of the model determines the quality of TrueLine. Product features should make the model more accurate, useful, understandable, or accessible.

Presentation matters, but presentation cannot substitute for prediction quality.

### Explainability Builds Trust

Users should understand the primary factors behind every recommendation. TrueLine should expose reasoning clearly enough that a user can evaluate the signal instead of blindly accepting it.

### Transparency Over Hype

TrueLine should communicate uncertainty, limitations, data freshness, model versions, and historical performance honestly.

The product should avoid guaranteed-win language, artificial urgency, and promotional sportsbook conventions.

### Long-Term Expected Value Over Short-Term Win Percentage

A good recommendation can lose. A poor recommendation can win.

TrueLine should judge model quality over meaningful samples using expected value, return on investment, closing line value, calibration, and consistency rather than isolated outcomes.

### Measurable Recommendations

Every recommendation should be supported by measurable outputs, including model probability, fair odds, sportsbook odds, edge, expected value, confidence, and contributing factors.

### Reproducible Predictions

Given the same model version and the same inputs, TrueLine should produce the same prediction. Model changes should be versioned so historical results remain attributable to the system that generated them.

### Users Should Understand Why

TrueLine should explain why the model likes a bet, what assumptions matter, and which conditions could change the recommendation.

## Target Users

### Primary Audience

#### Serious Sports Bettors

Users who compare prices, track performance, manage risk, and care about expected value over time.

They need fast market scanning, transparent model outputs, historical performance, line movement, and reliable alerts.

#### Value Bettors

Users focused on finding discrepancies between estimated probability and sportsbook price.

They need fair lines, implied probabilities, edge, expected value, market comparisons, and closing line value.

#### DFS Players

Users evaluating player opportunity, matchup quality, projections, ownership leverage, and fantasy scoring.

They need player-level projections, prop context, lineup changes, weather, and role-based alerts.

#### Data-Driven Users

Users who prefer structured evidence over narrative opinion.

They need filters, sortable metrics, historical data, model explanations, downloadable reports, and consistent methodology.

#### Sports Analytics Enthusiasts

Users interested in predictive models, player performance, market behavior, and the relationship between sports data and betting prices.

They need accessible model reasoning, performance breakdowns, and rich game context.

### Secondary Audiences

- Content creators producing research-driven sports analysis.
- Fantasy sports analysts and community leaders.
- Betting communities and private groups.
- Sports media professionals.
- Quantitative researchers.
- Casual bettors who want a disciplined alternative to hype-driven picks.
- Future business customers seeking model outputs, reports, or licensed analytics.

## Product Goals

TrueLine should become the Bloomberg Terminal for sports betting: a trusted decision workspace where users can understand the market, evaluate model disagreement, monitor changes, and measure long-term performance.

Users should be able to identify instantly:

- Highest expected value bets.
- Largest disagreements between TrueLine and sportsbooks.
- Highest-confidence opportunities.
- Best player props.
- Best home run opportunities.
- Best strikeout opportunities.
- Meaningful line movement.
- Closing line value.
- Historical model performance.
- Changes caused by lineups, injuries, weather, or market movement.

The platform should reduce the time required to move from a full sports slate to a small set of well-supported decisions.

## Product Structure

## Dashboard

The Dashboard is the primary daily workspace.

It should provide a complete market overview without requiring users to open every game.

### Today's Slate

- All scheduled games.
- Start times and statuses.
- Probable starters.
- Primary market prices.
- Weather and injury alerts.
- Data freshness.

### Top 10 Bets

- Highest-ranked recommendations across supported markets.
- Model probability.
- Sportsbook price.
- Fair price.
- Edge.
- Expected value.
- Confidence.
- TrueLine Score.

### Highest EV

A ranked view of markets with the strongest calculated expected value at currently available prices.

### Highest Confidence

A ranked view of recommendations supported by the clearest inputs and strongest model agreement.

Confidence must remain distinct from edge and sportsbook price.

### Biggest Market Disagreement

Markets where TrueLine's probability differs most from sportsbook implied probability.

This view should help users investigate potential opportunities even when the final recommendation remains a pass.

### Trending Line Movement

- Opening price.
- Current price.
- Direction and magnitude of movement.
- Time of change.
- Sportsbook comparison.
- Movement relative to TrueLine's fair line.

### Daily Reports

Daily summaries should include:

- Slate outlook.
- Best opportunities.
- Important changes.
- Weather and injury risks.
- Model performance recap.
- Closing line value report.

## Game Analysis

Every game should have a dedicated analysis workspace.

### Core Prediction

- Predicted winner.
- Home win probability.
- Away win probability.
- Projected score.
- Projected total runs.
- Home fair line.
- Away fair line.
- Sportsbook line.
- Edge.
- Expected value.
- Confidence.
- Recommendation.
- TrueLine Score.

### Reasons

The page should list the factors supporting or opposing the recommendation, their direction, and their relative importance.

### Pitcher Comparison

- Expected performance.
- Recent workload.
- Pitch mix.
- Strikeout and walk profiles.
- Contact quality.
- Handedness splits.
- Projected innings.

### Bullpen Comparison

- Overall quality.
- Recent usage.
- Rest and availability.
- Leverage reliever status.
- Matchup quality.

### Offense Comparison

- Projected lineup quality.
- Handedness splits.
- Recent performance.
- Contact and power indicators.
- Plate discipline.
- Base-running value.

### Weather

- Temperature.
- Wind speed and direction.
- Humidity.
- Precipitation.
- Roof status.
- Expected effect on runs, home runs, and pitching.

### Park Factors

- Run environment.
- Home run factors.
- Handedness effects.
- Stadium dimensions.
- Altitude.

### Injuries

- Confirmed absences.
- Questionable players.
- Expected return.
- Replacement impact.
- Lineup, rotation, and bullpen implications.

### Travel

- Distance traveled.
- Time-zone changes.
- Road-trip context.
- Previous game location.

### Rest

- Team rest.
- Pitcher rest.
- Bullpen workload.
- Consecutive games.
- Doubleheader context.

### AI Summary

An AI-generated summary may synthesize structured model outputs into readable analysis.

The summary must remain grounded in model data, cite the primary factors, communicate uncertainty, and never invent unsupported claims.

## Player Props

TrueLine should support a comprehensive player prop workspace.

### Planned Prop Markets

- Hits.
- Home runs.
- Strikeouts.
- RBIs.
- Total bases.
- Walks.
- Fantasy score.
- Pitching outs.
- Stolen bases.

Additional markets may be added when data quality and model validation meet product standards.

### Required Prop Outputs

Every prop should include:

- Player and matchup.
- Projection.
- Sportsbook line.
- Sportsbook odds.
- Fair odds.
- Edge.
- Expected value.
- Confidence.
- Recommendation.
- TrueLine Score.
- Explainable reasons.
- Data freshness.

## Model Suite

TrueLine should evolve into a coordinated suite of specialized models.

### Moneyline Model

Estimates game win probabilities and fair moneylines.

### Run Model

Projects team runs, game totals, run lines, and scoring distributions.

### Home Run Model

Estimates player home run probability using batter, pitcher, park, weather, lineup, and contact-quality inputs.

### Strikeout Model

Projects pitcher strikeouts using skill, workload, opposing lineup, umpire, park, and game-context inputs.

### Hits Model

Projects player hit probability and expected hits from contact quality, matchup, lineup position, and expected plate appearances.

### Player Props Model

Supports a broad set of player markets through shared player projections and market-specific probability models.

### Live Betting Model

Updates probabilities during games using score, inning, outs, base state, pitcher availability, and live prices.

### Same Game Parlay Model

Evaluates correlated outcomes and fair joint probabilities. It should not assume independence between legs.

### WNBA Model

Provides league-specific game and player projections while following the same product standards for fair lines, edge, confidence, and explanations.

### NFL Model

Supports game, team, and player markets with football-specific inputs and model components.

### NBA Model

Supports game and player markets with pace, rotation, availability, matchup, and workload inputs.

All models should eventually share common product contracts for:

- Probabilities.
- Fair odds.
- Edge.
- Expected value.
- Confidence.
- Recommendations.
- Explanations.
- Model versions.
- Historical evaluation.

## Historical Performance

TrueLine should maintain a permanent historical prediction database.

Every stored prediction should include:

- Prediction timestamp.
- Event and market.
- Model version.
- Inputs or input snapshot reference.
- Model probability.
- Fair odds.
- Sportsbook odds.
- Edge.
- Expected value.
- Confidence.
- Recommendation.
- TrueLine Score.
- Closing price.
- Outcome.
- Profit or loss.

### Core Performance Metrics

- Return on investment.
- Closing line value.
- Win rate.
- Expected value.
- Calibration.
- Average edge.
- Recommendation volume.
- Drawdown.

### Performance Segmentation

Users should be able to analyze performance by:

- Sport.
- League.
- Bet type.
- Confidence tier.
- TrueLine Score range.
- Sportsbook.
- Season.
- Date range.
- Model version.
- Recommendation tier.

Historical reporting should make model quality transparent and prevent selective presentation of results.

## Premium Features

Premium plans should provide meaningful analytical depth rather than cosmetic upgrades.

### Premium Dashboard

- Full rankings.
- Advanced filters.
- Expanded market coverage.
- Custom layouts.
- Faster refreshes.

### Advanced Models

- Full model suite.
- Advanced prop markets.
- Deeper explanations.
- Scenario analysis.

### Real-Time Alerts

- New qualifying recommendations.
- Material line movement.
- Edge threshold changes.
- Lineup, injury, and weather changes.
- Recommendation upgrades or downgrades.

### Bankroll Tracking

- Bankroll history.
- Stake recommendations.
- Exposure limits.
- Correlation awareness.
- Performance reporting.

### Saved Bets

- Personal watchlists.
- Tracked prices.
- Notes.
- Outcome and CLV tracking.

### Discord Integration

- User-configured alerts.
- Private community delivery.
- Model reports.
- Slate summaries.

### Push Notifications

- Personalized market alerts.
- Saved-player alerts.
- Game-start reminders.
- Live recommendation changes.

### Historical Analytics

- Deep model performance filters.
- Exportable results.
- Model-version comparisons.
- Custom date ranges.

### Model Reports

- Daily reports.
- Weekly performance reviews.
- Model change notes.
- Calibration and CLV summaries.

## Free Features

TrueLine should maintain a useful free experience that demonstrates product quality and builds trust.

Free access should include:

- Today's schedule.
- Core game information.
- A limited set of game predictions.
- Basic win probabilities.
- Selected fair lines.
- Limited recommendation previews.
- Basic explanation factors.
- Public model methodology.
- High-level historical performance.
- Delayed or reduced-frequency updates.
- Educational content about probability, edge, and expected value.

Free users should understand the TrueLine value proposition without receiving every premium market, alert, or historical tool.

## Mobile Application

TrueLine should eventually offer native iOS and Android applications designed for rapid daily decision-making.

### Mobile Priorities

- Today's personalized dashboard.
- Saved games, players, markets, and bets.
- Real-time push notifications.
- Line movement alerts.
- Injury, lineup, and weather alerts.
- Live recommendation changes.
- Bankroll and exposure overview.
- Fast filtering and search.

### Offline Viewing

Users should be able to view recently synchronized:

- Saved dashboards.
- Saved bets.
- Model reports.
- Prediction explanations.
- Historical summaries.

Offline content must display its last-updated timestamp clearly.

## Multi-Sport Expansion

TrueLine should expand only after each preceding phase meets defined standards for data quality, model validation, operational reliability, and product usefulness.

### Phase 1: MLB

MLB must reach production quality before TrueLine expands to additional sports.

Production quality includes:

- Reliable live data.
- Validated game and player models.
- Historical tracking.
- Transparent reporting.
- Stable alerts.
- Strong user workflows.

### Phase 2: WNBA

Launch game and player models with league-specific data and validation.

### Phase 3: NFL

Launch game, team, and player markets with football-specific modeling.

### Phase 4: NBA

Launch game and player models with lineup, pace, availability, and workload intelligence.

### Phase 5: NHL

Launch game, goalie, scoring, and player prop models.

### Phase 6: Soccer

Launch competition-specific match, goal, and player models across selected leagues.

Shared product conventions should remain consistent across sports, but sport-specific models must respect their own data and competitive structure.

## TrueLine Score

TrueLine Score is the flagship recommendation-quality rating.

Every recommendation should eventually receive a score from `0` to `100`.

### Suggested Ranges

| Score | Rating |
| ---: | --- |
| 95–100 | Elite |
| 85–94 | Strong |
| 70–84 | Good |
| 55–69 | Lean |
| Below 55 | Pass |

The score represents overall recommendation quality under the current model version.

It should eventually combine:

- Edge.
- Expected value.
- Confidence.
- Input completeness.
- Model agreement.
- Market quality.
- Data freshness.
- Historical reliability for similar predictions.
- Risk and volatility.

TrueLine Score must not be presented as certainty or guaranteed success.

The scoring methodology should be versioned, documented, reproducible, and evaluated historically.

## Explainability

Every prediction should expose the factors contributing to the recommendation.

Examples include:

- Better starting pitcher.
- Bullpen advantage.
- Weather.
- Park factors.
- Offensive matchup.
- Rest advantage.
- Line value.
- Recent form.
- Injury or lineup impact.
- Market movement.

Explainability should include both supporting and opposing factors when relevant.

Users should never need to blindly trust the model. TrueLine should give them enough information to understand the recommendation, evaluate the assumptions, and decide whether the opportunity fits their own risk tolerance.

## Product Principles and Companion Documents

This blueprint defines the long-term product destination.

Implementation and current-state decisions are governed by companion documents:

- [PROJECT_PRINCIPLES.md](../PROJECT_PRINCIPLES.md) defines the engineering constitution and enduring development principles.
- [MODEL_SPEC.md](MODEL_SPEC.md) defines the intended model inputs, outputs, and domain requirements.
- [PROJECT_STATE.md](PROJECT_STATE.md) defines the current implementation status, active providers, known limitations, and immediate next work.

These documents serve different purposes:

- `PRODUCT_BLUEPRINT.md` defines what TrueLine should become.
- `PROJECT_PRINCIPLES.md` defines how the project should be built.
- `MODEL_SPEC.md` defines what the model system must represent.
- `PROJECT_STATE.md` defines what is true today.

Roadmaps, sprint plans, and feature proposals should align with all four.

## Product Decision Standard

Before prioritizing a major feature, the team should ask:

- Does this improve users' ability to identify market value?
- Does this improve model quality, explainability, or trust?
- Does this help users act faster without hiding uncertainty?
- Can its value be measured?
- Does it support long-term platform quality?
- Is the underlying data reliable enough?
- Does it move MLB closer to production quality?
- Will the experience remain coherent as TrueLine expands?

Features that do not strengthen the model, decision workflow, trust, or measurable user value should not displace higher-priority work.
