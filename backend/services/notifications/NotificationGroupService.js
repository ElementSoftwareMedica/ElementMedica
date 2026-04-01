/**
 * NotificationGroupService
 * 
 * Gestisce gruppi di destinatari per notifiche.
 * Supporta gruppi statici, dinamici, role-based e segmenti predefiniti.
 * 
 * PROGETTO 47 - Advanced Notification System - Fase 6
 * 
 * @module services/notifications/NotificationGroupService
 */

import prisma from '../../config/prisma-optimization.js';
import logger from '../../utils/logger.js';

// ============================================
// PREDEFINED SEGMENTS
// ============================================

const SEGMENTS = {
  PAZIENTI_ULTIMO_ANNO: {
    name: 'Pazienti Ultimo Anno',
    description: 'Pazienti con almeno un appuntamento negli ultimi 12 mesi',
    query: async (tenantId) => {
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

      const persons = await prisma.person.findMany({
        where: {
          deletedAt: null,
          tenantProfiles: {
            some: {
              tenantId,
              status: 'ACTIVE',
              deletedAt: null
            }
          },
          personRoles: {
            some: {
              roleType: 'PAZIENTE'
            }
          },
          appuntamenti: {
            some: {
              dataOra: { gte: oneYearAgo },
              deletedAt: null
            }
          }
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          tenantProfiles: {
            where: { tenantId },
            select: { email: true, phone: true },
            take: 1
          }
        }
      });

      // Flatten email/phone from tenantProfiles
      return persons.map(p => ({
        id: p.id,
        firstName: p.firstName,
        lastName: p.lastName,
        email: p.tenantProfiles?.[0]?.email,
        phone: p.tenantProfiles?.[0]?.phone
      }));
    }
  },

  MEDICI_ATTIVI: {
    name: 'Medici Attivi',
    description: 'Tutti i medici attivi nel sistema',
    query: async (tenantId) => {
      const persons = await prisma.person.findMany({
        where: {
          deletedAt: null,
          tenantProfiles: {
            some: {
              tenantId,
              status: 'ACTIVE',
              deletedAt: null
            }
          },
          personRoles: {
            some: {
              roleType: 'MEDICO'
            }
          }
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          tenantProfiles: {
            where: { tenantId },
            select: { email: true, phone: true },
            take: 1
          }
        }
      });

      return persons.map(p => ({
        id: p.id,
        firstName: p.firstName,
        lastName: p.lastName,
        email: p.tenantProfiles?.[0]?.email,
        phone: p.tenantProfiles?.[0]?.phone
      }));
    }
  },

  DIPENDENTI: {
    name: 'Tutti i Dipendenti',
    description: 'Personale interno (non pazienti)',
    query: async (tenantId) => {
      const persons = await prisma.person.findMany({
        where: {
          deletedAt: null,
          tenantProfiles: {
            some: {
              tenantId,
              status: 'ACTIVE',
              deletedAt: null
            }
          },
          personRoles: {
            some: {
              roleType: {
                in: ['ADMIN', 'SUPER_ADMIN', 'MEDICO', 'INFERMIERE', 'SEGRETERIA_CLINICA', 'OPERATOR', 'MANAGER']
              }
            }
          }
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          tenantProfiles: {
            where: { tenantId },
            select: { email: true, phone: true },
            take: 1
          }
        }
      });

      return persons.map(p => ({
        id: p.id,
        firstName: p.firstName,
        lastName: p.lastName,
        email: p.tenantProfiles?.[0]?.email,
        phone: p.tenantProfiles?.[0]?.phone
      }));
    }
  },

  PAZIENTI_VISITE_SCADENZA: {
    name: 'Pazienti con Visite in Scadenza',
    description: 'Pazienti con visite/certificazioni in scadenza nei prossimi 30 giorni',
    query: async (tenantId) => {
      const in30Days = new Date();
      in30Days.setDate(in30Days.getDate() + 30);

      const persons = await prisma.person.findMany({
        where: {
          deletedAt: null,
          tenantProfiles: {
            some: {
              tenantId,
              status: 'ACTIVE',
              deletedAt: null
            }
          },
          visite: {
            some: {
              dataScadenza: {
                lte: in30Days,
                gte: new Date()
              },
              deletedAt: null
            }
          }
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          tenantProfiles: {
            where: { tenantId },
            select: { email: true, phone: true },
            take: 1
          }
        }
      });

      return persons.map(p => ({
        id: p.id,
        firstName: p.firstName,
        lastName: p.lastName,
        email: p.tenantProfiles?.[0]?.email,
        phone: p.tenantProfiles?.[0]?.phone
      }));
    }
  },

  UTENTI_INATTIVI_30GG: {
    name: 'Utenti Inattivi 30+ Giorni',
    description: 'Utenti che non hanno effettuato login negli ultimi 30 giorni',
    query: async (tenantId) => {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const persons = await prisma.person.findMany({
        where: {
          deletedAt: null,
          tenantProfiles: {
            some: {
              tenantId,
              status: 'ACTIVE',
              deletedAt: null
            }
          },
          lastLogin: { lt: thirtyDaysAgo }
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          tenantProfiles: {
            where: { tenantId },
            select: { email: true, phone: true },
            take: 1
          }
        }
      });

      return persons.map(p => ({
        id: p.id,
        firstName: p.firstName,
        lastName: p.lastName,
        email: p.tenantProfiles?.[0]?.email,
        phone: p.tenantProfiles?.[0]?.phone
      }));
    }
  },

  ADMIN_SISTEMA: {
    name: 'Amministratori Sistema',
    description: 'Tutti gli admin e super admin',
    query: async (tenantId) => {
      const persons = await prisma.person.findMany({
        where: {
          deletedAt: null,
          tenantProfiles: {
            some: {
              tenantId,
              status: 'ACTIVE',
              deletedAt: null
            }
          },
          personRoles: {
            some: {
              roleType: { in: ['ADMIN', 'SUPER_ADMIN'] }
            }
          }
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          tenantProfiles: {
            where: { tenantId },
            select: { email: true, phone: true },
            take: 1
          }
        }
      });

      return persons.map(p => ({
        id: p.id,
        firstName: p.firstName,
        lastName: p.lastName,
        email: p.tenantProfiles?.[0]?.email,
        phone: p.tenantProfiles?.[0]?.phone
      }));
    }
  }
};

