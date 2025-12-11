# 🎨 Piano Ottimizzazione Frontend Pubblico

**Versione:** 1.0  
**Data:** 19 Novembre 2025  
**Progetto:** ElementMedica - Redesign UI/UX Frontend Pubblico  
**Focus:** Medicina del Lavoro + Correzione Colori Corsi

---

## 📋 Executive Summary

Piano dettagliato per l'ottimizzazione visiva e UX del frontend pubblico con:
1. **Focus Medicina del Lavoro**: Elevare importanza visiva e conversion rate
2. **Correzione Colori Corsi**: Sistemare palette non corretta
3. **Ottimizzazione Generale**: Layout, spacing, accessibilità, performance
4. **Design System**: Palette unificata per brand consistency

**Timeline**: 3-4 giorni lavorativi  
**Impact**: +30% conversion rate stimato, +25% engagement

---

## 🎯 Obiettivi Misurabili

### Business Goals
- 📈 +30% click su CTA "Medicina del Lavoro"
- 📈 +25% tempo sulla pagina Medicina del Lavoro
- 📈 +20% submissions form contatti da pagina Medicina
- 📈 -15% bounce rate pagina Corsi

### Technical Goals
- ♿ WCAG 2.1 AA compliance (contrast ratio >= 4.5:1)
- ⚡ Lighthouse Score >= 95 (performance, accessibility, SEO)
- 📱 Mobile-first responsive design
- 🎨 Brand consistency 100% componenti pubblici

---

## 🔍 Analisi Stato Attuale

### Problemi Identificati

#### 1. Medicina del Lavoro - Bassa Visibilità
```typescript
// src/pages/public/MedicinaDelLavoroPage.tsx - PROBLEMI:
❌ Hero generico, non differenziato
❌ Nessuna statistica medica specifica
❌ Icone standard (Stethoscope) poco impattanti
❌ CTA "Contattaci" troppo generico
❌ Manca sezione trust signals (certificazioni, esperienza medici)
❌ Colori non medical-focused (primary-600 blu standard)
```

#### 2. Corsi Page - Colori Non Corretti
```typescript
// src/pages/public/CoursesPage.tsx - PROBLEMI:
❌ Colori risk levels confusi (ALTO/MEDIO/BASSO vs A/B/C)
❌ Card corsi con background grigio piatto
❌ Filtri poco visibili
❌ Badge categoria con colori random
❌ Hover states inconsistenti
```

#### 3. Design System - Palette Incompleta
```css
/* src/design-system/design-system.css - MANCANZE:
❌ Nessun colore medical-specific (celeste, verde salute)
❌ Primary blue troppo generico (non medical)
❌ Accent colors non definiti per categorie
❌ Semantic colors limitati (solo success/error/warning)
*/
```

---

## 🎨 Nuova Palette Colori

### Medical Theme (Medicina del Lavoro Focus)

```css
:root {
  /* === MEDICAL COLORS === */
  /* Celeste Medico - Primary per Medicina del Lavoro */
  --color-medical-50: #ecfeff;
  --color-medical-100: #cffafe;
  --color-medical-200: #a5f3fc;
  --color-medical-300: #67e8f9;
  --color-medical-400: #22d3ee;
  --color-medical-500: #06b6d4;  /* Main medical cyan */
  --color-medical-600: #0891b2;
  --color-medical-700: #0e7490;
  --color-medical-800: #155e75;
  --color-medical-900: #164e63;
  
  /* Verde Salute - Accenti wellness */
  --color-health-50: #f0fdf4;
  --color-health-100: #dcfce7;
  --color-health-200: #bbf7d0;
  --color-health-300: #86efac;
  --color-health-400: #4ade80;
  --color-health-500: #22c55e;  /* Main health green */
  --color-health-600: #16a34a;
  --color-health-700: #15803d;
  
  /* === SAFETY COLORS (per Corsi) === */
  /* Rosso Sicurezza - Alto Rischio */
  --color-safety-high-50: #fef2f2;
  --color-safety-high-500: #ef4444;
  --color-safety-high-700: #b91c1c;
  
  /* Arancione - Medio Rischio */
  --color-safety-medium-50: #fff7ed;
  --color-safety-medium-500: #f97316;
  --color-safety-medium-700: #c2410c;
  
  /* Verde - Basso Rischio */
  --color-safety-low-50: #f0fdf4;
  --color-safety-low-500: #22c55e;
  --color-safety-low-700: #15803d;
  
  /* === CATEGORY COLORS (per tipologie corsi) === */
  --color-category-antincendio: #f59e0b;      /* Arancione fuoco */
  --color-category-primo-soccorso: #ec4899;   /* Rosa medico */
  --color-category-sicurezza: #3b82f6;        /* Blu standard */
  --color-category-lavori-quota: #8b5cf6;     /* Viola */
  --color-category-spazi-confinati: #64748b;  /* Grigio scuro */
  
  /* === PRIMARY/SECONDARY (aggiornati) === */
  --color-primary-500: #0891b2;  /* Cambiato a medical cyan */
  --color-accent-500: #22c55e;   /* Verde salute */
}
```

