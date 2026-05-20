import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import toast from "react-hot-toast";
import {
  sendBroadcast,
  fetchBroadcastHistory,
  fetchBroadcastStats,
} from "../store/thunks/broadcastThunk";
import { Bell, Send, History, X, Image as ImageIcon, Eye } from "lucide-react";
import { SkeletonHeader, SkeletonTable } from "../components/Skeleton";
import { usePermissions } from "../hooks/usePermissions";

function Broadcast() {
  const dispatch = useDispatch();
  const broadcastState = useSelector((state) => state.broadcast);
  const { isReadOnly } = usePermissions();

  const broadcasts = Array.isArray(broadcastState?.broadcasts)
    ? broadcastState.broadcasts
    : [];
  const stats = broadcastState?.stats || null;
  const loading = broadcastState?.loading || false;

  const [showModal, setShowModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedBroadcast, setSelectedBroadcast] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [imagePreview, setImagePreview] = useState(null);
  const ITEMS_PER_PAGE = 10;

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    targetRole: "Farmer",
    broadcastImage: null,
  });

  useEffect(() => {
    dispatch(fetchBroadcastHistory());
    dispatch(fetchBroadcastStats());
  }, [dispatch]);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData({ ...formData, broadcastImage: file });
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = () => {
    if (!formData.title || !formData.description) {
      toast.error("Please fill in title and description");
      return;
    }

    const data = new FormData();
    data.append("title", formData.title);
    data.append("description", formData.description);
    data.append("targetRole", formData.targetRole);
    if (formData.broadcastImage) {
      data.append("broadcastImage", formData.broadcastImage);
    }

    dispatch(sendBroadcast(data))
      .unwrap()
      .then(() => {
        toast.success("Broadcast sent successfully!");
        dispatch(fetchBroadcastHistory());
        dispatch(fetchBroadcastStats());
        handleCloseModal();
      })
      .catch((err) => {
        toast.error(`Failed to send broadcast: ${err}`);
      });
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setFormData({
      title: "",
      description: "",
      targetRole: "Farmer",
      broadcastImage: null,
    });
    setImagePreview(null);
  };

  const handleViewDetails = (broadcast) => {
    setSelectedBroadcast(broadcast);
    setShowDetailsModal(true);
  };

  const formatDate = (date) => {
    if (!date) return "—";
    return new Date(date).toLocaleString("en-IN", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const broadcastsArray = Array.isArray(broadcasts) ? broadcasts : [];
  const totalPages = Math.ceil(broadcastsArray.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedBroadcasts = broadcastsArray.slice(
    startIndex,
    startIndex + ITEMS_PER_PAGE,
  );

  if (loading && !broadcasts.length) {
    return (
      <div className="space-y-6">
        <SkeletonHeader />
        <SkeletonTable rows={5} cols={5} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold">Broadcast Notifications</h1>
          <p className="text-sm text-gray-500">
            Send announcements to farmers and staff
          </p>
        </div>
        {!isReadOnly && (
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700"
          >
            <Send className="w-4 h-4" />
            Send Broadcast
          </button>
        )}
      </div>

      {/* BROADCAST HISTORY TABLE */}
      <div className="bg-white rounded-xl shadow-sm overflow-x-auto">
        <div className="px-6 py-4 border-b">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <History className="w-5 h-5" />
            Broadcast History
          </h2>
        </div>

        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs uppercase">
            <tr>
              <th className="px-6 py-3 text-left">Title</th>
              <th className="px-6 py-3 text-left">Description</th>
              <th className="px-6 py-3 text-left">Target Role</th>
              <th className="px-6 py-3 text-left">Sent Date</th>
              <th className="px-6 py-3 text-center">Actions</th>
            </tr>
          </thead>

          <tbody className="divide-y">
            {paginatedBroadcasts.length > 0 ? (
              paginatedBroadcasts.map((broadcast) => (
                <tr key={broadcast._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium">{broadcast.title}</td>
                  <td className="px-6 py-4 max-w-xs truncate">
                    {broadcast.description}
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">
                      {broadcast.targetRole}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {formatDate(broadcast.createdAt)}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <button
                      onClick={() => handleViewDetails(broadcast)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="5" className="text-center py-10 text-gray-500">
                  {loading ? "Loading broadcasts..." : "No broadcasts sent yet"}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* PAGINATION */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-3">
          <button
            disabled={currentPage === 1}
            onClick={() => setCurrentPage((p) => p - 1)}
            className="px-3 py-1 border rounded disabled:opacity-50"
          >
            Prev
          </button>
          <span className="text-sm">
            Page {currentPage} of {totalPages}
          </span>
          <button
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage((p) => p + 1)}
            className="px-3 py-1 border rounded disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}

      {/* SEND BROADCAST MODAL */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <Bell className="w-5 h-5" />
                Send Broadcast Notification
              </h2>
              <button
                onClick={handleCloseModal}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Title</label>
                <input
                  placeholder="e.g., New Crop Procurement Announcement"
                  className="border px-3 py-2 rounded-lg w-full"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Description
                </label>
                <textarea
                  placeholder="e.g., We are starting wheat procurement from next Monday. All farmers are requested to bring their produce to the collection center."
                  className="border px-3 py-2 rounded-lg w-full h-24"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Target Role
                </label>
                <select
                  value={formData.targetRole}
                  onChange={(e) =>
                    setFormData({ ...formData, targetRole: e.target.value })
                  }
                  className="border px-3 py-2 rounded-lg w-full"
                >
                  <option value="Farmer">Farmer</option>
                  <option value="Staff">Staff</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Broadcast Image (Optional)
                </label>
                <div className="border-2 border-dashed rounded-lg p-4 text-center">
                  {imagePreview ? (
                    <div className="relative">
                      <img
                        src={imagePreview}
                        alt="Preview"
                        className="max-h-48 mx-auto rounded"
                      />
                      <button
                        onClick={() => {
                          setImagePreview(null);
                          setFormData({ ...formData, broadcastImage: null });
                        }}
                        className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <label className="cursor-pointer">
                      <ImageIcon className="w-12 h-12 mx-auto text-gray-400 mb-2" />
                      <p className="text-sm text-gray-600">
                        Click to upload image
                      </p>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageChange}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={handleCloseModal}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 flex items-center gap-2 disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
                {loading ? "Sending..." : "Send Broadcast"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DETAILS MODAL */}
      {showDetailsModal && selectedBroadcast && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold">Broadcast Details</h2>
              <button
                onClick={() => setShowDetailsModal(false)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-600">Title</p>
                <p className="font-medium">{selectedBroadcast.title}</p>
              </div>

              <div>
                <p className="text-sm text-gray-600">Description</p>
                <p className="text-gray-800">{selectedBroadcast.description}</p>
              </div>

              <div>
                <p className="text-sm text-gray-600">Target Role</p>
                <span className="inline-block px-3 py-1 bg-blue-100 text-blue-700 rounded text-sm">
                  {selectedBroadcast.targetRole}
                </span>
              </div>

              <div>
                <p className="text-sm text-gray-600">Sent Date</p>
                <p className="text-gray-800">
                  {formatDate(selectedBroadcast.createdAt)}
                </p>
              </div>

              {selectedBroadcast.broadcastImage && (
                <div>
                  <p className="text-sm text-gray-600 mb-2">Image</p>
                  <img
                    src={selectedBroadcast.broadcastImage}
                    alt="Broadcast"
                    className="max-h-64 rounded-lg"
                  />
                </div>
              )}
            </div>

            <div className="flex justify-end mt-6">
              <button
                onClick={() => setShowDetailsModal(false)}
                className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Broadcast;
