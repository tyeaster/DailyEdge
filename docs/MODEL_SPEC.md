# MLB Model Specification

The TrueLine MLB model will transform schedule, player, team, market, weather, and context inputs into actionable probabilities and projections.

## Inputs

### Schedule

- Game id
- Away team
- Home team
- Venue
- Scheduled first pitch
- Game status
- Doubleheader and series context

### Starting Pitchers

- Probable starter
- Throwing hand
- Recent workload
- Pitch mix
- Strikeout rate
- Walk rate
- ERA, WHIP, and run prevention indicators
- Splits by handedness

### Team Stats

- Offensive production
- Handedness splits
- Recent form
- Defensive quality
- Base running
- Bullpen availability impact

### Player Stats

- Batting profile
- Recent plate appearances
- Strikeout and walk rates
- Power indicators
- Contact quality
- Expected lineup position
- Splits by opposing pitcher handedness

### Odds

- Moneyline
- Spread or run line
- Total
- Team totals
- Player props
- Sportsbook price
- Market timestamp

### Weather

- Temperature
- Wind speed
- Wind direction
- Humidity
- Rain chance
- Roof status when applicable
- Hitter-friendly and pitcher-friendly ratings

### Injuries

- Player status
- Expected return
- Team impact
- Replacement impact
- Lineup and bullpen consequences

### Bullpens

- Recent usage
- Rest days
- Leverage arms available
- Bullpen quality
- Fatigue risk

### Park Factors

- Run environment
- Home run factor
- Handedness effects
- Altitude and dimensions
- Weather interaction

### Line Movement

- Opening line
- Current line
- Price movement
- Market consensus
- Steam indicators
- Book-to-book variance

## Outputs

### Win Probability

Projected probability that each team wins the game.

### Fair Line

American odds derived from TrueLine model probability before sportsbook margin.

### Projected Runs

Team and game-level run projections for totals, team totals, and game context.

### Strikeout Projection

Pitcher strikeout expectation based on pitcher skill, opponent profile, workload, umpire or weather context when available, and sportsbook line.

### Home Run Probability

Player home run probability based on batter power, pitcher contact profile, park factors, weather, and lineup context.

### Player Prop Projection

Projected outcomes for strikeouts, hits, runs, RBI, home runs, and total bases.

## Model Contract

Model outputs should be strongly typed and include:

- Projection value
- Model probability when applicable
- Fair line when applicable
- Confidence score
- Edge score
- Reasoning summary
- Input timestamp
