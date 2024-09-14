import { describe, it, expect } from 'vitest';
import {
  WebMercatorProjection,
  ILatLng,
  IPoint,
  wrapLng,
  wrapLat,
  wrapLatLng,
  extendLatLngBounds,
  extendPointBounds,
  normalizeOverlay,
  IMarkerOverlay,
  ICircleOverlay,
  IPolygonOverlay,
  IPolylineOverlay,
  mapZoomToSpan,
} from './zoomtospan';

describe('WebMercatorProjection', () => {
  const worldSize = 256;
  const projection = new WebMercatorProjection(worldSize);

  describe('project', () => {
    it('should project (0, 0) to the center of the world', () => {
      const latLng: ILatLng = { lat: 0, lng: 0 };
      const expected: IPoint = { x: 128, y: 128 };
      expect(projection.project(latLng, 0)).toEqual(expected);
    });

    it('should project correctly at different zoom levels', () => {
      const latLng: ILatLng = { lat: 45, lng: 45 };
      const proj0 = projection.project(latLng, 0);
      const proj1 = projection.project(latLng, 1);
      expect(proj1.x).toBeCloseTo(proj0.x * 2);
      expect(proj1.y).toBeCloseTo(proj0.y * 2);
    });

    it('should handle extreme latitudes', () => {
      const north: ILatLng = { lat: 85, lng: 0 };
      const south: ILatLng = { lat: -85, lng: 0 };
      const projectedNorth = projection.project(north, 0);
      const projectedSouth = projection.project(south, 0);
      expect(projectedNorth.y).toBeLessThan(projectedSouth.y);
    });

    it('should handle negative longitudes correctly', () => {
      expect(projection.project({ lat: 0, lng: -180 }, 0)).toEqual({ x: 0, y: 128 });
      expect(projection.project({ lat: 0, lng: 0 }, 0)).toEqual({ x: 128, y: 128 });
      expect(projection.project({ lat: 0, lng: 180 }, 0)).toEqual({ x: 256, y: 128 });
      expect(projection.project({ lat: 0, lng: 360 }, 0)).toEqual({ x: 384, y: 128 });
    });

    it('should handle undefined zoom and return 0-1 result', () => {
      const latLng: ILatLng = { lat: 0, lng: 0 };
      expect(projection.project(latLng)).toEqual({ x: 0.5, y: 0.5 });
    });
  });

  describe('unproject', () => {
    it('should unproject the center of the world to (0, 0)', () => {
      const point: IPoint = { x: 128, y: 128 };
      const expected: ILatLng = { lat: 0, lng: 0 };
      const result = projection.unproject(point, 0);
      console.log(result);
      expect(result.lat).toBeCloseTo(expected.lat);
      expect(result.lng).toBeCloseTo(expected.lng);
    });

    it('should unproject correctly at different zoom levels', () => {
      const point: IPoint = { x: 192, y: 96 };
      const unproj0 = projection.unproject(point, 0);
      const unproj1 = projection.unproject({ x: point.x * 2, y: point.y * 2 }, 1);
      expect(unproj0.lat).toBeCloseTo(unproj1.lat);
      expect(unproj0.lng).toBeCloseTo(unproj1.lng);
    });

    it('should be the inverse of project', () => {
      const original: ILatLng = { lat: 37.7749, lng: -122.4194 };
      const projected = projection.project(original, 10);
      const unprojected = projection.unproject(projected, 10);
      expect(unprojected.lat).toBeCloseTo(original.lat);
      expect(unprojected.lng).toBeCloseTo(original.lng);
    });

    it('should handle undefined zoom', () => {
      expect(projection.unproject({ x: 0.5, y: 0.5 })).toEqual({ lat: 0, lng: 0 });
    });
  });
});

