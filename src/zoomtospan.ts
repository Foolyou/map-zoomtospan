// Type definitions
export interface ILatLng {
    lat: number;
    lng: number;
}

export interface ILatLngBounds {
    ne: ILatLng;
    sw: ILatLng;
}

export interface IPoint {
    x: number;
    y: number;
}

export interface IPointBounds {
    topLeft: IPoint;
    bottomRight: IPoint;
}

export interface ISize {
    width: number;
    height: number;
}

export interface IInsets {
    left: number;
    right: number;
    top: number;
    bottom: number;
}

export interface IAnchor {
    x: number;
    y: number;
}

export interface IViewport {
    size: ISize;
    insets: IInsets;
}

export interface IPolylineOverlay {
    points: ILatLng[];
    width: number;
}

export type IPolygonOverlay = IPolylineOverlay;

export interface ICircleOverlay {
    center: ILatLng;
    radius: number;
}

export interface IMarkerOverlay {
    position: ILatLng;
    boundingRect?: ISize;
    anchor?: IAnchor;
}

export type IStandardOverlay = IMarkerOverlay;

export type IOverlay = IPolylineOverlay | ICircleOverlay | IMarkerOverlay;

export interface MapZoomToSpanOptions {
    center?: ILatLng;
    zoomRange?: [number, number];
    viewport: IViewport;
    overlays: IOverlay[];
    projection?: IProjection;
    worldSize?: number;
    precision?: number;
}

export type MapResult<T> = {
    ok: true;
    result: T;
} | {
    ok: false;
    error: string;
}

export interface MapZoomToSpanResult {
    center: ILatLng;
    zoom: number;
}

export interface IProjection {
    project(latLng: ILatLng, zoom: number): IPoint;
    unproject(point: IPoint, zoom: number): ILatLng;
}

// Classes
export class WebMercatorProjection implements IProjection {
    constructor(private readonly worldSize: number = WebMercatorProjection.defaultWorldSize) {}

    project(latLng: ILatLng, zoom?: number): IPoint {
        const x = latLng.lng / 360 + 0.5;
        const y = 0.5 - (Math.log(Math.tan(Math.PI * (0.25 + latLng.lat / 360))) / Math.PI) / 2;

        if (zoom === undefined) {
            return { x, y };
        }

        const scale = Math.pow(2, zoom) * this.worldSize;
        return { x: x * scale, y: y * scale };
    }

    unproject(point: IPoint, zoom?: number): ILatLng {
        if (zoom === undefined) {
            return {
                lat: (point.x - 0.5) * 360,
                lng: (2 * Math.atan(Math.exp(Math.PI * (1 - 2 * point.y))) - Math.PI / 2) * 180 / Math.PI
            }
        }

        const scale = Math.pow(2, zoom) * this.worldSize;
        const lng = (point.x / scale - 0.5) * 360;
        const lat = (2 * Math.atan(Math.exp(Math.PI * (1 - 2 * point.y / scale))) - Math.PI / 2) * 180 / Math.PI;
        return { lat, lng };
    }

    static readonly defaultWorldSize = 512;
}

// Helper functions
export function wrapLng(lng: number): number {
    if (lng > 180) {
        return lng - 360;
    } else if (lng < -180) {
        return lng + 360;
    }
    return lng;
}

export function wrapLat(lat: number): number {
    if (lat > 90) {
        return 90;
    } else if (lat < -90) {
        return -90;
    }
    return lat;
}

export function wrapLatLng(latLng: ILatLng): ILatLng {
    return {
        lat: wrapLat(latLng.lat),
        lng: wrapLng(latLng.lng),
    };
}

