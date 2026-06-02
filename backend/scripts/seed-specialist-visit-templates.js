#!/usr/bin/env node

import prisma from '../config/prisma-optimization.js';
import { VisitTemplateService } from '../services/clinical/VisitTemplateService.js';

const SPECIALIST_TOKENS = [
    'ecg',
    'elettro',
    'spiro',
    'audio',
    'visio',
    'vista',
    'rachide',
    'colonna',
    'arti superiori',
    'arto superiore',
    'superiori',
    'alcol',
    'alcool',
    'alcohol',
    'drug',
    'droga',
    'droghe',
    'tossicologico',
    'sostanze'
];

function fieldCount(template) {
    return Array.isArray(template.fields) ? template.fields.length : 0;
}

function normalizeWidth(field) {
    const width = Number(field?.size?.width || 4);
    return Math.max(1, Math.min(width, 12));
}

function normalizeHeight(field) {
    const height = Number(field?.size?.height || 1);
    return Math.max(1, Math.min(height, 8));
}

function hasLayoutIssue(fields) {
    const occupiedBySection = new Map();
    for (const field of fields || []) {
        if (!field) continue;
        if (!field.section || !field.position || !field.size || field.visible === undefined) return true;
        if (field.visible === false) continue;
        const section = field.section || 'esame';
        const occupied = occupiedBySection.get(section) || new Set();
        occupiedBySection.set(section, occupied);
        const row = Number(field.position?.row || 0);
        const col = Number(field.position?.col || 0);
        const width = normalizeWidth(field);
        const height = normalizeHeight(field);
        if (col + width > 12) return true;
        for (let r = row; r < row + height; r += 1) {
            for (let c = col; c < col + width; c += 1) {
                const key = `${r}:${c}`;
                if (occupied.has(key)) return true;
                occupied.add(key);
            }
        }
    }
    return false;
}

function reflowFields(fields) {
    const cloned = JSON.parse(JSON.stringify(fields || []));
    const groups = new Map();
    for (const field of cloned) {
        const section = field.section || 'esame';
        groups.set(section, [...(groups.get(section) || []), field]);
    }

    const canPlace = (occupied, row, col, width, height) => {
        if (col + width > 12) return false;
        for (let r = row; r < row + height; r += 1) {
            for (let c = col; c < col + width; c += 1) {
                if (occupied.has(`${r}:${c}`)) return false;
            }
        }
        return true;
    };
    const mark = (occupied, row, col, width, height) => {
        for (let r = row; r < row + height; r += 1) {
            for (let c = col; c < col + width; c += 1) {
                occupied.add(`${r}:${c}`);
            }
        }
    };
    const find = (occupied, width, height) => {
        for (let row = 0; row < 100; row += 1) {
            for (let col = 0; col <= 12 - width; col += 1) {
                if (canPlace(occupied, row, col, width, height)) return { row, col };
            }
        }
        return { row: 0, col: 0 };
    };

    const result = [];
    for (const [section, sectionFields] of groups.entries()) {
        const occupied = new Set();
        sectionFields
            .sort((a, b) => (a.position?.row ?? 0) - (b.position?.row ?? 0)
                || (a.position?.col ?? 0) - (b.position?.col ?? 0)
                || (a.order ?? 0) - (b.order ?? 0))
            .forEach(field => {
                const width = normalizeWidth(field);
                const height = normalizeHeight(field);
                if (field.visible === false) {
                    result.push({ ...field, section, size: { width, height } });
                    return;
                }
                const position = find(occupied, width, height);
                mark(occupied, position.row, position.col, width, height);
                result.push({ ...field, section, position, size: { width, height }, visible: field.visible !== false });
            });
    }
    return result;
}

async function cleanupDuplicatePrestazioneTemplates() {
    const templates = await prisma.visitTemplate.findMany({
        where: {
            deletedAt: null,
            isActive: true,
            scope: 'PRESTAZIONE',
            prestazioneId: { not: null },
            medicoId: null
        },
        select: {
            id: true,
            tenantId: true,
            prestazioneId: true,
            name: true,
            fields: true,
            sidebarConfig: true,
            updatedAt: true,
            createdAt: true
        }
    });

    const groups = new Map();
    for (const template of templates) {
        const key = `${template.tenantId}:${template.prestazioneId}`;
        groups.set(key, [...(groups.get(key) || []), template]);
    }

    let removed = 0;
    for (const group of groups.values()) {
        if (group.length <= 1) continue;
        const [keep, ...duplicates] = group.sort((a, b) => {
            const specialistDelta = (b.sidebarConfig?.specialist === true ? 1 : 0)
                - (a.sidebarConfig?.specialist === true ? 1 : 0);
            if (specialistDelta !== 0) return specialistDelta;
            const fieldsDelta = fieldCount(a) - fieldCount(b);
            if (fieldsDelta !== 0) return fieldsDelta;
            return new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime();
        });

        await prisma.visitTemplate.updateMany({
            where: { id: { in: duplicates.map(t => t.id) } },
            data: {
                isActive: false,
                deletedAt: new Date()
            }
        });
        removed += duplicates.length;
        console.log(`Template duplicati disattivati per prestazione ${keep.prestazioneId}: ${duplicates.length}`);
    }

    return removed;
}

async function repairOverlappingTemplateLayouts() {
    const templates = await prisma.visitTemplate.findMany({
        where: { deletedAt: null, isActive: true },
        select: { id: true, fields: true }
    });
    let repaired = 0;
    for (const template of templates) {
        if (!Array.isArray(template.fields) || !hasLayoutIssue(template.fields)) continue;
        await prisma.visitTemplate.update({
            where: { id: template.id },
            data: {
                fields: reflowFields(template.fields),
                version: { increment: 1 }
            }
        });
        repaired += 1;
    }
    return repaired;
}

async function main() {
    const prestazioni = await prisma.prestazione.findMany({
        where: {
            deletedAt: null,
            OR: SPECIALIST_TOKENS.flatMap(token => ([
                { nome: { contains: token, mode: 'insensitive' } },
                { codice: { contains: token, mode: 'insensitive' } }
            ]))
        },
        select: { id: true, tenantId: true, nome: true, codice: true }
    });

    let processed = 0;
    let createdOrUpdated = 0;
    for (const prestazione of prestazioni) {
        processed += 1;
        const template = await VisitTemplateService.ensureSpecialistTemplateForPrestazione(
            prestazione.id,
            prestazione.tenantId
        );
        if (template?.id) createdOrUpdated += 1;
    }

    const duplicatesRemoved = await cleanupDuplicatePrestazioneTemplates();
    const layoutsRepaired = await repairOverlappingTemplateLayouts();

    console.log(`Template specialistici verificati: ${processed}`);
    console.log(`Template specialistici disponibili: ${createdOrUpdated}`);
    console.log(`Template duplicati disattivati: ${duplicatesRemoved}`);
    console.log(`Template layout riparati: ${layoutsRepaired}`);
}

main()
    .catch(error => {
        console.error('Errore seed template specialistici:', error);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
