import React, { useState, useEffect, useMemo } from 'react';
import { apiService } from '../../services/api';
import { useSocket } from '../../context/SocketContext';
import { useAuth } from '../../context/AuthContext';
import { ResourceItem, ResourceSummaryMetrics, ResourceRequestItem, ResourceAllocationItem, ResourceHistoryItem, Incident } from '../../types';
import {
  Boxes,
  Truck,
  PlusCircle,
  AlertTriangle,
  MapPin,
  CheckCircle2,
  XCircle,
  Clock,
  Shield,
  Activity,
  Search,
  Filter,
  RefreshCw,
  Edit,
  RotateCcw,
  Send,
  Layers,
  FileText,
  HelpCircle,
  Building2,
  Calendar,
  Sparkles,
  ArrowRight,
  TrendingDown,
  Wrench,
  Package,
  Navigation
} from 'lucide-react';
import { LiveCommandMap } from '../../components/map/LiveCommandMap';

interface ResourceManagementDashboardProps {
  incidents?: Incident[];
}

export const ResourceManagementDashboard: React.FC<ResourceManagementDashboardProps> = ({ incidents = [] }) => {
  const { socket } = useSocket();
  const { user } = useAuth();

  // Active Tab
  const [activeTab, setActiveTab] = useState<'overview' | 'inventory' | 'add' | 'requests' | 'allocations' | 'map' | 'alerts' | 'history'>('overview');

  // State
  const [resources, setResources] = useState<ResourceItem[]>([]);
  const [summaryMetrics, setSummaryMetrics] = useState<ResourceSummaryMetrics>({
    totalRegistered: 0,
    totalAvailable: 0,
    totalDeployed: 0,
    totalMaintenance: 0,
    lowStockCount: 0,
    pendingRequestsCount: 0
  });
  const [resourceRequests, setResourceRequests] = useState<ResourceRequestItem[]>([]);
  const [allocations, setAllocations] = useState<ResourceAllocationItem[]>([]);
  const [historyLogs, setHistoryLogs] = useState<ResourceHistoryItem[]>([]);
  const [lowStockItems, setLowStockItems] = useState<ResourceItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [availabilityFilter, setAvailabilityFilter] = useState('all');

  // Add / Edit Form State
  const [editingResource, setEditingResource] = useState<ResourceItem | null>(null);
  const [resourceForm, setResourceForm] = useState({
    name: '',
    category: 'Emergency Vehicles',
    customCategoryName: '',
    description: '',
    totalQuantity: 10,
    availableQuantity: 10,
    unit: 'vehicles',
    lat: 19.9975,
    lng: 73.7898,
    address: 'District Rescue Depot',
    storageDepot: 'Central Transport Hub',
    status: 'Available',
    department: 'Disaster Management Authority',
    minStockThreshold: 2,
    expiryDate: '',
    notes: ''
  });

  // Allocation Modal State
  const [allocatingResource, setAllocatingResource] = useState<ResourceItem | null>(null);
  const [allocForm, setAllocForm] = useState({
    incidentId: '',
    disasterTitle: '',
    quantity: 1,
    priority: 'High',
    address: 'Evacuation Zone',
    notes: ''
  });

  // Request Decision Modal State
  const [decidingRequest, setDecidingRequest] = useState<ResourceRequestItem | null>(null);
  const [decisionForm, setDecisionForm] = useState({
    status: 'Approved',
    quantityAllocated: 1,
    rejectionReason: '',
    notes: ''
  });

  // Fetch All Data
  const fetchData = async () => {
    setLoading(true);
    try {
      const resData = await apiService.getResourcesList({
        category: categoryFilter,
        status: statusFilter,
        search: searchQuery,
        availability: availabilityFilter
      });
      setResources(resData.resources || []);
      setSummaryMetrics(resData.summary || {
        totalRegistered: 0,
        totalAvailable: 0,
        totalDeployed: 0,
        totalMaintenance: 0,
        lowStockCount: 0,
        pendingRequestsCount: 0
      });

      const reqData = await apiService.getResourceRequests();
      setResourceRequests(reqData || []);

      const lowStockData = await apiService.getLowStockResources();
      setLowStockItems(lowStockData || []);

      const histData = await apiService.getResourceHistory();
      setHistoryLogs(histData || []);
    } catch (err) {
      console.error('Error fetching resource dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [categoryFilter, statusFilter, availabilityFilter]);

  // Socket.IO Real-time Synchronization
  useEffect(() => {
    if (!socket) return;

    const handleUpdate = () => {
      fetchData();
    };

    socket.on('resource:created', handleUpdate);
    socket.on('resource:updated', handleUpdate);
    socket.on('resource:availabilityUpdated', handleUpdate);
    socket.on('resource:allocated', handleUpdate);
    socket.on('resource:returned', handleUpdate);
    socket.on('resource:requestCreated', handleUpdate);
    socket.on('resource:requestUpdated', handleUpdate);
    socket.on('resource:lowStockAlert', handleUpdate);

    return () => {
      socket.off('resource:created', handleUpdate);
      socket.off('resource:updated', handleUpdate);
      socket.off('resource:availabilityUpdated', handleUpdate);
      socket.off('resource:allocated', handleUpdate);
      socket.off('resource:returned', handleUpdate);
      socket.off('resource:requestCreated', handleUpdate);
      socket.off('resource:requestUpdated', handleUpdate);
      socket.off('resource:lowStockAlert', handleUpdate);
    };
  }, [socket]);

  // Filtered Resources
  const filteredResources = useMemo(() => {
    return resources.filter((r) => {
      if (categoryFilter !== 'All' && r.category !== categoryFilter) return false;
      if (statusFilter !== 'All' && r.status !== statusFilter) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchName = r.name.toLowerCase().includes(q);
        const matchCat = r.category.toLowerCase().includes(q);
        const matchDept = (r.department || '').toLowerCase().includes(q);
        const matchId = (r.resourceId || '').toLowerCase().includes(q);
        if (!matchName && !matchCat && !matchDept && !matchId) return false;
      }
      return true;
    });
  }, [resources, categoryFilter, statusFilter, searchQuery]);

  // Submit Add / Edit Form
  const handleSubmitResourceForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingResource) {
      const res = await apiService.updateResourceItem(editingResource.resourceId, {
        name: resourceForm.name,
        category: resourceForm.category,
        customCategoryName: resourceForm.customCategoryName,
        description: resourceForm.description,
        totalQuantity: resourceForm.totalQuantity,
        availableQuantity: resourceForm.availableQuantity,
        unit: resourceForm.unit,
        location: {
          lat: resourceForm.lat,
          lng: resourceForm.lng,
          address: resourceForm.address,
          storageDepot: resourceForm.storageDepot
        },
        status: resourceForm.status,
        department: resourceForm.department,
        minStockThreshold: resourceForm.minStockThreshold,
        expiryDate: resourceForm.expiryDate,
        notes: resourceForm.notes
      });
      if (res.success) {
        alert('Resource updated successfully!');
        setEditingResource(null);
        setActiveTab('inventory');
        fetchData();
      } else {
        alert(`Error: ${res.message}`);
      }
    } else {
      const res = await apiService.createResource({
        name: resourceForm.name,
        category: resourceForm.category,
        customCategoryName: resourceForm.customCategoryName,
        description: resourceForm.description,
        totalQuantity: resourceForm.totalQuantity,
        availableQuantity: resourceForm.availableQuantity,
        unit: resourceForm.unit,
        location: {
          lat: resourceForm.lat,
          lng: resourceForm.lng,
          address: resourceForm.address,
          storageDepot: resourceForm.storageDepot
        },
        status: resourceForm.status,
        department: resourceForm.department,
        minStockThreshold: resourceForm.minStockThreshold,
        expiryDate: resourceForm.expiryDate,
        notes: resourceForm.notes
      });
      if (res.success) {
        alert('New Resource registered successfully!');
        setActiveTab('inventory');
        fetchData();
      } else {
        alert(`Error: ${res.message}`);
      }
    }
  };

  // Submit Allocation
  const handleSubmitAllocation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!allocatingResource) return;

    const res = await apiService.allocateResourceToIncident({
      resourceId: allocatingResource.resourceId,
      incidentId: allocForm.incidentId || 'inc_101',
      disasterTitle: allocForm.disasterTitle || 'Emergency Response Zone',
      quantityAllocated: allocForm.quantity,
      priority: allocForm.priority,
      destination: {
        lat: allocatingResource.location.lat + 0.005,
        lng: allocatingResource.location.lng + 0.005,
        address: allocForm.address
      },
      notes: allocForm.notes
    });

    if (res.success) {
      alert(`Successfully allocated ${allocForm.quantity} ${allocatingResource.unit} to Incident #${allocForm.incidentId}`);
      setAllocatingResource(null);
      fetchData();
    } else {
      alert(`Allocation Failed: ${res.message}`);
    }
  };

  // Submit Return
  const handleReturnResource = async (r: ResourceItem) => {
    if (!confirm(`Return ${r.name} back to central available inventory?`)) return;
    const res = await apiService.returnResourceFromDeployment({
      resourceId: r.resourceId,
      quantityReturned: 1,
      notes: 'Returned from field mission by operator command'
    });
    if (res.success) {
      alert(`Resource returned to available inventory.`);
      fetchData();
    } else {
      alert(`Error: ${res.message}`);
    }
  };

  // Toggle Maintenance Status
  const handleToggleMaintenance = async (r: ResourceItem) => {
    const isMaint = r.status === 'Maintenance';
    const nextVal = !isMaint;
    const notes = prompt(`Enter notes for marking ${r.name} as ${nextVal ? 'Maintenance' : 'Available'}:`, nextVal ? 'Routine hydraulic servicing' : 'Servicing complete');
    if (notes === null) return;

    const res = await apiService.setResourceMaintenance(r.resourceId, nextVal, notes);
    if (res.success) {
      fetchData();
    } else {
      alert(`Error: ${res.message}`);
    }
  };

  // Submit Request Decision
  const handleDecisionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!decidingRequest) return;

    const res = await apiService.updateResourceRequestStatus(decidingRequest.requestId, {
      status: decisionForm.status,
      quantityAllocated: decisionForm.quantityAllocated,
      operatorName: user?.name || 'Emergency Operator',
      rejectionReason: decisionForm.rejectionReason,
      notes: decisionForm.notes
    });

    if (res.success) {
      alert(`Request #${decidingRequest.requestId} updated to ${decisionForm.status}`);
      setDecidingRequest(null);
      fetchData();
    } else {
      alert(`Error: ${res.message}`);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-sans text-slate-100 pb-12">
      
      {/* 🚀 HERO HEADER BANNER */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-blue-950 via-slate-900 to-indigo-950 border border-blue-800/60 shadow-2xl space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-blue-600/20 border border-blue-500/40 rounded-2xl text-blue-400">
              <Boxes className="w-8 h-8" />
            </div>
            <div>
              <div className="inline-flex items-center space-x-2 px-2.5 py-0.5 rounded-full bg-blue-950 text-blue-300 border border-blue-800 font-mono text-[10px] font-bold uppercase tracking-wider mb-1">
                <Sparkles className="w-3 h-3 text-blue-400" />
                <span>RESQAI LOGISTICS & DEPLOYMENT ENGINE</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                Rescue Resource Management
              </h1>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => {
                setEditingResource(null);
                setResourceForm({
                  name: '',
                  category: 'Emergency Vehicles',
                  customCategoryName: '',
                  description: '',
                  totalQuantity: 10,
                  availableQuantity: 10,
                  unit: 'vehicles',
                  lat: 19.9975,
                  lng: 73.7898,
                  address: 'District Rescue Depot',
                  storageDepot: 'Central Transport Hub',
                  status: 'Available',
                  department: 'Disaster Management Authority',
                  minStockThreshold: 2,
                  expiryDate: '',
                  notes: ''
                });
                setActiveTab('add');
              }}
              className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-lg shadow-blue-600/30 flex items-center space-x-1.5 transition-all border border-blue-400/40"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Register New Resource</span>
            </button>
            
            <button
              onClick={fetchData}
              className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 📊 SUMMARY CARDS GRID */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-2">
          
          <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 text-center">
            <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">TOTAL REGISTERED</span>
            <span className="text-2xl font-black text-white mt-0.5 block">{summaryMetrics.totalRegistered}</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-emerald-900/60 text-center">
            <span className="text-[10px] text-emerald-400 font-bold block uppercase tracking-wider">AVAILABLE FLEET</span>
            <span className="text-2xl font-black text-emerald-400 mt-0.5 block">{summaryMetrics.totalAvailable}</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-blue-900/60 text-center">
            <span className="text-[10px] text-blue-400 font-bold block uppercase tracking-wider">DEPLOYED IN FIELD</span>
            <span className="text-2xl font-black text-blue-400 mt-0.5 block">{summaryMetrics.totalDeployed}</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-purple-900/60 text-center">
            <span className="text-[10px] text-purple-400 font-bold block uppercase tracking-wider">UNDER MAINTENANCE</span>
            <span className="text-2xl font-black text-purple-400 mt-0.5 block">{summaryMetrics.totalMaintenance}</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-amber-900/60 text-center">
            <span className="text-[10px] text-amber-400 font-bold block uppercase tracking-wider">LOW-STOCK ALERTS</span>
            <span className="text-2xl font-black text-amber-400 mt-0.5 block">{summaryMetrics.lowStockCount}</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-rose-900/60 text-center">
            <span className="text-[10px] text-rose-400 font-bold block uppercase tracking-wider">PENDING REQUESTS</span>
            <span className="text-2xl font-black text-rose-400 mt-0.5 block">{summaryMetrics.pendingRequestsCount}</span>
          </div>

        </div>
      </div>

      {/* 📌 DASHBOARD TABS NAVIGATION */}
      <div className="flex items-center space-x-2 overflow-x-auto border-b border-slate-800 pb-2 scrollbar-none text-xs font-mono font-bold">
        {[
          { id: 'overview', label: '📊 Overview', count: null },
          { id: 'inventory', label: '📦 All Resources', count: resources.length },
          { id: 'add', label: editingResource ? '✏️ Edit Resource' : '➕ Register Resource', count: null },
          { id: 'requests', label: '📋 Field Requests', count: resourceRequests.length },
          { id: 'map', label: '🗺️ GIS Map & Distance', count: null },
          { id: 'alerts', label: '⚠️ Low-Stock & Expiry', count: lowStockItems.length },
          { id: 'history', label: '📜 Transaction Ledger', count: historyLogs.length }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-2.5 rounded-xl border transition-all shrink-0 flex items-center space-x-2 ${
              activeTab === tab.id
                ? 'bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-600/30'
                : 'bg-slate-900/80 text-slate-400 border-slate-800 hover:text-white hover:bg-slate-800'
            }`}
          >
            <span>{tab.label}</span>
            {tab.count !== null && (
              <span className={`px-2 py-0.5 rounded-full text-[10px] ${activeTab === tab.id ? 'bg-blue-950 text-blue-200' : 'bg-slate-800 text-slate-300'}`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* TAB 1: OVERVIEW & ANALYTICS */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Quick Actions & Category Distribution */}
            <div className="lg:col-span-2 space-y-4">
              <h3 className="font-extrabold text-lg text-white flex items-center space-x-2">
                <Layers className="w-5 h-5 text-blue-400" />
                <span>Resource Category Breakdown</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[
                  { title: 'Emergency Vehicles', icon: Truck, color: 'text-blue-400', border: 'border-blue-800', bg: 'bg-blue-950/40' },
                  { title: 'Medical Supplies', icon: Package, color: 'text-emerald-400', border: 'border-emerald-800', bg: 'bg-emerald-950/40' },
                  { title: 'Essential Supplies', icon: Boxes, color: 'text-amber-400', border: 'border-amber-800', bg: 'bg-amber-950/40' },
                  { title: 'Rescue Equipment', icon: Wrench, color: 'text-purple-400', border: 'border-purple-800', bg: 'bg-purple-950/40' },
                  { title: 'Human Resources', icon: Shield, color: 'text-cyan-400', border: 'border-cyan-800', bg: 'bg-cyan-950/40' }
                ].map((cat) => {
                  const catItems = resources.filter(r => r.category === cat.title);
                  const total = catItems.reduce((acc, r) => acc + (r.totalQuantity || 0), 0);
                  const avail = catItems.reduce((acc, r) => acc + (r.availableQuantity || 0), 0);
                  const Icon = cat.icon;

                  return (
                    <div key={cat.title} className={`p-4 rounded-2xl border ${cat.border} ${cat.bg} space-y-3`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Icon className={`w-5 h-5 ${cat.color}`} />
                          <span className="font-extrabold text-xs text-white">{cat.title}</span>
                        </div>
                        <span className="text-[10px] font-mono font-bold text-slate-400">{catItems.length} Types</span>
                      </div>

                      <div className="space-y-1">
                        <div className="flex justify-between text-xs font-mono">
                          <span className="text-slate-400">Available:</span>
                          <span className={`font-bold ${cat.color}`}>{avail} / {total}</span>
                        </div>
                        <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                          <div
                            className={`h-full ${avail === 0 ? 'bg-red-500' : 'bg-blue-500'}`}
                            style={{ width: `${total > 0 ? (avail / total) * 100 : 0}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Low-Stock Warnings Widget */}
            <div className="space-y-4">
              <h3 className="font-extrabold text-lg text-white flex items-center space-x-2">
                <AlertTriangle className="w-5 h-5 text-amber-400" />
                <span>Critical Stock Alerts</span>
              </h3>

              <div className="p-4 rounded-3xl bg-slate-900 border border-slate-800 space-y-3 font-mono text-xs">
                {lowStockItems.length === 0 ? (
                  <div className="p-6 text-center text-slate-400 space-y-1">
                    <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
                    <p className="font-bold text-white">All Stock Levels Normal</p>
                    <p className="text-[11px]">No inventory items are below minimum threshold.</p>
                  </div>
                ) : (
                  lowStockItems.slice(0, 5).map((item) => (
                    <div key={item.resourceId} className="p-3 rounded-2xl bg-amber-950/40 border border-amber-800/80 flex items-center justify-between">
                      <div>
                        <h4 className="font-extrabold text-white text-xs">{item.name}</h4>
                        <span className="text-[10px] text-amber-300 font-bold block">
                          Stock: {item.availableQuantity} {item.unit} (Min Threshold: {item.minStockThreshold})
                        </span>
                      </div>
                      <span className="px-2 py-0.5 rounded bg-amber-900 text-amber-200 text-[10px] font-bold">
                        LOW STOCK
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* TAB 2: ALL RESOURCES INVENTORY TABLE */}
      {activeTab === 'inventory' && (
        <div className="space-y-4 font-mono text-xs">
          
          {/* SEARCH & FILTERS TOOLBAR */}
          <div className="p-4 rounded-3xl bg-slate-900 border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-3 shadow-lg">
            
            <div className="relative w-full md:w-72">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Search name, category, depot..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              <div className="flex items-center space-x-1 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
                <Filter className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-slate-400 font-bold">Category:</span>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="bg-transparent text-white font-bold focus:outline-none"
                >
                  <option value="All" className="bg-slate-900">All Categories</option>
                  <option value="Emergency Vehicles" className="bg-slate-900">Emergency Vehicles</option>
                  <option value="Medical Supplies" className="bg-slate-900">Medical Supplies</option>
                  <option value="Essential Supplies" className="bg-slate-900">Essential Supplies</option>
                  <option value="Rescue Equipment" className="bg-slate-900">Rescue Equipment</option>
                  <option value="Human Resources" className="bg-slate-900">Human Resources</option>
                </select>
              </div>

              <div className="flex items-center space-x-1 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
                <span className="text-slate-400 font-bold">Status:</span>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="bg-transparent text-white font-bold focus:outline-none"
                >
                  <option value="All" className="bg-slate-900">All Statuses</option>
                  <option value="Available" className="bg-slate-900">Available</option>
                  <option value="Deployed" className="bg-slate-900">Deployed</option>
                  <option value="Maintenance" className="bg-slate-900">Maintenance</option>
                  <option value="Low Stock" className="bg-slate-900">Low Stock</option>
                  <option value="Out of Stock" className="bg-slate-900">Out of Stock</option>
                </select>
              </div>
            </div>

          </div>

          {/* TABLE VIEW */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-950 border-b border-slate-800 text-slate-400 text-[11px] font-bold uppercase tracking-wider">
                    <th className="p-4">RESOURCE NAME & ID</th>
                    <th className="p-4">CATEGORY</th>
                    <th className="p-4 text-center">QUANTITY / CAPACITY</th>
                    <th className="p-4">DEPOT LOCATION</th>
                    <th className="p-4 text-center">STATUS</th>
                    <th className="p-4 text-right">ACTIONS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-200">
                  {filteredResources.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-500 italic">
                        No resources match your search criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredResources.map((r) => (
                      <tr key={r.resourceId} className="hover:bg-slate-800/40 transition-colors">
                        
                        <td className="p-4">
                          <div className="font-extrabold text-white text-sm">{r.name}</div>
                          <div className="text-[10px] text-slate-500">ID: {r.resourceId} • Dept: {r.department}</div>
                        </td>

                        <td className="p-4">
                          <span className="px-2.5 py-1 rounded-full bg-slate-950 border border-slate-800 text-slate-300 font-bold text-[11px]">
                            {r.category}
                          </span>
                        </td>

                        <td className="p-4 text-center">
                          <div className="font-extrabold text-sm text-emerald-400">
                            {r.availableQuantity} / {r.totalQuantity} <span className="text-xs text-slate-400 font-normal">{r.unit}</span>
                          </div>
                          <div className="w-24 h-1.5 bg-slate-950 rounded-full mx-auto mt-1 overflow-hidden border border-slate-800">
                            <div
                              className={`h-full ${r.availableQuantity === 0 ? 'bg-red-500' : 'bg-emerald-500'}`}
                              style={{ width: `${(r.availableQuantity / (r.totalQuantity || 1)) * 100}%` }}
                            />
                          </div>
                        </td>

                        <td className="p-4">
                          <div className="text-slate-200 font-bold">{r.location?.storageDepot || 'Central Depot'}</div>
                          <div className="text-[10px] text-slate-500">{r.location?.address}</div>
                        </td>

                        <td className="p-4 text-center">
                          <span className={`px-3 py-1 rounded-full text-[10px] font-extrabold uppercase border ${
                            r.status === 'Available' ? 'bg-emerald-950 text-emerald-300 border-emerald-800' :
                            r.status === 'Deployed' ? 'bg-blue-950 text-blue-300 border-blue-800' :
                            r.status === 'Maintenance' ? 'bg-purple-950 text-purple-300 border-purple-800' :
                            'bg-amber-950 text-amber-300 border-amber-800'
                          }`}>
                            {r.status}
                          </span>
                        </td>

                        <td className="p-4 text-right space-x-1.5">
                          {r.status === 'Deployed' ? (
                            <button
                              onClick={() => handleReturnResource(r)}
                              className="px-2.5 py-1 bg-blue-950 hover:bg-blue-900 text-blue-300 border border-blue-700 rounded-lg text-[11px] font-bold transition-colors"
                            >
                              Return Stock
                            </button>
                          ) : (
                            <button
                              onClick={() => {
                                setAllocatingResource(r);
                                setAllocForm({
                                  incidentId: incidents.length ? incidents[0].id : 'inc_101',
                                  disasterTitle: incidents.length ? incidents[0].title : 'Active Emergency Site',
                                  quantity: 1,
                                  priority: 'High',
                                  address: r.location?.address || 'Disaster Zone',
                                  notes: ''
                                });
                              }}
                              disabled={r.availableQuantity === 0}
                              className="px-2.5 py-1 bg-emerald-950 hover:bg-emerald-900 disabled:opacity-40 text-emerald-300 border border-emerald-700 rounded-lg text-[11px] font-bold transition-colors"
                            >
                              Allocate
                            </button>
                          )}

                          <button
                            onClick={() => handleToggleMaintenance(r)}
                            className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-lg text-[11px] transition-colors"
                          >
                            <Wrench className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => {
                              setEditingResource(r);
                              setResourceForm({
                                name: r.name,
                                category: r.category,
                                customCategoryName: r.customCategoryName || '',
                                description: r.description || '',
                                totalQuantity: r.totalQuantity,
                                availableQuantity: r.availableQuantity,
                                unit: r.unit,
                                lat: r.location?.lat || 19.9975,
                                lng: r.location?.lng || 73.7898,
                                address: r.location?.address || '',
                                storageDepot: r.location?.storageDepot || '',
                                status: r.status,
                                department: r.department || '',
                                minStockThreshold: r.minStockThreshold || 5,
                                expiryDate: r.expiryDate ? new Date(r.expiryDate).toISOString().substring(0, 10) : '',
                                notes: r.notes || ''
                              });
                              setActiveTab('add');
                            }}
                            className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-lg text-[11px] transition-colors"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                        </td>

                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* TAB 3: ADD / EDIT RESOURCE FORM */}
      {activeTab === 'add' && (
        <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl max-w-3xl mx-auto space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <h3 className="text-xl font-extrabold text-white flex items-center space-x-2">
              <PlusCircle className="w-6 h-6 text-blue-400" />
              <span>{editingResource ? `Edit Resource: ${editingResource.name}` : 'Register New Resource Item'}</span>
            </h3>
            <button
              onClick={() => {
                setEditingResource(null);
                setActiveTab('inventory');
              }}
              className="px-3 py-1 bg-slate-800 text-slate-400 hover:text-white rounded-lg text-xs"
            >
              Cancel
            </button>
          </div>

          <form onSubmit={handleSubmitResourceForm} className="space-y-4 text-xs font-sans">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-bold text-slate-300 mb-1">Resource Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. ALS Ambulance AMB-04"
                  value={resourceForm.name}
                  onChange={(e) => setResourceForm({ ...resourceForm, name: e.target.value })}
                  className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-white focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1">Category *</label>
                <select
                  value={resourceForm.category}
                  onChange={(e) => setResourceForm({ ...resourceForm, category: e.target.value })}
                  className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-white focus:border-blue-500 focus:outline-none"
                >
                  <option value="Emergency Vehicles">Emergency Vehicles</option>
                  <option value="Medical Supplies">Medical Supplies</option>
                  <option value="Essential Supplies">Essential Supplies</option>
                  <option value="Rescue Equipment">Rescue Equipment</option>
                  <option value="Human Resources">Human Resources</option>
                  <option value="Custom">Custom Category</option>
                </select>
              </div>
            </div>

            {resourceForm.category === 'Custom' && (
              <div>
                <label className="block font-bold text-slate-300 mb-1">Custom Category Name</label>
                <input
                  type="text"
                  placeholder="Specify custom category..."
                  value={resourceForm.customCategoryName}
                  onChange={(e) => setResourceForm({ ...resourceForm, customCategoryName: e.target.value })}
                  className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-white focus:border-blue-500 focus:outline-none"
                />
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block font-bold text-slate-300 mb-1">Total Capacity / Stock *</label>
                <input
                  type="number"
                  min="0"
                  required
                  value={resourceForm.totalQuantity}
                  onChange={(e) => setResourceForm({ ...resourceForm, totalQuantity: parseInt(e.target.value, 10) || 0 })}
                  className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-white focus:border-blue-500 focus:outline-none font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1">Available Quantity *</label>
                <input
                  type="number"
                  min="0"
                  max={resourceForm.totalQuantity}
                  required
                  value={resourceForm.availableQuantity}
                  onChange={(e) => setResourceForm({ ...resourceForm, availableQuantity: parseInt(e.target.value, 10) || 0 })}
                  className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-white focus:border-blue-500 focus:outline-none font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1">Unit of Measurement *</label>
                <select
                  value={resourceForm.unit}
                  onChange={(e) => setResourceForm({ ...resourceForm, unit: e.target.value })}
                  className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-white focus:border-blue-500 focus:outline-none"
                >
                  <option value="vehicles">vehicles</option>
                  <option value="kits">kits</option>
                  <option value="packets">packets</option>
                  <option value="units">units</option>
                  <option value="litres">litres</option>
                  <option value="kg">kg</option>
                  <option value="personnel">personnel</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-bold text-slate-300 mb-1">Latitude Coordinate</label>
                <input
                  type="number"
                  step="any"
                  value={resourceForm.lat}
                  onChange={(e) => setResourceForm({ ...resourceForm, lat: parseFloat(e.target.value) || 19.9975 })}
                  className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1">Longitude Coordinate</label>
                <input
                  type="number"
                  step="any"
                  value={resourceForm.lng}
                  onChange={(e) => setResourceForm({ ...resourceForm, lng: parseFloat(e.target.value) || 73.7898 })}
                  className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-bold text-slate-300 mb-1">Storage Depot / Warehouse Name</label>
                <input
                  type="text"
                  placeholder="e.g. Central Logistics Armory #1"
                  value={resourceForm.storageDepot}
                  onChange={(e) => setResourceForm({ ...resourceForm, storageDepot: e.target.value })}
                  className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-white"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1">Min Stock Threshold (Low-Stock Warning)</label>
                <input
                  type="number"
                  min="0"
                  value={resourceForm.minStockThreshold}
                  onChange={(e) => setResourceForm({ ...resourceForm, minStockThreshold: parseInt(e.target.value, 10) || 0 })}
                  className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-300 mb-1">Description & Specs</label>
              <textarea
                rows={2}
                placeholder="Enter technical specifications or stock details..."
                value={resourceForm.description}
                onChange={(e) => setResourceForm({ ...resourceForm, description: e.target.value })}
                className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-white"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 font-extrabold text-white text-xs rounded-xl shadow-lg transition-all"
            >
              {editingResource ? 'Save Resource Changes' : 'Register Resource Item'}
            </button>
          </form>
        </div>
      )}

      {/* TAB 4: RESOURCE REQUESTS WORKFLOW */}
      {activeTab === 'requests' && (
        <div className="space-y-4 font-mono text-xs">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="font-extrabold text-lg text-white font-sans flex items-center space-x-2">
              <FileText className="w-5 h-5 text-rose-400" />
              <span>Field Rescue Resource Requests</span>
            </h3>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-950 border-b border-slate-800 text-slate-400 text-[11px] font-bold uppercase">
                    <th className="p-4">REQUEST ID & TEAM</th>
                    <th className="p-4">RESOURCE REQUIRED</th>
                    <th className="p-4 text-center">QTY REQUESTED</th>
                    <th className="p-4">PRIORITY</th>
                    <th className="p-4">STATUS</th>
                    <th className="p-4 text-right">DECISION ACTION</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-200">
                  {resourceRequests.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-500 italic">
                        No pending resource requests from rescue teams.
                      </td>
                    </tr>
                  ) : (
                    resourceRequests.map((req) => (
                      <tr key={req.requestId} className="hover:bg-slate-800/40 transition-colors">
                        <td className="p-4">
                          <div className="font-extrabold text-white text-sm">#{req.requestId}</div>
                          <div className="text-[10px] text-slate-400">{req.requestingTeamName} • Dept: {req.requestingDepartment}</div>
                        </td>

                        <td className="p-4">
                          <div className="font-bold text-slate-200">{req.resourceName}</div>
                          <div className="text-[10px] text-slate-500">Reason: {req.requestReason}</div>
                        </td>

                        <td className="p-4 text-center font-extrabold text-sm text-blue-400">
                          {req.quantityRequested}
                        </td>

                        <td className="p-4">
                          <span className={`px-2.5 py-0.5 rounded font-extrabold text-[10px] uppercase border ${
                            req.priority === 'Critical' ? 'bg-red-950 text-red-300 border-red-800' :
                            req.priority === 'High' ? 'bg-amber-950 text-amber-300 border-amber-800' :
                            'bg-blue-950 text-blue-300 border-blue-800'
                          }`}>
                            {req.priority}
                          </span>
                        </td>

                        <td className="p-4">
                          <span className={`px-3 py-1 rounded-full text-[10px] font-extrabold uppercase border ${
                            req.status === 'Approved' ? 'bg-emerald-950 text-emerald-300 border-emerald-800' :
                            req.status === 'Rejected' ? 'bg-red-950 text-red-300 border-red-800' :
                            'bg-amber-950 text-amber-300 border-amber-800'
                          }`}>
                            {req.status}
                          </span>
                        </td>

                        <td className="p-4 text-right">
                          <button
                            onClick={() => {
                              setDecidingRequest(req);
                              setDecisionForm({
                                status: 'Approved',
                                quantityAllocated: req.quantityRequested,
                                rejectionReason: '',
                                notes: ''
                              });
                            }}
                            className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg text-xs shadow transition-all"
                          >
                            Review & Decide
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: GIS MAP & NEAREST DISCOVERY */}
      {activeTab === 'map' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-lg text-white flex items-center space-x-2">
              <Navigation className="w-5 h-5 text-emerald-400" />
              <span>GIS Resource Radar & Nearest Depot Discovery</span>
            </h3>
          </div>

          <div className="h-[520px] rounded-3xl overflow-hidden border border-slate-800 shadow-2xl">
            <LiveCommandMap
              hospitals={[]}
              resources={resources.map(r => ({
                id: r.resourceId,
                name: `${r.name} (${r.availableQuantity} ${r.unit})`,
                type: r.category.includes('Vehicle') ? 'Ambulance' : 'Medical Kit',
                status: r.status === 'Available' ? 'Available' : 'Dispatched',
                location: { lat: r.location.lat, lng: r.location.lng, address: r.location.address || 'Depot' },
                etaMinutes: 10,
                capacity: r.availableQuantity,
                contactNumber: '+1 555-RESOURCE'
              }))}
              height="520px"
            />
          </div>
        </div>
      )}

      {/* TAB 6: LOW-STOCK & EXPIRY ALERTS */}
      {activeTab === 'alerts' && (
        <div className="space-y-4 font-mono text-xs">
          <h3 className="font-extrabold text-lg text-white font-sans flex items-center space-x-2">
            <AlertTriangle className="w-5 h-5 text-amber-400" />
            <span>Low-Stock & Expiry Alert Center</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {lowStockItems.length === 0 ? (
              <div className="col-span-2 p-8 bg-slate-900 border border-slate-800 rounded-3xl text-center text-slate-400">
                <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-2" />
                <h4 className="font-extrabold text-white text-base">Inventory Healthy</h4>
                <p className="text-xs">No consumable items are below threshold or nearing expiry date.</p>
              </div>
            ) : (
              lowStockItems.map((item) => (
                <div key={item.resourceId} className="p-5 rounded-3xl bg-slate-900 border border-amber-600/60 space-y-3 shadow-xl">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-extrabold text-white text-base">{item.name}</h4>
                      <p className="text-slate-400 text-xs">{item.category} • Depot: {item.location?.storageDepot}</p>
                    </div>
                    <span className="px-2.5 py-1 rounded bg-amber-950 text-amber-300 border border-amber-800 text-[10px] font-bold uppercase">
                      CRITICAL ALERT
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800">
                      <span className="text-slate-500 text-[10px] font-bold block">CURRENT STOCK</span>
                      <strong className="text-amber-400 text-sm">{item.availableQuantity} / {item.totalQuantity} {item.unit}</strong>
                    </div>
                    <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800">
                      <span className="text-slate-500 text-[10px] font-bold block">MIN THRESHOLD</span>
                      <strong className="text-slate-200 text-sm">{item.minStockThreshold} {item.unit}</strong>
                    </div>
                  </div>

                  {item.expiryDate && (
                    <div className="p-2 bg-red-950/40 border border-red-800/60 rounded-xl text-red-300 text-[11px] font-bold flex items-center space-x-2">
                      <Calendar className="w-4 h-4 text-red-400 shrink-0" />
                      <span>EXPIRY DATE: {new Date(item.expiryDate).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 7: TRANSACTION LEDGER */}
      {activeTab === 'history' && (
        <div className="space-y-4 font-mono text-xs">
          <h3 className="font-extrabold text-lg text-white font-sans flex items-center space-x-2">
            <Clock className="w-5 h-5 text-blue-400" />
            <span>Resource Stock Audit & Transaction Ledger</span>
          </h3>

          <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-950 border-b border-slate-800 text-slate-400 text-[11px] font-bold uppercase">
                    <th className="p-4">TIMESTAMP</th>
                    <th className="p-4">RESOURCE NAME</th>
                    <th className="p-4 text-center">ACTION</th>
                    <th className="p-4 text-center">PREV → NEW</th>
                    <th className="p-4">PERFORMED BY</th>
                    <th className="p-4">REASON & AUDIT NOTES</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-200">
                  {historyLogs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-500 italic">
                        No audit history logs recorded yet.
                      </td>
                    </tr>
                  ) : (
                    historyLogs.map((log) => (
                      <tr key={log.historyId} className="hover:bg-slate-800/40 transition-colors">
                        <td className="p-4 text-slate-400">
                          {log.createdAt ? new Date(log.createdAt).toLocaleString() : 'Recent'}
                        </td>
                        <td className="p-4 font-bold text-white">
                          {log.resourceName}
                        </td>
                        <td className="p-4 text-center">
                          <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold uppercase border ${
                            log.transactionType === 'REGISTER' ? 'bg-emerald-950 text-emerald-300 border-emerald-800' :
                            log.transactionType === 'ALLOCATE' ? 'bg-blue-950 text-blue-300 border-blue-800' :
                            log.transactionType === 'RETURN' ? 'bg-purple-950 text-purple-300 border-purple-800' :
                            'bg-slate-950 text-slate-300 border-slate-700'
                          }`}>
                            {log.transactionType}
                          </span>
                        </td>
                        <td className="p-4 text-center font-bold">
                          <span className="text-slate-400">{log.previousQuantity}</span>
                          <span className="text-blue-400 mx-1">→</span>
                          <span className="text-emerald-400">{log.newQuantity}</span>
                        </td>
                        <td className="p-4 text-slate-300">
                          {log.performedBy}
                        </td>
                        <td className="p-4 text-slate-400">
                          {log.reason}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ALLOCATION MODAL */}
      {allocatingResource && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-3xl p-6 shadow-2xl space-y-4 text-white font-sans text-xs">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-extrabold text-base text-white">Allocate Resource</h3>
              <button onClick={() => setAllocatingResource(null)} className="p-1 bg-slate-800 rounded">
                <XCircle className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
              <p className="font-bold text-white text-sm">{allocatingResource.name}</p>
              <p className="text-[11px] text-emerald-400 font-mono font-bold">
                Available: {allocatingResource.availableQuantity} {allocatingResource.unit}
              </p>
            </div>

            <form onSubmit={handleSubmitAllocation} className="space-y-3">
              <div>
                <label className="block font-bold mb-1">Target Incident</label>
                <select
                  value={allocForm.incidentId}
                  onChange={(e) => {
                    const selectedInc = incidents.find(i => i.id === e.target.value);
                    setAllocForm({
                      ...allocForm,
                      incidentId: e.target.value,
                      disasterTitle: selectedInc ? selectedInc.title : 'Active Incident'
                    });
                  }}
                  className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-white"
                >
                  {incidents.map(inc => (
                    <option key={inc.id} value={inc.id}>{inc.title} (#{inc.id})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold mb-1">Quantity to Allocate</label>
                <input
                  type="number"
                  min="1"
                  max={allocatingResource.availableQuantity}
                  value={allocForm.quantity}
                  onChange={(e) => setAllocForm({ ...allocForm, quantity: parseInt(e.target.value, 10) || 1 })}
                  className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono"
                />
              </div>

              <div>
                <label className="block font-bold mb-1">Destination / Evacuation Zone Address</label>
                <input
                  type="text"
                  value={allocForm.address}
                  onChange={(e) => setAllocForm({ ...allocForm, address: e.target.value })}
                  className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-white"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 font-bold text-white text-xs rounded-xl shadow-lg transition-colors"
              >
                Confirm Resource Allocation
              </button>
            </form>
          </div>
        </div>
      )}

      {/* REQUEST DECISION MODAL */}
      {decidingRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-3xl p-6 shadow-2xl space-y-4 text-white font-sans text-xs">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-extrabold text-base text-white">Review Request #{decidingRequest.requestId}</h3>
              <button onClick={() => setDecidingRequest(null)} className="p-1 bg-slate-800 rounded">
                <XCircle className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
              <p className="font-bold text-white text-sm">{decidingRequest.resourceName}</p>
              <p className="text-[11px] text-slate-400">Team: {decidingRequest.requestingTeamName} • Qty Requested: {decidingRequest.quantityRequested}</p>
              <p className="text-[11px] text-amber-300 italic">Reason: {decidingRequest.requestReason}</p>
            </div>

            <form onSubmit={handleDecisionSubmit} className="space-y-3">
              <div>
                <label className="block font-bold mb-1">Decision</label>
                <select
                  value={decisionForm.status}
                  onChange={(e) => setDecisionForm({ ...decisionForm, status: e.target.value })}
                  className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-white"
                >
                  <option value="Approved">Approve (Full Quantity)</option>
                  <option value="Partially Approved">Partially Approve</option>
                  <option value="Rejected">Reject Request</option>
                </select>
              </div>

              {decisionForm.status === 'Partially Approved' && (
                <div>
                  <label className="block font-bold mb-1">Quantity Approved</label>
                  <input
                    type="number"
                    min="1"
                    max={decidingRequest.quantityRequested}
                    value={decisionForm.quantityAllocated}
                    onChange={(e) => setDecisionForm({ ...decisionForm, quantityAllocated: parseInt(e.target.value, 10) || 1 })}
                    className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono"
                  />
                </div>
              )}

              {decisionForm.status === 'Rejected' && (
                <div>
                  <label className="block font-bold mb-1">Reason for Rejection</label>
                  <textarea
                    rows={2}
                    required
                    placeholder="Enter reason for rejecting request..."
                    value={decisionForm.rejectionReason}
                    onChange={(e) => setDecisionForm({ ...decisionForm, rejectionReason: e.target.value })}
                    className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-white"
                  />
                </div>
              )}

              <button
                type="submit"
                className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 font-bold text-white text-xs rounded-xl shadow-lg transition-colors"
              >
                Submit Decision
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