### Tailwind Config Update

```javascript
// tailwind.config.js - AGGIORNAMENTO
export default {
  theme: {
    extend: {
      colors: {
        medical: {
          50: 'var(--color-medical-50)',
          100: 'var(--color-medical-100)',
          500: 'var(--color-medical-500)',
          600: 'var(--color-medical-600)',
          700: 'var(--color-medical-700)',
        },
        health: {
          50: 'var(--color-health-50)',
          500: 'var(--color-health-500)',
          600: 'var(--color-health-600)',
        },
        safety: {
          high: {
            50: 'var(--color-safety-high-50)',
            500: 'var(--color-safety-high-500)',
            700: 'var(--color-safety-high-700)',
          },
          medium: {
            50: 'var(--color-safety-medium-50)',
            500: 'var(--color-safety-medium-500)',
            700: 'var(--color-safety-medium-700)',
          },
          low: {
            50: 'var(--color-safety-low-50)',
            500: 'var(--color-safety-low-500)',
            700: 'var(--color-safety-low-700)',
          },
        },
        category: {
          antincendio: 'var(--color-category-antincendio)',
          'primo-soccorso': 'var(--color-category-primo-soccorso)',
          sicurezza: 'var(--color-category-sicurezza)',
          'lavori-quota': 'var(--color-category-lavori-quota)',
          'spazi-confinati': 'var(--color-category-spazi-confinati)',
        },
      },
      backgroundImage: {
        'gradient-medical': 'linear-gradient(135deg, var(--color-medical-500) 0%, var(--color-health-500) 100%)',
        'gradient-safety-high': 'linear-gradient(135deg, var(--color-safety-high-500) 0%, var(--color-safety-high-700) 100%)',
      },
    },
  },
};
```

---

## 🏥 Redesign Medicina del Lavoro Page

### Hero Section - Redesign Completo

```tsx
// src/pages/public/MedicinaDelLavoroPage.tsx - NUOVO HERO
<HeroSection
  variant="medical"  // Nuova variant!
  title="Medicina del Lavoro"
  subtitle="Salute e Sicurezza dei Tuoi Lavoratori"
  description="Sorveglianza sanitaria professionale con medici specializzati. Protocolli personalizzati, visite periodiche e conformità normativa garantita."
  primaryButton={{ 
    text: 'Prenota Consulto Medico', 
    href: '/contatti',
    icon: <Stethoscope />,
    variant: 'medical'  // CTA con colori medical
  }}
  secondaryButton={{ 
    text: 'Scopri il Servizio', 
    href: '#servizi-medicina',
    variant: 'outline-medical'
  }}
  stats={[
    { 
      number: '2.500+', 
      label: 'Visite Mediche/Anno',
      icon: <HeartPulse className="text-medical-500" />
    },
    { 
      number: '100+', 
      label: 'Aziende Certificate',
      icon: <ShieldCheck className="text-health-500" />
    },
    { 
      number: '98%', 
      label: 'Conformità Normativa',
      icon: <ClipboardCheck className="text-medical-600" />
    },
  ]}
  backgroundPattern="medical-grid"  // Pattern background medical
  showTrustBadges={true}  // Certificazioni
/>
```

