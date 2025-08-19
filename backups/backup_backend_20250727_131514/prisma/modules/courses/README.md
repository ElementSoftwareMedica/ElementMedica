# Modulo COURSES

## Descrizione
Sistema corsi e formazione

## Modelli Inclusi
- **Course**: Corsi di formazione
- **CourseSchedule**: Modello del sistema
- **CourseEnrollment**: Iscrizioni ai corsi
- **CourseSession**: Modello del sistema

## Enum Utilizzati


## Relazioni
- **CourseSchedule** → **Course**: course
- **CourseEnrollment** → **Person**: person
- **CourseEnrollment** → **CourseSchedule**: schedule
- **CourseSession** → **CourseSchedule**: schedule

---
*Documentazione generata automaticamente*
