const prisma = require('../utils/prisma');

// @desc    Get all brands
// @route   GET /api/brands
// @access  Public
const getBrands = async (req, res) => {
  try {
    const brands = await prisma.brands.findMany({
      orderBy: { name: 'asc' }
    });
    res.json(brands);
  } catch (error) {
    console.error('Get brands error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get single brand by ID
// @route   GET /api/brands/:id
// @access  Public
const getBrandById = async (req, res) => {
  try {
    const brand = await prisma.brands.findUnique({
      where: { id: parseInt(req.params.id) },
      include: { products: true }
    });

    if (!brand) {
      return res.status(404).json({ message: 'Brand not found' });
    }

    res.json(brand);
  } catch (error) {
    console.error('Get brand by ID error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Create a brand
// @route   POST /api/brands
// @access  Private/Admin
const createBrand = async (req, res) => {
  try {
    const { name, logo, country } = req.body;

    if (!name) {
      return res.status(400).json({ message: 'Name is required' });
    }

    const brandExists = await prisma.brands.findFirst({
      where: { name }
    });

    if (brandExists) {
      return res.status(400).json({ message: 'Brand already exists' });
    }

    const brand = await prisma.brands.create({
      data: {
        name,
        logo: logo || '',
        country: country || ''
      }
    });

    res.status(201).json(brand);
  } catch (error) {
    console.error('Create brand error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Update a brand
// @route   PUT /api/brands/:id
// @access  Private/Admin
const updateBrand = async (req, res) => {
  try {
    const { name, logo, country } = req.body;
    const brandId = parseInt(req.params.id);

    const brandExists = await prisma.brands.findUnique({
      where: { id: brandId }
    });

    if (!brandExists) {
      return res.status(404).json({ message: 'Brand not found' });
    }

    const brand = await prisma.brands.update({
      where: { id: brandId },
      data: {
        name: name !== undefined ? name : undefined,
        logo: logo !== undefined ? logo : undefined,
        country: country !== undefined ? country : undefined
      }
    });

    res.json(brand);
  } catch (error) {
    console.error('Update brand error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Delete a brand
// @route   DELETE /api/brands/:id
// @access  Private/Admin
const deleteBrand = async (req, res) => {
  try {
    const brandId = parseInt(req.params.id);

    const brandExists = await prisma.brands.findUnique({
      where: { id: brandId }
    });

    if (!brandExists) {
      return res.status(404).json({ message: 'Brand not found' });
    }

    await prisma.brands.delete({
      where: { id: brandId }
    });

    res.json({ message: 'Brand removed successfully' });
  } catch (error) {
    console.error('Delete brand error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  getBrands,
  getBrandById,
  createBrand,
  updateBrand,
  deleteBrand,
};
