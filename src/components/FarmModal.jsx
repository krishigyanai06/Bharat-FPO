import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { MapContainer, TileLayer, Polygon, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { getFarmsByUserId, getFarmByFarmId } from "../store/thunks/farmThunk";
import { clearFarms, clearSelectedFarm } from "../store/slices/farmSlice";
import { X, MapPin, Layers, Droplets, ArrowLeft } from "lucide-react";

const MAP_STYLES = [
  {
    label: "Satellite",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution: "&copy; Esri &mdash; Source: Esri, USGS, NOAA",
  },
  {
    label: "Dark",
    url: "https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png",
    attribution: '&copy; <a href="https://stadiamaps.com/">Stadia Maps</a>',
  },
  {
    label: "Minimal",
    url: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
    attribution: '&copy; <a href="https://carto.com/">CARTO</a>',
  },
];

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// GeoJSON polygon coords are [lng, lat], Leaflet needs [lat, lng]
const toLatLng = (coords) => coords.map(([lng, lat]) => [lat, lng]);

const getCenter = (coords) => {
  const lats = coords.map(([, lat]) => lat);
  const lngs = coords.map(([lng]) => lng);
  return [
    (Math.min(...lats) + Math.max(...lats)) / 2,
    (Math.min(...lngs) + Math.max(...lngs)) / 2,
  ];
};

function FarmModal({ member, onClose }) {
  const dispatch = useDispatch();
  const { farms, selectedFarm, loading, detailLoading } = useSelector(
    (s) => s.farm,
  );
  const [mapStyle, setMapStyle] = useState(0);

  useEffect(() => {
    dispatch(getFarmsByUserId(member._id));
    return () => dispatch(clearFarms());
  }, [dispatch, member._id]);

  const handleViewDetail = (farmId) => dispatch(getFarmByFarmId(farmId));
  const handleBack = () => dispatch(clearSelectedFarm());

  const farm = selectedFarm;

  // polygon coords from geojson
  const rawCoords = farm?.geojson?.geometry?.coordinates?.[0];
  const polygonPositions = rawCoords ? toLatLng(rawCoords) : null;
  const mapCenter = rawCoords ? getCenter(rawCoords) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        {/* HEADER */}
        <div className="flex items-center justify-between p-5 border-b ">
          <div className="flex items-center gap-2">
            {farm && (
              <button
                onClick={handleBack}
                className="p-1 rounded-lg hover:bg-gray-100"
              >
                <ArrowLeft size={18} />
              </button>
            )}
            <div>
              <h2 className="text-lg font-semibold">
                {farm
                  ? farm.farmName || "Farm Details"
                  : `${member.firstName} ${member.lastName}'s Farms`}
              </h2>
              <p className="text-xs text-gray-500">
                {farm
                  ? `${farm.farmArea} ${farm.unit || "acre"}`
                  : `${farms.length} farm(s) found`}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-gray-100"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-5">
          {/* FARM LIST VIEW */}
          {!farm && (
            <>
              {loading && (
                <div className="flex justify-center py-10">
                  <div className="w-8 h-8 border-b-2 border-brand-600 rounded-full animate-spin" />
                </div>
              )}

              {!loading && farms.length === 0 && (
                <p className="py-10 text-center text-gray-500">
                  No farms registered for this member.
                </p>
              )}

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {farms.map((f) => {
                  const coords = f.geojson?.geometry?.coordinates?.[0];
                  const center = coords ? getCenter(coords) : null;
                  return (
                    <div
                      key={f._id}
                      className="p-4 transition border cursor-pointer rounded-xl hover:shadow-md"
                      onClick={() => handleViewDetail(f._id)}
                    >
                      <div className="flex items-start justify-between">
                        <h3 className="font-semibold text-gray-800">
                          {f.farmName || "Unnamed Farm"}
                        </h3>
                        <span className="text-xs bg-brand-100 text-brand-700 px-2 py-0.5 rounded-full">
                          {f.farmArea} {f.unit || "acre"}
                        </span>
                      </div>
                      <div className="mt-2 space-y-1 text-sm text-gray-500">
                        <p className="flex items-center gap-1">
                          <MapPin size={13} />
                          {center
                            ? `${center[0].toFixed(4)}°N, ${center[1].toFixed(4)}°E`
                            : "Location N/A"}
                        </p>
                        <p className="flex items-center gap-1">
                          <Layers size={13} /> Soil: {f.soilType || "N/A"}
                        </p>
                        <p className="flex items-center gap-1">
                          <Droplets size={13} /> Irrigation:{" "}
                          {f.irrigationType || "N/A"}
                        </p>
                      </div>
                      <button className="mt-3 text-xs text-brand-600 hover:underline">
                        View Details & Map →
                      </button>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {/* FARM DETAIL + MAP VIEW */}
          {farm && (
            <>
              {detailLoading && (
                <div className="flex justify-center py-10">
                  <div className="w-8 h-8 border-b-2 border-brand-600 rounded-full animate-spin" />
                </div>
              )}

              {!detailLoading && (
                <div className="space-y-5">
                  {/* INFO GRID */}
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {[
                      { label: "Farm Name", value: farm.farmName },
                      {
                        label: "Area",
                        value: `${farm.farmArea} ${farm.unit || "acre"}`,
                      },
                      { label: "Soil Type", value: farm.soilType },
                      { label: "Irrigation", value: farm.irrigationType },
                      { label: "Village", value: farm.village },
                      { label: "District", value: farm.district },
                      { label: "State", value: farm.state },
                      { label: "Pincode", value: farm.pincode },
                    ].map(
                      (item) =>
                        item.value && (
                          <div
                            key={item.label}
                            className="p-3 rounded-lg bg-gray-50"
                          >
                            <p className="text-xs text-gray-400">
                              {item.label}
                            </p>
                            <p className="text-sm font-medium text-gray-700 mt-0.5">
                              {item.value}
                            </p>
                          </div>
                        ),
                    )}
                  </div>

                  {/* CROPS */}
                  {farm.crops?.length > 0 && (
                    <div>
                      <p className="mb-2 text-sm font-medium text-gray-600">
                        Crops Grown
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {farm.crops.map((c, i) => (
                          <span
                            key={i}
                            className="px-3 py-1 text-xs text-brand-700 bg-brand-100 rounded-full"
                          >
                            {c.cropName || c}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* MAP */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-medium text-gray-600">
                        Farm Boundary
                      </p>
                      {polygonPositions && (
                        <div className="flex gap-1">
                          {MAP_STYLES.map((s, i) => (
                            <button
                              key={s.label}
                              onClick={() => setMapStyle(i)}
                              className={`px-3 py-1 text-xs rounded-full border transition ${
                                mapStyle === i
                                  ? "bg-brand-600 text-white border-brand-600"
                                  : "text-gray-500 border-gray-300 hover:border-brand-500 hover:text-brand-600"
                              }`}
                            >
                              {s.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    {polygonPositions && mapCenter ? (
                      <div className="overflow-hidden border rounded-xl h-72">
                        <MapContainer
                          center={mapCenter}
                          zoom={16}
                          style={{ height: "100%", width: "100%" }}
                        >
                          <TileLayer
                            key={mapStyle}
                            url={MAP_STYLES[mapStyle].url}
                            attribution={MAP_STYLES[mapStyle].attribution}
                          />
                          <Polygon
                            positions={polygonPositions}
                            pathOptions={{
                              color: "#4ade80",
                              fillColor: "#4ade80",
                              fillOpacity: 0.3,
                              weight: 2,
                            }}
                          >
                            <Popup>
                              {farm.farmName || "Farm Boundary"} —{" "}
                              {farm.farmArea} {farm.unit || "acre"}
                            </Popup>
                          </Polygon>
                        </MapContainer>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-40 text-gray-400 bg-gray-100 rounded-xl">
                        <MapPin size={28} className="mb-1 opacity-40" />
                        <p className="text-sm">No location data available</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default FarmModal;
