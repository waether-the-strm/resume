---
name: narrative
description: The story of the strm.dev home page and its locked decisions — the equation, the three scenes, the guide, the hero as the built message, the business card. Use before changing any sequence, scene, stop text, or when the name appears.
---

# Narrative

## The spine
1. **Signature from the first pixel.** "Jan Mirecki · design engineer · Oslo" lives in the blob, a small floating
   element at the bottom centre: the title of the current stop above, a hairline, the name below. The title is
   a title; the name is the way to the card. A tap (or a mouse over it) unfolds it for a few seconds: sound,
   the start, the work, the lab. The name row folds away when the name is on the page (the finished look, the
   card). An experiment: its contents may change.
   A hiring manager with ten seconds learns who is talking without the tour.
2. **The equation (~1.3 screens).** A line draws from the centre. A `+` appears and stays. `what?`, `why?`,
   `who?` stack above the line: the question first, then its answer melts in. The line pulses. `how?` appears
   centred below, slides left, its answer melts in: "scroll. It builds as you go." The questions and the line
   dissolve (warp); the answer holds alone, then melts; `how` vanishes in a spark and reappears in the corner.
   From here "how · n" is the guide's heading.
3. **Three scenes, scroll is the slider (~2.7 screens).** One message, one DOM, three skins:
   - `words`: one compact block; sentences appear in the order they will later be split.
   - `structure`: boxes with names; with progress the names become components (`<Headline as="h1" />`), then
     get tokens (`tokens="…"`); boxes fade, mono lets go, sizes walk towards the look.
   - `look`: the real hero. Timed: tiles 01–03 one by one, then the name line with a weight wave through it,
     then the call with air. Colour lands in the first quarter of the scene.
   The guide says one sentence per scene; the heading always lands ~0.5 s before the page changes.
   Payoff at the end of `look`: "Same words, read twice. The second time took no effort. That is layout."
4. **The business card.** `= how? · the same question, answered`, monogram, "I'm Jan, a staff‑level design
   engineer.", role line, one paragraph, three paths (write to me · see the work · or wander). Then three project
   cards with visual headers.

## Locked decisions (change only with Jan, on a rendered example)
- Questions use `?`, answers melt in after the question; `how?` arrives centred and slides left.
- The name is in the signature from the start and in the `who` block of the message; it is not the opening.
- The built message is the hero. Headline: "Your product, clear at a glance."
- The equation does not return as a column at the end; only the kicker echoes it.
- Guide sentences are short (under 14 words), payoff under 20.
- Stage 0 is phase-driven (14 thresholds), reversible; one-shot effects fire on crossing in both directions.

## What was tried and dropped (do not reintroduce without a reason)
- ASCII boxes drawn in box-drawing characters (lines collided with labels at transitions).
- Separate stops for markup and tokens (five stops felt like a slideshow; folded into scene 2 as annotations).
- The equation as a spec column on the final board (did not sing there).
- "A look that stays quiet." (poetic, said nothing) → "Colour only where it means something."
- Big buttons on the final board (heavy) → menu rows with arrows inside a card.
- A haze gradient under `backdrop-filter` (banded) → a separate gradient layer.
