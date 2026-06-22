# DailyEdge Roadmap

DailyEdge is being built as a premium MLB analytics dashboard that starts with today's slate and grows into a full decision platform for bets, player props, bankroll management, and subscriptions.

## 1. Foundation

- Establish the Daily Slate as the home experience.
- Build reusable UI components for games, bets, props, weather, and injuries.
- Define shared TypeScript models for MLB data.
- Keep mock data realistic enough to support product iteration before every live provider exists.

## 2. Live MLB Data

- Replace mock schedule data with a live MLB schedule provider.
- Normalize games, teams, venues, statuses, game times, and probable pitchers into the shared domain model.
- Preserve provider fallback behavior so the dashboard remains usable when a live source fails.

## 3. Odds and Fair Lines

- Add a vendor-agnostic odds provider architecture.
- Integrate OddsPipe as the first production odds provider.
- Compare sportsbook lines against DailyEdge fair lines.
- Display edge percentage, value rating, and recommended units without coupling UI components to odds vendors.

## 4. Weather and Injuries

- Add live weather providers for game-level context.
- Add live injury providers for player availability and impact tracking.
- Normalize weather and injury inputs before they reach the prediction engine.
- Surface only actionable weather and injury changes on the Daily Slate.

## 5. Prediction Engine

- Build the first DailyEdge MLB model using schedule, team, pitcher, player, odds, weather, injury, bullpen, park, and line movement inputs.
- Generate win probabilities, fair lines, projected runs, player prop projections, strikeout projections, and home run probabilities.
- Keep model outputs strongly typed so scoring and UI layers can evolve safely.

## 6. Player Props

- Expand prop coverage across strikeouts, hits, runs, RBI, home runs, and total bases.
- Add prop-specific projections, fair lines, edges, and confidence scoring.
- Prioritize props by value, confidence, market availability, and risk.

## 7. Bankroll

- Add bankroll settings, staking preferences, risk limits, and exposure controls.
- Convert value ratings into recommended units.
- Track open recommendations and historical outcomes.

## 8. Accounts and Subscriptions

- Add user accounts, saved preferences, and subscription tiers.
- Gate premium analytics, advanced props, and bankroll tools behind plan rules.
- Keep authentication and billing isolated from model and provider layers.

## 9. Mobile App

- Adapt the Daily Slate for mobile-first scanning.
- Prioritize compact cards, saved filters, alerts, and push notifications.
- Reuse the same service and provider contracts behind the mobile experience.
