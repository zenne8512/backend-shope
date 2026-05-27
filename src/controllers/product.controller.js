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
      where.product_variants = {
        some: {
          price: {
            gte: minPrice ? parseFloat(minPrice) : undefined,
            lte: maxPrice ? parseFloat(maxPrice) : undefined
          }
        }
      };
    }

    // Fetch products
    let products = await prisma.products.findMany({
      where,
      include: {
        categories: true,
        brands: true,
        product_images: true,
        product_variants: true,
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
        const priceA = a.product_variants && a.product_variants.length > 0 ? parseFloat(a.product_variants[0].price) : 0;
        const priceB = b.product_variants && b.product_variants.length > 0 ? parseFloat(b.product_variants[0].price) : 0;
        return priceA - priceB;
      });
    } else if (sort === 'price_desc') {
      products.sort((a, b) => {
        const priceA = a.product_variants && a.product_variants.length > 0 ? parseFloat(a.product_variants[0].price) : 0;
        const priceB = b.product_variants && b.product_variants.length > 0 ? parseFloat(b.product_variants[0].price) : 0;
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
        product_images: true,
        product_variants: true,
        product_reviews: true,
        product_attributes: {
          include: {
            attribute_values: {
              include: { attributes: true }
            }
          }
        }
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
    const { name, price, description, image, category_id, brand_id } = req.body;

    if (!name || !price || !category_id) {
      return res.status(400).json({ message: 'Name, price and category_id are required' });
    }

    const priceFloat = parseFloat(price);
    const categoryIdInt = parseInt(category_id);
    const brandIdInt = brand_id ? parseInt(brand_id) : null;

    // Create the product
    const product = await prisma.products.create({
      data: {
        name,
        description,
        category_id: categoryIdInt,
        brand_id: brandIdInt,
        // create associated variant for price
        product_variants: {
          create: {
            price: priceFloat,
            name: "Default Variant",
            stock: 100
          }
        },
        // create associated image if provided
        product_images: image ? {
          create: {
            image_url: image,
            is_main: true
          }
        } : undefined
      },
      include: {
        categories: true,
        product_variants: true,
        product_images: true
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
      where: { id: productId },
      include: { product_variants: true, product_images: true }
    });
    
    if (!productExists) {
      return res.status(404).json({ message: 'Product not found' });
    }

    const dataToUpdate = {};
    if (name) dataToUpdate.name = name;
    if (description !== undefined) dataToUpdate.description = description;
    if (category_id) dataToUpdate.category_id = parseInt(category_id);
    if (brand_id !== undefined) dataToUpdate.brand_id = brand_id ? parseInt(brand_id) : null;

    // Update product basics
    const product = await prisma.products.update({
      where: { id: productId },
      data: dataToUpdate,
    });

    // Update price and stock on the first variant if provided
    if (productExists.product_variants.length > 0) {
      const variantData = {};
      if (price) variantData.price = parseFloat(price);
      if (stock !== undefined) variantData.stock = parseInt(stock);
      
      if (Object.keys(variantData).length > 0) {
        await prisma.product_variants.update({
          where: { id: productExists.product_variants[0].id },
          data: variantData
        });
      }
    }

    // Update or create image
    if (image !== undefined) {
      if (productExists.product_images.length > 0) {
        await prisma.product_images.update({
          where: { id: productExists.product_images[0].id },
          data: { image_url: image }
        });
      } else if (image) {
        await prisma.product_images.create({
          data: { product_id: productId, image_url: image, is_main: true }
        });
      }
    }

    const updatedProduct = await prisma.products.findUnique({
      where: { id: productId },
      include: { categories: true, product_variants: true, product_images: true }
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