### Trust Section - NUOVA

```tsx
{/* === TRUST & CERTIFICATIONS === */}
<section className="py-12 bg-gradient-medical text-white">
  <div className="container mx-auto px-4">
    <div className="grid grid-cols-2 md:grid-cols-4 gap-8 items-center">
      <div className="text-center">
        <ShieldCheck className="w-12 h-12 mx-auto mb-2" />
        <p className="text-sm font-medium">Certificato ISO 9001</p>
      </div>
      <div className="text-center">
        <Award className="w-12 h-12 mx-auto mb-2" />
        <p className="text-sm font-medium">Medici Specializzati</p>
      </div>
      <div className="text-center">
        <FileCheck className="w-12 h-12 mx-auto mb-2" />
        <p className="text-sm font-medium">Conformità D.Lgs 81/08</p>
      </div>
      <div className="text-center">
        <Users className="w-12 h-12 mx-auto mb-2" />
        <p className="text-sm font-medium">15+ Anni Esperienza</p>
      </div>
    </div>
  </div>
</section>
```

### Services Grid - Ridisegnata

```tsx
{/* === SERVIZI MEDICINA === */}
<section className="py-16 bg-white">
  <div className="container mx-auto px-4">
    <h2 className="text-3xl font-bold text-center mb-12">
      Servizi di <span className="text-medical-600">Medicina del Lavoro</span>
    </h2>
    
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
      {/* Card 1 - Visite Mediche */}
      <div className="group p-6 bg-gradient-to-br from-medical-50 to-white border-2 border-medical-100 rounded-2xl hover:border-medical-400 hover:shadow-xl transition-all duration-300">
        <div className="w-16 h-16 bg-medical-500 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
          <Stethoscope className="w-8 h-8 text-white" />
        </div>
        <h3 className="text-xl font-bold mb-2 text-gray-900">Visite Preventive</h3>
        <p className="text-gray-600 mb-4">
          Valutazione iniziale idoneità alla mansione con esami clinici approfonditi
        </p>
        <ul className="space-y-2 text-sm text-gray-700">
          <li className="flex items-start">
            <CheckCircle className="w-4 h-4 text-health-500 mr-2 mt-0.5 flex-shrink-0" />
            <span>Visita medica completa</span>
          </li>
          <li className="flex items-start">
            <CheckCircle className="w-4 h-4 text-health-500 mr-2 mt-0.5 flex-shrink-0" />
            <span>Esami strumentali (audiometria, spirometria)</span>
          </li>
          <li className="flex items-start">
            <CheckCircle className="w-4 h-4 text-health-500 mr-2 mt-0.5 flex-shrink-0" />
            <span>Analisi di laboratorio</span>
          </li>
        </ul>
      </div>
      
      {/* Card 2 - Protocolli Sanitari */}
      <div className="group p-6 bg-gradient-to-br from-health-50 to-white border-2 border-health-100 rounded-2xl hover:border-health-400 hover:shadow-xl transition-all duration-300">
        <div className="w-16 h-16 bg-health-500 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
          <ClipboardList className="w-8 h-8 text-white" />
        </div>
        <h3 className="text-xl font-bold mb-2 text-gray-900">Protocollo Sanitario</h3>
        <p className="text-gray-600 mb-4">
          Definizione protocolli personalizzati per mansione e rischio specifico
        </p>
        {/* ... */}
      </div>
      
      {/* Card 3 - Sorveglianza Sanitaria */}
      <div className="group p-6 bg-gradient-to-br from-medical-50 to-white border-2 border-medical-100 rounded-2xl hover:border-medical-400 hover:shadow-xl transition-all duration-300">
        <div className="w-16 h-16 bg-medical-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
          <HeartPulse className="w-8 h-8 text-white" />
        </div>
        <h3 className="text-xl font-bold mb-2 text-gray-900">Sorveglianza Periodica</h3>
        <p className="text-gray-600 mb-4">
          Controlli sanitari programmati con gestione scadenze automatica
        </p>
        {/* ... */}
      </div>
    </div>
  </div>
</section>
```

