# Vice Cover Studio

[![make.fun gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/Fslrm123/gta6-cover-art-01-entry/rank.svg)](https://make.fun/bounty/gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/Fslrm123/gta6-cover-art-01-entry/reward.svg)](https://make.fun/bounty/gta6-cover-art-01)

An offline GTA-style cover-art maker that paints original Vice City key art entirely in code — layered sunset sky with stars and soft cloud bands, a striped retro sun, a two-depth skyline with lit windows, ocean glitter with a sun-reflection column, palm silhouettes and a neon-rimmed lowrider with underglow and whitewalls — finished with a chrome-gradient title under a neon halo, five gold wanted stars, an original "M / MATURE 17+" badge, vignette and film grain. Style it in the editor (4 themes: Vice Sunset, Neon Nights, Golden Hour, Midnight Vice; 3 layouts: Classic, Poster, Billboard; painted scene or sunset-tinted photo backdrops; stars/badge toggles and a grain slider) and export a 1080 × 1080 PNG. No uploads, no network requests: nothing leaves your browser.

Entry for the make.fun bounty [gta6-cover-art-01](https://make.fun/bounty/gta6-cover-art-01). New to make.fun? Join with my referral: https://make.fun/r/3v2j7j85

## How to run

```sh
node serve.ts        # serves app/ on http://localhost:8080
```

Then open http://localhost:8080 in a desktop browser. Edit the title, subtitle and tagline, pick a theme and layout, choose a backdrop, and click **Export PNG · 1080 × 1080**.

To build the make.fun dossier locally (program/v1):

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

## Notes

- Fully offline, zero external requests, deterministic output (fixed-seed painting).
- All artwork is original and painted in code; the two sample photos in `app/samples/` are bundled for the photo backdrops.
- Original fan-made tool — not affiliated with Rockstar Games or Take-Two Interactive.

## License

MIT — see [LICENSE](LICENSE).
