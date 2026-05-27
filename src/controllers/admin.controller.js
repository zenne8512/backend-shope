const prisma = require('../utils/prisma');

// @desc    Get Admin Dashboard Stats
// @route   GET /api/admin/dashboard
// @access  Private/Admin
const getDashboardStats = async (req, res) => {
  try {
    const totalProducts = await prisma.products.count();
    const totalOrders = await prisma.orders.count();
    const totalUsers = await prisma.users.count({ where: { role: 'USER' } });

    // Calculate total revenue from COMPLETED orders
    const completedOrders = await prisma.orders.findMany({
      where: { status: 'COMPLETED' },
      select: { total_amount: true }
    });

    const totalRevenue = completedOrders.reduce((sum, order) => sum + (order.total_amount || 0), 0);

    res.json({
      totalProducts,
      totalOrders,
      totalUsers,
      totalRevenue,
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get all orders
// @route   GET /api/admin/orders
// @access  Private/Admin
const getAllOrders = async (req, res) => {
  try {
    const orders = await prisma.orders.findMany({
      include: {
        users: { select: { id: true, email: true } },
        order_items: { include: { products: true } }
      },
      orderBy: { created_at: 'desc' },
    });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Update order status
// @route   PUT /api/admin/orders/:id/status
// @access  Private/Admin
const updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const orderId = parseInt(req.params.id);

    const validStatuses = ['PENDING', 'CONFIRMED', 'COMPLETED'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const orderExists = await prisma.orders.findUnique({
      where: { id: orderId }
    });

    if (!orderExists) {
      return res.status(404).json({ message: 'Order not found' });
    }

    const updatedOrder = await prisma.orders.update({
      where: { id: orderId },
      data: { status }
    });

    res.json(updatedOrder);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  getDashboardStats,
  getAllOrders,
  updateOrderStatus,
};
