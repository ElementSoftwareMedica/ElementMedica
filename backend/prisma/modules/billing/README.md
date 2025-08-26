# Modulo BILLING

## Descrizione
Sistema fatturazione e preventivi

## Modelli Inclusi
- **Preventivo**: Modello del sistema
- **PreventivoPartecipante**: Modello del sistema
- **Fattura**: Fatturazione

## Enum Utilizzati


## Relazioni
- **Preventivo** → **CourseSchedule**: scheduledCourse
- **PreventivoPartecipante** → **Person**: person
- **PreventivoPartecipante** → **Preventivo**: preventivo
- **Fattura** → **CourseSchedule**: scheduledCourse

---
*Documentazione generata automaticamente*
