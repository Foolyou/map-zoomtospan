import { useEffect, useRef, useState } from 'react';
import { IInsets, mapZoomToSpan, WebMercatorProjection, IOverlay } from '../src/index';
import styled from 'styled-components';
import maplibregl, { PositionAnchor } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import GeoJSON from 'geojson';

// Styled Components
const StyledButton = styled.button`
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 200px;
  margin: 5px 0;
  padding: 5px 10px;
  cursor: pointer;
`;

const StrongButton = styled(StyledButton)`
  font-weight: bold;
`;

const FullPageContainer = styled.div`
  display: flex;
  width: 100vw;
  height: 100vh;
  background-color: #f0f2f5;
`;

const MapContainer = styled.div`
  flex: 2;
  position: relative;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
`;

const ControlPanelContainer = styled.div`
  flex: 1;
  overflow-y: auto;
  height: 100vh;
  padding: 20px;
  background-color: white;
  border-left: 1px solid #e8e8e8;
`;

const LINE_WIDTH = 8;

// Helper Functions
function getRandomSizeRect() {
    const size = {
        width: Math.random() * 70 + 50,
        height: Math.random() * 70 + 50,
    }

    const el = document.createElement('div');
    el.style.width = `${size.width}px`;
    el.style.height = `${size.height}px`;
    el.style.backgroundColor = 'rgba(255, 0, 0, 0.5)';
    return {
        el,
        size
    };
}

// Add this function before the App component
function createCircleElement(color: string, size: number): HTMLElement {
  const circle = document.createElement('div');
  circle.style.width = `${size}px`;
  circle.style.height = `${size}px`;
  circle.style.borderRadius = '50%';
  circle.style.backgroundColor = color;
  return circle;
}

// Add this function to create a circle element
function createCircleOverlay(color: string, radius: number): HTMLElement {
  const circle = document.createElement('div');
  circle.style.width = `${radius * 2}px`;
  circle.style.height = `${radius * 2}px`;
  circle.style.borderRadius = '50%';
  circle.style.backgroundColor = color;
  return circle;
}

// Map Component
interface MapProps {
    onMapReady: (map: maplibregl.Map) => void;
    onMapClick: (event: maplibregl.MapMouseEvent) => void;
}

const Map = ({ onMapReady, onMapClick }: MapProps) => {
    const mapRef = useRef<HTMLDivElement>(null);
    const [map, setMap] = useState<maplibregl.Map | null>(null);

    useEffect(() => {
        if (mapRef.current) {
            const newMap = new maplibregl.Map({
                container: mapRef.current,
                style: 'https://demotiles.maplibre.org/style.json',
                center: [0, 0],
                zoom: 2,
                maxZoom: 20,
                minZoom: 0,
            });
            setMap(newMap);
            onMapReady(newMap);
        }
    }, []);

    useEffect(() => {
        if (map) {
            map.on('click', onMapClick);
        }

        return () => {
            if (map) {
                map.off('click', onMapClick);
            }
        };
    }, [map, onMapClick]);

    return <div ref={mapRef} id="map" style={{ width: '100%', height: '100%' }}></div>;
};

const projection = new WebMercatorProjection(WebMercatorProjection.defaultWorldSize);

// ControlPanel Component
interface ControlPanelProps {
    viewportSize: { width: number; height: number };
    operationLock: string;
    setOperationLock: (lock: string) => void;
    markers: any[];
    polylines: any[];
    polygons: any[];
    forcedCenter: { lng: number; lat: number } | null;
    setForcedCenter: (center: { lng: number; lat: number } | null) => void;
    clearAll: () => void;
    finishPolyline: () => void;
    finishPolygon: () => void;
    precision: number;
    setPrecision: (precision: number) => void;
    zoomRange: [number, number];
    setZoomRange: (range: [number, number]) => void;
    insets: IInsets;
    setInsets: (insets: IInsets) => void;
    zoomToSpan: () => void;
}

