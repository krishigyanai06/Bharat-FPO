import { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchPosters,
  uploadPoster,
  deletePoster,
} from "../store/thunks/advertisementThunk";
import { ImagePlus, Trash2, X, Upload } from "lucide-react";
import toast from "react-hot-toast";
import { usePermissions } from "../hooks/usePermissions";

export default function Advertisement() {
  const dispatch = useDispatch();
  const { posters, loading } = useSelector((s) => s.advertisement);
  const { isReadOnly } = usePermissions();
  const [preview, setPreview] = useState(null);
  const [file, setFile] = useState(null);

  const [uploading, setUploading] = useState(false);
  const [confirmId, setConfirmId] = useState(null);
  const fileRef = useRef();

  useEffect(() => {
    dispatch(fetchPosters());
  }, [dispatch]);

  const handleFile = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const handleUpload = async () => {
    if (!file) return toast.error("Please select an image");
    const fd = new FormData();
    fd.append("posterImages", file);

    setUploading(true);
    const res = await dispatch(uploadPoster(fd));
    setUploading(false);
    if (uploadPoster.fulfilled.match(res)) {
      toast.success("Poster uploaded");
      setFile(null);
      setPreview(null);
      fileRef.current.value = "";
      dispatch(fetchPosters());
    } else {
      toast.error(res.payload || "Upload failed");
    }
  };

  const handleDelete = async (id) => {
    const res = await dispatch(deletePoster(id));
    if (deletePoster.fulfilled.match(res)) toast.success("Poster deleted");
    else toast.error("Delete failed");
    setConfirmId(null);
  };

  return (
    <div className="space-y-6">
      {/* UPLOAD CARD */}
      {!isReadOnly && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
          <h2 className="text-base font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <ImagePlus className="w-5 h-5 text-brand-600" /> Upload Advertisement
            Poster
          </h2>
        <div className="flex flex-col sm:flex-row gap-4 items-start">
          {/* Image picker */}
          <div
            onClick={() => fileRef.current.click()}
            className="w-full sm:w-48 h-36 border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-brand-500 hover:bg-brand-50 transition flex-shrink-0 overflow-hidden"
          >
            {preview ? (
              <img
                src={preview}
                alt="preview"
                className="w-full h-full object-cover rounded-xl"
              />
            ) : (
              <>
                <Upload className="w-8 h-8 text-gray-400 mb-1" />
                <p className="text-xs text-gray-500">Click to select image</p>
              </>
            )}
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFile}
          />

          <div className="flex-1 space-y-3 w-full">
            <div className="flex gap-2">
              <button
                onClick={handleUpload}
                disabled={uploading || !file}
                className="px-5 py-2.5 bg-brand-600 text-white rounded-xl text-sm font-medium hover:bg-brand-700 disabled:opacity-50 transition"
              >
                {uploading ? "Uploading…" : "Upload Poster"}
              </button>
              {preview && (
                <button
                  onClick={() => {
                    setFile(null);
                    setPreview(null);
                    fileRef.current.value = "";
                  }}
                  className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
      )}

      {/* POSTERS GRID */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
        <h2 className="text-base font-semibold text-gray-800 mb-4">
          All Posters{" "}
          <span className="text-sm font-normal text-gray-400">
            ({posters.reduce((acc, p) => acc + (p.posters?.length || 0), 0)})
          </span>
        </h2>

        {loading && posters.length === 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="h-44 bg-gray-100 rounded-xl animate-pulse"
              />
            ))}
          </div>
        ) : posters.length === 0 ? (
          <div className="text-center py-16">
            <ImagePlus className="w-12 h-12 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-500">
              No posters yet. Upload one above.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {posters.map((poster) => {
              const imgs = poster.posters?.length
                ? poster.posters
                : poster.url
                  ? [poster]
                  : [];
              return imgs.map((img, i) => (
                <div
                  key={`${poster._id}-${i}`}
                  className="relative group rounded-xl overflow-hidden border border-gray-200 shadow-sm"
                >
                  <img
                    src={img.url}
                    alt="Poster"
                    className="w-full object-contain bg-gray-50"
                  />
                  {!isReadOnly && (
                    <button
                      onClick={() => setConfirmId(poster._id)}
                      className="absolute top-2 right-2 w-8 h-8 bg-red-600 text-white rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition shadow"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ));
            })}
          </div>
        )}
      </div>

      {/* DELETE CONFIRM */}
      {confirmId && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center space-y-4">
            <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto">
              <Trash2 className="w-7 h-7 text-red-600" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-gray-800">
                Delete Poster?
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                This action cannot be undone.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmId(null)}
                className="flex-1 px-4 py-2.5 border border-gray-300 rounded-xl text-sm text-gray-700 hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(confirmId)}
                className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-xl text-sm hover:bg-red-700 transition"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