describe('wrap', () => {
  describe('wrapLng', () => { 
    it('should wrap longitudes correctly', () => {
      expect(wrapLng(180)).toBe(180);
      expect(wrapLng(-180)).toBe(-180);
      expect(wrapLng(190)).toBe(-170);
      expect(wrapLng(-190)).toBe(170);
    });
  });

  describe('wrapLat', () => {
    it('should wrap latitudes correctly', () => {
      expect(wrapLat(90)).toBe(90);
      expect(wrapLat(-90)).toBe(-90);
      expect(wrapLat(95)).toBe(90);
      expect(wrapLat(-95)).toBe(-90);
    });
  });

  describe('wrapLatLng', () => {
    it('should wrap latlng correctly', () => {
      expect(wrapLatLng({ lat: 90, lng: 180 })).toEqual({ lat: 90, lng: 180 });
      expect(wrapLatLng({ lat: -90, lng: -180 })).toEqual({ lat: -90, lng: -180 });
      expect(wrapLatLng({ lat: 90, lng: 190 })).toEqual({ lat: 90, lng: -170 });
      expect(wrapLatLng({ lat: -90, lng: 190 })).toEqual({ lat: -90, lng: -170 });
      expect(wrapLatLng({ lat: 90, lng: 360 })).toEqual({ lat: 90, lng: 0 });
      expect(wrapLatLng({ lat: -90, lng: 360 })).toEqual({ lat: -90, lng: 0 });
      expect(wrapLatLng({ lat: 100, lng: 370 })).toEqual({ lat: 90, lng: 10 });
      expect(wrapLatLng({ lat: -100, lng: 370 })).toEqual({ lat: -90, lng: 10 });
    });
  });
});

describe('extendLatLngBounds', () => {
  it('should extend latlng bounds correctly', () => {
    const bounds1 = { ne: { lat: 10, lng: 10 }, sw: { lat: 0, lng: 0 } };
    const bounds2 = { ne: { lat: 20, lng: 20 }, sw: { lat: 10, lng: 10 } };
    const extended = extendLatLngBounds(bounds1, bounds2);
    expect(extended.ne).toEqual({ lat: 20, lng: 20 });
    expect(extended.sw).toEqual({ lat: 0, lng: 0 });
  });

  it('should handle a ILatLng input', () => {
    const bounds1 = { ne: { lat: 10, lng: 10 }, sw: { lat: 0, lng: 0 } };
    const extended = extendLatLngBounds(bounds1, { lat: 20, lng: 20 });
    expect(extended.ne).toEqual({ lat: 20, lng: 20 });
    expect(extended.sw).toEqual({ lat: 0, lng: 0 });
  });

  it('should throw an error for invalid bounds', () => {
    expect(() => extendLatLngBounds({ ne: { lat: 10, lng: 10 }, sw: { lat: 0, lng: 0 } }, { ne: { lat: 20, lng: 20 }, sw: { lat: 10, lng: 10 } })).not.toThrow();
    expect(() => extendLatLngBounds({ ne: { lat: 10, lng: 10 }, sw: { lat: 0, lng: 0 } }, { ne: { lat: 20, lng: 20 }, sw: { lat: 10, lng: 10 } })).not.toThrow();
    expect(() => extendLatLngBounds({ ne: { lat: 10, lng: 10 }, sw: { lat: 0, lng: 0 } }, {} as any)).toThrow();
  });
});

describe('extendPointBounds', () => {
  it('should extend point bounds correctly', () => {
    const bounds1 = { topLeft: { x: 0, y: 0 }, bottomRight: { x: 10, y: 10 } };
    const bounds2 = { topLeft: { x: 10, y: 10 }, bottomRight: { x: 20, y: 20 } };
    const extended = extendPointBounds(bounds1, bounds2);
    expect(extended.topLeft).toEqual({ x: 0, y: 0 });
    expect(extended.bottomRight).toEqual({ x: 20, y: 20 });
  });
});