const ControlPanel: React.FC<ControlPanelProps> = ({
    viewportSize,
    operationLock,
    setOperationLock,
    markers,
    polylines,
    polygons,
    forcedCenter,
    setForcedCenter,
    clearAll,
    finishPolyline,
    finishPolygon,
    precision,
    setPrecision,
    zoomRange,
    setZoomRange,
    insets,
    setInsets,
    zoomToSpan
}) => {
    return (
        <ControlPanelContainer>
            <h4 style={{ marginBottom: '20px' }}>zoomToSpan Demo</h4>
            <hr />
            <div style={{ width: '100%' }}>
                <div>
                    <strong>Map Viewport Size:</strong>
                    <span> {viewportSize.width}px x {viewportSize.height}px</span>
                </div>
                <div>
                    <StrongButton onClick={() => {
                        if (operationLock === 'addMarker') {
                            setOperationLock('none');
                        } else {
                            setOperationLock('addMarker');
                        }
                    }}>{operationLock === 'addMarker' ? 'Stop adding markers' : 'Add markers'}</StrongButton>
                    <StrongButton onClick={() => {
                        if (operationLock === 'addCircle') {
                            setOperationLock('none');
                        } else {
                            setOperationLock('addCircle');
                        }
                    }}>{operationLock === 'addCircle' ? 'Stop adding circles' : 'Add circles'}</StrongButton>
                    <StrongButton onClick={() => {
                        if (operationLock === 'addPolyline') {
                            finishPolyline();
                        } else {
                            setOperationLock('addPolyline');
                        }
                    }}>{operationLock === 'addPolyline' ? 'Finish polyline' : 'Add polyline'}</StrongButton>
                    <StrongButton onClick={() => {
                        if (operationLock === 'addPolygon') {
                            finishPolygon();
                        } else {
                            setOperationLock('addPolygon');
                        }
                    }}>{operationLock === 'addPolygon' ? 'Finish polygon' : 'Add polygon'}</StrongButton>
                    <StrongButton onClick={clearAll} disabled={markers.length === 0 && polylines.length === 0 && polygons.length === 0 && !forcedCenter}>Clear all</StrongButton>
                </div>
                <div>
                    <StrongButton onClick={() => setOperationLock('setForcedCenter')}>
                        {forcedCenter ? 'Change forced center' : 'Set forced center'}
                    </StrongButton>
                    {forcedCenter && (
                        <StrongButton onClick={() => setForcedCenter(null)}>
                            Clear forced center
                        </StrongButton>
                    )}
                </div>
                {forcedCenter && (
                    <div>
                        <strong>Forced Center:</strong>
                        <span> {forcedCenter.lng.toFixed(4)}, {forcedCenter.lat.toFixed(4)}</span>
                    </div>
                )}
                <hr />
                <div>
                    <strong>Precision:</strong>
                    <input
                        type="number"
                        min={0.00001}
                        max={1}
                        value={precision}
                        onChange={(e) => setPrecision(parseFloat(e.target.value))}
                        style={{ width: '100%', marginTop: '10px' }}
                    />
                </div>
                <div>
                    <strong>Zoom range:</strong>
                    <input
                        type="range"
                        min={0}
                        max={20}
                        value={zoomRange[0]}
                        onChange={(e) => setZoomRange([parseInt(e.target.value), zoomRange[1]])}
                        style={{ width: '100%', marginTop: '10px' }}
                    />
                    <input
                        type="range"
                        min={0}
                        max={20}
                        value={zoomRange[1]}
                        onChange={(e) => setZoomRange([zoomRange[0], parseInt(e.target.value)])}
                        style={{ width: '100%', marginTop: '10px' }}
                    />
                    <span>Current range: {zoomRange[0].toFixed(precision)} - {zoomRange[1].toFixed(precision)}</span>
                </div>
                <div>
                    <strong>Insets:</strong>
                    <div style={{ width: '100%', marginTop: '10px' }}>
                        <div>
                            <label>Top</label>
                            <input type="number" value={insets.top} onChange={(e) => setInsets({ ...insets, top: parseInt(e.target.value) })} />
                        </div>
                        <div>
                            <label>Left</label>
                            <input type="number" value={insets.left} onChange={(e) => setInsets({ ...insets, left: parseInt(e.target.value) })} />
                        </div>
                        <div>
                            <label>Bottom</label>
                            <input type="number" value={insets.bottom} onChange={(e) => setInsets({ ...insets, bottom: parseInt(e.target.value) })} />
                        </div>
                        <div>
                            <label>Right</label>
                            <input type="number" value={insets.right} onChange={(e) => setInsets({ ...insets, right: parseInt(e.target.value) })} />
                        </div>
                    </div>
                </div>
                
                <StrongButton onClick={zoomToSpan}>zoomToSpan</StrongButton>
            </div>
        </ControlPanelContainer>
    );
};