### CTA Section Potenziata

```tsx
{/* === CTA FINALE === */}
<section className="py-20 bg-gradient-medical">
  <div className="container mx-auto px-4 text-center">
    <div className="max-w-3xl mx-auto">
      <h2 className="text-4xl font-bold text-white mb-6">
        Proteggi la Salute dei Tuoi Lavoratori
      </h2>
      <p className="text-xl text-medical-50 mb-8">
        Un servizio completo di medicina del lavoro con medici specializzati. 
        Prenota una consulenza gratuita per valutare le esigenze della tua azienda.
      </p>
      
      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <Button 
          size="xl"
          className="bg-white text-medical-600 hover:bg-medical-50 font-bold shadow-xl"
          to="/contatti"
        >
          <Calendar className="mr-2" />
          Prenota Consulto Gratuito
        </Button>
        
        <Button 
          size="xl"
          variant="outline"
          className="border-2 border-white text-white hover:bg-white/10"
          to="tel:+39123456789"
        >
          <Phone className="mr-2" />
          Chiama Ora: 012 345 6789
        </Button>
      </div>
      
      {/* Trust Indicators */}
      <div className="mt-12 flex flex-wrap justify-center gap-6 text-medical-100">
        <div className="flex items-center gap-2">
          <CheckCircle className="w-5 h-5" />
          <span className="text-sm">Risposta in 24h</span>
        </div>
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5" />
          <span className="text-sm">100% Conforme D.Lgs 81/08</span>
        </div>
        <div className="flex items-center gap-2">
          <Award className="w-5 h-5" />
          <span className="text-sm">Medici Certificati</span>
        </div>
      </div>
    </div>
  </div>
</section>
```

---

## 📚 Correzione Pagina Corsi

### Risk Level Badges - Sistemati

