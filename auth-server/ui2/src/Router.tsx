import { createBrowserRouter, RouterProvider } from 'react-router-dom';

import { LoginPage } from './pages/Login.page';
import ForgotPassword from './pages/FortgotPassword.page';

const router = createBrowserRouter([
  {
    path: '/forgot-password',
    element: <ForgotPassword />,
  },
  {
    path: '*',
    element: <LoginPage />,
  },
]);

export function Router() {
  return <RouterProvider router={router} />;
}
