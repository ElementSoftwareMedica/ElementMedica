/**
 * Notification Group Controller
 * 
 * API endpoints per gestione gruppi di destinatari notifiche.
 * 
 * PROGETTO 47 - Advanced Notification System - Fase 6
 * 
 * @module controllers/notificationGroupController
 */

import { NotificationGroupService } from '../services/notifications/NotificationGroupService.js';
import logger from '../utils/logger.js';

/**
 * Lista tutti i gruppi del tenant
 * GET /api/v1/notifications/groups
 */
export const getAllGroups = async (req, res) => {
  try {
    const { tenantId } = req.person;
    const { type, isActive, search } = req.query;

    const groups = await NotificationGroupService.getAll(tenantId, {
      type,
      isActive,
      search
    });

    res.json({
      success: true,
      data: groups.map(g => ({
        ...g,
        memberCount: g._count?.members || g.memberCount || 0
      }))
    });
  } catch (error) {
    logger.error({ error: 'Internal server error' }, '[NotificationGroupController] Error getting groups');
    res.status(500).json({ success: false });
  }
};

/**
 * Ottieni singolo gruppo
 * GET /api/v1/notifications/groups/:id
 */
export const getGroup = async (req, res) => {
  try {
    const { tenantId } = req.person;
    const { id } = req.params;

    const group = await NotificationGroupService.getById(id, tenantId);

    if (!group) {
      return res.status(404).json({ success: false, message: 'Gruppo non trovato' });
    }

    res.json({
      success: true,
      data: {
        ...group,
        memberCount: group._count?.members || group.memberCount || 0
      }
    });
  } catch (error) {
    logger.error({ error: 'Internal server error' }, '[NotificationGroupController] Error getting group');
    res.status(500).json({ success: false });
  }
};

/**
 * Crea nuovo gruppo
 * POST /api/v1/notifications/groups
 */
export const createGroup = async (req, res) => {
  try {
    const { tenantId } = req.person;
    const { name, description, type, dynamicQuery, memberIds, isActive } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, message: 'Il nome è obbligatorio' });
    }

    const validTypes = ['STATIC', 'DYNAMIC', 'ROLE_BASED', 'SEGMENT'];
    if (type && !validTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        message: `Tipo non valido. Deve essere uno tra: ${validTypes.join(', ')}`
      });
    }

    const group = await NotificationGroupService.create({
      name,
      description,
      type: type || 'STATIC',
      dynamicQuery,
      memberIds,
      isActive
    }, tenantId);

    logger.info({ groupId: group.id, tenantId }, '[NotificationGroupController] Group created');

    res.status(201).json({ success: true, data: group });
  } catch (error) {
    logger.error({ error: 'Internal server error' }, '[NotificationGroupController] Error creating group');
    res.status(500).json({ success: false });
  }
};

/**
 * Aggiorna gruppo
 * PUT /api/v1/notifications/groups/:id
 */
export const updateGroup = async (req, res) => {
  try {
    const { tenantId } = req.person;
    const { id } = req.params;
    const { name, description, type, dynamicQuery, isActive } = req.body;

    const group = await NotificationGroupService.update(id, {
      name,
      description,
      type,
      dynamicQuery,
      isActive
    }, tenantId);

    logger.info({ groupId: id, tenantId }, '[NotificationGroupController] Group updated');

    res.json({ success: true, data: group });
  } catch (error) {
    if (error.message === 'Gruppo non trovato') {
      return res.status(404).json({ success: false });
    }
    logger.error({ error: 'Internal server error' }, '[NotificationGroupController] Error updating group');
    res.status(500).json({ success: false });
  }
};

/**
 * Elimina gruppo (soft delete)
 * DELETE /api/v1/notifications/groups/:id
 */
export const deleteGroup = async (req, res) => {
  try {
    const { tenantId } = req.person;
    const { id } = req.params;

    await NotificationGroupService.delete(id, tenantId);

    logger.info({ groupId: id, tenantId }, '[NotificationGroupController] Group deleted');

    res.json({ success: true, message: 'Gruppo eliminato' });
  } catch (error) {
    if (error.message === 'Gruppo non trovato') {
      return res.status(404).json({ success: false });
    }
    logger.error({ error: 'Internal server error' }, '[NotificationGroupController] Error deleting group');
    res.status(500).json({ success: false });
  }
};

/**
 * Toggle stato attivo gruppo
 * PATCH /api/v1/notifications/groups/:id/toggle
 */
export const toggleGroup = async (req, res) => {
  try {
    const { tenantId } = req.person;
    const { id } = req.params;

    const group = await NotificationGroupService.toggle(id, tenantId);

    res.json({ success: true, data: group });
  } catch (error) {
    if (error.message === 'Gruppo non trovato') {
      return res.status(404).json({ success: false });
    }
    logger.error({ error: 'Internal server error' }, '[NotificationGroupController] Error toggling group');
    res.status(500).json({ success: false });
  }
};

// ==========================================
// MEMBER MANAGEMENT
// ==========================================

/**
 * Aggiungi membri a gruppo statico
 * POST /api/v1/notifications/groups/:id/members
 */
export const addMembers = async (req, res) => {
  try {
    const { tenantId } = req.person;
    const { id } = req.params;
    const { personIds } = req.body;

    if (!personIds || !Array.isArray(personIds) || personIds.length === 0) {
      return res.status(400).json({ success: false, message: 'Array personIds è obbligatorio' });
    }

    const result = await NotificationGroupService.addMembers(id, personIds, tenantId);

    res.json({ success: true, data: result });
  } catch (error) {
    if (error.message === 'Gruppo non trovato') {
      return res.status(404).json({ success: false });
    }
    if (error.message.includes('static groups')) {
      return res.status(400).json({ success: false });
    }
    logger.error({ error: 'Internal server error' }, '[NotificationGroupController] Error adding members');
    res.status(500).json({ success: false });
  }
};

