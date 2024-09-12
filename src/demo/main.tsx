import { createRoot } from 'react-dom/client';
import { useEffect, useRef, useState, useCallback } from 'react';
import { IInsets, mapZoomToSpan, WebMercatorProjection, IOverlay } from '../index';
import './main.css';
import styled from 'styled-components';
import maplibregl, { PositionAnchor, LngLatBounds } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

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

const ControlPanel = styled.div`
  flex: 1;
  overflow-y: auto;
  height: 100vh;
  padding: 20px;
  background-color: white;
  border-left: 1px solid #e8e8e8;
`;

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

// Map Component
interface MapProps {
    onMapReady: (map: any) => void;
    onMapClick: (event: any) => void;
}

const Map = ({ onMapReady, onMapClick }: MapProps) => {
    const mapRef = useRef(null);
    const [map, setMap] = useState<any>(null);

    useEffect(() => {
        if (mapRef.current) {
            const map = new maplibregl.Map({
                container: mapRef.current,
                style: 'https://demotiles.maplibre.org/style.json',
                center: [0, 0],
                zoom: 2,
                maxZoom: 20,
                minZoom: 0,
            });
            setMap(map);
            onMapReady(map);
        }
    }, [onMapReady]);

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

// Main App Component
const App = () => {
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 });
    const [map, setMap] = useState<any>(null);
    const [operationLock, setOperationLock] = useState('none');
    const [markers, setMarkers] = useState<any[]>([]);
    const [insets, setInsets] = useState<IInsets>({ top: 0, left: 0, bottom: 0, right: 0 });
    const [zoomRange, setZoomRange] = useState<[number, number]>([0, 20]);
    const [precision, setPrecision] = useState<number>(1);

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

    const addMarker = useCallback((position: any) => {
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
    }, [map, markers]);

    const clearMarkers = useCallback(() => {
        markers.forEach(marker => {
            marker.rectMarker.remove();
            marker.anchorMarker.remove();
        });
        setMarkers([]);
    }, [map, markers]);

    const zoomToSpan = useCallback(() => {
        if (!mapContainerRef.current) return;

        const zoomToSpanResult = mapZoomToSpan({
            viewport: {
                size: {
                    width: viewportSize.width,
                    height: viewportSize.height,
                },
                insets
            },
            projection,
            overlays: markers.map((marker): IOverlay => {
                const { position, size, anchor: { anchor } } = marker;
                return {
                    position,
                    boundingRect: size,
                    anchor,
                };
            }),
            zoomRange,
            precision,
        });

        if (zoomToSpanResult.ok) {
            const { center, zoom } = zoomToSpanResult.result;
            map.setZoom(zoom);
            map.setCenter([center.lng, center.lat]);
        } else {
            console.error('zoomToSpan', zoomToSpanResult.error);
        }
    }, [map, markers, viewportSize, insets, zoomRange, precision]);

    const onMapReady = useCallback((map: any) => {
        setMap(map);
        setViewportSize({
            width: map.getContainer().clientWidth,
            height: map.getContainer().clientHeight
        });
    }, []);

    const onMapClick = useCallback((event: any) => {
        const point = projection.project(event.lngLat, map.getZoom());

        if (operationLock === 'none') {
            return;
        }

        if (operationLock === 'addMarker') {
            addMarker(event.lngLat);
            return;
        }
    }, [map, operationLock, addMarker])

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
                <ControlPanel>
                    <h4 style={{ marginBottom: '20px' }}>zoomToSpan Demo</h4>
                    <hr />
                    <div style={{ width: '100%' }}>
                        <div>
                            <strong>Map Viewport Size:</strong>
                            <span> {viewportSize.width}px x {viewportSize.height}px</span>
                        </div>
                        <div>
                            <StrongButton onClick={() => {
                                setOperationLock((operationLock: string) => {
                                    if (operationLock === 'none') {
                                        return 'addMarker';
                                    } else if (operationLock === 'addMarker') {
                                        return 'none';
                                    }
                                    return operationLock;
                                });
                            }}>{operationLock === 'none' ? 'Add markers' : 'Stop adding markers'}</StrongButton>
                            <StrongButton onClick={clearMarkers} disabled={markers.length === 0}>Clear markers</StrongButton>
                        </div>
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
                        <StrongButton onClick={zoomToSpan} disabled={markers.length === 0}>zoomToSpan</StrongButton>
                    </div>
                </ControlPanel>
            </FullPageContainer>
            :
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
                <span>Loading MapLibre GL JS...</span>
            </div>
    );
};

const root = createRoot(document.getElementById('app')!);
root.render(<App />);
