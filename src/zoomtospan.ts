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

export interface IOverlay {
    position: ILatLng;
    boundingRect?: ISize;
    anchor?: IAnchor;
}

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

export function getOverlaysContainingPointBounds(overlays: IOverlay[], zoom: number, projection: IProjection): IPointBounds {
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
    let leftZoomValue = zoomRange[0];
    let rightZoomValue = zoomRange[1];

    // some map library uses integer zoom levels, so we set 1 as default precision
    const precision = options.precision || 1;

    let resultZoom = leftZoomValue;
    let resultOverlayBounds: IPointBounds | null = null;
    let foundValidZoom = false;

    while (rightZoomValue - leftZoomValue > precision) {
        const currentZoom = (leftZoomValue + rightZoomValue) / 2;
        const overlayBounds = getOverlaysContainingPointBounds(options.overlays, currentZoom, projection);
        if (isAllOverlaysCanBePutInsideContentArea(overlayBounds, contentBounds)) {
            leftZoomValue = currentZoom;
            resultZoom = currentZoom;
            resultOverlayBounds = overlayBounds;
            foundValidZoom = true;
        } else {
            rightZoomValue = currentZoom;
        }
    }

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
            center: viewportCenterLatLng,
            zoom: resultZoom,
        }
    };
}
