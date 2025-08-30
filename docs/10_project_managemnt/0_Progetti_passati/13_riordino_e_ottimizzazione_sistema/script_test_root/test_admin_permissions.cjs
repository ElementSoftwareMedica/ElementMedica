const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');
const fetch = require('node-fetch');

const prisma = new PrismaClient();

async function testAdminPermissions() {
  try {
    // Get admin user
    const admin = await prisma.person.findFirst({
      where: { email: 'admin@example.com' }
    });
    
    if (!admin) {
      console.log('Admin user not found');
      return;
    }
    
    console.log('Admin found:', admin.id, admin.email);
    
    // Create JWT token
    const token = jwt.sign(
      { 
        personId: admin.id, 
        email: admin.email,
        companyId: admin.companyId
      }, 
      process.env.JWT_SECRET, 
      { expiresIn: '1h' }
    );
    
    console.log('Token created');
    
    // Test verify endpoint
    const verifyResponse = await fetch('http://localhost:4001/api/v1/auth/verify', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    const verifyData = await verifyResponse.json();
    console.log('\n=== VERIFY ENDPOINT RESPONSE ===');
    console.log('Status:', verifyResponse.status);
    console.log('Valid:', verifyData.valid);
    console.log('User role:', verifyData.user?.role);
    console.log('User roles:', verifyData.user?.roles);
    console.log('Permissions:', verifyData.permissions);
    console.log('Companies read permission:', verifyData.permissions?.['companies:read']);
    
    // Test permissions endpoint
    const permissionsResponse = await fetch(`http://localhost:4001/api/v1/auth/permissions/${admin.id}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (permissionsResponse.ok) {
      const permissionsData = await permissionsResponse.json();
      console.log('\n=== PERMISSIONS ENDPOINT RESPONSE ===');
      console.log('Status:', permissionsResponse.status);
      console.log('Data:', permissionsData);
    } else {
      console.log('\n=== PERMISSIONS ENDPOINT ERROR ===');
      console.log('Status:', permissionsResponse.status);
      console.log('Error:', await permissionsResponse.text());
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

testAdminPermissions();