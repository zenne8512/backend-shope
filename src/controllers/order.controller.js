const prisma = require('../utils/prisma');

// @desc    Create new order from cart
// @route   POST /api/orders/checkout
// @access  Private
const createOrder = async (req, res) => {
  try {
    // Create order, deduct stock, and clear cart in an interactive transaction
    const order = await prisma.$transaction(async (tx) => {
      // 1. Get all items in user's cart
      const cartItems = await tx.cart_items.findMany({
        where: { user_id: req.user.id },
        include: { 
          products: {
            include: { product_variants: true }
          } 
        },
      });

      if (cartItems.length === 0) {
        throw new Error('No items in cart');
      }

      let totalAmount = 0;
      const orderItemsData = [];

      // 2. Check stock for all items
      for (const item of cartItems) {
        const firstVariant = item.products.product_variants && item.products.product_variants.length > 0
          ? item.products.product_variants[0]
          : null;

        if (!firstVariant) {
          throw new Error(`Sản phẩm ${item.products.name} không có biến thể hợp lệ.`);
        }

        // Use findUnique to get the most up-to-date stock inside transaction
        const variantCheck = await tx.product_variants.findUnique({
          where: { id: firstVariant.id }
        });

        if ((variantCheck.stock || 0) < item.quantity) {
          throw new Error(`Sản phẩm ${item.products.name} chỉ còn ${variantCheck.stock} sản phẩm trong kho, không đủ số lượng bạn yêu cầu.`);
        }

        const price = parseFloat(variantCheck.price);
        const quantity = item.quantity;
        totalAmount += price * quantity;

        orderItemsData.push({
          product_id: item.product_id,
          quantity: quantity,
          price: price,
        });

        // 3. Deduct stock safely
        await tx.product_variants.update({
          where: { id: firstVariant.id },
          data: {
            stock: {
              decrement: item.quantity
            }
          }
        });
      }

      // 4. Create order
      const newOrder = await tx.orders.create({
        data: {
          user_id: req.user.id,
          total_amount: totalAmount,
          status: 'PENDING',
          order_items: {
            create: orderItemsData,
          },
        },
        include: { order_items: true },
      });

      // 5. Clear cart
      await tx.cart_items.deleteMany({
        where: { user_id: req.user.id },
      });

      return newOrder;
    });

    res.status(201).json(order);
  } catch (error) {
    console.error('Create order error:', error);
    // If error is thrown from inside the transaction, pass the message to client
    if (error.message.includes('không đủ số lượng') || error.message.includes('No items') || error.message.includes('không có biến thể')) {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get user's orders
// @route   GET /api/orders/my-orders
// @access  Private
const getMyOrders = async (req, res) => {
  try {
    const orders = await prisma.orders.findMany({
      where: { user_id: req.user.id },
      include: {
        order_items: {
          include: { products: true },
        },
      },
      orderBy: { created_at: 'desc' },
    });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get single order by ID
// @route   GET /api/orders/:id
// @access  Private
const getOrderById = async (req, res) => {
  try {
    const order = await prisma.orders.findFirst({
      where: {
        id: parseInt(req.params.id),
        // Ensure user can only see their own order, unless they are Admin!
        user_id: req.user.role === 'ADMIN' ? undefined : req.user.id
      },
      include: {
        order_items: {
          include: {
            products: {
              include: { product_images: true }
            }
          }
        },
        users: {
          select: { id: true, email: true, name: true, phone: true, address: true }
        }
      }
    });

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    res.json(order);
  } catch (error) {
    console.error('Get order by ID error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Cancel order
// @route   PUT /api/orders/:id/cancel
// @access  Private
const cancelOrder = async (req, res) => {
  try {
    const orderId = parseInt(req.params.id);

    // Find the order
    const order = await prisma.orders.findFirst({
      where: {
        id: orderId,
        user_id: req.user.role === 'ADMIN' ? undefined : req.user.id
      },
      include: {
        order_items: {
          include: {
            products: {
              include: { product_variants: true }
            }
          }
        }
      }
    });

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (order.status !== 'PENDING') {
      return res.status(400).json({ message: 'Only PENDING orders can be cancelled' });
    }

    // Cancel order and return stock in a transaction
    const updatedOrder = await prisma.$transaction(async (prisma) => {
      // 1. Update order status to CANCELLED
      const uOrder = await prisma.orders.update({
        where: { id: orderId },
        data: { status: 'CANCELLED' }
      });

      // 2. Return stock to variants
      for (const item of order.order_items) {
        const firstVariant = item.products.product_variants && item.products.product_variants.length > 0
          ? item.products.product_variants[0]
          : null;

        if (firstVariant) {
          await prisma.product_variants.update({
            where: { id: firstVariant.id },
            data: {
              stock: {
                increment: item.quantity
              }
            }
          });
        }
      }

      return uOrder;
    });

    res.json(updatedOrder);
  } catch (error) {
    console.error('Cancel order error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
// @desc    Get all orders (Admin)
// @route   GET /api/orders
// @access  Private/Admin
const getAllOrders = async (req, res) => {
  try {
    const orders = await prisma.orders.findMany({
      include: {
        users: {
          select: { id: true, name: true, email: true, phone: true, address: true }
        },
        order_items: {
          include: { products: true }
        }
      },
      orderBy: { created_at: 'desc' }
    });
    res.json(orders);
  } catch (error) {
    console.error('Get all orders error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Update order status (Admin)
// @route   PUT /api/orders/:id/status
// @access  Private/Admin
const updateOrderStatus = async (req, res) => {
  try {
    const orderId = parseInt(req.params.id);
    const { status } = req.body;

    const validStatuses = ['PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const order = await prisma.orders.findUnique({
      where: { id: orderId },
      include: {
        order_items: {
          include: {
            products: {
              include: { product_variants: true }
            }
          }
        }
      }
    });

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (order.status === status) {
      return res.json(order);
    }

    // If changing to CANCELLED from a non-CANCELLED status, we need to refund stock
    if (status === 'CANCELLED' && order.status !== 'CANCELLED') {
      const updatedOrder = await prisma.$transaction(async (tx) => {
        const uOrder = await tx.orders.update({
          where: { id: orderId },
          data: { status: 'CANCELLED' }
        });

        // Return stock
        for (const item of order.order_items) {
          const firstVariant = item.products.product_variants && item.products.product_variants.length > 0
            ? item.products.product_variants[0]
            : null;

          if (firstVariant) {
            await tx.product_variants.update({
              where: { id: firstVariant.id },
              data: {
                stock: { increment: item.quantity }
              }
            });
          }
        }
        return uOrder;
      });
      return res.json(updatedOrder);
    }
    
    // Otherwise just update status
    const updatedOrder = await prisma.orders.update({
      where: { id: orderId },
      data: { status }
    });

    res.json(updatedOrder);
  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  createOrder,
  getMyOrders,
  getOrderById,
  cancelOrder,
  getAllOrders,
  updateOrderStatus,
};