describe('normalizeOverlay', () => {
  it('should normalize IMarkerOverlay correctly', () => {
    const overlay: IMarkerOverlay = {
      position: { lat: 10, lng: 10 },
      anchor: { x: 10, y: 10 },
      boundingRect: {
        width: 10,
        height: 10,
      },
    };
    expect(normalizeOverlay(overlay)).toEqual([overlay]);
  });

  it('should normalize IPolylineOverlay correctly', () => {
    const overlay: IPolylineOverlay = {
      points: [{ lat: 10, lng: 10 }, { lat: 20, lng: 20 }],
      width: 10,
    };
    expect(normalizeOverlay(overlay)).toEqual([{
      position: { lat: 20, lng: 20 },
      anchor: { x: 0.5, y: 0.5 },
      boundingRect: {
        width: 10,
        height: 10,
      },
    }, {
      position: { lat: 10, lng: 10 },
      anchor: { x: 0.5, y: 0.5 },
      boundingRect: {
        width: 10,
        height: 10,
      },
    }]);
  });
  
  it('should normalize ICircleOverlay correctly', () => {
    const overlay: ICircleOverlay = {
      center: { lat: 10, lng: 10 },
      radius: 10,
    };
    expect(normalizeOverlay(overlay)).toEqual([{
      position: { lat: 10, lng: 10 },
      anchor: { x: 0.5, y: 0.5 },
      boundingRect: {
        width: 20,
        height: 20,
      },
    }]);
  });

  it('should normalize IPolygonOverlay correctly', () => {
    const overlay: IPolygonOverlay = {
      points: [{ lat: 10, lng: 10 }, { lat: 20, lng: 20 }],
      width: 10,
    };
    expect(normalizeOverlay(overlay)).toEqual([{
      position: { lat: 20, lng: 20 },
      anchor: { x: 0.5, y: 0.5 },
      boundingRect: {
        width: 10,
        height: 10,
      },
    }, {
      position: { lat: 10, lng: 10 },
      anchor: { x: 0.5, y: 0.5 },
      boundingRect: {
        width: 10,
        height: 10,
      },
    }]);
  });

  it('should throw an error for invalid overlay', () => {
    expect(() => normalizeOverlay({} as any)).toThrow();
  });
});

