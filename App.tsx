import React from 'react';
import { ToastProvider } from './app/components/common/Toast';
import AppNavigator      from './app/Navigations/AppNavigator';

export default function App() {
  return (
    <ToastProvider>
      <AppNavigator />
    </ToastProvider>
  );
}
