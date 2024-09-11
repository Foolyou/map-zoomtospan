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
    projection: IProjection;
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
    constructor(private readonly worldSize: number) {}

    project(latLng: ILatLng, zoom: number): IPoint {
        const scale = Math.pow(2, zoom) * this.worldSize;
        const x = (latLng.lng / 360 + 0.5) * scale;
        const y = (0.5 - (Math.log(Math.tan(Math.PI * (0.25 + latLng.lat / 360))) / Math.PI) / 2) * scale;
        return { x, y };
    }

    unproject(point: IPoint, zoom: number): ILatLng {
        const scale = Math.pow(2, zoom) * this.worldSize;
        const lng = (point.x / scale - 0.5) * 360;
        const lat = (2 * Math.atan(Math.exp(Math.PI * (1 - 2 * point.y / scale))) - Math.PI / 2) * 180 / Math.PI;
        return { lat, lng };
    }
}

// Helper functions
export function wrapLatLng(latLng: ILatLng): ILatLng {
    if (latLng.lng > 180) {
        latLng.lng -= 360;
    } else if (latLng.lng < -180) {
        latLng.lng += 360;
    }
    if (latLng.lat > 90) {
        latLng.lat = 90;
    } else if (latLng.lat < -90) {
        latLng.lat = -90;
    }
    return latLng;
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

    console.log('--------------------------------');
    console.log('zoom', zoom);
    console.log('bounds', bounds);
    const latlngBounds = {
        ne: {
            lat: projection.unproject({ x: bounds.bottomRight.x, y: bounds.topLeft.y }, zoom).lat,
            lng: projection.unproject({ x: bounds.bottomRight.x, y: bounds.topLeft.y }, zoom).lng,
        },
        sw: {
            lat: projection.unproject({ x: bounds.topLeft.x, y: bounds.bottomRight.y }, zoom).lat,
            lng: projection.unproject({ x: bounds.topLeft.x, y: bounds.bottomRight.y }, zoom).lng,
        },
    };
    // const firstOverlayPosition = overlays[0].position;
    // const firstOverlayPositionPoint = projection.project(firstOverlayPosition, zoom);
    // const antimeridianX = projection.project({ lat: 0, lng: 180 }, zoom).x;
    // const isAcrossAntimeridian = Math.abs(firstOverlayPositionPoint.x - bounds.topLeft.x) > ;
    console.log('--------------------------------', latlngBounds);

    return bounds;
}

export function isAllOverlaysCanBePutInsideContentArea(overlayBounds: IPointBounds, contentBounds: IPointBounds): boolean {
    const overlayWidth = overlayBounds.bottomRight.x - overlayBounds.topLeft.x;
    const overlayHeight = overlayBounds.bottomRight.y - overlayBounds.topLeft.y;
    const contentWidth = contentBounds.bottomRight.x - contentBounds.topLeft.x;
    const contentHeight = contentBounds.bottomRight.y - contentBounds.topLeft.y;
    return overlayWidth <= contentWidth && overlayHeight <= contentHeight;
}

// Main function
export function mapZoomToSpan(options: MapZoomToSpanOptions): MapResult<MapZoomToSpanResult> {
    if (!options.overlays.length) {
        return { ok: false, error: 'No overlays provided' };
    }

    console.log('positions', options.overlays.map(o => JSON.stringify(o.position)));

    const projection = options.projection;
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
    const precision = options.precision || 0.01;

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
    const viewportCenterLatLng = options.projection.unproject(viewportCenterPoint, resultZoom);

    return {
        ok: true,
        result: {
            center: viewportCenterLatLng,
            zoom: resultZoom,
        }
    };
}
