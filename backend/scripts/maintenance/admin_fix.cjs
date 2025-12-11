"use strict";
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcrypt");

(async () => {
  const prisma = new PrismaClient();
  try {
    const email = "admin@example.com";

    // Ensure global tenant exists
    let tenant = await prisma.tenant.findFirst({ where: { slug: "global" } });
    if (!tenant) {
      tenant = await prisma.tenant.create({
        data: { name: "Global Tenant", slug: "global", settings: {}, isActive: true },
      });
    }

    // Create or update admin person
    let person = await prisma.person.findFirst({ where: { email } });
    if (!person) {
      const hashed = await bcrypt.hash("Admin123!", 12);
      person = await prisma.person.create({
        data: {
          firstName: "Admin",
          lastName: "User",
          email,
          password: hashed,
          status: "ACTIVE",
          globalRole: "ADMIN",
          tenantId: tenant.id,
          gdprConsentDate: new Date(),
          gdprConsentVersion: "1.0",
        },
      });
    } else {
      person = await prisma.person.update({
        where: { id: person.id },
        data: { status: "ACTIVE", globalRole: "ADMIN", tenantId: tenant.id },
      });
    }

    // Ensure ADMIN role is active
    let role = await prisma.personRole.findFirst({
      where: { personId: person.id, roleType: "ADMIN", deletedAt: null },
    });
    if (!role) {
      role = await prisma.personRole.create({
        data: {
          personId: person.id,
          roleType: "ADMIN",
          tenantId: tenant.id,
          isActive: true,
          isPrimary: true,
          assignedBy: person.id,
        },
      });
    } else if (!role.isActive || role.deletedAt) {
      role = await prisma.personRole.update({
        where: { id: role.id },
        data: { isActive: true, deletedAt: null },
      });
    }

    // Essential permissions for dashboard access and admin management
    const essentialPerms = [
      "ADMIN_PANEL",
      "SYSTEM_SETTINGS",
      "USER_MANAGEMENT",
      "ROLE_MANAGEMENT",
      "VIEW_COMPANIES",
      "VIEW_PERSONS",
      "VIEW_COURSES",
      "VIEW_CMS",
      "VIEW_SUBMISSIONS",
      "MANAGE_PUBLIC_CMS",
    ];

    let added = 0,
      reenabled = 0,
      kept = 0;

    for (const perm of essentialPerms) {
      const existing = await prisma.rolePermission.findFirst({
        where: { personRoleId: role.id, permission: perm },
      });
      if (!existing) {
        await prisma.rolePermission.create({
          data: {
            personRoleId: role.id,
            permission: perm,
            isGranted: true,
            grantedAt: new Date(),
            grantedBy: person.id,
          },
        });
        added++;
      } else if (!existing.isGranted || existing.deletedAt) {
        await prisma.rolePermission.update({
          where: { id: existing.id },
          data: { isGranted: true, deletedAt: null, grantedAt: new Date() },
        });
        reenabled++;
      } else {
        kept++;
      }
    }

    console.log("OK", {
      tenant: tenant.id,
      person: person.id,
      role: role.id,
      added,
      reenabled,
      kept,
    });
  } catch (e) {
    console.error("ERR", e);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
})();