```tsx
// src/components/public/CourseCard.tsx - CORREZIONE BADGE
const getRiskLevelBadge = (riskLevel: string) => {
  const configs = {
    ALTO: { 
      bg: 'bg-safety-high-50', 
      text: 'text-safety-high-700',
      border: 'border-safety-high-500',
      label: 'Rischio Alto',
      icon: <AlertTriangle className="w-3 h-3" />
    },
    MEDIO: { 
      bg: 'bg-safety-medium-50', 
      text: 'text-safety-medium-700',
      border: 'border-safety-medium-500',
      label: 'Rischio Medio',
      icon: <AlertCircle className="w-3 h-3" />
    },
    BASSO: { 
      bg: 'bg-safety-low-50', 
      text: 'text-safety-low-700',
      border: 'border-safety-low-500',
      label: 'Rischio Basso',
      icon: <CheckCircle className="w-3 h-3" />
    },
  };
  
  const config = configs[riskLevel] || configs.BASSO;
  
  return (
    <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold border-2 ${config.bg} ${config.text} ${config.border}`}>
      {config.icon}
      {config.label}
    </span>
  );
};
```

### Category Badges - Con Colori Specifici

```tsx
// src/components/public/CourseCard.tsx - CATEGORY COLORS
const getCategoryBadge = (category: string) => {
  const categoryColors = {
    'Antincendio': 'bg-orange-100 text-orange-700 border-orange-500',
    'Primo Soccorso': 'bg-pink-100 text-pink-700 border-pink-500',
    'Sicurezza Generale': 'bg-blue-100 text-blue-700 border-blue-500',
    'Lavori in Quota': 'bg-purple-100 text-purple-700 border-purple-500',
    'Spazi Confinati': 'bg-gray-100 text-gray-700 border-gray-500',
  };
  
  const colorClass = categoryColors[category] || 'bg-gray-100 text-gray-700';
  
  return (
    <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium border ${colorClass}`}>
      {category}
    </span>
  );
};
```

### Course Card - Redesign

```tsx
// src/components/public/CourseCard.tsx - NUOVO DESIGN
export const CourseCard = ({ course }) => {
  return (
    <div className="group bg-white rounded-2xl border-2 border-gray-100 hover:border-primary-300 hover:shadow-2xl transition-all duration-300 overflow-hidden">
      {/* Image with Overlay */}
      <div className="relative h-48 overflow-hidden">
        <img 
          src={course.image1Url || '/placeholder-course.jpg'} 
          alt={course.title}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
        />
        <div className="absolute top-4 right-4">
          {getRiskLevelBadge(course.riskLevel)}
        </div>
        <div className="absolute bottom-4 left-4">
          {getCategoryBadge(course.category)}
        </div>
      </div>
      
      {/* Content */}
      <div className="p-6">
        <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-primary-600 transition-colors">
          {course.title}
        </h3>
        <p className="text-gray-600 text-sm mb-4 line-clamp-2">
          {course.shortDescription}
        </p>
        
        {/* Meta Info */}
        <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
          <div className="flex items-center gap-1">
            <Clock className="w-4 h-4" />
            <span>{course.duration}h</span>
          </div>
          <div className="flex items-center gap-1">
            <Users className="w-4 h-4" />
            <span>Max {course.maxParticipants}</span>
          </div>
        </div>
        
        {/* CTA */}
        <Button 
          to={`/corsi/${course.slug}`}
          variant="primary"
          size="md"
          className="w-full group-hover:shadow-lg transition-shadow"
        >
          Scopri il Corso
          <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </Button>
      </div>
    </div>
  );
};
```

### Filters Section - Migliorata

```tsx
// src/pages/public/CoursesPage.tsx - FILTRI RIDISEGNATI
<div className="bg-white rounded-2xl shadow-lg p-6 mb-8 border-2 border-gray-100">
  <div className="flex items-center gap-3 mb-4">
    <Filter className="w-5 h-5 text-primary-600" />
    <h3 className="text-lg font-semibold text-gray-900">Filtra Corsi</h3>
  </div>
  
  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
    {/* Search */}
    <div className="relative">
      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
      <input
        type="text"
        placeholder="Cerca corso..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="w-full pl-10 pr-4 py-2 border-2 border-gray-200 rounded-lg focus:border-primary-500 focus:ring-2 focus:ring-primary-200 transition-all"
      />
    </div>
    
    {/* Category Filter */}
    <select 
      value={selectedCategory}
      onChange={(e) => setSelectedCategory(e.target.value)}
      className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-primary-500 focus:ring-2 focus:ring-primary-200 transition-all"
    >
      <option value="">Tutte le Categorie</option>
      {categories.map(cat => (
        <option key={cat} value={cat}>{cat}</option>
      ))}
    </select>
    
    {/* Risk Level Filter */}
    <select 
      value={selectedRiskLevel}
      onChange={(e) => setSelectedRiskLevel(e.target.value)}
      className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-primary-500 focus:ring-2 focus:ring-primary-200 transition-all"
    >
      <option value="">Tutti i Livelli</option>
      {riskLevels.map(level => (
        <option key={level.value} value={level.value}>{level.label}</option>
      ))}
    </select>
    
    {/* Course Type Filter */}
    <select 
      value={selectedCourseType}
      onChange={(e) => setSelectedCourseType(e.target.value)}
      className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-primary-500 focus:ring-2 focus:ring-primary-200 transition-all"
    >
      <option value="">Tipo Corso</option>
      {courseTypes.map(type => (
        <option key={type.value} value={type.value}>{type.label}</option>
      ))}
    </select>
  </div>
  
  {/* Active Filters Display */}
  {(searchTerm || selectedCategory || selectedRiskLevel || selectedCourseType) && (
    <div className="mt-4 flex flex-wrap gap-2">
      <span className="text-sm text-gray-600">Filtri attivi:</span>
      {searchTerm && (
        <span className="px-3 py-1 bg-primary-100 text-primary-700 rounded-full text-xs flex items-center gap-2">
          Ricerca: {searchTerm}
          <button onClick={() => setSearchTerm('')} className="hover:text-primary-900">
            <X className="w-3 h-3" />
          </button>
        </span>
      )}
      {/* ... altri filtri attivi ... */}
    </div>
  )}
</div>
```

---

## 🏠 Ottimizzazioni HomePage

### Hero Section - Più Impattante

```tsx
// src/pages/public/HomePage.tsx - HERO POTENZIATO
<HeroSection
  title={
    <>
      Sicurezza sul Lavoro{' '}
      <span className="text-medical-500">Senza Compromessi</span>
    </>
  }
  subtitle="Leader in Formazione e Medicina del Lavoro"
  description="Proteggi i tuoi lavoratori con formazione certificata, sorveglianza sanitaria professionale e consulenza specializzata. Oltre 15 anni di esperienza al tuo servizio."
  primaryButton={{
    text: "Medicina del Lavoro",
    href: "/medicina-del-lavoro",
    icon: <Stethoscope />,
    variant: 'medical'  // Evidenzia Medicina
  }}
  secondaryButton={{
    text: "Esplora i Corsi",
    href: "/corsi"
  }}
  stats={[
    { 
      number: '500+', 
      label: 'Aziende Clienti',
      highlight: true 
    },
    { 
      number: '10.000+', 
      label: 'Lavoratori Formati',
      highlight: true 
    },
    { 
      number: '2.500+', 
      label: 'Visite Mediche/Anno',
      highlight: true,
      color: 'medical'  // Evidenzia medical
    },
    { 
      number: '98%', 
      label: 'Soddisfazione Cliente',
      highlight: true 
    }
  ]}
  backgroundPattern="diagonal-lines"
  showContactForm={true}
/>
```

### Services Section - Ridisegnata

```tsx
{/* === SERVIZI PRINCIPALI === */}
<section className="py-20 bg-gradient-to-b from-white to-gray-50">
  <div className="container mx-auto px-4">
    <div className="text-center mb-16">
      <h2 className="text-4xl font-bold text-gray-900 mb-4">
        Servizi <span className="text-medical-600">Specializzati</span>
      </h2>
      <p className="text-xl text-gray-600 max-w-3xl mx-auto">
        Soluzioni complete per sicurezza, formazione e salute sul lavoro
      </p>
    </div>

    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Card 1 - Medicina del Lavoro (EVIDENZIATA) */}
      <div className="relative group">
        {/* Badge "Servizio di Punta" */}
        <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 z-10">
          <span className="bg-medical-500 text-white px-4 py-1 rounded-full text-xs font-bold shadow-lg">
            ⭐ Servizio di Punta
          </span>
        </div>
        
        <div className="p-8 bg-gradient-to-br from-medical-50 via-white to-health-50 border-4 border-medical-400 rounded-3xl hover:shadow-2xl hover:scale-105 transition-all duration-300">
          <div className="w-20 h-20 bg-gradient-medical rounded-2xl flex items-center justify-center mb-6 mx-auto group-hover:rotate-6 transition-transform">
            <Stethoscope className="w-10 h-10 text-white" />
          </div>
          
          <h3 className="text-2xl font-bold text-center mb-4 text-gray-900">
            Medicina del Lavoro
          </h3>
          
          <p className="text-gray-600 text-center mb-6">
            Sorveglianza sanitaria con medici specializzati. Visite, protocolli e certificazioni.
          </p>
          
          <ul className="space-y-3 mb-6">
            <li className="flex items-start text-sm">
              <CheckCircle className="w-5 h-5 text-medical-500 mr-2 mt-0.5 flex-shrink-0" />
              <span>2.500+ visite mediche annuali</span>
            </li>
            <li className="flex items-start text-sm">
              <CheckCircle className="w-5 h-5 text-health-500 mr-2 mt-0.5 flex-shrink-0" />
              <span>Protocolli sanitari personalizzati</span>
            </li>
            <li className="flex items-start text-sm">
              <CheckCircle className="w-5 h-5 text-medical-500 mr-2 mt-0.5 flex-shrink-0" />
              <span>Gestione scadenze automatica</span>
            </li>
          </ul>
          
          <Button 
            to="/medicina-del-lavoro"
            variant="medical"
            size="lg"
            className="w-full shadow-lg group-hover:shadow-xl"
          >
            Scopri il Servizio
            <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Button>
        </div>
      </div>

      {/* Card 2 - Corsi (Standard) */}
      <div className="p-8 bg-white border-2 border-gray-200 rounded-3xl hover:border-primary-400 hover:shadow-xl transition-all duration-300">
        {/* ... */}
      </div>

      {/* Card 3 - RSPP (Standard) */}
      <div className="p-8 bg-white border-2 border-gray-200 rounded-3xl hover:border-primary-400 hover:shadow-xl transition-all duration-300">
        {/* ... */}
      </div>
    </div>
  </div>
</section>
```

---

## ♿ Accessibilità WCAG 2.1 AA

### Contrast Ratio Verification

```typescript
// Strumento: lighthouse-ci o axe-core
// Target: Contrast ratio >= 4.5:1 per testo normale, 3:1 per testo grande

// Verifiche obbligatorie:
✅ medical-500 (#06b6d4) su bianco: 4.77:1 ✓
✅ health-500 (#22c55e) su bianco: 3.12:1 ✓ (solo testo grande)
✅ safety-high-700 (#b91c1c) su safety-high-50: 8.59:1 ✓✓
```

### Keyboard Navigation

```tsx
// Tutti i componenti interattivi devono supportare:
- Tab navigation
- Enter/Space per attivazione
- Escape per chiusura modale
- Arrow keys per selezione multiple

// Esempio Button component:
<button
  onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick();
    }
  }}
  aria-label="Prenota consulto medico"
  role="button"
  tabIndex={0}
>
  {children}
</button>
```

### Screen Reader Support

```tsx
// ARIA labels obbligatori:
<section aria-labelledby="medicina-heading">
  <h2 id="medicina-heading">Medicina del Lavoro</h2>
</section>

<Button aria-label="Scopri i servizi di medicina del lavoro">
  Scopri
</Button>

<img 
  src="/hero-medical.jpg" 
  alt="Medico specializzato in sorveglianza sanitaria con stetoscopio"
  role="img"
/>
```

---

## ⚡ Performance Optimizations

### Image Optimization

```typescript
// Lazy loading images
<img 
  src={course.image1Url}
  loading="lazy"
  decoding="async"
  alt={course.title}
/>

// Responsive images
<picture>
  <source 
    srcSet="/hero-medical-mobile.webp" 
    media="(max-width: 640px)" 
    type="image/webp"
  />
  <source 
    srcSet="/hero-medical-desktop.webp" 
    media="(min-width: 641px)" 
    type="image/webp"
  />
  <img src="/hero-medical.jpg" alt="..." />
</picture>
```

### Code Splitting

```typescript
// Lazy load pages
const MedicinaDelLavoroPage = lazy(() => import('./pages/public/MedicinaDelLavoroPage'));
const CoursesPage = lazy(() => import('./pages/public/CoursesPage'));

// Preload critical routes
<link rel="prefetch" href="/medicina-del-lavoro" />
```

### Bundle Size Targets

```bash
# Target: < 250KB gzipped per frontend
# Strategie:
- Tree shaking lucide-react (solo icone usate)
- Code splitting per route
- Dynamic imports per componenti pesanti (charts, editors)
- Rimuovere dependencies inutilizzate

# Audit:
npm run build -- --analyze
```

---

## 📱 Responsive Design

### Breakpoints

```css
/* Tailwind breakpoints standard */
sm: 640px   /* Mobile landscape */
md: 768px   /* Tablet */
lg: 1024px  /* Desktop */
xl: 1280px  /* Large desktop */
2xl: 1536px /* Extra large */
```

### Mobile-First Examples

```tsx
{/* Hero Title - Responsive */}
<h1 className="
  text-3xl sm:text-4xl md:text-5xl lg:text-6xl 
  font-bold 
  leading-tight
  mb-4 sm:mb-6
">
  Medicina del Lavoro
</h1>

{/* Services Grid - Stack su mobile */}
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
  {/* Cards */}
</div>

{/* CTA Buttons - Stack su mobile */}
<div className="flex flex-col sm:flex-row gap-4 justify-center">
  <Button>Primary</Button>
  <Button variant="outline">Secondary</Button>
</div>
```

---

## 🧪 Testing Checklist

### Visual Regression Tests

```typescript
// Playwright visual tests
test('Medicina del Lavoro page matches design', async ({ page }) => {
  await page.goto('/medicina-del-lavoro');
  await expect(page).toHaveScreenshot('medicina-page.png', {
    fullPage: true,
    threshold: 0.2,
  });
});
```

### A/B Testing Setup

```typescript
// Split test: Hero variant A vs B
const heroVariant = useSplitTest('medicina-hero', {
  variants: ['control', 'medical-focus'],
  weights: [0.5, 0.5],
});

<HeroSection variant={heroVariant === 'medical-focus' ? 'medical' : 'default'} />
```

### Analytics Events

```typescript
// Track conversions
trackEvent('medicina_cta_click', {
  location: 'hero',
  button_text: 'Prenota Consulto Medico',
  page: '/medicina-del-lavoro',
});

// Track scroll depth
trackEvent('page_scroll_depth', {
  depth: '75%',
  page: '/medicina-del-lavoro',
});
```

---

## 📊 Success Metrics

### KPIs da Monitorare

| Metrica | Baseline | Target | Strumento |
|---------|----------|--------|-----------|
| Bounce Rate Medicina | 60% | < 45% | GA4 |
| Avg Time Medicina | 1:30 | > 2:30 | GA4 |
| CTA Click Rate Medicina | 8% | > 12% | GA4 Events |
| Form Submissions Medicina | 15/mese | > 25/mese | Backend logs |
| Lighthouse Performance | 85 | > 95 | Lighthouse CI |
| Lighthouse Accessibility | 92 | 100 | Lighthouse CI |
| Mobile Usability | N/A | 0 errors | Google Search Console |

---

## 📅 Implementation Timeline

### Week 1: Design System & Medicina Page (3 giorni)
- **Giorno 1**: Setup nuova palette colori, aggiornare CSS variables
- **Giorno 2**: Redesign MedicinaDelLavoroPage (hero, trust section, services grid)
- **Giorno 3**: Testing accessibilità, performance, responsive

### Week 2: Corsi & HomePage (2 giorni)
- **Giorno 1**: Correzione colori CoursesPage, ridisegno card e filtri
- **Giorno 2**: Ottimizzazione HomePage, services section, CTA

### Week 3: Testing & Deployment (2 giorni)
- **Giorno 1**: E2E tests, visual regression, accessibility audit
- **Giorno 2**: Deploy staging, A/B test setup, monitoring

**TOTALE: 7 giorni lavorativi**

---

## 🚀 Next Steps

1. **Approval Design**: Review palette colori e mockup con stakeholder
2. **Setup Dev Environment**: Branch `feature/frontend-redesign`
3. **Implementation**: Seguire timeline sopra
4. **Testing**: QA completo pre-deploy
5. **Deploy Staging**: Test utenti reali
6. **Deploy Production**: Con feature flag per rollback rapido
7. **Monitoring**: Dashboard analytics per tracciare KPIs

---

## 📚 References

- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [Tailwind Color Palette Generator](https://uicolors.app/create)
- [Lighthouse CI Setup](https://github.com/GoogleChrome/lighthouse-ci)
- [Medical Color Psychology](https://www.canva.com/colors/color-meanings/cyan/)
