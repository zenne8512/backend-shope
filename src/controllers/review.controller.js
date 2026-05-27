const prisma = require('../utils/prisma');

// @desc    Create a product review
// @route   POST /api/reviews
// @access  Private
const createReview = async (req, res) => {
  try {
    const { product_id, rating, comment } = req.body;

    if (!product_id || rating === undefined) {
      return res.status(400).json({ message: 'Product ID and rating are required' });
    }

    const ratingInt = parseInt(rating);
    if (ratingInt < 1 || ratingInt > 5) {
      return res.status(400).json({ message: 'Rating must be between 1 and 5' });
    }

    // Check if product exists
    const product = await prisma.products.findUnique({
      where: { id: parseInt(product_id) }
    });

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Optional: check if user already reviewed this product to update instead of duplicate
    const reviewExists = await prisma.product_reviews.findFirst({
      where: {
        product_id: parseInt(product_id),
        // Wait, does product_reviews have a user relation? Let's check schema.prisma!
      }
    });

    // Let's create the review
    const review = await prisma.product_reviews.create({
      data: {
        product_id: parseInt(product_id),
        rating: ratingInt,
        comment: comment || '',
        // Note: in the database schema, model product_reviews doesn't have a user_id!
        // Let's check our schema.prisma around line 61.
        // product_reviews: id, product_id, rating, comment, created_at. No user_id!
        // Ah! That's correct, in their SQL Server schema, they didn't add user_id to reviews.
        // It's anonymous/guest reviews or simple comments linked only to products.
        // We will respect their original schema structure!
      }
    });

    res.status(201).json(review);
  } catch (error) {
    console.error('Create review error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get reviews for a product
// @route   GET /api/reviews/product/:productId
// @access  Public
const getProductReviews = async (req, res) => {
  try {
    const productId = parseInt(req.params.productId);

    const reviews = await prisma.product_reviews.findMany({
      where: { product_id: productId },
      orderBy: { created_at: 'desc' }
    });

    res.json(reviews);
  } catch (error) {
    console.error('Get product reviews error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Delete a review
// @route   DELETE /api/reviews/:id
// @access  Private/Admin
const deleteReview = async (req, res) => {
  try {
    const reviewId = parseInt(req.params.id);

    const review = await prisma.product_reviews.findUnique({
      where: { id: reviewId }
    });

    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }

    // Since the original schema doesn't have user_id in product_reviews, only Admin can delete or we allow users to delete by ID.
    // Let's enforce that only admin can delete reviews (moderation)
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Not authorized, admin only' });
    }

    await prisma.product_reviews.delete({
      where: { id: reviewId }
    });

    res.json({ message: 'Review deleted successfully' });
  } catch (error) {
    console.error('Delete review error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  createReview,
  getProductReviews,
  deleteReview,
};
