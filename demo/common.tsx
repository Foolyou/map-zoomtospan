import styled from 'styled-components';

export const StyledButton = styled.button`
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 200px;
  margin: 5px 0;
  padding: 5px 10px;
  cursor: pointer;
`;

export const StrongButton = styled(StyledButton)`
  font-weight: bold;
`;

export const FullPageContainer = styled.div`
  display: flex;
  width: 100vw;
  height: 100vh;
  background-color: #f0f2f5;
`;

export const MapContainer = styled.div`
  flex: 2;
  position: relative;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
`;

export const ControlPanelContainer = styled.div`
  flex: 1;
  overflow-y: auto;
  height: 100vh;
  padding: 20px;
  background-color: white;
  border-left: 1px solid #e8e8e8;
`;
