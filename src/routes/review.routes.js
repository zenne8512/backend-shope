const express = require('express');
const router = express.Router();
const {
  createReview,
  getProductReviews,
  deleteReview,
} = require('../controllers/review.controller');
const { protect, admin } = require('../middlewares/auth.middleware');

router.route('/')
  .post(protect, createReview);

router.route('/product/:productId')
  .get(getProductReviews);

router.route('/:id')
  .delete(protect, admin, deleteReview);

module.exports = router;
