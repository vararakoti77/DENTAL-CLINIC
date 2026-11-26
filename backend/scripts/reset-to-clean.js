const { PrismaClient, Role, Specialization, MedicineType, PrescriptionType } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('===> Starting complete database cleanup...');

  // 1. Delete all transactional tables in dependency order
  await prisma.payment.deleteMany({});
  console.log('✓ Cleared Payments');

  await prisma.consultationBill.deleteMany({});
  console.log('✓ Cleared Consultation Bills');

  await prisma.operationBill.deleteMany({});
  console.log('✓ Cleared Operation Bills');

  await prisma.pharmacySaleItem.deleteMany({});
  await prisma.pharmacySale.deleteMany({});
  console.log('✓ Cleared Pharmacy Sales');

  await prisma.stockMovement.deleteMany({});
  console.log('✓ Cleared Stock Movements');

  await prisma.purchaseItem.deleteMany({});
  await prisma.purchaseInvoice.deleteMany({});
  console.log('✓ Cleared Purchase Invoices');

  await prisma.medicineBatchStock.deleteMany({});
  console.log('✓ Cleared Medicine Batches');

  await prisma.dentalFinding.deleteMany({});
  console.log('✓ Cleared Dental Findings');

  await prisma.labPhoto.deleteMany({});
  await prisma.labDocument.deleteMany({});
  await prisma.labItem.deleteMany({});
  await prisma.labCase.deleteMany({});
  console.log('✓ Cleared Lab Cases');

  await prisma.procedure.deleteMany({});
  console.log('✓ Cleared Procedures');

  await prisma.clinicalNote.deleteMany({});
  console.log('✓ Cleared Clinical Notes');

  await prisma.appointment.deleteMany({});
  console.log('✓ Cleared Appointments');

  await prisma.patient.deleteMany({});
  console.log('✓ Cleared Patients');

  await prisma.supplier.deleteMany({});
  console.log('✓ Cleared Suppliers');

  await prisma.medicineMaster.deleteMany({});
  console.log('✓ Cleared Medicines');

  // 2. Clean all doctors and all non-admin users
  await prisma.doctor.deleteMany({});
  await prisma.user.deleteMany({
    where: {
      username: { not: 'admin' },
    },
  });
  console.log('✓ Cleaned all doctors and demo users (0 doctors in database)');

  // 3. Ensure master Admin exists with standard password
  const adminPassword = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {
      passwordHash: adminPassword,
      role: Role.ADMIN,
      fullName: 'Clinic Administrator',
    },
    create: {
      username: 'admin',
      passwordHash: adminPassword,
      fullName: 'Clinic Administrator',
      email: 'admin@dentalclinic.com',
      phone: '+91 98765 00000',
      role: Role.ADMIN,
    },
  });
  console.log('✓ Verified Master Admin (admin / admin123)');

  // No doctors seeded - 100% clean for manual testing
  console.log('✓ Doctor accounts completely cleared (0 doctors)');

  // No medicines seeded - completely clean catalog
  console.log('✓ Pharmacy medicines catalog completely cleared (0 medicines)');

  console.log('===> Database is now 100% clean and ready for fresh end-to-end testing!');
}

main()
  .catch((e) => {
    console.error('Cleanup error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });


  