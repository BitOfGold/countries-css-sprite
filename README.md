# countries-css-sprite
A CSS sprite that contains all the country flags by country ISO codes. Data is actualized from **Wikipedia.**
All flags are 16px tall and padded to 32px width. Ideal for listing or selecting countries.
The png is tinified, the CSS is optimized for size.
The whole package is 14k gzipped, and contains 249 flags.

## Easy to use:

Just download and include **country_flags.css** and **country_flags_sprite.png** (you can find them zipped in **/dist** too)

Example:
```
<div class="country-flag DE"></div> Germany
```

Example test of all flags is in **country_flags_test.html**

## If you want to rebuild the css and flags (You dont need this if you just want to use it):

run

```
npm i
```

then create a **.env** file with your tinify (TinyPNG) API Key [https://tinypng.com/developers]
Like this:

```
TINIFY_API_KEY=<YOUR API KEY>
```

then run
```
node create.js
```

The downloaded Luxemburg (LU) flag .svg had errors, so I included a **LU.svg** that you should copy into **/flags** directory after downloading, then re-run.

If you want the latest data, delete **iso__country_code.html**, **/flags** and **/resized_flags** directories, as those are cached.