describe('zoomToSpan', () => {
  it('should return error for no overlays', () => {
    expect(mapZoomToSpan({
      overlays: [],
      viewport: {
        size: { width: 100, height: 100 },
        insets: { left: 0, top: 0, right: 0, bottom: 0 },
      },
    })).toEqual({ ok: false, error: 'No overlays provided' });
  });

  it('should return biggest zoom for a single small marker', () => {
    const mapResult = mapZoomToSpan({
      overlays: [{
        position: { lat: 0, lng: 0 },
        anchor: { x: 0.5, y: 0.5 },
        boundingRect: {
          width: 0,
          height: 0,
        },
      }],
      viewport: {
        size: { width: 100, height: 100 },
        insets: { left: 0, top: 0, right: 0, bottom: 0 },
      }
    })
    if (mapResult.ok) {
      expect(mapResult.result!.zoom).toBeCloseTo(20);
      expect(mapResult.result!.center.lat).toBeCloseTo(0);
      expect(mapResult.result!.center.lng).toBeCloseTo(0);
    } else {
      throw new Error(mapResult.error);
    }
  });

  it('should return a false when no zoom level could contain all overlays', () => {
    const mapResult = mapZoomToSpan({
      overlays: [{
        position: { lat: 0, lng: 0 },
        anchor: { x: 0.5, y: 0.5 },
        boundingRect: {
          width: 200,
          height: 200,
        },
      }],
      viewport: {
        size: { width: 100, height: 100 },
        insets: { left: 0, top: 0, right: 0, bottom: 0 },
      }
    });
    expect(mapResult.ok).toBe(false);
  });

  it('should handle the case when steps is not a multiple of precision', () => {
    const mapResult = mapZoomToSpan({
      overlays: [{
        position: { lat: 0, lng: 0 },
        anchor: { x: 0.5, y: 0.5 },
        boundingRect: {
          width: 0,
          height: 0,
        },
      }],
      viewport: {
        size: { width: 100, height: 100 },
        insets: { left: 0, top: 0, right: 0, bottom: 0 },
      },
      precision: 0.3,
      zoomRange: [10, 20],
    });
    if (mapResult.ok) {
      expect(mapResult.result!.zoom).toBeCloseTo(19.9);
    } else {
      throw new Error(mapResult.error);
    }
  });

  it('should keep the given center', () => {
    const mapResult = mapZoomToSpan({
      overlays: [{
        position: { lat: 0, lng: 0 },
        anchor: { x: 0.5, y: 0.5 },
        boundingRect: {
          width: 0,
          height: 0,
        },
      }],
      viewport: {
        size: { width: 800, height: 800 },
        insets: { left: 0, top: 0, right: 0, bottom: 0 },
      },
      center: { lat: 10, lng: 10 },
      precision: 1
    });
    if (mapResult.ok) {
      expect(mapResult.result!.center.lat).toBeCloseTo(10);
      expect(mapResult.result!.center.lng).toBeCloseTo(10);
      expect(mapResult.result!.zoom).toBeCloseTo(4);
    } else {
      throw new Error(mapResult.error);
    }
  });

  it('should handle the case when overlays are not normalized', () => {
    const mapResult = mapZoomToSpan({
      "viewport": {
        "size": {
          "width": 697,
          "height": 754
        },
        "insets": {
          "top": 0,
          "left": 0,
          "bottom": 0,
          "right": 0
        }
      },
      "overlays": [
        {
          "position": {
            "lng": 2.900390625002075,
            "lat": 35.60371874069665
          },
          "boundingRect": {
            "width": 96.37073318456046,
            "height": 68.1845279354911
          },
          "anchor": {
            "x": 0,
            "y": 0
          }
        },
        {
          "position": {
            "lng": 9.052734375001592,
            "lat": 16.467694748288096
          },
          "boundingRect": {
            "width": 63.86991242107034,
            "height": 66.34798959557844
          },
          "anchor": {
            "x": 0.5,
            "y": 0
          }
        },
        {
          "position": {
            "lng": -9.931640624998494,
            "lat": -2.635788574167208
          },
          "boundingRect": {
            "width": 75.968545447278,
            "height": 105.18221833265311
          },
          "anchor": {
            "x": 0.5,
            "y": 0
          }
        },
        {
          "position": {
            "lng": 49.907857887755654,
            "lat": 11.178401873709163
          },
          "boundingRect": {
            "width": 91.99197022523205,
            "height": 57.40699932445306
          },
          "anchor": {
            "x": 1,
            "y": 1
          }
        },
        {
          "points": [
            {
              "lng": 55.70863913775554,
              "lat": -1.230374177434797
            },
            {
              "lng": 36.37270163775588,
              "lat": 5.965753671063098
            },
            {
              "lng": 51.31410788775548,
              "lat": -33.87041555094431
            },
            {
              "lng": 82.25160788775497,
              "lat": -32.39851580247581
            },
            {
              "lng": 93.85317038775474,
              "lat": -1.4061088354378768
            }
          ],
          "width": 8
        },
        {
          "points": [
            {
              "lng": -22.070275500636455,
              "lat": 57.59300408298171
            },
            {
              "lng": -32.61715050063597,
              "lat": 45.314259540893744
            },
            {
              "lng": -18.378869250636313,
              "lat": 39.88524731463335
            },
            {
              "lng": 16.074255749363402,
              "lat": 44.06465307537448
            },
            {
              "lng": 19.765661999363488,
              "lat": 62.980661008026686
            },
            {
              "lng": 27.500036999363346,
              "lat": 67.86351648655946
            },
            {
              "lng": 3.2422244993635445,
              "lat": 60.39808854628299
            },
            {
              "lng": -22.070275500636455,
              "lat": 57.59300408298171
            }
          ],
          "width": 8
        },
        {
          "center": {
            "lng": 20.903951637756165,
            "lat": -18.64624514267338
          },
          "radius": 84.84525079131373
        },
        {
          "center": {
            "lng": 69.59535788775491,
            "lat": 26.27371402440393
          },
          "radius": 96.17766164504901
        }
      ],
      "zoomRange": [
        0,
        20
      ],
      "precision": 0.01
    });
    if (mapResult.ok) {
      expect(mapResult.result!.zoom).toBeCloseTo(1.93);
      expect(mapResult.result!.center.lat).toBeCloseTo(27.591526);
      expect(mapResult.result!.center.lng).toBeCloseTo(30.618009);
    } else {
      throw new Error(mapResult.error);
    }
  });
});