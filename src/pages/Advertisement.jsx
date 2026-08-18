import React, { useEffect, useState, useMemo, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchPosters,
  uploadPoster,
  deletePoster,
  fetchSuperAdminPosters,
  uploadSuperAdminPoster,
  deleteSuperAdminPoster,
  updateSuperAdminPosterTargeting,
} from "../store/thunks/advertisementThunk";
import { fetchAllTenants } from "../store/thunks/layoutThunk";
import { setActiveFilter } from "../store/slices/advertisementSlice";
import toast from "react-hot-toast";

// Modular components
import AdvertisementHeader from "../components/advertisement/AdvertisementHeader";
import AdvertisementUploadForm from "../components/advertisement/AdvertisementUploadForm";
import AdvertisementGallery from "../components/advertisement/AdvertisementGallery";

// Modals
import EditTargetingModal from "../components/advertisement/modals/EditTargetingModal";
import PosterLightboxModal from "../components/advertisement/modals/PosterLightboxModal";
import DeleteConfirmModal from "../components/advertisement/modals/DeleteConfirmModal";

export default function Advertisement() {
  const dispatch = useDispatch();
  const {
    posters = [],
    loading,
    uploading,
    updatingTargeting,
    activeFilter = "all",
  } = useSelector((s) => s.advertisement || {});
  const { user } = useSelector((s) => s.auth || {});
  const { allTenants = [], tenants = [], selectedTenantId } = useSelector(
    (s) => s.layout || {}
  );

  const availableTenants = allTenants.length > 0 ? allTenants : tenants;

  // Role permissions
  const role = String(user?.role || "").replace(/\s+/g, "").toLowerCase();
  const isSuperAdmin = role === "superadmin";
  const isViewer = role === "viewer";
  const canManage = !isViewer;

  // Modals state
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [lightboxItem, setLightboxItem] = useState(null);
  const [copiedId, setCopiedId] = useState(null);
  const [editingTargetingPoster, setEditingTargetingPoster] = useState(null);

  // Load tenants on mount for SuperAdmin
  useEffect(() => {
    if (isSuperAdmin) {
      dispatch(fetchAllTenants());
    }
  }, [dispatch, isSuperAdmin]);

  // Load posters
  const loadPosters = useCallback(() => {
    if (isSuperAdmin) {
      dispatch(fetchSuperAdminPosters());
    } else {
      dispatch(fetchPosters(activeFilter === "all" ? undefined : activeFilter));
    }
  }, [dispatch, isSuperAdmin, activeFilter]);

  useEffect(() => {
    loadPosters();
  }, [loadPosters, selectedTenantId]);

  // Handle Tab Switch (For FPO Admin)
  const handleFilterChange = (filterKey) => {
    if (activeFilter === filterKey) return;
    dispatch(setActiveFilter(filterKey));
    dispatch(fetchPosters(filterKey === "all" ? undefined : filterKey));
  };

  // Upload handler
  const handleUpload = async ({ files, visibleToAll, selectedTenantIds }) => {
    const formData = new FormData();
    files.forEach((file) => formData.append("posterImages", file));

    if (isSuperAdmin) {
      formData.append("visibleToAll", visibleToAll ? "true" : "false");
      if (!visibleToAll) {
        formData.append("visibleToTenants", JSON.stringify(selectedTenantIds));
      }
    }

    let res;
    if (isSuperAdmin) {
      res = await dispatch(uploadSuperAdminPoster(formData));
    } else {
      res = await dispatch(uploadPoster(formData));
    }

    if (
      (uploadSuperAdminPoster.fulfilled && uploadSuperAdminPoster.fulfilled.match(res)) ||
      (uploadPoster.fulfilled && uploadPoster.fulfilled.match(res))
    ) {
      toast.success(
        files.length === 1
          ? "Poster uploaded successfully!"
          : `${files.length} posters uploaded successfully!`
      );
      loadPosters();
      return true;
    } else {
      toast.error(res.payload || "Failed to upload posters");
      return false;
    }
  };

  // Delete handler
  const handleDelete = async (id) => {
    if (!id) return;
    setDeletingId(id);
    let res;
    if (isSuperAdmin) {
      res = await dispatch(deleteSuperAdminPoster(id));
    } else {
      res = await dispatch(deletePoster(id));
    }
    setDeletingId(null);
    setConfirmDeleteId(null);

    if (
      (deleteSuperAdminPoster.fulfilled && deleteSuperAdminPoster.fulfilled.match(res)) ||
      (deletePoster.fulfilled && deletePoster.fulfilled.match(res))
    ) {
      toast.success("Poster deleted successfully");
      loadPosters();
    } else {
      toast.error(res.payload || "Failed to delete poster");
    }
  };

  // Save Targeting (SuperAdmin)
  const handleSaveTargeting = async (payload) => {
    const res = await dispatch(updateSuperAdminPosterTargeting(payload));
    if (updateSuperAdminPosterTargeting.fulfilled.match(res)) {
      toast.success("Targeting updated successfully");
      setEditingTargetingPoster(null);
      loadPosters();
    } else {
      toast.error(res.payload || "Failed to update targeting");
    }
  };

  // Copy image link
  const handleCopyLink = (url, id) => {
    if (!url) return;
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    toast.success("Poster image URL copied to clipboard");
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Flatten & normalize posters for gallery
  const normalizedPosters = useMemo(() => {
    if (!Array.isArray(posters)) return [];

    const items = [];
    posters.forEach((poster) => {
      if (!poster) return;

      const posterType =
        poster.type?.toLowerCase() ||
        (isSuperAdmin || poster.isSuperAdmin ? "superadmin" : "fpo");
      const createdAt = poster.createdAt || poster.created_at || null;
      const posterId = poster._id || poster.id;
      const visAll = poster.visibleToAll !== false;
      const visTenants = poster.visibleToTenants || [];

      // Case 1: multiple images in array
      const imageList = poster.posters || poster.posterImages || [];
      if (Array.isArray(imageList) && imageList.length > 0) {
        imageList.forEach((imgObj, idx) => {
          const imgUrl = typeof imgObj === "string" ? imgObj : imgObj?.url;
          if (imgUrl) {
            items.push({
              id: `${posterId}-${idx}`,
              parentId: posterId,
              url: imgUrl,
              type: posterType,
              createdAt,
              title: poster.title || `Poster #${items.length + 1}`,
              visibleToAll: visAll,
              visibleToTenants: visTenants,
              raw: poster,
            });
          }
        });
      } else if (poster.url) {
        // Case 2: single url
        items.push({
          id: posterId || `poster-${items.length}`,
          parentId: posterId,
          url: poster.url,
          type: posterType,
          createdAt,
          title: poster.title || `Poster #${items.length + 1}`,
          visibleToAll: visAll,
          visibleToTenants: visTenants,
          raw: poster,
        });
      }
    });

    return items;
  }, [posters, isSuperAdmin]);

  // Statistics
  const stats = useMemo(() => {
    let superAdminCount = 0;
    let fpoCount = 0;
    let globalBroadcasts = 0;

    normalizedPosters.forEach((p) => {
      if (p.type === "superadmin") superAdminCount++;
      else fpoCount++;
      if (p.visibleToAll) globalBroadcasts++;
    });

    return {
      total: normalizedPosters.length,
      superAdmin: superAdminCount,
      fpo: fpoCount,
      globalBroadcasts,
    };
  }, [normalizedPosters]);

  return (
    <div className="space-y-6 pb-12">
      {/* 1. HEADER & KPI CARDS */}
      <AdvertisementHeader
        isSuperAdmin={isSuperAdmin}
        stats={stats}
        loading={loading}
        onRefresh={loadPosters}
      />

      {/* 2. UPLOAD FORM (FOR SUPER ADMIN & ADMIN) */}
      {canManage && (
        <AdvertisementUploadForm
          isSuperAdmin={isSuperAdmin}
          availableTenants={availableTenants}
          uploading={uploading}
          onUpload={handleUpload}
        />
      )}

      {/* 3. POSTER GALLERY */}
      <AdvertisementGallery
        posters={normalizedPosters}
        loading={loading}
        activeFilter={activeFilter}
        onFilterChange={handleFilterChange}
        isSuperAdmin={isSuperAdmin}
        canManage={canManage}
        stats={stats}
        onOpenLightbox={setLightboxItem}
        onOpenEditTargeting={setEditingTargetingPoster}
        onRequestDelete={setConfirmDeleteId}
        onCopyLink={handleCopyLink}
        copiedId={copiedId}
      />

      {/* 4. EDIT TARGETING MODAL (SUPER ADMIN) */}
      <EditTargetingModal
        isOpen={Boolean(editingTargetingPoster)}
        poster={editingTargetingPoster}
        availableTenants={availableTenants}
        isUpdating={updatingTargeting}
        onClose={() => setEditingTargetingPoster(null)}
        onSave={handleSaveTargeting}
      />

      {/* 5. LIGHTBOX FULLSCREEN MODAL */}
      <PosterLightboxModal
        poster={lightboxItem}
        isSuperAdmin={isSuperAdmin}
        onClose={() => setLightboxItem(null)}
      />

      {/* 6. DELETE CONFIRMATION DIALOG */}
      <DeleteConfirmModal
        isOpen={Boolean(confirmDeleteId)}
        posterId={confirmDeleteId}
        isDeleting={deletingId === confirmDeleteId}
        onClose={() => setConfirmDeleteId(null)}
        onConfirm={handleDelete}
      />
    </div>
  );
}