export function extendLatLngBounds(bounds: ILatLngBounds, otherBounds: ILatLng | ILatLngBounds): ILatLngBounds {
    if ('lat' in otherBounds && 'lng' in otherBounds) {
        return {
            ne: {
                lat: Math.max(bounds.ne.lat, otherBounds.lat),
                lng: Math.max(bounds.ne.lng, otherBounds.lng),
            },
            sw: {
                lat: Math.min(bounds.sw.lat, otherBounds.lat),
                lng: Math.min(bounds.sw.lng, otherBounds.lng),
            },
        };
    } else if ('ne' in otherBounds && 'sw' in otherBounds) {
        return {
            ne: {
                lat: Math.max(bounds.ne.lat, otherBounds.ne.lat),
                lng: Math.max(bounds.ne.lng, otherBounds.ne.lng),
            },
            sw: {
                lat: Math.min(bounds.sw.lat, otherBounds.sw.lat),
                lng: Math.min(bounds.sw.lng, otherBounds.sw.lng),
            },
        };
    }
    throw new Error('Invalid bounds');
}

export function extendPointBounds(bounds: IPointBounds, otherBounds: IPointBounds): IPointBounds {
    return {
        topLeft: {
            x: Math.min(bounds.topLeft.x, otherBounds.topLeft.x),
            y: Math.min(bounds.topLeft.y, otherBounds.topLeft.y),
        },
        bottomRight: {
            x: Math.max(bounds.bottomRight.x, otherBounds.bottomRight.x),
            y: Math.max(bounds.bottomRight.y, otherBounds.bottomRight.y),
        },
    };
}

export function normalizeOverlay(overlay: IOverlay): IStandardOverlay[] {
    if ('position' in overlay) {
        return [overlay];
    }

    if ('center' in overlay) {
        return [
            {
                position: overlay.center,
                boundingRect: {
                width: overlay.radius * 2,
                height: overlay.radius * 2,
            },
            anchor: { x: 0.5, y: 0.5 },
        }];
    }

    if ('points' in overlay) {
        let bounds: ILatLngBounds = {
            ne: { lng: overlay.points[0].lng, lat: overlay.points[0].lat },
            sw: { lng: overlay.points[0].lng, lat: overlay.points[0].lat },
        };
        for (const coord of overlay.points) {
            bounds = extendLatLngBounds(bounds, coord);
        }
        return [
            {
                position: { lng: bounds.ne.lng, lat: bounds.ne.lat },
                boundingRect: { width: overlay.width, height: overlay.width },
                anchor: { x: 0.5, y: 0.5 },
            },
            {
                position: { lng: bounds.sw.lng, lat: bounds.sw.lat },
                boundingRect: { width: overlay.width, height: overlay.width },
                anchor: { x: 0.5, y: 0.5 },
            }
        ]
    }

    throw new Error('Invalid overlay');
}

export function getOverlaysContainingPointBounds(overlays: IStandardOverlay[], zoom: number, projection: IProjection): IPointBounds {
    let bounds: IPointBounds = {
        topLeft: { x: Infinity, y: Infinity },
        bottomRight: { x: -Infinity, y: -Infinity },
    };

    for (const overlay of overlays) {
        const point = projection.project(overlay.position, zoom);
        const { boundingRect = { width: 0, height: 0 } } = overlay;
        const { anchor = { x: 0.5, y: 0.5 } } = overlay;
        const overlayTopLeft = {
            x: point.x - anchor.x * boundingRect.width,
            y: point.y - anchor.y * boundingRect.height,
        };
        const overlayBottomRight = {
            x: point.x + (1 - anchor.x) * boundingRect.width,
            y: point.y + (1 - anchor.y) * boundingRect.height,
        };
        bounds = extendPointBounds(bounds, { topLeft: overlayTopLeft, bottomRight: overlayBottomRight });
    }

    return bounds
}

export function extendOverlaysContainingPointBoundsWithCenter(overlays: IStandardOverlay[], zoom: number, projection: IProjection, center: ILatLng): IPointBounds {
    const centerPoint = projection.project(center, zoom);
    const overlayBounds = getOverlaysContainingPointBounds(overlays, zoom, projection);
    
    const leftToCenter = Math.abs(centerPoint.x - overlayBounds.topLeft.x);
    const rightToCenter = Math.abs(overlayBounds.bottomRight.x - centerPoint.x);
    const maxHorizontalDistance = Math.max(leftToCenter, rightToCenter);
    
    const topToCenter = Math.abs(centerPoint.y - overlayBounds.topLeft.y);
    const bottomToCenter = Math.abs(overlayBounds.bottomRight.y - centerPoint.y);
    const maxVerticalDistance = Math.max(topToCenter, bottomToCenter);
    
    const extendedBounds = {
        topLeft: {
            x: centerPoint.x - maxHorizontalDistance,
            y: centerPoint.y - maxVerticalDistance
        },
        bottomRight: {
            x: centerPoint.x + maxHorizontalDistance,
            y: centerPoint.y + maxVerticalDistance
        }
    };
    
    return extendedBounds;
}

