import { IInsets } from '../src/index';
import { ControlPanelContainer, StrongButton } from './common';

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
    resultZoom: number | null;
    resultCenter: { lng: number; lat: number } | null;
    fitBounds: () => void;
}

export const ControlPanel: React.FC<ControlPanelProps> = ({
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
    zoomToSpan,
    resultZoom,
    resultCenter,
    fitBounds
}) => {
    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen();
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            }
        }
    };

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
                <StrongButton onClick={fitBounds}>fitBounds</StrongButton>
                <StrongButton onClick={toggleFullscreen}>Toggle Fullscreen</StrongButton>
                <div>
                    <strong>Result Zoom:</strong>
                    <span> {resultZoom != null ? resultZoom.toFixed(precision) : 'N/A'}</span>
                </div>
                <div>
                    <strong>Result Center:</strong>
                    <span> {resultCenter != null ? `${resultCenter.lng.toFixed(precision)}, ${resultCenter.lat.toFixed(precision)}` : 'N/A'}</span>
                </div>
            </div>
        </ControlPanelContainer>
    );
};
