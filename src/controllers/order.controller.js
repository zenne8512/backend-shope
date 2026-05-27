const prisma = require('../utils/prisma');

// @desc    Create new order from cart
// @route   POST /api/orders/checkout
// @access  Private
const createOrder = async (req, res) => {
  try {
    // Get all items in user's cart
    const cartItems = await prisma.cart_items.findMany({
      where: { user_id: req.user.id },
      include: { 
        products: {
          include: { product_variants: true }
        } 
      },
    });

    if (cartItems.length === 0) {
      return res.status(400).json({ message: 'No items in cart' });
    }

    // Check stock for all items first
    for (const item of cartItems) {
      const firstVariant = item.products.product_variants && item.products.product_variants.length > 0
        ? item.products.product_variants[0]
        : null;

      if (!firstVariant) {
        return res.status(400).json({ message: `Sản phẩm ${item.products.name} không có biến thể hợp lệ.` });
      }

      if ((firstVariant.stock || 0) < item.quantity) {
        return res.status(400).json({ message: `Sản phẩm ${item.products.name} chỉ còn ${firstVariant.stock} sản phẩm trong kho, không đủ số lượng bạn yêu cầu.` });
      }
    }

    // Calculate total
    let totalAmount = 0;
    const orderItemsData = cartItems.map((item) => {
      const price = item.products.product_variants && item.products.product_variants.length > 0 
        ? parseFloat(item.products.product_variants[0].price)
        : 0;
        
      const quantity = item.quantity;
      totalAmount += price * quantity;

      return {
        product_id: item.product_id,
        quantity: quantity,
        price: price, // store price at checkout time
      };
    });

    // Create order, deduct stock, and clear cart in a transaction
    const order = await prisma.$transaction(async (prisma) => {
      // 1. Create order
      const newOrder = await prisma.orders.create({
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

      // 2. Deduct stock from the first variant of each product
      for (const cartItem of cartItems) {
        const variantId = cartItem.products.product_variants[0].id;
        await prisma.product_variants.update({
          where: { id: variantId },
          data: {
            stock: {
              decrement: cartItem.quantity
            }
          }
        });
      }

      // 3. Clear cart
      await prisma.cart_items.deleteMany({
        where: { user_id: req.user.id },
      });

      return newOrder;
    });

    res.status(201).json(order);
  } catch (error) {
    console.error('Create order error:', error);
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

module.exports = {
  createOrder,
  getMyOrders,
  getOrderById,
  cancelOrder,
};