// Main App Component
export const MapLibrePage = () => {
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 });
    const [map, setMap] = useState<maplibregl.Map | null>(null);
    const [operationLock, setOperationLock] = useState('none');
    const [markers, setMarkers] = useState<any[]>([]);
    const [polylines, setPolylines] = useState<any[]>([]);
    const [polygons, setPolygons] = useState<any[]>([]);
    const [currentPolyline, setCurrentPolyline] = useState<[number, number][]>([]);
    const [currentPolygon, setCurrentPolygon] = useState<[number, number][]>([]);
    const [insets, setInsets] = useState<IInsets>({ top: 0, left: 0, bottom: 0, right: 0 });
    const [zoomRange, setZoomRange] = useState<[number, number]>([0, 20]);
    const [precision, setPrecision] = useState<number>(0.01);
    const [forcedCenter, setForcedCenter] = useState<{ lng: number; lat: number } | null>(null);
    const [forcedCenterMarker, setForcedCenterMarker] = useState<maplibregl.Marker | null>(null);
    const [circles, setCircles] = useState<any[]>([]);
    const [circleMarkers, setCircleMarkers] = useState<maplibregl.Marker[]>([]);

    useEffect(() => {
        const updateViewportSize = () => {
            if (mapContainerRef.current) {
                setViewportSize({
                    width: mapContainerRef.current.clientWidth,
                    height: mapContainerRef.current.clientHeight
                });
            }
        };

        updateViewportSize();
        window.addEventListener('resize', updateViewportSize);

        return () => {
            window.removeEventListener('resize', updateViewportSize);
        };
    }, []);

    useEffect(() => {
        if (map && forcedCenter) {
            if (forcedCenterMarker) {
                forcedCenterMarker.remove();
            }
            const newMarker = new maplibregl.Marker({
                element: createCircleElement('green', 15),
                anchor: 'center'
            }).setLngLat([forcedCenter.lng, forcedCenter.lat]).addTo(map);
            setForcedCenterMarker(newMarker);
        } else if (forcedCenterMarker) {
            forcedCenterMarker.remove();
            setForcedCenterMarker(null);
        }
    }, [map, forcedCenter]);

    const addMarker = (position: maplibregl.LngLat) => {
        if (!map) return;

        const anchorList = [
            { name: 'top-left', anchor: { x: 0, y: 0 } },
            { name: 'top', anchor: { x: 0.5, y: 0 } },
            { name: 'top-right', anchor: { x: 1, y: 0 } },
            { name: 'left', anchor: { x: 0, y: 0.5 } },
            { name: 'center', anchor: { x: 0.5, y: 0.5 } },
            { name: 'right', anchor: { x: 1, y: 0.5 } },
            { name: 'bottom-left', anchor: { x: 0, y: 1 } },
            { name: 'bottom', anchor: { x: 0.5, y: 1 } },
            { name: 'bottom-right', anchor: { x: 1, y: 1 } },
        ];

        const anchor = anchorList[Math.floor(Math.random() * anchorList.length)];
        const { el, size } = getRandomSizeRect();

        const rectMarker = new maplibregl.Marker({
            element: el,
            anchor: anchor.name as PositionAnchor,
        }).setLngLat([position.lng, position.lat]).addTo(map);
        
        const anchorMarker = new maplibregl.Marker({
            element: createCircleElement('blue', 10),
            anchor: 'center'
        }).setLngLat([position.lng, position.lat]).addTo(map);

        setMarkers([...markers, { position: { lng: position.lng, lat: position.lat }, rectMarker, anchorMarker, size, anchor }]);
    };

    const addCircle = (position: maplibregl.LngLat) => {
        if (!map) return;

        const center = position;
        const radius = Math.random() * 30 + 70; // Random radius between 30 and 100
        const newCircle = {
            center: { lng: center.lng, lat: center.lat },
            radius: radius,
        };

        const circleElement = createCircleOverlay('rgba(255, 0, 0, 0.2)', radius);
        const marker = new maplibregl.Marker({
            element: circleElement,
            anchor: 'center',
        }).setLngLat([center.lng, center.lat]).addTo(map);

        setCircles([...circles, newCircle]);
        setCircleMarkers([...circleMarkers, marker]);
    };

    const addPolylinePoint = (position: maplibregl.LngLat) => {
        setCurrentPolyline([...currentPolyline, [position.lng, position.lat]]);
    };

    const addPolygonPoint = (position: maplibregl.LngLat) => {
        setCurrentPolygon([...currentPolygon, [position.lng, position.lat]]);
    };

    const finishPolygon = () => {
        if (!map) return;

        if (currentPolygon.length > 2) {
            const newPolygon: GeoJSON.Feature<GeoJSON.Polygon> = {
                type: 'Feature',
                properties: {},
                geometry: {
                    type: 'Polygon',
                    coordinates: [currentPolygon.concat([currentPolygon[0]])] // Close the polygon
                }
            };

            map.addLayer({
                id: `polygon-${polygons.length}`,
                type: 'fill',
                source: {
                    type: 'geojson',
                    data: newPolygon
                },
                paint: {
                    'fill-color': '#888',
                    'fill-opacity': 0.5
                }
            });

            // Add an outline layer for the polygon
            map.addLayer({
                id: `polygon-outline-${polygons.length}`,
                type: 'line',
                source: {
                    type: 'geojson',
                    data: newPolygon
                },
                paint: {
                    'line-color': '#888',
                    'line-width': LINE_WIDTH
                }
            });

            setPolygons([...polygons, newPolygon]);
            setCurrentPolygon([]);
            setOperationLock('none');
        }
    };

    const finishPolyline = () => {
        if (!map) return;

        if (currentPolyline.length > 1) {
            const newPolyline: GeoJSON.Feature<GeoJSON.LineString> = {
                type: 'Feature',
                properties: {},
                geometry: {
                    type: 'LineString',
                    coordinates: currentPolyline
                }
            };

            map.addLayer({
                id: `polyline-${polylines.length}`,
                type: 'line',
                source: {
                    type: 'geojson',
                    data: newPolyline
                },
                layout: {
                    'line-join': 'round',
                    'line-cap': 'round'
                },
                paint: {
                    'line-color': '#888',
                    'line-width': LINE_WIDTH
                }
            });

            setPolylines([...polylines, newPolyline]);
            setCurrentPolyline([]);
            setOperationLock('none');
        }
    };

    const clearAll = () => {
        markers.forEach(marker => {
            marker.rectMarker.remove();
            marker.anchorMarker.remove();
        });
        setMarkers([]);
        polylines.forEach((_, index) => {
            if (map) {
                map.removeLayer(`polyline-${index}`);
                map.removeSource(`polyline-${index}`);
            }
        });
        setPolylines([]);
        setCurrentPolyline([]);
        polygons.forEach((_, index) => {
            if (map) {
                map.removeLayer(`polygon-${index}`);
                map.removeLayer(`polygon-outline-${index}`); // Remove the outline layer
                map.removeSource(`polygon-${index}`);
            }
        });
        setPolygons([]);
        setCurrentPolygon([]);
        if (forcedCenterMarker) {
            forcedCenterMarker.remove();
            setForcedCenterMarker(null);
        }
        setForcedCenter(null);
        circleMarkers.forEach(marker => marker.remove());
        setCircles([]);
        setCircleMarkers([]);
    };

    const zoomToSpan = () => {
        if (!mapContainerRef.current) return;
        const allOverlays: IOverlay[] = [
            ...markers.map((marker): IOverlay => {
                const { position, size, anchor: { anchor } } = marker;
                return {
                    position,
                    boundingRect: size,
                    anchor,
                };
            }),
            ...polylines.map((polyline): IOverlay => {
                return {
                    points: polyline.geometry.coordinates.map((coord: any) => ({ lng: coord[0], lat: coord[1] })),
                    width: LINE_WIDTH
                }
            }),
            ...polygons.map((polygon): IOverlay => {
                return {
                    points: polygon.geometry.coordinates[0].map((coord: any) => ({ lng: coord[0], lat: coord[1] })),
                    width: LINE_WIDTH
                }
            }),
            ...circles.map((circle): IOverlay => ({
                center: circle.center,
                radius: circle.radius,
            })),
        ];

        const zoomToSpanResult = mapZoomToSpan({
            viewport: {
                size: {
                    width: viewportSize.width,
                    height: viewportSize.height,
                },
                insets
            },
            projection,
            overlays: allOverlays,
            zoomRange,
            precision,
            center: forcedCenter ? { lng: forcedCenter.lng, lat: forcedCenter.lat } : undefined,
        });

        if (zoomToSpanResult.ok) {
            const { center, zoom } = zoomToSpanResult.result;
            if (map) {
                map.setZoom(zoom);
                map.setCenter([center.lng, center.lat]);
            }
        } else {
            console.error('zoomToSpan', zoomToSpanResult.error);
        }
    };

    const onMapReady = (map: any) => {
        setMap(map);
        setViewportSize({
            width: map.getContainer().clientWidth,
            height: map.getContainer().clientHeight
        });
    };

    const onMapClick = (event: any) => {
        if (operationLock === 'none') {
            return;
        }

        if (operationLock === 'addMarker') {
            addMarker(event.lngLat);
            return;
        }

        if (operationLock === 'addPolyline') {
            addPolylinePoint(event.lngLat);
            return;
        }

        if (operationLock === 'addPolygon') {
            addPolygonPoint(event.lngLat);
            return;
        }

        if (operationLock === 'addCircle') {
            addCircle(event.lngLat);
            return;
        }

        if (operationLock === 'setForcedCenter') {
            setForcedCenter(event.lngLat);
            setOperationLock('none');
            return;
        }
    };

    return (
        maplibregl ?
            <FullPageContainer>
                <MapContainer ref={mapContainerRef}>
                    <Map
                        onMapReady={onMapReady}
                        onMapClick={onMapClick}
                    />
                    <div className="insets-indicator" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
                        <div className="insets-indicator-top" style={{ position: 'absolute', top: 0, left: 0, right: 0, height: `${insets.top}px`, backgroundColor: 'rgba(128, 128, 0, 0.5)' }}></div>
                        <div className="insets-indicator-left" style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: `${insets.left}px`, backgroundColor: 'rgba(128, 128, 0, 0.5)' }}></div>
                        <div className="insets-indicator-bottom" style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: `${insets.bottom}px`, backgroundColor: 'rgba(128, 128, 0, 0.5)' }}></div>
                        <div className="insets-indicator-right" style={{ position: 'absolute', top: 0, right: 0, bottom: 0, width: `${insets.right}px`, backgroundColor: 'rgba(128, 128, 0, 0.5)' }}></div>
                    </div>
                </MapContainer>
                <ControlPanel
                    viewportSize={viewportSize}
                    operationLock={operationLock}
                    setOperationLock={setOperationLock}
                    markers={markers}
                    polylines={polylines}
                    polygons={polygons}
                    forcedCenter={forcedCenter}
                    setForcedCenter={setForcedCenter}
                    clearAll={clearAll}
                    finishPolyline={finishPolyline}
                    finishPolygon={finishPolygon}
                    precision={precision}
                    setPrecision={setPrecision}
                    zoomRange={zoomRange}
                    setZoomRange={setZoomRange}
                    insets={insets}
                    setInsets={setInsets}
                    zoomToSpan={zoomToSpan}
                />
            </FullPageContainer>
            :
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
                <span>Loading MapLibre GL JS...</span>
            </div>
    );
};