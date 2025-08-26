#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const SCHEMA_PATH = path.join(__dirname, '../prisma/schema.prisma');
const BACKUP_DIR = path.join(__dirname, '../prisma/backups');
const DOCS_DIR = path.join(__dirname, '../docs');

// Ensure directories exist
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}
if (!fs.existsSync(DOCS_DIR)) {
  fs.mkdirSync(DOCS_DIR, { recursive: true });
}

// Create backup
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const backupPath = path.join(BACKUP_DIR, `schema-${timestamp}.prisma`);
fs.copyFileSync(SCHEMA_PATH, backupPath);
console.log(`✅ Schema backup created: ${backupPath}`);

// Read current schema
let schema = fs.readFileSync(SCHEMA_PATH, 'utf8');

// Optimization functions
function addSoftDeleteToModels(schema) {
  console.log('🔄 Adding soft delete support...');
  
  // Models that should have soft delete
  const modelsNeedingSoftDelete = [
    'Person', 'Company', 'Course', 'CourseSchedule', 'CourseEnrollment',
    'TestDocument', 'RegistroPresenze', 'Fattura', 'Preventivo', 'LetteraIncarico'
  ];
  
  modelsNeedingSoftDelete.forEach(modelName => {
    const modelRegex = new RegExp(`(model\s+${modelName}\s*{[^}]*?)(?=\s*})`, 'gs');
    schema = schema.replace(modelRegex, (match) => {
      if (!match.includes('deletedAt')) {
        return match + '\n  deletedAt DateTime?\n';
      }
      return match;
    });
  });
  
  return schema;
}

function optimizeIndices(schema) {
  console.log('🔄 Optimizing database indices...');
  
  // Add performance indices for common queries
  const indexOptimizations = [
    {
      model: 'Person',
      indices: [
        '@@index([email, tenantId])',
        '@@index([tenantId, status])',
        '@@index([companyId, tenantId])'
      ]
    },
    {
      model: 'Course',
      indices: [
        '@@index([status, tenantId])',
        '@@index([companyId, status])'
      ]
    },
    {
      model: 'CourseSchedule',
      indices: [
        '@@index([startDate, endDate])',
        '@@index([companyId, startDate])'
      ]
    },
    {
      model: 'CourseEnrollment',
      indices: [
        '@@index([personId, status])',
        '@@index([scheduleId, status])'
      ]
    }
  ];
  
  indexOptimizations.forEach(({ model, indices }) => {
    const modelRegex = new RegExp(`(model\s+${model}\s*{[^}]*?)(?=\s*})`, 'gs');
    schema = schema.replace(modelRegex, (match) => {
      let updatedMatch = match;
      indices.forEach(index => {
        if (!updatedMatch.includes(index)) {
          updatedMatch += `\n  ${index}`;
        }
      });
      return updatedMatch;
    });
  });
  
  return schema;
}

