const prisma = require('../utils/prisma');

// @desc    Fetch all products
// @route   GET /api/products
// @access  Public
const getProducts = async (req, res) => {
  try {
    const { search, keyword, category_id, brand_id, minPrice, maxPrice, sort, page, limit } = req.query;

    // Build where clause
    const where = {};

    const searchWord = search || keyword;
    if (searchWord) {
      where.OR = [
        { name: { contains: searchWord } },
        { description: { contains: searchWord } }
      ];
    }

    if (category_id) {
      where.category_id = parseInt(category_id);
    }

    if (brand_id) {
      where.brand_id = parseInt(brand_id);
    }

    if (minPrice || maxPrice) {
      where.price = {
        gte: minPrice ? parseFloat(minPrice) : undefined,
        lte: maxPrice ? parseFloat(maxPrice) : undefined
      };
    }

    // Fetch products
    let products = await prisma.products.findMany({
      where,
      include: {
        categories: true,
        brands: true,
        product_reviews: true
      }
    });

    // Add average rating and total reviews in listing
    products = products.map(product => {
      const reviews = product.product_reviews || [];
      const totalReviews = reviews.length;
      const averageRating = totalReviews > 0
        ? parseFloat((reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / totalReviews).toFixed(1))
        : 0;
      return {
        ...product,
        averageRating,
        totalReviews
      };
    });

    // In-memory Sorting
    if (sort === 'price_asc') {
      products.sort((a, b) => {
        const priceA = a.price ? parseFloat(a.price) : 0;
        const priceB = b.price ? parseFloat(b.price) : 0;
        return priceA - priceB;
      });
    } else if (sort === 'price_desc') {
      products.sort((a, b) => {
        const priceA = a.price ? parseFloat(a.price) : 0;
        const priceB = b.price ? parseFloat(b.price) : 0;
        return priceB - priceA;
      });
    } else if (sort === 'newest') {
      products.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
    }

    // In-memory Pagination
    const total = products.length;
    const p = parseInt(page) || 1;
    const l = parseInt(limit) || 10;
    const startIndex = (p - 1) * l;
    const endIndex = p * l;

    const paginatedProducts = products.slice(startIndex, endIndex);

    res.json({
      products: paginatedProducts,
      total,
      page: p,
      limit: l,
      totalPages: Math.ceil(total / l)
    });
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Fetch single product
// @route   GET /api/products/:id
// @access  Public
const getProductById = async (req, res) => {
  try {
    const product = await prisma.products.findUnique({
      where: { id: parseInt(req.params.id) },
      include: { 
        categories: true,
        brands: true,
        product_reviews: true
      },
    });

    if (product) {
      const reviews = product.product_reviews || [];
      const totalReviews = reviews.length;
      const averageRating = totalReviews > 0
        ? parseFloat((reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / totalReviews).toFixed(1))
        : 0;

      res.json({
        ...product,
        averageRating,
        totalReviews
      });
    } else {
      res.status(404).json({ message: 'Product not found' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Create a product
// @route   POST /api/products
// @access  Private/Admin
const createProduct = async (req, res) => {
  try {
    const { name, price, description, image, category_id, brand_id, stock } = req.body;

    if (!name || !price || !category_id) {
      return res.status(400).json({ message: 'Name, price and category_id are required' });
    }

    const priceFloat = parseFloat(price);
    const categoryIdInt = parseInt(category_id);
    const brandIdInt = brand_id ? parseInt(brand_id) : null;
    const stockInt = stock !== undefined ? parseInt(stock) : 100;

    // Create the product
    const product = await prisma.products.create({
      data: {
        name,
        description,
        category_id: categoryIdInt,
        brand_id: brandIdInt,
        price: priceFloat,
        stock: stockInt,
        image_url: image || null
      },
      include: {
        categories: true,
        brands: true
      }
    });

    res.status(201).json(product);
  } catch (error) {
    console.error('Create product error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Update a product
// @route   PUT /api/products/:id
// @access  Private/Admin
const updateProduct = async (req, res) => {
  try {
    const { name, price, description, image, category_id, brand_id, stock } = req.body;
    const productId = parseInt(req.params.id);
    
    // Check if product exists
    const productExists = await prisma.products.findUnique({
      where: { id: productId }
    });
    
    if (!productExists) {
      return res.status(404).json({ message: 'Product not found' });
    }

    const dataToUpdate = {};
    if (name) dataToUpdate.name = name;
    if (description !== undefined) dataToUpdate.description = description;
    if (category_id) dataToUpdate.category_id = parseInt(category_id);
    if (brand_id !== undefined) dataToUpdate.brand_id = brand_id ? parseInt(brand_id) : null;
    if (price) dataToUpdate.price = parseFloat(price);
    if (stock !== undefined) dataToUpdate.stock = parseInt(stock);
    if (image !== undefined) dataToUpdate.image_url = image;

    // Update product
    const updatedProduct = await prisma.products.update({
      where: { id: productId },
      data: dataToUpdate,
      include: {
        categories: true,
        brands: true
      }
    });

    res.json(updatedProduct);
  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Delete a product
// @route   DELETE /api/products/:id
// @access  Private/Admin
const deleteProduct = async (req, res) => {
  try {
    const productId = parseInt(req.params.id);
    const productExists = await prisma.products.findUnique({
      where: { id: productId }
    });

    if (!productExists) {
      return res.status(404).json({ message: 'Product not found' });
    }

    await prisma.products.delete({
      where: { id: productId },
    });

    res.json({ message: 'Product removed' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
};
