const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const bcrypt = require('bcryptjs');

async function main() {
  const users = await prisma.users.findMany({});
  console.log('Current users:', users.map(u => ({ id: u.id, email: u.email, role: u.role })));
  
  const adminExists = users.some(u => u.role === 'ADMIN');
  if (!adminExists) {
    console.log('No ADMIN found. Creating default admin...');
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('admin123', salt);
    const newAdmin = await prisma.users.create({
      data: {
        email: 'admin@shoppi.com',
        password: hashedPassword,
        role: 'ADMIN',
        name: 'Admin Principal'
      }
    });
    console.log('Admin created:', newAdmin.email);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
