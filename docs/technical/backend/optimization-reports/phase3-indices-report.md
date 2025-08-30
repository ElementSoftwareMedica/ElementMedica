# 📋 REPORT FASE 3: INDICI & VINCOLI

**Data**: 2025-07-10T17:03:23.360Z
**Schema**: /Users/matteo.michielon/project 2.0/backend/prisma/schema.prisma
**Backup**: /Users/matteo.michielon/project 2.0/backend/prisma/schema.prisma.backup-phase3

## ✅ MODIFICHE APPLICATE

### Indici Aggiunti (55)
- Aggiunto indice su CustomRolePermission.customRoleId
- Aggiunto indice su CustomRolePermission.customRoleId
- Aggiunto indice su CustomRolePermission.customRoleId
- Aggiunto indice su CustomRolePermission.customRoleId
- Aggiunto indice su CustomRole.tenantId
- Aggiunto indice su CustomRole.createdBy
- Aggiunto indice su TenantUsage.tenantId
- Aggiunto indice su EnhancedUserRole.assignedBy
- Aggiunto indice su EnhancedUserRole.companyId
- Aggiunto indice su EnhancedUserRole.tenantId
- Aggiunto indice su EnhancedUserRole.personId
- Aggiunto indice su TenantConfiguration.tenantId
- Aggiunto indice su RolePermission.grantedBy
- Aggiunto indice su RolePermission.personRoleId
- Aggiunto indice su PersonRole.assignedBy
- Aggiunto indice su PersonRole.personId
- Aggiunto indice su PersonSession.personId
- Aggiunto indice su ConsentRecord.personId
- Aggiunto indice su GdprAuditLog.personId
- Aggiunto indice su RefreshToken.personId
- Aggiunto indice su TestPartecipante.personId
- Aggiunto indice su TestPartecipante.testId
- Aggiunto indice su TestDocument.scheduledCourseId
- Aggiunto indice su TestDocument.trainerId
- Aggiunto indice su ActivityLog.personId
- Aggiunto indice su FatturaAzienda.aziendaId
- Aggiunto indice su FatturaAzienda.fatturaId
- Aggiunto indice su Fattura.scheduledCourseId
- Aggiunto indice su PreventivoAzienda.aziendaId
- Aggiunto indice su PreventivoAzienda.preventivoId
- Aggiunto indice su PreventivoPartecipante.personId
- Aggiunto indice su PreventivoPartecipante.preventivoId
- Aggiunto indice su Preventivo.scheduledCourseId
- Aggiunto indice su RegistroPresenzePartecipante.personId
- Aggiunto indice su RegistroPresenzePartecipante.registroPresenzeId
- Aggiunto indice su RegistroPresenze.formatoreId
- Aggiunto indice su RegistroPresenze.scheduledCourseId
- Aggiunto indice su RegistroPresenze.sessionId
- Aggiunto indice su LetteraIncarico.scheduledCourseId
- Aggiunto indice su LetteraIncarico.trainerId
- Aggiunto indice su TemplateLink.companyId
- Aggiunto indice su Attestato.personId
- Aggiunto indice su Attestato.scheduledCourseId
- Aggiunto indice su ScheduleCompany.companyId
- Aggiunto indice su ScheduleCompany.scheduleId
- Aggiunto indice su CourseSession.coTrainerId
- Aggiunto indice su CourseSession.scheduleId
- Aggiunto indice su CourseSession.trainerId
- Aggiunto indice su CourseEnrollment.personId
- Aggiunto indice su CourseEnrollment.scheduleId
- Aggiunto indice su CourseSchedule.companyId
- Aggiunto indice su CourseSchedule.courseId
- Aggiunto indice su CourseSchedule.trainerId
- Aggiunto indice su Course.tenantId
- Aggiunto indice su Company.tenantId

### Vincoli Aggiunti (50)
- Aggiunto onDelete: Restrict alla linea 36
- Aggiunto onDelete: Restrict alla linea 70
- Aggiunto onDelete: Restrict alla linea 95
- Aggiunto onDelete: Cascade alla linea 96
- Aggiunto onDelete: Cascade alla linea 97
- Aggiunto onDelete: Cascade alla linea 119
- Aggiunto onDelete: Cascade alla linea 138
- Aggiunto onDelete: Cascade alla linea 140
- Aggiunto onDelete: Restrict alla linea 153
- Aggiunto onDelete: Cascade alla linea 172
- Aggiunto onDelete: Restrict alla linea 198
- Aggiunto onDelete: Cascade alla linea 216
- Aggiunto onDelete: Cascade alla linea 238
- Aggiunto onDelete: Cascade alla linea 260
- Aggiunto onDelete: Cascade alla linea 297
- Aggiunto onDelete: Cascade alla linea 314
- Aggiunto onDelete: Cascade alla linea 350
- Aggiunto onDelete: Cascade alla linea 383
- Aggiunto onDelete: Cascade alla linea 410
- Aggiunto onDelete: Cascade alla linea 431
- Aggiunto onDelete: Cascade alla linea 472
- Aggiunto onDelete: Cascade alla linea 550
- Aggiunto onDelete: Restrict alla linea 552
- Aggiunto onDelete: Restrict alla linea 553
- Aggiunto onDelete: Cascade alla linea 554
- Aggiunto onDelete: Cascade alla linea 557
- Aggiunto onDelete: Cascade alla linea 558
- Aggiunto onDelete: Cascade alla linea 559
- Aggiunto onDelete: Cascade alla linea 560
- Aggiunto onDelete: Cascade alla linea 561
- Aggiunto onDelete: Cascade alla linea 562
- Aggiunto onDelete: Cascade alla linea 564
- Aggiunto onDelete: Cascade alla linea 565
- Aggiunto onDelete: Cascade alla linea 566
- Aggiunto onDelete: Cascade alla linea 567
- Aggiunto onDelete: Cascade alla linea 568
- Aggiunto onDelete: Cascade alla linea 569
- Aggiunto onDelete: Cascade alla linea 570
- Aggiunto onDelete: Cascade alla linea 571
- Aggiunto onDelete: Cascade alla linea 572
- Aggiunto onDelete: Cascade alla linea 573
- Aggiunto onDelete: Cascade alla linea 600
- Aggiunto onDelete: Restrict alla linea 601
- Aggiunto onDelete: Restrict alla linea 603
- Aggiunto onDelete: Cascade alla linea 604
- Aggiunto onDelete: Cascade alla linea 627
- Aggiunto onDelete: Cascade alla linea 714
- Aggiunto onDelete: Restrict alla linea 715
- Aggiunto onDelete: Cascade alla linea 759
- Aggiunto onDelete: Cascade alla linea 761

## 🎯 RISULTATI

- **Indici aggiunti**: 55
- **Vincoli aggiunti**: 50
- **Problemi risolti**: 105

## 📋 PROSSIMI PASSI

1. ✅ **Fase 3 completata**: Indici e vincoli ottimizzati
2. 🔄 **Prossima fase**: Fase 4 - Multi-tenancy
3. 🧪 **Testing**: Verificare performance delle query
4. 🗄️ **Migrazione**: Aggiornare database

---
*Report generato automaticamente - Fase 3 Optimizer*
