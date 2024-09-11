import { describe, it, expect } from 'vitest';
import { WebMercatorProjection, ILatLng, IPoint } from './zoomtospan';

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
      expect(projection.project({ lat: 0, lng: 360 }, 0)).toEqual({ x: 256, y: 128 });
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
  });
});
