import { useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";

const DashLayout = () => {
  const location = useLocation();
  const pathname = location.pathname;

  useEffect(() => {
    if (pathname === "/dashboard") {
      document.title = "Vistri 360 | Dashboard";
    }
  }, [pathname]);

  return (
    <>
      <main className="font-jakarta">
        <Outlet />
      </main>
    </>
  )
}

export default DashLayout