import { useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import NavBar from '../components/LandingComponents/NavBar'
import Footer from '../components/LandingComponents/Footer'

const LandingPage = () => {
  const location = useLocation();
  const pathname = location.pathname;

  useEffect(() => {
    if (pathname === "/" || pathname === "") {
      document.title = "Vistri 360";
    }
  }, [pathname]);

  return (
    <>
      <NavBar />
      <main className="font-body">
        <Outlet />
      </main>
      <Footer/>
    </>
  );
};

export default LandingPage;
