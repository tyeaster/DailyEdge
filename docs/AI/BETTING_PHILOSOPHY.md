# Betting Philosophy

This document defines the betting logic TrueLine should preserve across product, model, and engineering work.

Related:

- [`../SCORING.md`](../SCORING.md)
- [`../RANKING_ENGINE.md`](../RANKING_ENGINE.md)
- [`../BEST_BETS.md`](../BEST_BETS.md)
- [`PRODUCT_VISION.md`](PRODUCT_VISION.md)

## Core Belief

TrueLine exists to find market value.

A prediction can be correct and still be a bad bet. A bet can lose and still have been positive expected value. Product decisions must preserve this distinction.

## Winners Are Not the Product

The question is not:

```text
Who will win?
```

The better question is:

```text
Is the sportsbook price wrong relative to TrueLine's estimated probability?
```

Examples:

- A team with 62% win probability may be a bad bet if the sportsbook price implies 68%.
- A home run prop with only 12% probability may be valuable if the market implies 8%.
- A strikeout over may be a pass if the model projects 6.1 against a 5.5 line but the odds are too expensive.

## Required Concepts

### Sportsbook Odds

The market price offered by a sportsbook.

### Implied Probability

The probability implied by sportsbook odds before or after vig adjustment.

### Model Probability

TrueLine's probability estimate.

### Fair Line

The odds or market line implied by TrueLine's model probability.

### Edge

The difference between model probability and sportsbook implied probability.

### Expected Value

The expected return from betting at the sportsbook price using TrueLine's probability.

### Confidence

The model's certainty in its own estimate. Confidence is not the same as edge and not the same as odds.

### Data Quality

The completeness and reliability of the inputs supporting a recommendation.

## Recommendation Logic

Recommendations should consider:

- Edge.
- Expected value.
- Confidence.
- Data quality.
- Variance.
- Market risk.
- Historical calibration.
- CLV.
- Correlation/exposure.

Do not recommend solely because projected probability is high.

## Market-Specific Philosophy

### Moneyline

Moneyline should answer:

```text
Which team should win, and is the price mispriced?
```

Inputs should include team strength, starting pitching, bullpen, lineups, matchup, recent form, weather, ballpark, and market price.

### Run Line

Run Line should answer:

```text
Is the projected margin meaningfully different from the sportsbook spread?
```

Variance is higher than moneyline. Blowout potential and bullpen gap matter.

### Game Totals

Game Totals should answer:

```text
Is the run environment materially different from the posted total?
```

Weather, ballpark, lineups, bullpens, starters, recent form, and run environment matter.

### Team Totals

Team Totals should answer:

```text
Is one team's run-scoring opportunity mispriced?
```

Lineup strength, opposing starter, opposing bullpen, park, weather, and recent offense matter.

### Strikeouts

Strikeouts should answer:

```text
Is the pitcher's expected strikeout distribution above or below the line?
```

Pitch count, innings expectation, opponent K rate, lineup contact, umpire, weather, pitcher form, and pitch matchup matter.

### Hits

Hits should answer:

```text
Is the hitter likely to record at least the required hit count?
```

Contact, batting order, pitcher matchup, bullpen, zone match, and lineup context matter.

### Total Bases

Total Bases should answer:

```text
Is the hitter likely to exceed the total-base line through contact quality and matchup?
```

Hard hit rate, slugging, ISO, recent total bases, pitch/zone match, park, weather, lineup, and bullpen matter.

### Home Runs

Home Runs should answer:

```text
Which hitters have the best power outcome environment today?
```

Barrels, launch angle, pull power, pitch type, zone, pitcher HR risk, wind, park, and bullpen matter.

## Correlation Philosophy

TrueLine should not treat bets as independent when they are not.

Related bets:

- Same hitter HR, hits, total bases, RBI.
- Same team total and multiple hitter props.
- Same game over and multiple offensive overs.
- Same pitcher strikeouts and opposing hitter unders.
- Same team moneyline and run line.

Correlation does not make a bet bad. It changes portfolio risk.

## Calibration Philosophy

TrueLine should earn trust through measured performance:

- Win rate.
- ROI.
- Closing line value.
- Confidence calibration.
- Performance by market.
- Performance by odds range.
- Performance by recommendation tier.
- Performance by data quality tier.

Until calibration is production-backed, the product should avoid overclaiming.

## User Communication Standard

Recommendations should say:

- What TrueLine projects.
- What the sportsbook offers.
- Where the edge is.
- Why the model likes or dislikes it.
- How confident the data is.
- What could invalidate the edge.

Avoid hype language.

