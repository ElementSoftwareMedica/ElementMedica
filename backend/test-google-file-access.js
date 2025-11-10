/**
 * Test script to verify Google Drive file access
 */

import { PrismaClient } from '@prisma/client';
import { google } from 'googleapis';
import { getValidAccessToken } from './services/googleTokenService.js';

const prisma = new PrismaClient();

const FILE_ID = '1OPjjUyhOqgiV_cC5j6sWN7TYC_Qrl_hKFUaXX4CSMHU';

async function testFileAccess() {
  try {
    console.log('🔍 Testing Google Drive file access...\n');

    // Get first user with Google token
    const token = await prisma.googleTokens.findFirst({
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true
          }
        }
      }
    });

    if (!token) {
      console.error('❌ No Google tokens found in database');
      process.exit(1);
    }

    console.log('✅ Found OAuth account:', token.user.email);
    console.log('📋 Scopes:', token.scope.join(', '));
    console.log();

    // Get valid access token
    const accessToken = await getValidAccessToken(token.userId, token.tenantId);
    console.log('✅ Access token obtained (expires:', new Date(Number(token.expiryDate)).toLocaleString(), ')\n');

    // Configure OAuth2 client
    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({
      access_token: accessToken
    });

    const drive = google.drive({
      version: 'v3',
      auth: oauth2Client
    });

    console.log('🔎 Attempting to access file:', FILE_ID);
    console.log();

    // Test 1: Get file metadata
    try {
      const fileMetadata = await drive.files.get({
        fileId: FILE_ID,
        fields: 'id, name, mimeType, owners, permissions, shared, driveId'
      });

      console.log('✅ FILE FOUND! Metadata:');
      console.log(JSON.stringify(fileMetadata.data, null, 2));
      console.log();
    } catch (error) {
      console.error('❌ Failed to get file metadata:');
      console.error('   Status:', error.response?.status);
      console.error('   Message:', error.response?.data?.error?.message);
      console.error('   Error code:', error.code);
      console.log();

      // If 404, try searching for the file
      if (error.response?.status === 404) {
        console.log('🔍 File not found with direct access. Searching Drive...\n');

        const searchResults = await drive.files.list({
          q: `name contains 'Attestato' or name contains '${FILE_ID}'`,
          fields: 'files(id, name, mimeType, shared, owners)',
          pageSize: 10
        });

        if (searchResults.data.files.length > 0) {
          console.log('📁 Found files in Drive:');
          searchResults.data.files.forEach(file => {
            console.log(`   - ${file.name} (${file.id})`);
            console.log(`     Type: ${file.mimeType}`);
            console.log(`     Shared: ${file.shared}`);
          });
        } else {
          console.log('❌ No files found matching search criteria');
        }
      }

      process.exit(1);
    }

    // Test 2: Try to copy the file
    console.log('📋 Attempting to copy file...');
    try {
      const copyResult = await drive.files.copy({
        fileId: FILE_ID,
        requestBody: {
          name: 'TEST_COPY_' + Date.now()
        }
      });

      console.log('✅ File copied successfully!');
      console.log('   New file ID:', copyResult.data.id);
      console.log();

      // Clean up: delete the test copy
      console.log('🧹 Cleaning up test copy...');
      await drive.files.delete({
        fileId: copyResult.data.id
      });
      console.log('✅ Test copy deleted');

    } catch (error) {
      console.error('❌ Failed to copy file:');
      console.error('   Status:', error.response?.status);
      console.error('   Message:', error.response?.data?.error?.message);
      console.error('   Reason:', error.response?.data?.error?.errors?.[0]?.reason);
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

testFileAccess();