// ============================================
// SERVICE CLASS
// ============================================

export class NotificationGroupService {

  // ==========================================
  // CRUD OPERATIONS
  // ==========================================

  /**
   * Crea nuovo gruppo
   */
  static async create(data, tenantId) {
    logger.info({ tenantId, groupName: data.name }, '[NotificationGroupService] Creating group');

    const group = await prisma.notificationGroup.create({
      data: {
        tenantId,
        name: data.name,
        description: data.description || null,
        type: data.type || 'STATIC',
        dynamicQuery: data.dynamicQuery || null,
        isActive: data.isActive !== false,
        memberCount: 0
      }
    });

    // Se gruppo statico con membri iniziali
    if (data.type === 'STATIC' && data.memberIds?.length) {
      await this.addMembers(group.id, data.memberIds, tenantId);
    }

    logger.info({ groupId: group.id }, '[NotificationGroupService] Group created');
    return group;
  }

  /**
   * Lista gruppi con filtri
   */
  static async getAll(tenantId, filters = {}) {
    const where = {
      tenantId,
      deletedAt: null
    };

    if (filters.type) {
      where.type = filters.type;
    }

    if (filters.isActive !== undefined) {
      where.isActive = filters.isActive === 'true' || filters.isActive === true;
    }

    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } }
      ];
    }

    return prisma.notificationGroup.findMany({
      where,
      include: {
        _count: {
          select: { members: true }
        }
      },
      orderBy: { name: 'asc' }
    });
  }

  /**
   * Ottieni gruppo con membri
   */
  static async getById(id, tenantId) {
    const group = await prisma.notificationGroup.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: {
        members: {
          include: {
            person: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                tenantProfiles: {
                  where: { tenantId },
                  select: { email: true, phone: true },
                  take: 1
                }
              }
            }
          }
        },
        _count: {
          select: { members: true }
        }
      }
    });

    // Flatten tenantProfiles for backward compatibility
    if (group?.members) {
      group.members = group.members.map(m => ({
        ...m,
        person: {
          ...m.person,
          email: m.person?.tenantProfiles?.[0]?.email,
          phone: m.person?.tenantProfiles?.[0]?.phone,
          tenantProfiles: undefined
        }
      }));
    }

    return group;
  }

  /**
   * Aggiorna gruppo
   */
  static async update(id, data, tenantId) {
    const existing = await this.getById(id, tenantId);

    if (!existing) {
      throw new Error('Group not found');
    }

    logger.info({ groupId: id }, '[NotificationGroupService] Updating group');

    return prisma.notificationGroup.update({
      where: { id },
      data: {
        name: data.name !== undefined ? data.name : existing.name,
        description: data.description !== undefined ? data.description : existing.description,
        type: data.type !== undefined ? data.type : existing.type,
        dynamicQuery: data.dynamicQuery !== undefined ? data.dynamicQuery : existing.dynamicQuery,
        isActive: data.isActive !== undefined ? data.isActive : existing.isActive,
        updatedAt: new Date()
      }
    });
  }

  /**
   * Soft delete gruppo
   */
  static async delete(id, tenantId) {
    const existing = await this.getById(id, tenantId);

    if (!existing) {
      throw new Error('Group not found');
    }

    logger.info({ groupId: id }, '[NotificationGroupService] Soft deleting group');

    return prisma.notificationGroup.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        isActive: false
      }
    });
  }

  /**
   * Toggle stato attivo
   */
  static async toggle(id, tenantId) {
    const existing = await this.getById(id, tenantId);

    if (!existing) {
      throw new Error('Group not found');
    }

    return prisma.notificationGroup.update({
      where: { id },
      data: {
        isActive: !existing.isActive,
        updatedAt: new Date()
      }
    });
  }

  // ==========================================
  // MEMBER MANAGEMENT (Static Groups)
  // ==========================================

  /**
   * Aggiungi membri a gruppo statico
   */
  static async addMembers(groupId, personIds, tenantId) {
    const group = await this.getById(groupId, tenantId);

    if (!group) {
      throw new Error('Group not found');
    }

    if (group.type !== 'STATIC') {
      throw new Error('Can only add members to static groups');
    }

    // Filtra ID già presenti
    const existingIds = group.members.map(m => m.personId);
    const newIds = personIds.filter(id => !existingIds.includes(id));

    if (newIds.length === 0) {
      return { added: 0, total: existingIds.length };
    }

    // Verifica che le persone esistano nel tenant (P63: Person non ha tenantId top-level)
    const validPersons = await prisma.person.findMany({
      where: {
        id: { in: newIds },
        deletedAt: null,
        tenantProfiles: { some: { tenantId, deletedAt: null } }
      },
      select: { id: true }
    });

    const validIds = validPersons.map(p => p.id);

    if (validIds.length === 0) {
      return { added: 0, total: existingIds.length };
    }

    await prisma.notificationGroupMember.createMany({
      data: validIds.map(personId => ({
        groupId,
        personId
      })),
      skipDuplicates: true
    });

    // Aggiorna contatore
    const newTotal = existingIds.length + validIds.length;
    await prisma.notificationGroup.update({
      where: { id: groupId },
      data: { memberCount: newTotal }
    });

    logger.info({ groupId, added: validIds.length }, '[NotificationGroupService] Members added');

    return { added: validIds.length, total: newTotal };
  }

  /**
   * Rimuovi membri da gruppo statico
   */
  static async removeMembers(groupId, personIds, tenantId) {
    const group = await this.getById(groupId, tenantId);

    if (!group) {
      throw new Error('Group not found');
    }

    if (group.type !== 'STATIC') {
      throw new Error('Can only remove members from static groups');
    }

    const result = await prisma.notificationGroupMember.deleteMany({
      where: {
        groupId,
        personId: { in: personIds }
      }
    });

    // Aggiorna contatore
    const newTotal = Math.max(0, group.members.length - result.count);
    await prisma.notificationGroup.update({
      where: { id: groupId },
      data: { memberCount: newTotal }
    });

    logger.info({ groupId, removed: result.count }, '[NotificationGroupService] Members removed');

    return { removed: result.count, total: newTotal };
  }

  // ==========================================
  // DYNAMIC GROUPS
  // ==========================================

  /**
   * Ottieni membri dinamici (esegui query)
   */
  static async getDynamicMembers(group, tenantId) {
    switch (group.type) {
      case 'ROLE_BASED':
        return this.getMembersByRole(group.dynamicQuery?.roleType, tenantId);

      case 'DYNAMIC':
        return this.getMembersByQuery(group.dynamicQuery, tenantId);

      case 'SEGMENT':
        return this.getMembersBySegment(group.dynamicQuery?.segmentId, tenantId);

      default:
        logger.warn({ groupType: group.type, groupId: group.id }, '[NotificationGroupService] Unknown group type, returning empty array');
        return [];
    }
  }

  /**
   * Membri per ruolo
   */
  static async getMembersByRole(roleType, tenantId) {
    if (!roleType) {
      return [];
    }

    const roleTypes = Array.isArray(roleType) ? roleType : [roleType];

    const persons = await prisma.person.findMany({
      where: {
        deletedAt: null,
        tenantProfiles: {
          some: {
            tenantId,
            status: 'ACTIVE'
          }
        },
        personRoles: {
          some: {
            roleType: { in: roleTypes }
          }
        }
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        tenantProfiles: {
          where: { tenantId },
          select: { email: true, phone: true },
          take: 1
        }
      }
    });

    return persons.map(p => ({
      id: p.id,
      firstName: p.firstName,
      lastName: p.lastName,
      email: p.tenantProfiles?.[0]?.email,
      phone: p.tenantProfiles?.[0]?.phone
    }));
  }

  /**
   * Membri per query personalizzata
   */
  static async getMembersByQuery(query, tenantId) {
    if (!query) {
      return [];
    }

    const where = this.buildWhereFromQuery(query, tenantId);

    const persons = await prisma.person.findMany({
      where,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        tenantProfiles: {
          where: { tenantId },
          select: { email: true, phone: true },
          take: 1
        }
      }
    });

    return persons.map(p => ({
      id: p.id,
      firstName: p.firstName,
      lastName: p.lastName,
      email: p.tenantProfiles?.[0]?.email,
      phone: p.tenantProfiles?.[0]?.phone
    }));
  }

  /**
   * Costruisci where clause da query JSON
   */
  static buildWhereFromQuery(query, tenantId) {
    // P63: Person non ha tenantId in top-level — usa solo tenantProfiles.some
    const where = {
      deletedAt: null,
      tenantProfiles: {
        some: {
          tenantId,
          status: 'ACTIVE'
        }
      }
    };

    // Filtro per appuntamenti recenti
    if (query.hasAppointmentSince) {
      where.appuntamenti = {
        some: {
          dataOra: { gte: new Date(query.hasAppointmentSince) },
          deletedAt: null
        }
      };
    }

    // Filtro per tipo visita
    if (query.hasVisitType) {
      where.visite = {
        some: {
          tipo: query.hasVisitType,
          deletedAt: null
        }
      };
    }

    // Filtro per età
    if (query.ageRange) {
      const today = new Date();
      if (query.ageRange.min) {
        where.birthDate = {
          ...where.birthDate,
          lte: new Date(today.getFullYear() - query.ageRange.min, today.getMonth(), today.getDate())
        };
      }
      if (query.ageRange.max) {
        where.birthDate = {
          ...where.birthDate,
          gte: new Date(today.getFullYear() - query.ageRange.max, today.getMonth(), today.getDate())
        };
      }
    }

    // Filtro per ruolo
    if (query.hasRole?.length) {
      where.roles = {
        some: {
          role: {
            roleType: { in: query.hasRole }
          }
        }
      };
    }

    // Filtro per ultimo login
    if (query.lastLoginAfter) {
      where.lastLoginAt = {
        ...where.lastLoginAt,
        gte: new Date(query.lastLoginAfter)
      };
    }

    if (query.lastLoginBefore) {
      where.lastLoginAt = {
        ...where.lastLoginAt,
        lte: new Date(query.lastLoginBefore)
      };
    }

    // Filtro per email verificata
    if (query.emailVerified !== undefined) {
      where.emailVerified = query.emailVerified;
    }

    return where;
  }

  /**
   * Ottieni membri di un segmento predefinito
   */
  static async getMembersBySegment(segmentId, tenantId) {
    if (!segmentId) {
      return [];
    }

    const segment = SEGMENTS[segmentId];

    if (!segment) {
      logger.warn({ segmentId }, '[NotificationGroupService] Unknown segment, returning empty array');
      return [];
    }

    return segment.query(tenantId);
  }

  /**
   * Lista segmenti disponibili
   */
  static listSegments() {
    return Object.entries(SEGMENTS).map(([id, segment]) => ({
      id,
      name: segment.name,
      description: segment.description
    }));
  }

  // ==========================================
  // UNIFIED MEMBER ACCESS
  // ==========================================

  /**
   * Ottieni tutti i membri di un gruppo (statico o dinamico)
   */
  static async getGroupMembers(groupId, tenantId) {
    const group = await this.getById(groupId, tenantId);

    if (!group) {
      throw new Error('Group not found');
    }

    if (group.type === 'STATIC') {
      // Per gruppi statici, usa la relazione
      return group.members.map(m => m.person);
    }

    // Per gruppi dinamici, esegui query
    return this.getDynamicMembers(group, tenantId);
  }

  /**
   * Conta membri di un gruppo
   */
  static async countMembers(groupId, tenantId) {
    const group = await this.getById(groupId, tenantId);

    if (!group) {
      throw new Error('Group not found');
    }

    if (group.type === 'STATIC') {
      return group.members.length;
    }

    const members = await this.getDynamicMembers(group, tenantId);
    return members.length;
  }

  /**
   * Preview membri prima di invio
   */
  static async previewMembers(groupId, tenantId, limit = 10) {
    const members = await this.getGroupMembers(groupId, tenantId);
    const total = members.length;

    return {
      total,
      preview: members.slice(0, limit).map(m => ({
        id: m.id,
        name: `${m.firstName || ''} ${m.lastName || ''}`.trim(),
        email: m.email,
        phone: m.phone
      })),
      hasMore: total > limit
    };
  }

  /**
   * Sincronizza membri dinamici (aggiorna cache count)
   */
  static async syncDynamicGroup(groupId, tenantId) {
    const group = await this.getById(groupId, tenantId);

    if (!group || group.type === 'STATIC') {
      return null;
    }

    const members = await this.getDynamicMembers(group, tenantId);

    await prisma.notificationGroup.update({
      where: { id: groupId },
      data: {
        memberCount: members.length,
        lastSyncAt: new Date()
      }
    });

    logger.info({ groupId, memberCount: members.length }, '[NotificationGroupService] Dynamic group synced');

    return {
      groupId,
      memberCount: members.length,
      syncedAt: new Date()
    };
  }

  // ==========================================
  // BATCH SEND
  // ==========================================

  /**
   * Ottieni tutti i destinatari per invio batch
   * Restituisce array di person IDs
   */
  static async getRecipientIdsForGroup(groupId, tenantId) {
    const members = await this.getGroupMembers(groupId, tenantId);
    return members.map(m => m.id);
  }

  /**
   * Ottieni statistiche gruppo
   */
  static async getGroupStats(groupId, tenantId) {
    const group = await this.getById(groupId, tenantId);

    if (!group) {
      throw new Error('Group not found');
    }

    const members = await this.getGroupMembers(groupId, tenantId);

    // Conta membri con email
    const withEmail = members.filter(m => m.email).length;
    // Conta membri con telefono
    const withPhone = members.filter(m => m.phone).length;

    return {
      groupId,
      groupName: group.name,
      type: group.type,
      totalMembers: members.length,
      withEmail,
      withPhone,
      emailCoverage: members.length > 0 ? Math.round((withEmail / members.length) * 100) : 0,
      phoneCoverage: members.length > 0 ? Math.round((withPhone / members.length) * 100) : 0
    };
  }
}

export default NotificationGroupService;
