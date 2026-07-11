import PanoramaViewer from "../../components/PanoramaViewer";
import panoImage from "../../images/sample.jpg"; // Make sure this is equirectangular

const DashboardPage = () => {
  return (
     <div>
        <PanoramaViewer imageUrl={panoImage} />
    </div>
  )
}

export default DashboardPage