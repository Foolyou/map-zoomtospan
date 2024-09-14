import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { IndexPage } from './IndexPage';
import { MapLibrePage } from './MapLibrePage';
import './main.css';

const router = createBrowserRouter([
    {
        path: '/',
        element: <IndexPage />
    },
    {
        path: '/maplibre',
        element: <MapLibrePage />
    }
]);

createRoot(document.getElementById('app')!).render(
    <StrictMode>
        <RouterProvider router={router}></RouterProvider>
    </StrictMode>
);
