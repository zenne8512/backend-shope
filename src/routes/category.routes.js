const express = require('express');
const router = express.Router();
const { getCategories, createCategory } = require('../controllers/category.controller');
const { protect, admin } = require('../middlewares/auth.middleware');

router.route('/')
  .get(getCategories)
  .post(protect, admin, createCategory);

module.exports = router;
