# Modulo ATTENDANCE

## Descrizione
Sistema presenze e registrazioni

## Modelli Inclusi
- **RegistroPresenze**: Modello del sistema
- **RegistroPresenzePartecipante**: Modello del sistema

## Enum Utilizzati


## Relazioni
- **RegistroPresenze** → **Person**: formatore
- **RegistroPresenze** → **CourseSchedule**: scheduledCourse
- **RegistroPresenze** → **CourseSession**: session
- **RegistroPresenzePartecipante** → **Person**: person
- **RegistroPresenzePartecipante** → **RegistroPresenze**: registroPresenze

---
*Documentazione generata automaticamente*
