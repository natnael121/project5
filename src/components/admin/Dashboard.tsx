import React, { useState, useEffect } from 'react';
import { DollarSign, ShoppingBag, Eye, TrendingUp, Clock, CheckCircle, XCircle, Plus, Minus } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useAuth } from '../../hooks/useAuth';
import { firebaseService } from '../../services/firebase';
import { MenuStats, Order, PendingOrder, TableBill, MenuItem } from '../../types';

export const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<MenuStats | null>(null);
  const [pendingOrders, setPendingOrders] = useState<PendingOrder[]>([]);
  const [tableBills, setTableBills] = useState<TableBill[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [activeTab, setActiveTab] = useState<string>('pending');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadDashboardData();
    }
  }, [user]);

  const loadDashboardData = async () => {
    if (!user) return;
    
    try {
      const [menuStats, pending, bills, items] = await Promise.all([
        firebaseService.getMenuStats(user.id),
        firebaseService.getPendingOrders(user.id),
        firebaseService.getTableBills(user.id),
        firebaseService.getMenuItems(user.id)
      ]);
      
      setStats(menuStats);
      setPendingOrders(pending);
      setTableBills(bills);
      setMenuItems(items);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApproveOrder = async (pendingOrder: PendingOrder) => {
    try {
      await firebaseService.approvePendingOrder(pendingOrder.id, pendingOrder);
      await loadDashboardData();
    } catch (error) {
      console.error('Error approving order:', error);
      alert('Failed to approve order');
    }
  };

  const handleRejectOrder = async (pendingOrderId: string) => {
    try {
      await firebaseService.rejectPendingOrder(pendingOrderId);
      setPendingOrders(prev => prev.filter(order => order.id !== pendingOrderId));
    } catch (error) {
      console.error('Error rejecting order:', error);
      alert('Failed to reject order');
    }
  };

  const handleAddItemToTable = async (tableNumber: string, menuItem: MenuItem) => {
    try {
      const orderItem = {
        id: menuItem.id,
        name: menuItem.name,
        price: menuItem.price,
        quantity: 1,
        total: menuItem.price,
      };
      
      await firebaseService.addItemToTableBill(user!.id, tableNumber, orderItem);
      await loadDashboardData();
    } catch (error) {
      console.error('Error adding item to table:', error);
      alert('Failed to add item to table');
    }
  };

  const handleRemoveItemFromTable = async (tableNumber: string, itemId: string) => {
    try {
      await firebaseService.removeItemFromTableBill(user!.id, tableNumber, itemId);
      await loadDashboardData();
    } catch (error) {
      console.error('Error removing item from table:', error);
      alert('Failed to remove item from table');
    }
  };

  const handleMarkBillAsPaid = async (tableNumber: string) => {
    if (!confirm(`Mark Table ${tableNumber} bill as paid? This will clear the table for the next customer.`)) return;
    
    try {
      await firebaseService.markTableBillAsPaid(user!.id, tableNumber);
      await loadDashboardData();
    } catch (error) {
      console.error('Error marking bill as paid:', error);
      alert('Failed to mark bill as paid');
    }
  };

  const getTableNumbers = () => {
    const tableNumbers = new Set<string>();
    tableBills.forEach(bill => tableNumbers.add(bill.tableNumber));
    // Add tables 1-10 by default
    for (let i = 1; i <= 10; i++) {
      tableNumbers.add(i.toString());
    }
    return Array.from(tableNumbers).sort((a, b) => parseInt(a) - parseInt(b));
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const statCards = [
    {
      title: 'Total Revenue',
      value: `$${stats?.totalRevenue.toFixed(2) || '0.00'}`,
      icon: DollarSign,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      title: 'Total Orders',
      value: stats?.totalOrders.toString() || '0',
      icon: ShoppingBag,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      title: 'Menu Views',
      value: stats?.totalViews.toString() || '0',
      icon: Eye,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
    },
    {
      title: 'Popular Items',
      value: stats?.popularItems.length.toString() || '0',
      icon: TrendingUp,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
    },
  ];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600">Welcome back, {user?.name}!</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, index) => (
          <div key={index} className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
              </div>
              <div className={`p-3 rounded-lg ${stat.bgColor}`}>
                <stat.icon className={`w-6 h-6 ${stat.color}`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Order Management Section */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="border-b">
          <nav className="flex space-x-8 px-6">
            <button
              onClick={() => setActiveTab('pending')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'pending'
                  ? 'border-orange-500 text-orange-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Pending Approval ({pendingOrders.length})
            </button>
            {getTableNumbers().map(tableNumber => {
              const tableBill = tableBills.find(bill => bill.tableNumber === tableNumber);
              return (
                <button
                  key={tableNumber}
                  onClick={() => setActiveTab(`table-${tableNumber}`)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === `table-${tableNumber}`
                      ? 'border-green-500 text-green-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Table {tableNumber}
                  {tableBill && (
                    <span className="ml-1 bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
                      ${tableBill.total.toFixed(2)}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'pending' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Orders Awaiting Approval</h3>
              {pendingOrders.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Clock className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>No pending orders</p>
                </div>
              ) : (
                pendingOrders.map((order) => (
                  <div key={order.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h4 className="font-semibold text-gray-900">Table {order.tableNumber}</h4>
                        <p className="text-sm text-gray-600">
                          {new Date(order.timestamp).toLocaleString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-gray-900">${order.totalAmount.toFixed(2)}</p>
                      </div>
                    </div>
                    
                    <div className="mb-4">
                      <h5 className="font-medium text-gray-700 mb-2">Items:</h5>
                      <div className="space-y-1">
                        {order.items.map((item, index) => (
                          <div key={index} className="flex justify-between text-sm">
                            <span>{item.name} x{item.quantity}</span>
                            <span>${item.total.toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    <div className="flex space-x-3">
                      <button
                        onClick={() => handleApproveOrder(order)}
                        className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center space-x-2"
                      >
                        <CheckCircle className="w-4 h-4" />
                        <span>Approve</span>
                      </button>
                      <button
                        onClick={() => handleRejectOrder(order.id)}
                        className="flex-1 bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center space-x-2"
                      >
                        <XCircle className="w-4 h-4" />
                        <span>Reject</span>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab.startsWith('table-') && (
            <TableBillView
              tableNumber={activeTab.replace('table-', '')}
              tableBill={tableBills.find(bill => bill.tableNumber === activeTab.replace('table-', ''))}
              menuItems={menuItems}
              onAddItem={handleAddItemToTable}
              onRemoveItem={handleRemoveItemFromTable}
              onMarkAsPaid={handleMarkBillAsPaid}
            />
          )}
        </div>
      </div>

      {/* Revenue Chart */}
      {stats?.monthlyRevenue && stats.monthlyRevenue.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Revenue Trend</h2>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={stats.monthlyRevenue}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value) => [`$${value}`, 'Revenue']} />
                <Line 
                  type="monotone" 
                  dataKey="revenue" 
                  stroke="#10b981" 
                  strokeWidth={2}
                  dot={{ fill: '#10b981' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Popular Items */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Popular Items</h2>
          <div className="space-y-3">
            {stats?.popularItems.slice(0, 5).map((item, index) => (
              <div key={item.id} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                    <span className="text-sm font-semibold text-green-600">#{index + 1}</span>
                  </div>
                  <span className="font-medium text-gray-900">{item.name}</span>
                </div>
                <span className="text-sm text-gray-600">{item.orders} orders</span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Orders */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Orders</h2>
          <div className="space-y-3">
            {stats?.recentOrders.slice(0, 5).map((order) => (
              <div key={order.id} className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">Table {order.tableNumber}</p>
                  <p className="text-sm text-gray-600">
                    {new Date(order.timestamp).toLocaleDateString()}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-gray-900">${order.totalAmount.toFixed(2)}</p>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    order.status === 'delivered' ? 'bg-green-100 text-green-800' :
                    order.status === 'preparing' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {order.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// Table Bill View Component
interface TableBillViewProps {
  tableNumber: string;
  tableBill: TableBill | undefined;
  menuItems: MenuItem[];
  onAddItem: (tableNumber: string, menuItem: MenuItem) => void;
  onRemoveItem: (tableNumber: string, itemId: string) => void;
  onMarkAsPaid: (tableNumber: string) => void;
}

const TableBillView: React.FC<TableBillViewProps> = ({
  tableNumber,
  tableBill,
  menuItems,
  onAddItem,
  onRemoveItem,
  onMarkAsPaid,
}) => {
  const [showAddItems, setShowAddItems] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Table {tableNumber}</h3>
        <div className="flex space-x-3">
          <button
            onClick={() => setShowAddItems(!showAddItems)}
            className="bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>Add Items</span>
          </button>
          {tableBill && (
            <button
              onClick={() => onMarkAsPaid(tableNumber)}
              className="bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors"
            >
              Mark as Paid
            </button>
          )}
        </div>
      </div>

      {!tableBill ? (
        <div className="text-center py-8 text-gray-500">
          <ShoppingBag className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <p>No active orders for this table</p>
        </div>
      ) : (
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="font-semibold text-gray-900 mb-3">Current Bill</h4>
          <div className="space-y-2 mb-4">
            {tableBill.items.map((item, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex-1">
                  <span className="text-sm font-medium">{item.name}</span>
                  <span className="text-sm text-gray-600 ml-2">x{item.quantity}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium">${item.total.toFixed(2)}</span>
                  <button
                    onClick={() => onRemoveItem(tableNumber, item.id)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
          
          <div className="border-t pt-3 space-y-1">
            <div className="flex justify-between text-sm">
              <span>Subtotal:</span>
              <span>${tableBill.subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Tax (15%):</span>
              <span>${tableBill.tax.toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-bold">
              <span>Total:</span>
              <span>${tableBill.total.toFixed(2)}</span>
            </div>
          </div>
        </div>
      )}

      {showAddItems && (
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="font-semibold text-gray-900 mb-3">Add Items to Table {tableNumber}</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-64 overflow-y-auto">
            {menuItems.filter(item => item.available).map((item) => (
              <div key={item.id} className="bg-white p-3 rounded-lg border">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h5 className="font-medium text-sm">{item.name}</h5>
                    <p className="text-xs text-gray-600">${item.price.toFixed(2)}</p>
                  </div>
                  <button
                    onClick={() => onAddItem(tableNumber, item)}
                    className="bg-green-600 text-white p-1 rounded hover:bg-green-700 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};