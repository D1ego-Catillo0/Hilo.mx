/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ToastProvider } from './context/ToastContext';
import { HiloProvider } from './context/HiloContext';
import { AppLayout } from './components/layout/AppLayout';
import { DashboardPage } from './pages/DashboardPage';
import { OrdersPage } from './pages/OrdersPage';
import { NewOrderPage } from './pages/NewOrderPage';
import { OrderDetailPage } from './pages/OrderDetailPage';
import { CalendarPage } from './pages/CalendarPage';
import { CustomersPage } from './pages/CustomersPage';
import { ReportsPage } from './pages/ReportsPage';
import { SettingsPage } from './pages/SettingsPage';

export default function App() {
  return (
    <ToastProvider>
      <HiloProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<AppLayout />}>
              <Route index element={<DashboardPage />} />
              <Route path="pedidos" element={<OrdersPage />} />
              <Route path="pedidos/nuevo" element={<NewOrderPage />} />
              <Route path="pedidos/:id" element={<OrderDetailPage />} />
              <Route path="calendario" element={<CalendarPage />} />
              <Route path="clientes" element={<CustomersPage />} />
              <Route path="reportes" element={<ReportsPage />} />
              <Route path="configuracion" element={<SettingsPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </HiloProvider>
    </ToastProvider>
  );
}
