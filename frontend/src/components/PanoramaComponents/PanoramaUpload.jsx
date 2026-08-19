import Loading from "../Loading";
import { useUploadPanoramas } from "../../hooks/useUploadPanorama";

const MAX_PANORAMA_FILE_SIZE = 50 * 1024 * 1024;
const SUPPORTED_PANORAMA_TYPES = new Set(["image/jpeg", "image/png"]);

const normalizeFilename = (filename) => (
  filename.split(/[\\/]/).pop().trim().toLowerCase()
);

const errorMessage = (error) => (
  error?.data?.message
  || error?.response?.data?.message
  || error?.message
  || "Panorama upload failed. Check the file type and size."
);

const PanoramaUpload = ({
  projectId,
  clientId,
  existingPanoramas = [],
  onUploaded,
  onError,
}) => {
  const { uploadPanoramas, isLoading } = useUploadPanoramas();

  const handleChange = async (event) => {
    const files = Array.from(event.target.files ?? []);
    if (files.length === 0) return;

    const resetInput = () => { event.target.value = ""; };
    const fail = (message) => {
      onError?.(message);
      resetInput();
    };

    if (files.length > 20) {
      fail("You can upload a maximum of 20 panoramas at a time.");
      return;
    }

    const unsupportedFile = files.find((file) => !SUPPORTED_PANORAMA_TYPES.has(file.type));
    if (unsupportedFile) {
      fail(`${unsupportedFile.name} is not supported. Use a JPG or PNG panorama.`);
      return;
    }

    const oversizedFile = files.find((file) => file.size > MAX_PANORAMA_FILE_SIZE);
    if (oversizedFile) {
      fail(`${oversizedFile.name} is too large. Each panorama must be 50 MB or smaller.`);
      return;
    }

    const incomingFilenames = files.map((file) => normalizeFilename(file.name));
    const duplicateBatchFilename = incomingFilenames.find((filename, index) => (
      incomingFilenames.indexOf(filename) !== index
    ));
    if (duplicateBatchFilename) {
      fail(`The panorama filename "${duplicateBatchFilename}" appears more than once in this upload.`);
      return;
    }

    const existingFilenames = new Set(
      existingPanoramas.map((panorama) => normalizeFilename(panorama.image_path ?? ""))
    );
    const alreadyUploadedFilename = incomingFilenames.find((filename) => existingFilenames.has(filename));
    if (alreadyUploadedFilename) {
      fail(`A panorama named "${alreadyUploadedFilename}" has already been uploaded.`);
      return;
    }

    try {
      if (!projectId) throw new Error("A valid project is required before uploading panoramas.");
      const response = await uploadPanoramas(files, projectId, null, clientId);
      onUploaded?.(response.data ?? [], files);
    } catch (error) {
      console.error("Unable to upload panoramas", error);
      onError?.(errorMessage(error));
    } finally {
      resetInput();
    }
  };

  return (
    <label className="relative flex h-11 shrink-0 cursor-pointer items-center justify-center gap-2 overflow-hidden rounded-xl bg-primary px-4 text-[11px] font-bold uppercase tracking-widest text-white transition duration-300 hover:-translate-y-0.5 hover:bg-primary/90 hover:shadow-lg hover:shadow-primary/20 focus-within:ring-2 focus-within:ring-primary/60">
      <Loading isLoading={isLoading} />
      <span>{isLoading ? "Uploading..." : "Upload 360 view"}</span>
      <input type="file" multiple disabled={isLoading} accept="image/*" className="hidden" onChange={handleChange} />
    </label>
  );
};

export default PanoramaUpload;
