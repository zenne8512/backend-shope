const express = require('express');
const router = express.Router();
const {
  getDashboardStats,
  getAllOrders,
  updateOrderStatus
} = require('../controllers/admin.controller');
const { protect, admin } = require('../middlewares/auth.middleware');

router.get('/dashboard', protect, admin, getDashboardStats);
router.get('/orders', protect, admin, getAllOrders);
router.put('/orders/:id/status', protect, admin, updateOrderStatus);

module.exports = router;