function addEnumOptimizations(schema) {
  console.log('🔄 Adding enum optimizations...');
  
  // Add common enums if they don't exist
  const enums = [
    {
      name: 'PersonStatus',
      values: ['ACTIVE', 'INACTIVE', 'SUSPENDED', 'PENDING']
    },
    {
      name: 'CourseStatus',
      values: ['DRAFT', 'PUBLISHED', 'ACTIVE', 'COMPLETED', 'CANCELLED']
    },
    {
      name: 'EnrollmentStatus',
      values: ['PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'NO_SHOW']
    }
  ];
  
  enums.forEach(({ name, values }) => {
    if (!schema.includes(`enum ${name}`)) {
      const enumDef = `\nenum ${name} {\n  ${values.join('\n  ')}\n}\n`;
      schema += enumDef;
    }
  });
  
  return schema;
}

function addAuditFields(schema) {
  console.log('🔄 Adding audit fields...');
  
  // Models that should have audit fields
  const modelsNeedingAudit = [
    'Person', 'Company', 'Course', 'CourseSchedule', 'CourseEnrollment',
    'TestDocument', 'RegistroPresenze', 'Fattura', 'Preventivo', 'LetteraIncarico'
  ];
  
  modelsNeedingAudit.forEach(modelName => {
    const modelRegex = new RegExp(`(model\s+${modelName}\s*{[^}]*?)(?=\s*})`, 'gs');
    schema = schema.replace(modelRegex, (match) => {
      let updatedMatch = match;
      
      if (!match.includes('createdAt')) {
        updatedMatch += '\n  createdAt DateTime @default(now())';
      }
      if (!match.includes('updatedAt')) {
        updatedMatch += '\n  updatedAt DateTime @updatedAt';
      }
      if (!match.includes('createdBy') && match.includes('tenantId')) {
        updatedMatch += '\n  createdBy String?';
      }
      if (!match.includes('updatedBy') && match.includes('tenantId')) {
        updatedMatch += '\n  updatedBy String?';
      }
      
      return updatedMatch + '\n';
    });
  });
  
  return schema;
}

function addSecurityEnhancements(schema) {
  console.log('🔄 Adding security enhancements...');
  
  // Add security-related models if they don't exist
  const securityModels = `
// Security and Audit Models
model SecurityAuditLog {
  id          String   @id @default(cuid())
  tenantId    String
  userId      String?
  action      String
  resource    String
  resourceId  String?
  ipAddress   String?
  userAgent   String?
  metadata    Json     @default({})
  createdAt   DateTime @default(now())
  
  tenant      Tenant   @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  
  @@index([tenantId, action])
  @@index([tenantId, createdAt])
  @@index([userId, action])
}

model DataRetentionPolicy {
  id              String   @id @default(cuid())
  tenantId        String
  resourceType    String
  retentionDays   Int
  isActive        Boolean  @default(true)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  
  tenant          Tenant   @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  
  @@unique([tenantId, resourceType])
  @@index([tenantId, isActive])
}
`;
  
  if (!schema.includes('model SecurityAuditLog')) {
    schema += securityModels;
  }
  
  return schema;
}

function validateSchema() {
  console.log('🔄 Validating schema...');
  try {
    execSync('npx prisma validate', { 
      cwd: path.dirname(SCHEMA_PATH),
      stdio: 'pipe'
    });
    console.log('✅ Schema validation passed');
    return true;
  } catch (error) {
    console.error('❌ Schema validation failed:');
    console.error(error.stdout?.toString() || error.message);
    return false;
  }
}

function generateOptimizationReport() {
  console.log('🔄 Generating optimization report...');
  
  const report = `# Schema Optimization Report

Generated: ${new Date().toISOString()}

## Optimizations Applied

### 1. Soft Delete Support
- Added \`deletedAt\` fields to core models
- Enables logical deletion instead of physical deletion
- Maintains data integrity and audit trails

### 2. Performance Indices
- Added composite indices for common query patterns
- Optimized tenant-based queries
- Enhanced search performance

### 3. Enum Optimizations
- Standardized status enums
- Improved data consistency
- Better query performance

### 4. Audit Fields
- Added \`createdAt\`, \`updatedAt\` timestamps
- Added \`createdBy\`, \`updatedBy\` tracking
- Enhanced audit capabilities

### 5. Security Enhancements
- Added \`SecurityAuditLog\` model
- Added \`DataRetentionPolicy\` model
- Improved compliance capabilities

## Next Steps

1. Review the optimized schema
2. Run database migration: \`npx prisma migrate dev\`
3. Update application code to use new fields
4. Implement soft delete logic in services
5. Set up data retention policies

## Backup

Original schema backed up to: ${backupPath}
`;
  
  const reportPath = path.join(DOCS_DIR, 'schema-optimization-report.md');
  fs.writeFileSync(reportPath, report);
  console.log(`✅ Optimization report saved: ${reportPath}`);
}

// Main execution
console.log('🚀 Starting complete schema optimization...');
console.log('=' .repeat(50));

try {
  // Apply optimizations
  schema = addSoftDeleteToModels(schema);
  schema = optimizeIndices(schema);
  schema = addEnumOptimizations(schema);
  schema = addAuditFields(schema);
  schema = addSecurityEnhancements(schema);
  
  // Write optimized schema
  fs.writeFileSync(SCHEMA_PATH, schema);
  console.log('✅ Schema optimizations applied');
  
  // Validate the optimized schema
  if (validateSchema()) {
    generateOptimizationReport();
    console.log('\n🎉 Schema optimization completed successfully!');
    console.log('📋 Next steps:');
    console.log('   1. Review the changes in your schema file');
    console.log('   2. Run: npx prisma migrate dev');
    console.log('   3. Update your application code');
  } else {
    console.log('\n⚠️  Schema optimization completed with validation errors');
    console.log('📋 Please review and fix the validation errors before proceeding');
  }
  
} catch (error) {
  console.error('❌ Error during optimization:', error.message);
  
  // Restore backup on error
  console.log('🔄 Restoring backup...');
  fs.copyFileSync(backupPath, SCHEMA_PATH);
  console.log('✅ Backup restored');
  
  process.exit(1);
}

console.log('=' .repeat(50));