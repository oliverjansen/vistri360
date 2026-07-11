import { useState, useEffect } from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import SplashScreen from './components/SplashScreen';

// HomePage Structure
import LandingPage from './layouts/LandingLayout'
import HomePage from './pages/LandingPages/HomePage'

// Auth Structure
import AuthLayout from './layouts/AuthLayout'
import SignInPage from './pages/AuthPages/SignInPage'

// Dashboard Structure
import DashLayout from './layouts/DashLayout'
import DashboardPage from './pages/DashboardPages/DashboardPage'

// NotFound 404
import NotFoundPage from './pages/NotFoundPage';

const routes = [
  {
    path: '/',
    element: <LandingPage />,
    errorElement: <NotFoundPage />,
    children: [
      {
        path: '',
        element: <HomePage />,
      },
    ],
  },
  {
    path: '/auth',
    element: <AuthLayout />,
    errorElement: <NotFoundPage />,
    children: [
      {
        path: 'signin',
        element: <SignInPage />,
      },
    ],
  },
    {
    path: '/dashboard',
    element: <DashLayout />,
    errorElement: <NotFoundPage />,
    children: [
      {
        path: '',
        element: <DashboardPage />,
      },
    ],
  },
];

const router = createBrowserRouter(routes)


const App = () => {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
    }, 2000); // display splash screen for 2s
    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return <SplashScreen />;
  }

  return (
    <>
      <RouterProvider router={router} />
    </>
  )
}

export default App