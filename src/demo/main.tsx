import { createRoot } from 'react-dom/client';
import { useEffect, useRef, useState, createContext, useContext, useCallback } from 'react';
import { IInsets, mapZoomToSpan, WebMercatorProjection, IOverlay } from '../index';
import './main.css';
import { Button, Slider, Input, Typography, Space, Card, Divider, InputNumber } from 'antd';
import 'antd/dist/reset.css';
import styled from 'styled-components';

const { Title, Text } = Typography;

// Context
const AMapContext = createContext<any>(null);

// Styled Components
const StyledButton = styled(Button)`
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 200px;
  margin: 5px 0;
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

const ControlPanel = styled(Card)`
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

function getAnchorCircle() {
    const el = document.createElement('div');
    el.style.width = '10px';
    el.style.height = '10px';
    el.style.backgroundColor = 'rgba(0, 0, 255, 0.5)';
    el.style.borderRadius = '50%';
    return el;
}

// Map Component
interface MapProps {
    onMapReady: (map: any) => void;
    onMapClick: (event: any) => void;
}

const Map = ({ onMapReady, onMapClick }: MapProps) => {
    const mapRef = useRef(null);
    const AMap = useContext(AMapContext);
    const [map, setMap] = useState<any>(null);

    useEffect(() => {
        if (AMap && mapRef.current) {
            const map = new AMap.Map(mapRef.current);
            setMap(map);
            onMapReady(map);
        }
    }, [AMap, onMapReady]);

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

// Main App Component
const App = () => {
    const [AMap, setAMap] = useState<any>(null);
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 });
    const [map, setMap] = useState<any>(null);
    const [operationLock, setOperationLock] = useState('none');
    const [markers, setMarkers] = useState<any[]>([]);
    const [insets, setInsets] = useState<IInsets>({ top: 80, left: 80, bottom: 80, right: 80 });
    const [zoomRange, setZoomRange] = useState<[number, number]>([0, 20]);
    const [precision, setPrecision] = useState<number>(0.01);

    useEffect(() => {
        // (window as any).AMapLoader.load({
        //     key: import.meta.env.VITE_AMAP_KEY,
        //     version: '2.0'
        // }).then((AMap: any) => {
        //     setAMap(AMap);
        // });
        setAMap((window as any).AMap);
    }, []);

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
            { name: 'top-center', anchor: { x: 0.5, y: 0 } },
            { name: 'top-right', anchor: { x: 1, y: 0 } },
            { name: 'middle-left', anchor: { x: 0, y: 0.5 } },
            { name: 'center', anchor: { x: 0.5, y: 0.5 } },
            { name: 'middle-right', anchor: { x: 1, y: 0.5 } },
            { name: 'bottom-left', anchor: { x: 0, y: 1 } },
            { name: 'bottom-center', anchor: { x: 0.5, y: 1 } },
            { name: 'bottom-right', anchor: { x: 1, y: 1 } },
        ];

        const anchor = anchorList[Math.floor(Math.random() * anchorList.length)];
        const { el, size } = getRandomSizeRect();

        const rectMarker = new AMap.Marker({
            content: el,
            offset: new AMap.Pixel(-anchor.anchor.x * size.width, -anchor.anchor.y * size.height),
            position: position,
            bubble: true
        });

        const anchorMarker = new AMap.Marker({
            content: getAnchorCircle(),
            offset: new AMap.Pixel(-5, -5),
            position: position,
            bubble: true
        });

        map.add(rectMarker);
        map.add(anchorMarker);

        setMarkers([...markers, { position: { lng: position.lng, lat: position.lat }, rectMarker, anchorMarker, size, anchor }]);
    }, [map, markers]);

    const clearMarkers = useCallback(() => {
        markers.forEach(marker => {
            map.remove(marker.rectMarker);
            map.remove(marker.anchorMarker);
        });
        setMarkers([]);
    }, [map, markers]);

    const zoomToSpan = useCallback(() => {
        console.log('markers', markers);
        if (!mapContainerRef.current) return;

        const { clientWidth, clientHeight } = mapContainerRef.current;
        const zoomToSpanResult = mapZoomToSpan({
            viewport: {
                size: {
                    width: clientWidth,
                    height: clientHeight,
                },
                insets
            },
            projection: new WebMercatorProjection(256),
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
        })
        if (zoomToSpanResult.ok) {
            const { center, zoom } = zoomToSpanResult.result;
            console.log('center', center, 'zoom', zoom);
            map.setZoomAndCenter(zoom, new AMap.LngLat(center.lng, center.lat));
        } else {
            console.error('zoomToSpan', zoomToSpanResult.error);
        }
    }, [map, markers, insets, zoomRange, precision]);

    const onMapReady = useCallback((map: any) => {
        setMap(map);
        setViewportSize({
            width: map.getSize().width,
            height: map.getSize().height
        });
    }, []);

    const onMapClick = useCallback((event: any) => {
        if (operationLock === 'none') {
            return;
        }

        if (operationLock === 'addMarker') {
            addMarker(event.lnglat);
            return;
        }
    }, [map, operationLock, addMarker])

    return (
        AMap ?
            <FullPageContainer>
                <MapContainer ref={mapContainerRef}>
                    <AMapContext.Provider value={AMap}>
                        <Map
                            onMapReady={onMapReady}
                            onMapClick={onMapClick}
                        />
                    </AMapContext.Provider>
                    <div className="insets-indicator" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
                        <div className="insets-indicator-top" style={{ position: 'absolute', top: 0, left: 0, right: 0, height: `${insets.top}px`, backgroundColor: 'rgba(128, 128, 0, 0.5)' }}></div>
                        <div className="insets-indicator-left" style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: `${insets.left}px`, backgroundColor: 'rgba(128, 128, 0, 0.5)' }}></div>
                        <div className="insets-indicator-bottom" style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: `${insets.bottom}px`, backgroundColor: 'rgba(128, 128, 0, 0.5)' }}></div>
                        <div className="insets-indicator-right" style={{ position: 'absolute', top: 0, right: 0, bottom: 0, width: `${insets.right}px`, backgroundColor: 'rgba(128, 128, 0, 0.5)' }}></div>
                    </div>
                </MapContainer>
                <ControlPanel>
                    <Title level={4} style={{ marginBottom: '20px' }}>zoomToSpan Demo</Title>
                    <Divider />
                    <Space direction="vertical" style={{ width: '100%' }} size="large">
                        <div>
                            <Text strong>Map Viewport Size:</Text>
                            <Text> {viewportSize.width}px x {viewportSize.height}px</Text>
                        </div>
                        <Space direction="vertical">
                            <StrongButton type='dashed' onClick={() => {
                                setOperationLock((operationLock: string) => {
                                    if (operationLock === 'none') {
                                        return 'addMarker';
                                    } else if (operationLock === 'addMarker') {
                                        return 'none';
                                    }
                                    return operationLock;
                                });
                            }}>{operationLock === 'none' ? 'Add markers' : 'Stop adding markers'}</StrongButton>
                            <StrongButton type='dashed' onClick={clearMarkers} disabled={markers.length === 0}>Clear markers</StrongButton>
                        </Space>
                        <Divider />
                        <div>
                            <Text strong>Precision:</Text>
                            <InputNumber
                                min={0.00001}
                                max={1}
                                value={precision}
                                onChange={(value) => setPrecision(value as number)}
                                style={{ width: '100%', marginTop: '10px' }}
                            />
                        </div>
                        <div>
                            <Text strong>Zoom range:</Text>
                            <Slider
                                range
                                min={0}
                                max={20}
                                value={zoomRange}
                                onChange={(value) => setZoomRange(value as [number, number])}
                                marks={{
                                    0: '0',
                                    20: '20'
                                }}
                                tooltip={{
                                    formatter: (value) => value?.toFixed(precision)
                                }}
                                style={{ marginTop: '10px' }}
                            />
                            <Text>Current range: {zoomRange[0].toFixed(precision)} - {zoomRange[1].toFixed(precision)}</Text>
                        </div>
                        <div>
                            <Text strong>Insets:</Text>
                            <Space direction="vertical" style={{ width: '100%', marginTop: '10px' }}>
                                <Input addonBefore="Top" type="number" value={insets.top} onChange={(e) => setInsets({ ...insets, top: parseInt(e.target.value) })} />
                                <Input addonBefore="Left" type="number" value={insets.left} onChange={(e) => setInsets({ ...insets, left: parseInt(e.target.value) })} />
                                <Input addonBefore="Bottom" type="number" value={insets.bottom} onChange={(e) => setInsets({ ...insets, bottom: parseInt(e.target.value) })} />
                                <Input addonBefore="Right" type="number" value={insets.right} onChange={(e) => setInsets({ ...insets, right: parseInt(e.target.value) })} />
                            </Space>
                        </div>
                        <StrongButton type='primary' disabled={markers.length === 0} onClick={zoomToSpan}>zoomToSpan</StrongButton>
                    </Space>
                </ControlPanel>
            </FullPageContainer>
            :
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
                <Text>Loading AMap Lib...</Text>
            </div>
    );
};

const root = createRoot(document.getElementById('app')!);
root.render(<App />);