export function isAllOverlaysCanBePutInsideContentArea(overlayBounds: IPointBounds, contentBounds: IPointBounds): boolean {
    const overlayWidth = Math.abs(overlayBounds.bottomRight.x - overlayBounds.topLeft.x);
    const overlayHeight = Math.abs(overlayBounds.bottomRight.y - overlayBounds.topLeft.y);
    const contentWidth = Math.abs(contentBounds.bottomRight.x - contentBounds.topLeft.x);
    const contentHeight = Math.abs(contentBounds.bottomRight.y - contentBounds.topLeft.y);
    return overlayWidth <= contentWidth && overlayHeight <= contentHeight;
}

// Main function
export function mapZoomToSpan(options: MapZoomToSpanOptions): MapResult<MapZoomToSpanResult> {
    if (!options.overlays.length) {
        return { ok: false, error: 'No overlays provided' };
    }

    const overlays = options.overlays.flatMap(normalizeOverlay);

    const projection = options.projection || new WebMercatorProjection(options.worldSize || WebMercatorProjection.defaultWorldSize);
    const contentBounds: IPointBounds = {
        topLeft: {
            x: options.viewport.insets.left,
            y: options.viewport.insets.top,
        },
        bottomRight: {
            x: options.viewport.size.width - options.viewport.insets.right,
            y: options.viewport.size.height - options.viewport.insets.bottom,
        },
    };

    const centerOffsetInPixels: IPoint = {
        x: (options.viewport.insets.left - options.viewport.insets.right) / 2,
        y: (options.viewport.insets.top - options.viewport.insets.bottom) / 2,
    };

    const zoomRange = options.zoomRange || [0, 20];
    const precision = options.precision || 0.01;

    let resultZoom = zoomRange[1];
    let resultOverlayBounds: IPointBounds | null = null;
    let foundValidZoom = false;

    const totalSteps = Math.floor((zoomRange[1] - zoomRange[0]) / precision);

    let leftZoomStep = 0;
    let rightZoomStep = totalSteps;

    do {
        const currentZoomStep = Math.floor((leftZoomStep + rightZoomStep) / 2);
        let currentZoom = zoomRange[0] + currentZoomStep * precision;
        let overlayBounds = getOverlaysContainingPointBounds(overlays, currentZoom, projection);

        if (options.center) {
            overlayBounds = extendOverlaysContainingPointBoundsWithCenter(overlays, currentZoom, projection, options.center);
        }

        if (isAllOverlaysCanBePutInsideContentArea(overlayBounds, contentBounds)) {
            leftZoomStep = currentZoomStep + 1;
            resultZoom = currentZoom;
            resultOverlayBounds = overlayBounds;
            foundValidZoom = true;
        } else {
            rightZoomStep = currentZoomStep - 1;
        }
    } while (rightZoomStep >= leftZoomStep);

    if (!foundValidZoom || !resultOverlayBounds) {
        return { ok: false, error: 'No valid zoom was found' };
    }

    const overlayCenterPoint = {
        x: (resultOverlayBounds.topLeft.x + resultOverlayBounds.bottomRight.x) / 2,
        y: (resultOverlayBounds.topLeft.y + resultOverlayBounds.bottomRight.y) / 2,
    };
    const viewportCenterPoint = {
        x: overlayCenterPoint.x - centerOffsetInPixels.x,
        y: overlayCenterPoint.y - centerOffsetInPixels.y,
    };
    const viewportCenterLatLng = projection.unproject(viewportCenterPoint, resultZoom);

    return {
        ok: true,
        result: {
            center: options.center || viewportCenterLatLng,
            zoom: resultZoom,
        }
    };
}