/**
 * Rimuovi membri da gruppo statico
 * DELETE /api/v1/notifications/groups/:id/members
 */
export const removeMembers = async (req, res) => {
  try {
    const { tenantId } = req.person;
    const { id } = req.params;
    const { personIds } = req.body;

    if (!personIds || !Array.isArray(personIds) || personIds.length === 0) {
      return res.status(400).json({ success: false, message: 'Array personIds è obbligatorio' });
    }

    const result = await NotificationGroupService.removeMembers(id, personIds, tenantId);

    res.json({ success: true, data: result });
  } catch (error) {
    if (error.message === 'Gruppo non trovato') {
      return res.status(404).json({ success: false });
    }
    if (error.message.includes('static groups')) {
      return res.status(400).json({ success: false });
    }
    logger.error({ error: 'Internal server error' }, '[NotificationGroupController] Error removing members');
    res.status(500).json({ success: false });
  }
};

/**
 * Ottieni membri del gruppo
 * GET /api/v1/notifications/groups/:id/members
 */
export const getGroupMembers = async (req, res) => {
  try {
    const { tenantId } = req.person;
    const { id } = req.params;

    const members = await NotificationGroupService.getGroupMembers(id, tenantId);

    res.json({
      success: true,
      data: members.map(m => ({
        id: m.id,
        name: `${m.firstName || ''} ${m.lastName || ''}`.trim(),
        email: m.email,
        phone: m.phone
      })),
      total: members.length
    });
  } catch (error) {
    if (error.message === 'Gruppo non trovato') {
      return res.status(404).json({ success: false });
    }
    logger.error({ error: 'Internal server error' }, '[NotificationGroupController] Error getting members');
    res.status(500).json({ success: false });
  }
};

/**
 * Preview membri (per invio)
 * GET /api/v1/notifications/groups/:id/preview
 */
export const previewMembers = async (req, res) => {
  try {
    const { tenantId } = req.person;
    const { id } = req.params;
    const limit = parseInt(req.query.limit) || 10;

    const preview = await NotificationGroupService.previewMembers(id, tenantId, limit);

    res.json({ success: true, data: preview });
  } catch (error) {
    if (error.message === 'Gruppo non trovato') {
      return res.status(404).json({ success: false });
    }
    logger.error({ error: 'Internal server error' }, '[NotificationGroupController] Error previewing members');
    res.status(500).json({ success: false });
  }
};

/**
 * Statistiche gruppo
 * GET /api/v1/notifications/groups/:id/stats
 */
export const getGroupStats = async (req, res) => {
  try {
    const { tenantId } = req.person;
    const { id } = req.params;

    const stats = await NotificationGroupService.getGroupStats(id, tenantId);

    res.json({ success: true, data: stats });
  } catch (error) {
    if (error.message === 'Gruppo non trovato') {
      return res.status(404).json({ success: false });
    }
    logger.error({ error: 'Internal server error' }, '[NotificationGroupController] Error getting stats');
    res.status(500).json({ success: false });
  }
};

/**
 * Sincronizza gruppo dinamico
 * POST /api/v1/notifications/groups/:id/sync
 */
export const syncGroup = async (req, res) => {
  try {
    const { tenantId } = req.person;
    const { id } = req.params;

    const result = await NotificationGroupService.syncDynamicGroup(id, tenantId);

    if (!result) {
      return res.status(400).json({
        success: false,
        message: 'Solo i gruppi dinamici possono essere sincronizzati'
      });
    }

    res.json({ success: true, data: result });
  } catch (error) {
    logger.error({ error: 'Internal server error' }, '[NotificationGroupController] Error syncing group');
    res.status(500).json({ success: false });
  }
};

// ==========================================
// SEGMENTS
// ==========================================

/**
 * Lista segmenti predefiniti
 * GET /api/v1/notifications/segments
 */
export const listSegments = async (req, res) => {
  try {
    const segments = NotificationGroupService.listSegments();
    res.json({ success: true, data: segments });
  } catch (error) {
    logger.error({ error: 'Internal server error' }, '[NotificationGroupController] Error listing segments');
    res.status(500).json({ success: false });
  }
};

/**
 * Preview segmento predefinito
 * GET /api/v1/notifications/segments/:segmentId/preview
 */
export const previewSegment = async (req, res) => {
  try {
    const { tenantId } = req.person;
    const { segmentId } = req.params;
    const limit = parseInt(req.query.limit) || 10;

    const members = await NotificationGroupService.getMembersBySegment(segmentId, tenantId);
    const total = members.length;

    res.json({
      success: true,
      data: {
        segmentId,
        total,
        preview: members.slice(0, limit).map(m => ({
          id: m.id,
          name: `${m.firstName || ''} ${m.lastName || ''}`.trim(),
          email: m.email,
          phone: m.phone
        })),
        hasMore: total > limit
      }
    });
  } catch (error) {
    if (error.message.includes('Unknown segment')) {
      return res.status(404).json({ success: false });
    }
    logger.error({ error: 'Internal server error' }, '[NotificationGroupController] Error previewing segment');
    res.status(500).json({ success: false });
  }
};

export default {
  getAllGroups,
  getGroup,
  createGroup,
  updateGroup,
  deleteGroup,
  toggleGroup,
  addMembers,
  removeMembers,
  getGroupMembers,
  previewMembers,
  getGroupStats,
  syncGroup,
  listSegments,
  previewSegment
};
