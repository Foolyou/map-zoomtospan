# map-zoomtospan

A cross-platform utility to calculate a reasonable map zoom level and/or center point for a given map viewport.

## Installation

```bash
npm install map-zoomtospan
```

## Usage

## development

First, you need to set the environment variables:

```bash
cp .env.example .env # and then set the keys and secrets in .env
```

Then, install dependencies:

```bash
npm install
```

This projects' demo requires an AMap key and security code, which can be obtained by registering an account on the [AMap Open Platform](https://lbs.amap.com/dev/key/app).

But if you don't want to use AMap, you can use [MapLibre GL JS](https://maplibre.org/projects/maplibre-gl-js/) (or other map providers) instead. But you still need to apply for a key from [MapLibre GL JS](https://maplibre.org/projects/maplibre-gl-js/). Remember, do not keep your key and secret in the source code, and do not publish them to the public.

Then, run the development server:

```bash
npm run dev
```

## License

MIT
