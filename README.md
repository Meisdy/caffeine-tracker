# Caffeine Tracker

A personal caffeine tracker that models what is actually in your bloodstream, not just how many cups you drank.

Installable as a Progressive Web App on Android. All data lives on the device in IndexedDB — there is no backend, no account, and nothing is ever transmitted anywhere.

**This is not medical advice.** Every number it shows is an estimate from a population model.

---

## What it does

- **One-tap logging** from a grid of favorites, including per-machine doses — "Espresso, work Jura" can carry a different dose than "Espresso, café".
- **A live concentration curve** built from a pharmacokinetic model personalized to your body and metabolism.
- **A phase readout** — rising, peak, productive, fading, crash risk, overloaded — derived from both the level and its slope.
- **A sleep cutoff**: the last moment you can have another coffee and still be under your sleep-disruption threshold when you go to bed.
- **Habit awareness** across days and weeks: rolling baselines, unusual-intake detection, a tolerance estimate, and withdrawal-headache warnings.

---

## The model

### Absorption and elimination

A one-compartment model with first-order absorption, the Bateman function:

```
C(t) = (dose / Vd) · ka/(ka − ke) · (e^(−ke·t) − e^(−ka·t))
```

- `Vd = 0.6 L/kg × body weight`
- `ke = ln(2) / personal half-life`
- `ka = 5.0 /h`, placing the peak near 45 minutes after intake
- Oral bioavailability is treated as complete

Doses superpose linearly. As a sanity check, 100 mg in a 70 kg adult peaks at about 2.1 mg/L after 44 minutes, which matches published values.

### Personal half-life

Baseline 5 h, adjusted multiplicatively and clamped to 2–15 h:

| Modifier | Factor |
| --- | --- |
| Smoking | ×0.65 |
| Oral contraceptives | ×1.9 |
| Pregnancy, 1st / 2nd / 3rd trimester | ×1.2 / ×1.7 / ×2.8 |
| Liver impairment, mild / moderate / severe | ×1.5 / ×2.5 / ×4.0 |
| Age 65+ | ×1.1 |

Two things are deliberately **not** half-life modifiers:

- **Sex** does not meaningfully change clearance by itself. It is collected only to decide which modifiers to offer.
- **Tolerance** is a receptor-level adaptation, not faster metabolism. Habitual heavy drinkers do not clear caffeine faster, so tolerance scales the *effect thresholds* instead of the curve.

### The sleep cutoff

The cutoff is judged on the **worst concentration across the first 90 minutes of sleep**, not on the level at the instant of bedtime. A coffee drunk just before bed has barely been absorbed at lights-out but peaks while you are trying to fall asleep. Using the onset window also makes the projection monotonic in intake time, which is what lets the solver use simple bisection.

### Tolerance and withdrawal

Tolerance is an exponentially weighted mean of daily intake with a 7-day half-life, normalized against 400 mg/day. Withdrawal risk compares today against that weighted habit, and only fires for someone with an established habit to withdraw from.

---

## Limitations

- Linear superposition understates levels above roughly 600 mg, where caffeine kinetics turn non-linear.
- Phase thresholds are heuristic anchors on the dose-response literature, not validated cutoffs.
- The tolerance index is a proxy, not a measured receptor state.
- Half-life is estimated from population data. Real individual half-lives span 2–10 h and genotype is not captured.
- **Cutoff notifications are best-effort.** Chrome shelved the Notification Triggers API, so an installed PWA cannot guarantee a notification at an exact future time. The daily digest runs on Periodic Background Sync (browser-chosen cadence, roughly daily); the cutoff warning fires when the app is opened inside the warning window or from a timer while a tab is alive. The cutoff time itself is always shown on the Today screen.
- Device-only storage means losing the device loses the data. Export regularly from the Profile screen.

---

## Layout

```
src/
  domain/         pure model — no React, no IO, fully unit-tested
  data/           Dexie schema, seed catalog, repositories, JSON backup
  ui/             screens, components, hooks
  notifications/  service worker, daily digest, best-effort cutoff watcher
```

`domain/` imports nothing from the other layers, so every number the app claims can be tested and audited in isolation.

---

## Development

```bash
npm install
npm run dev      # http://localhost:5173
npm run test     # domain unit tests
npm run build    # type-check, then production build into dist/
```

Service workers require HTTPS or `localhost`. Plain HTTP over a LAN address will not install the app, so test PWA behaviour against the deployed URL rather than `npm run dev` on a LAN IP.

## Deployment

Pushing to `main` runs `.github/workflows/deploy.yml`, which tests, builds, and publishes to GitHub Pages.

One-time setup:

1. Create the GitHub repository and push `main`.
2. In **Settings → Pages**, set the source to **GitHub Actions**.
3. If the repository name is not `caffeine-tracker`, update `basePath` in `vite.config.ts` to match. A mismatch there is the most common way this setup silently breaks — the service worker registers against the wrong scope and the app will not install.

To install on Android: open the Pages URL in Chrome, then **menu → Install app**. Chrome, Edge, Samsung Internet, Brave and Opera all work. Firefox for Android does not support PWA install and is unsupported.

---

## Sources for the constants

- Blanchard & Sawers (1983), *The absolute bioavailability of caffeine in man*, Eur J Clin Pharmacol 24:93–98 — bioavailability, volume of distribution
- Nehlig (2018), *Interindividual differences in caffeine metabolism*, Pharmacol Rev 70(2):384–411 — half-life range and modifiers
- Parsons & Neims (1978) — smoking and caffeine clearance
- Abernethy & Todd (1985) — oral contraceptive steroids and caffeine elimination
- Drake et al. (2013), *Caffeine effects on sleep taken 0, 3, or 6 hours before going to bed*, J Clin Sleep Med 9(11):1195–1200 — sleep threshold
- Juliano & Griffiths (2004), *A critical review of caffeine withdrawal*, Psychopharmacology 176:1–29 — withdrawal timing, tolerance onset and reversal
- EFSA (2015), *Scientific Opinion on the safety of caffeine* — 400 mg daily and 200 mg single-dose reference values

## License

AGPL-3.0-or-later. See [LICENSE](LICENSE).
