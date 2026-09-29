import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Send,
  Users,
  Search,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
  Shield,
  Phone,
  UserCheck,
  FileCode,
  Plus,
  Trash2,
  ChevronRight,
  BarChart2,
  MessageSquare,
  Copy,
  Check,
} from 'lucide-react';
import { fetchAllAdmins, sendWhatsAppCampaign } from '../store/thunks/superadminThunk';
import {
  toggleSelectAdmin,
  selectAllAdmins,
  clearSelectedAdmins,
} from '../store/slices/superadminSlice';
import toast from 'react-hot-toast';

// Robust string extractor to prevent rendering object instances in JSX
const getDisplayString = (val, fallback = '') => {
  if (val === null || val === undefined) return fallback;
  if (typeof val === 'string' || typeof val === 'number') return String(val);
  if (typeof val === 'object') {
    return val.name || val.tenantName || val.tenantCode || val.userName || val.fullName || val.title || val.role || val._id || fallback;
  }
  return fallback;
};

export default function WhatsAppCampaign() {
  const dispatch = useDispatch();
  const {
    adminsList = [],
    loadingAdmins = false,
    sendingCampaign = false,
    selectedAdmins = [],
    campaignHistory = [],
  } = useSelector((state) => state.superadmin || {});

  const [activeTab, setActiveTab] = useState('dispatcher'); // 'dispatcher' | 'directory' | 'history'
  const [searchTerm, setSearchTerm] = useState('');
  
  // Single recipient form state
  const [formData, setFormData] = useState({
    campaignName: 'bharatfpo_connect_marketing',
    destination: '9146450350',
    userName: 'Vishal',
    source: 'Bharat_FPO_Connect_App',
  });

  // Dynamic template params
  const [templateParams, setTemplateParams] = useState([]);
  const [paramKey, setParamKey] = useState('');
  const [paramValue, setParamValue] = useState('');

  // Bulk dispatch state
  const [isBulkSending, setIsBulkSending] = useState(false);
  const [bulkProgress, setBulkProgress] = useState({ current: 0, total: 0, success: 0, failed: 0 });

  // JSON Preview Modal
  const [showJsonModal, setShowJsonModal] = useState(false);
  const [modalPayload, setModalPayload] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    dispatch(fetchAllAdmins());
  }, [dispatch]);

  // Sanitize phone number (strip whitespace, ensure 91 prefix if 10 digits)
  const sanitizePhone = (phone) => {
    const raw = getDisplayString(phone, '');
    if (!raw) return '';
    const cleaned = String(raw).replace(/\D/g, '');
    if (cleaned.length === 10) return `91${cleaned}`;
    return cleaned;
  };

  const handleSelectAdminForSingle = (admin) => {
    const name = getDisplayString(admin.userName || admin.name || admin.fullName || admin.email, 'Admin User');
    const phone = sanitizePhone(admin.destination || admin.phone || admin.mobile || '9146450350');
    setFormData((prev) => ({
      ...prev,
      userName: name,
      destination: phone,
    }));
    setActiveTab('dispatcher');
    toast.success(`Selected ${name} for single campaign`);
  };

  const handleAddTemplateParam = () => {
    if (!paramKey.trim()) {
      toast.error('Parameter key is required');
      return;
    }
    setTemplateParams((prev) => [...prev, { key: paramKey.trim(), value: paramValue.trim() }]);
    setParamKey('');
    setParamValue('');
  };

  const handleRemoveTemplateParam = (index) => {
    setTemplateParams((prev) => prev.filter((_, i) => i !== index));
  };

  const formatTemplateParamsForApi = () => {
    return templateParams.map((p) => (p.value ? `${p.key}:${p.value}` : p.key));
  };

  // Build current payload preview object
  const buildCurrentPayload = (overrides = {}) => {
    return {
      campaignName: overrides.campaignName || formData.campaignName,
      destination: sanitizePhone(overrides.destination || formData.destination),
      userName: overrides.userName || formData.userName,
      source: overrides.source || formData.source,
      templateParams: overrides.templateParams || formatTemplateParamsForApi(),
    };
  };

  // Success feedback state for single submission
  const [lastSuccessInfo, setLastSuccessInfo] = useState(null);

  // Single Campaign Submit
  const handleSingleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.destination.trim()) {
      toast.error('Destination phone number is required');
      return;
    }
    if (!formData.userName.trim()) {
      toast.error('Recipient user name is required');
      return;
    }

    const payload = buildCurrentPayload();
    setLastSuccessInfo(null);
    
    try {
      const res = await dispatch(sendWhatsAppCampaign(payload)).unwrap();
      const messageId = res?.submittedMessageId || 'N/A';
      setLastSuccessInfo({
        recipient: payload.userName,
        destination: payload.destination,
        messageId: messageId,
        time: new Date().toLocaleTimeString(),
      });
    } catch (err) {
      console.error('Campaign submission error:', err);
      const errMsg = typeof err === 'string' ? err : err?.message || 'Failed to submit WhatsApp campaign';
      toast.error(errMsg);
    }
  };

  // Bulk Campaign Submit
  const handleBulkSubmit = async () => {
    if (selectedAdmins.length === 0) {
      toast.error('Please select at least one admin user from the directory');
      return;
    }

    setIsBulkSending(true);
    setBulkProgress({ current: 0, total: selectedAdmins.length, success: 0, failed: 0 });

    let successCount = 0;
    let failedCount = 0;

    for (let i = 0; i < selectedAdmins.length; i++) {
      const admin = selectedAdmins[i];
      const name = getDisplayString(admin.userName || admin.name || admin.fullName, 'Admin User');
      const phone = sanitizePhone(admin.destination || admin.phone || admin.mobile);

      setBulkProgress({
        current: i + 1,
        total: selectedAdmins.length,
        success: successCount,
        failed: failedCount,
      });

      if (!phone) {
        failedCount++;
        continue;
      }

      const payload = {
        campaignName: formData.campaignName,
        destination: phone,
        userName: name,
        source: formData.source,
        templateParams: formatTemplateParamsForApi(),
      };

      try {
        await dispatch(sendWhatsAppCampaign(payload)).unwrap();
        successCount++;
      } catch (err) {
        failedCount++;
      }
    }

    setBulkProgress({
      current: selectedAdmins.length,
      total: selectedAdmins.length,
      success: successCount,
      failed: failedCount,
    });

    setIsBulkSending(false);
    toast.success(`Bulk campaign complete! Success: ${successCount}, Failed: ${failedCount}`);
  };

  // Filter admins list
  const filteredAdmins = adminsList.filter((admin) => {
    const term = searchTerm.toLowerCase();
    const name = getDisplayString(admin.userName || admin.name || admin.fullName).toLowerCase();
    const phone = getDisplayString(admin.destination || admin.phone || admin.mobile).toLowerCase();
    const email = getDisplayString(admin.email).toLowerCase();
    const tenant = getDisplayString(admin.tenantName || admin.tenantId || admin.tenant || admin.role).toLowerCase();
    return name.includes(term) || phone.includes(term) || email.includes(term) || tenant.includes(term);
  });

  const isAllSelected = filteredAdmins.length > 0 && selectedAdmins.length === filteredAdmins.length;

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success('Copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-slate-50/50 p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200/80">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-brand-50 rounded-xl text-brand-600 border border-brand-100">
                <MessageSquare className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                  Super Admin WhatsApp Campaign
                </h1>
                <p className="text-sm text-slate-500 mt-0.5">
                  Broadcast marketing campaigns and updates directly to registered Admin users
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => dispatch(fetchAllAdmins())}
              disabled={loadingAdmins}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loadingAdmins ? 'animate-spin' : ''}`} />
              Refresh Directory
            </button>
            <button
              onClick={() => {
                setModalPayload(buildCurrentPayload());
                setShowJsonModal(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-brand-700 bg-brand-50 hover:bg-brand-100 border border-brand-200 rounded-xl transition-colors"
            >
              <FileCode className="w-4 h-4" />
              Payload Preview
            </button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Admins</p>
              <h3 className="text-2xl font-bold text-slate-900 mt-1">{adminsList.length}</h3>
              <p className="text-xs text-slate-400 mt-0.5">Across all registered tenants</p>
            </div>
            <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
              <Users className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Selected Targets</p>
              <h3 className="text-2xl font-bold text-slate-900 mt-1">{selectedAdmins.length}</h3>
              <p className="text-xs text-slate-400 mt-0.5">Ready for batch campaign</p>
            </div>
            <div className="p-3 bg-purple-50 text-purple-600 rounded-xl">
              <UserCheck className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Campaigns Sent</p>
              <h3 className="text-2xl font-bold text-slate-900 mt-1">{campaignHistory.length}</h3>
              <p className="text-xs text-slate-400 mt-0.5">Total submissions logged</p>
            </div>
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
              <Send className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Success Rate</p>
              <h3 className="text-2xl font-bold text-slate-900 mt-1">
                {campaignHistory.length > 0
                  ? `${Math.round(
                      (campaignHistory.filter((c) => c.status === 'Success').length / campaignHistory.length) * 100
                    )}%`
                  : '100%'}
              </h3>
              <p className="text-xs text-emerald-600 font-medium mt-0.5">WhatsApp API Verified</p>
            </div>
            <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
              <BarChart2 className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 bg-white px-4 pt-3 rounded-t-2xl">
          <button
            onClick={() => setActiveTab('dispatcher')}
            className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === 'dispatcher'
                ? 'border-brand-600 text-brand-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Send className="w-4 h-4" />
            Campaign Dispatcher
          </button>
          <button
            onClick={() => setActiveTab('directory')}
            className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === 'directory'
                ? 'border-brand-600 text-brand-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Users className="w-4 h-4" />
            Admin Directory ({adminsList.length})
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === 'history'
                ? 'border-brand-600 text-brand-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Clock className="w-4 h-4" />
            Submission Logs ({campaignHistory.length})
          </button>
        </div>

        {/* Tab 1: Dispatcher Form */}
        {activeTab === 'dispatcher' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Form Column */}
            <div className="lg:col-span-2 bg-white p-6 rounded-b-2xl rounded-tr-2xl border border-slate-200/80 shadow-sm space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Campaign Configuration</h2>
                  <p className="text-xs text-slate-500">Configure parameters for WhatsApp template execution</p>
                </div>
                <span className="px-3 py-1 bg-brand-50 text-brand-700 font-semibold text-xs rounded-full border border-brand-200">
                  POST /api/superadmin/whatsapp/send-campaign
                </span>
              </div>

              {/* Success Notification Banner */}
              {lastSuccessInfo && (
                <div className="p-4 bg-emerald-50/90 border border-emerald-200 rounded-xl flex items-start justify-between gap-3 text-emerald-900 shadow-sm transition-all">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <h4 className="text-sm font-bold text-emerald-900">WhatsApp Campaign Submitted Successfully!</h4>
                      <p className="text-xs text-emerald-700 mt-0.5">
                        Campaign dispatched to <span className="font-semibold">{lastSuccessInfo.recipient}</span> ({lastSuccessInfo.destination}).
                      </p>
                      <p className="text-[11px] font-mono text-emerald-700 mt-1">
                        Submitted Message ID: <span className="font-bold text-emerald-800">{lastSuccessInfo.messageId}</span>
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setLastSuccessInfo(null)}
                    className="text-emerald-500 hover:text-emerald-800 p-1 rounded-lg text-xs font-semibold"
                    title="Dismiss"
                  >
                    ✕
                  </button>
                </div>
              )}

              <form onSubmit={handleSingleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                      Campaign Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.campaignName}
                      onChange={(e) => setFormData({ ...formData, campaignName: e.target.value })}
                      placeholder="e.g. bharatfpo_connect_marketing"
                      className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                      Source Application *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.source}
                      onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                      placeholder="e.g. Bharat_FPO_Connect_App"
                      className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-all"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                      Recipient User Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.userName}
                      onChange={(e) => setFormData({ ...formData, userName: e.target.value })}
                      placeholder="e.g. Vishal"
                      className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                      Destination Mobile Number *
                    </label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                      <input
                        type="text"
                        required
                        value={formData.destination}
                        onChange={(e) => setFormData({ ...formData, destination: e.target.value })}
                        placeholder="e.g. 9146450350"
                        className="w-full pl-10 pr-3.5 py-2.5 text-sm rounded-xl border border-slate-300 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-all font-mono"
                      />
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">Include country code without '+' (e.g. 9146450350)</p>
                  </div>
                </div>

                {/* Template Parameters Editor */}
                <div className="pt-2">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                      Template Parameters ({templateParams.length})
                    </label>
                    <span className="text-[11px] text-slate-400">Optional custom variables</span>
                  </div>

                  <div className="flex items-center gap-2 mb-3">
                    <input
                      type="text"
                      placeholder="Param name / key"
                      value={paramKey}
                      onChange={(e) => setParamKey(e.target.value)}
                      className="flex-1 px-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-1 focus:ring-brand-500"
                    />
                    <input
                      type="text"
                      placeholder="Param value"
                      value={paramValue}
                      onChange={(e) => setParamValue(e.target.value)}
                      className="flex-1 px-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-1 focus:ring-brand-500"
                    />
                    <button
                      type="button"
                      onClick={handleAddTemplateParam}
                      className="px-3 py-2 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add
                    </button>
                  </div>

                  {templateParams.length > 0 && (
                    <div className="flex flex-wrap gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200">
                      {templateParams.map((param, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium bg-white text-slate-700 rounded-md border border-slate-300 shadow-xs"
                        >
                          <span className="font-semibold text-brand-700">{param.key}</span>
                          {param.value && <span className="text-slate-400">: {param.value}</span>}
                          <button
                            type="button"
                            onClick={() => handleRemoveTemplateParam(idx)}
                            className="text-slate-400 hover:text-red-500 ml-1"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Form Buttons */}
                <div className="flex items-center gap-3 pt-4 border-t border-slate-100">
                  <button
                    type="submit"
                    disabled={sendingCampaign || isBulkSending}
                    className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 font-semibold text-sm text-white bg-brand-600 hover:bg-brand-700 active:bg-brand-800 rounded-xl shadow-sm transition-all disabled:opacity-50"
                  >
                    <Send className={`w-4 h-4 ${sendingCampaign ? 'animate-bounce' : ''}`} />
                    {sendingCampaign ? 'Submitting Campaign...' : 'Send Single Campaign'}
                  </button>

                  {selectedAdmins.length > 0 && (
                    <button
                      type="button"
                      onClick={handleBulkSubmit}
                      disabled={sendingCampaign || isBulkSending}
                      className="inline-flex items-center justify-center gap-2 px-6 py-3 font-semibold text-sm text-white bg-purple-600 hover:bg-purple-700 rounded-xl shadow-sm transition-all disabled:opacity-50"
                    >
                      <Users className="w-4 h-4" />
                      {isBulkSending ? 'Processing Bulk...' : `Send to Selected (${selectedAdmins.length})`}
                    </button>
                  )}
                </div>
              </form>

              {/* Bulk Progress Overlay */}
              {isBulkSending && (
                <div className="p-4 bg-purple-50 border border-purple-200 rounded-xl space-y-2">
                  <div className="flex justify-between text-xs font-semibold text-purple-900">
                    <span>Bulk Progress ({bulkProgress.current} of {bulkProgress.total})</span>
                    <span>{Math.round((bulkProgress.current / bulkProgress.total) * 100)}%</span>
                  </div>
                  <div className="w-full bg-purple-200 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${(bulkProgress.current / bulkProgress.total) * 100}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[11px] text-purple-700 pt-1">
                    <span>Success: {bulkProgress.success}</span>
                    <span>Failed: {bulkProgress.failed}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Side Quick Action / Target Card */}
            <div className="bg-white p-6 rounded-b-2xl rounded-tr-2xl border border-slate-200/80 shadow-sm space-y-5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="font-bold text-slate-900 text-base">Quick Target Admin</h3>
                <Shield className="w-4 h-4 text-brand-600" />
              </div>

              <p className="text-xs text-slate-500">
                Select an Admin from the directory to quickly load their details into the campaign dispatcher.
              </p>

              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {adminsList.slice(0, 5).map((admin, index) => {
                  const name = getDisplayString(admin.userName || admin.name || admin.fullName, 'Admin User');
                  const phone = getDisplayString(admin.destination || admin.phone || admin.mobile, 'N/A');
                  return (
                    <div
                      key={getDisplayString(admin._id || index)}
                      onClick={() => handleSelectAdminForSingle(admin)}
                      className="p-3 bg-slate-50 hover:bg-brand-50/60 border border-slate-200/80 hover:border-brand-200 rounded-xl cursor-pointer transition-all flex items-center justify-between group"
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-900 truncate group-hover:text-brand-700">{name}</p>
                        <p className="text-[11px] text-slate-500 font-mono">{phone}</p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-brand-600 group-hover:translate-x-0.5 transition-all" />
                    </div>
                  );
                })}
              </div>

              {adminsList.length > 5 && (
                <button
                  onClick={() => setActiveTab('directory')}
                  className="w-full text-center text-xs font-semibold text-brand-600 hover:text-brand-700 py-1"
                >
                  View all {adminsList.length} admin users →
                </button>
              )}
            </div>
          </div>
        )}

        {/* Tab 2: Admin Users Directory */}
        {activeTab === 'directory' && (
          <div className="bg-white p-6 rounded-b-2xl rounded-tr-2xl border border-slate-200/80 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  placeholder="Search admins by name, phone, email, tenant..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 text-sm rounded-xl border border-slate-300 focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    if (isAllSelected) {
                      dispatch(clearSelectedAdmins());
                    } else {
                      dispatch(selectAllAdmins());
                    }
                  }}
                  className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl"
                >
                  {isAllSelected ? 'Deselect All' : 'Select All'}
                </button>

                {selectedAdmins.length > 0 && (
                  <button
                    onClick={() => {
                      setActiveTab('dispatcher');
                    }}
                    className="px-3.5 py-2 text-xs font-semibold text-white bg-purple-600 hover:bg-purple-700 rounded-xl"
                  >
                    Send Campaign to ({selectedAdmins.length})
                  </button>
                )}
              </div>
            </div>

            {loadingAdmins ? (
              <div className="py-12 text-center text-slate-400">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-brand-600" />
                Fetching admin users list...
              </div>
            ) : filteredAdmins.length === 0 ? (
              <div className="py-12 text-center text-slate-400">
                No admin users found matching your search.
              </div>
            ) : (
              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-600 text-xs font-bold uppercase tracking-wider border-b border-slate-200">
                      <th className="p-3.5 w-10 text-center">
                        <input
                          type="checkbox"
                          checked={isAllSelected}
                          onChange={() => {
                            if (isAllSelected) dispatch(clearSelectedAdmins());
                            else dispatch(selectAllAdmins());
                          }}
                          className="rounded text-brand-600 focus:ring-brand-500"
                        />
                      </th>
                      <th className="p-3.5">Admin Name</th>
                      <th className="p-3.5">Destination Phone</th>
                      <th className="p-3.5">Email</th>
                      <th className="p-3.5">Tenant / Role</th>
                      <th className="p-3.5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {filteredAdmins.map((admin, idx) => {
                      const idKey = getDisplayString(admin._id || admin.id || admin.phone || admin.destination || idx);
                      const isSelected = selectedAdmins.some(
                        (a) => getDisplayString(a._id || a.id || a.phone || a.destination) === getDisplayString(admin._id || admin.id || admin.phone || admin.destination)
                      );
                      const name = getDisplayString(admin.userName || admin.name || admin.fullName, 'Admin User');
                      const phone = getDisplayString(admin.destination || admin.phone || admin.mobile, 'N/A');
                      const email = getDisplayString(admin.email, 'N/A');
                      const tenant = getDisplayString(admin.tenantName || admin.tenantId || admin.tenant || admin.role, 'Admin');

                      return (
                        <tr
                          key={idKey}
                          className={`hover:bg-slate-50/80 transition-colors ${
                            isSelected ? 'bg-purple-50/40' : ''
                          }`}
                        >
                          <td className="p-3.5 text-center">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => dispatch(toggleSelectAdmin(admin))}
                              className="rounded text-brand-600 focus:ring-brand-500"
                            />
                          </td>
                          <td className="p-3.5 font-bold text-slate-900">{name}</td>
                          <td className="p-3.5 font-mono text-slate-600">{phone}</td>
                          <td className="p-3.5 text-slate-500">{email}</td>
                          <td className="p-3.5">
                            <span className="px-2.5 py-1 text-xs font-medium bg-slate-100 text-slate-700 rounded-md">
                              {tenant}
                            </span>
                          </td>
                          <td className="p-3.5 text-right">
                            <button
                              onClick={() => handleSelectAdminForSingle(admin)}
                              className="px-3 py-1.5 text-xs font-semibold text-brand-700 bg-brand-50 hover:bg-brand-100 rounded-lg border border-brand-200 transition-colors"
                            >
                              Use in Campaign
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Submission History Logs */}
        {activeTab === 'history' && (
          <div className="bg-white p-6 rounded-b-2xl rounded-tr-2xl border border-slate-200/80 shadow-sm space-y-4">
            <h2 className="text-lg font-bold text-slate-900">Submitted Campaigns History</h2>
            {campaignHistory.length === 0 ? (
              <div className="py-12 text-center text-slate-400">
                No campaign submissions logged yet in this session.
              </div>
            ) : (
              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-600 text-xs font-bold uppercase tracking-wider border-b border-slate-200">
                      <th className="p-3.5">Status</th>
                      <th className="p-3.5">Submitted Message ID</th>
                      <th className="p-3.5">Recipient</th>
                      <th className="p-3.5">Destination</th>
                      <th className="p-3.5">Campaign Name</th>
                      <th className="p-3.5">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {campaignHistory.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-3.5">
                          {item.status === 'Success' ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold text-emerald-700 bg-emerald-50 rounded-full border border-emerald-200">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Success
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold text-red-700 bg-red-50 rounded-full border border-red-200">
                              <XCircle className="w-3.5 h-3.5" />
                              Failed
                            </span>
                          )}
                        </td>
                        <td className="p-3.5 font-mono text-xs font-bold text-slate-800">
                          {getDisplayString(item.submittedMessageId, 'N/A')}
                        </td>
                        <td className="p-3.5 font-medium text-slate-900">{getDisplayString(item.recipient)}</td>
                        <td className="p-3.5 font-mono text-slate-600">{getDisplayString(item.destination)}</td>
                        <td className="p-3.5 text-slate-600">{getDisplayString(item.campaignName)}</td>
                        <td className="p-3.5 text-xs text-slate-400">
                          {new Date(item.timestamp).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* JSON Payload & Response Preview Modal */}
      {showJsonModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
            <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileCode className="w-5 h-5 text-brand-400" />
                <h3 className="font-bold text-base">API Payload & Response Console</h3>
              </div>
              <button
                onClick={() => setShowJsonModal(false)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-4 bg-slate-950 text-slate-200 font-mono text-xs max-h-[70vh] overflow-y-auto">
              <div className="flex items-center justify-between text-slate-400 border-b border-slate-800 pb-2">
                <span>Request Endpoint: POST /api/superadmin/whatsapp/send-campaign</span>
                <button
                  onClick={() => copyToClipboard(JSON.stringify(modalPayload, null, 2))}
                  className="flex items-center gap-1 text-brand-400 hover:text-brand-300"
                >
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? 'Copied' : 'Copy JSON'}
                </button>
              </div>

              <pre className="text-emerald-400 bg-slate-900 p-4 rounded-xl border border-slate-800 overflow-x-auto">
                {JSON.stringify(modalPayload || buildCurrentPayload(), null, 2)}
              </pre>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setShowJsonModal(false)}
                className="px-5 py-2 text-xs font-semibold text-slate-700 bg-slate-200 hover:bg-slate-300 rounded-xl"
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
