import { createBrowserRouter, RouterProvider } from 'react-router-dom';

import { LoginPage } from './pages/Login.page';
import ForgotPassword from './pages/FortgotPassword.page';
import ResetPassword from './pages/ResetPassword.page';

const router = createBrowserRouter([
  {
    path: '/forgot-password',
    element: <ForgotPassword />,
  },
  {
    path: '/reset-password',
    element: <ResetPassword />,
  },
  {
    path: '*',
    element: <LoginPage />,
  },
]);

export function Router() {
  return <RouterProvider router={router} />;
}
