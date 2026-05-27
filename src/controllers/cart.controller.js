const prisma = require('../utils/prisma');

// @desc    Get user cart
// @route   GET /api/cart
// @access  Private
const getCart = async (req, res) => {
  try {
    const cartItems = await prisma.cart_items.findMany({
      where: { user_id: req.user.id },
      include: { products: true },
    });
    res.json(cartItems);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Add item to cart
// @route   POST /api/cart
// @access  Private
const addToCart = async (req, res) => {
  try {
    const { product_id, quantity } = req.body;
    // Allow fallback to productId for backward compatibility with frontend
    const pId = product_id || req.body.productId;

    if (!pId) {
      return res.status(400).json({ message: 'Product ID is required' });
    }

    const qty = quantity ? parseInt(quantity) : 1;

    // Check if product exists
    const product = await prisma.products.findUnique({
      where: { id: parseInt(pId) }
    });

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Check if item already in cart
    const itemExists = await prisma.cart_items.findUnique({
      where: {
        user_id_product_id: {
          user_id: req.user.id,
          product_id: parseInt(pId),
        }
      }
    });

    if (itemExists) {
      // Update quantity
      const updatedItem = await prisma.cart_items.update({
        where: { id: itemExists.id },
        data: { quantity: itemExists.quantity + qty }
      });
      return res.json(updatedItem);
    }

    const cartItem = await prisma.cart_items.create({
      data: {
        user_id: req.user.id,
        product_id: parseInt(pId),
        quantity: qty
      }
    });

    res.status(201).json(cartItem);
  } catch (error) {
    console.error('Add to cart error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Update cart item quantity
// @route   PUT /api/cart/:id
// @access  Private
const updateCartItem = async (req, res) => {
  try {
    const { quantity } = req.body;
    const cartItemId = parseInt(req.params.id);

    if (!quantity || parseInt(quantity) < 1) {
      return res.status(400).json({ message: 'Invalid quantity' });
    }

    const itemExists = await prisma.cart_items.findFirst({
      where: { id: cartItemId, user_id: req.user.id }
    });

    if (!itemExists) {
      return res.status(404).json({ message: 'Cart item not found or not belongs to user' });
    }

    const updatedItem = await prisma.cart_items.update({
      where: { id: cartItemId },
      data: { quantity: parseInt(quantity) }
    });

    res.json(updatedItem);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Remove item from cart
// @route   DELETE /api/cart/:id
// @access  Private
const removeCartItem = async (req, res) => {
  try {
    const cartItemId = parseInt(req.params.id);

    const itemExists = await prisma.cart_items.findFirst({
      where: { id: cartItemId, user_id: req.user.id }
    });

    if (!itemExists) {
      return res.status(404).json({ message: 'Cart item not found' });
    }

    await prisma.cart_items.delete({
      where: { id: cartItemId }
    });

    res.json({ message: 'Item removed from cart' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  getCart,
  addToCart,
  updateCartItem,
  removeCartItem,
};
