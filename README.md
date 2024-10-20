# countries-css-sprite
A CSS sprite that contains all the country flags by country ISO codes. Data is actualized from **Wikipedia.**
All flags are 16px tall and padded to 32px width. Ideal for listing or selecting countries.
The png is tinified, the CSS is optimized for size.
The whole package is 14 gzipped, and contains 249 flags.

## Easy to use:

Just download and include country_flags.css and country_flags_sprite.png

Example:
```
<div class="country-flag DE"></div> Germany
```

Example test of all flags is in **country_flags_test.html**

## If you want to rebuild the css and flags:

run

```
npm i
```

then create an .env file with you TinyPNG API Key ( https://tinypng.com/developers )

```
TINYPNG_API_KEY=<YOUR KEYy
```

then run
```
node create.js
```

The Luxemburg (LU) flag has errors, I included LU.svg that you should copy into flags and re-run.

If you want the latest data, delete **iso__country_code.html**, **flags** and **resized_flags** directories, as those are cached.

