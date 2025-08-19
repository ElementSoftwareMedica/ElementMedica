import type { Meta, StoryObj } from '@storybook/react';
import { BrowserRouter } from 'react-router-dom';
import { CourseCard } from './CourseCard';

// Mock functions per le label
const mockGetRiskLevelLabel = (riskLevel: string) => {
  switch (riskLevel) {
    case 'ALTO':
    case 'A':
      return 'Rischio Alto';
    case 'MEDIO':
    case 'B':
      return 'Rischio Medio';
    case 'BASSO':
    case 'C':
      return 'Rischio Basso';
    default:
      return riskLevel;
  }
};

const mockGetCourseTypeLabel = (courseType: string) => {
  switch (courseType) {
    case 'PRIMO_CORSO':
      return 'Primo Corso';
    case 'AGGIORNAMENTO':
      return 'Aggiornamento';
    default:
      return courseType;
  }
};

// Mock course data
const mockCourse = {
  id: '1',
  title: 'Corso di Formazione per Lavoratori - Sicurezza Generale',
  shortDescription: 'Corso di formazione generale per lavoratori secondo il D.Lgs. 81/08. Fornisce le conoscenze di base sui rischi e le misure di prevenzione negli ambienti di lavoro.',
  category: 'Sicurezza sul Lavoro',
  subcategory: 'Formazione Generale',
  riskLevel: 'MEDIO' as const,
  courseType: 'PRIMO_CORSO' as const,
  duration: 8,
  maxParticipants: 25,
  image1Url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=300&fit=crop',
  slug: 'corso-formazione-lavoratori-sicurezza-generale'
};

const meta = {
  title: 'Public/Molecules/CourseCard',
  component: CourseCard,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'Card per visualizzare un corso nella pagina pubblica con design moderno e informazioni essenziali.',
      },
    },
  },
  decorators: [
    (Story) => (
      <BrowserRouter>
        <div className="max-w-sm">
          <Story />
        </div>
      </BrowserRouter>
    ),
  ],
  tags: ['autodocs'],
  argTypes: {
    course: {
      description: 'Oggetto corso con tutte le informazioni necessarie',
    },
    getRiskLevelLabel: {
      description: 'Funzione per ottenere la label del livello di rischio',
    },
    getCourseTypeLabel: {
      description: 'Funzione per ottenere la label del tipo di corso',
    },
  },
  args: {
    getRiskLevelLabel: mockGetRiskLevelLabel,
    getCourseTypeLabel: mockGetCourseTypeLabel,
  },
} satisfies Meta<typeof CourseCard>;

export default meta;
type Story = StoryObj<typeof meta>;

// Story principale
export const Default: Story = {
  args: {
    course: mockCourse,
  },
};

// Varianti per livello di rischio
export const RischioAlto: Story = {
  args: {
    course: {
      ...mockCourse,
      title: 'Corso Sicurezza Cantieri - Rischio Alto',
      riskLevel: 'ALTO',
      category: 'Edilizia',
      subcategory: 'Cantieri',
    },
  },
};

export const RischioBasso: Story = {
  args: {
    course: {
      ...mockCourse,
      title: 'Corso Sicurezza Uffici - Rischio Basso',
      riskLevel: 'BASSO',
      category: 'Uffici',
      subcategory: 'Amministrativo',
    },
  },
};

// Varianti per tipo di corso
export const Aggiornamento: Story = {
  args: {
    course: {
      ...mockCourse,
      title: 'Aggiornamento Sicurezza Lavoratori',
      courseType: 'AGGIORNAMENTO',
      duration: 6,
    },
  },
};

// Varianti per sistema di classificazione A/B/C
export const RischioA: Story = {
  args: {
    course: {
      ...mockCourse,
      title: 'Corso Sicurezza - Classificazione A',
      riskLevel: 'A',
      category: 'Industria',
    },
  },
};

export const RischioB: Story = {
  args: {
    course: {
      ...mockCourse,
      title: 'Corso Sicurezza - Classificazione B',
      riskLevel: 'B',
      category: 'Commercio',
    },
  },
};

export const RischioC: Story = {
  args: {
    course: {
      ...mockCourse,
      title: 'Corso Sicurezza - Classificazione C',
      riskLevel: 'C',
      category: 'Servizi',
    },
  },
};

// Senza immagine
export const SenzaImmagine: Story = {
  args: {
    course: {
      ...mockCourse,
      image1Url: undefined,
      title: 'Corso senza Immagine di Copertina',
    },
  },
};

// Senza sottocategoria
export const SenzaSottocategoria: Story = {
  args: {
    course: {
      ...mockCourse,
      subcategory: undefined,
      title: 'Corso senza Sottocategoria',
    },
  },
};

// Titolo lungo
export const TitoloLungo: Story = {
  args: {
    course: {
      ...mockCourse,
      title: 'Corso di Formazione Completo per Lavoratori sulla Sicurezza nei Luoghi di Lavoro con Approfondimenti Specifici',
      shortDescription: 'Descrizione molto lunga che dovrebbe essere troncata dopo tre righe per mantenere un layout consistente e leggibile in tutte le card dei corsi. Questo testo serve per testare il comportamento del componente con contenuti più lunghi del normale.',
    },
  },
};

// Corso con durata lunga
export const DurataLunga: Story = {
  args: {
    course: {
      ...mockCourse,
      title: 'Corso Intensivo di Specializzazione',
      duration: 40,
      maxParticipants: 12,
    },
  },
};

// Grid di card (esempio di utilizzo)
export const GridExample: Story = {
  args: {
    course: mockCourse,
  },
  render: (args) => (
    <BrowserRouter>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6 bg-gray-50">
        <CourseCard {...args} />
        <CourseCard 
          {...args} 
          course={{
            ...args.course,
            id: '2',
            title: 'Corso RSPP - Responsabile Servizio Prevenzione',
            riskLevel: 'ALTO',
            courseType: 'PRIMO_CORSO',
            category: 'RSPP',
            duration: 48,
          }}
        />
        <CourseCard 
          {...args} 
          course={{
            ...args.course,
            id: '3',
            title: 'Aggiornamento Primo Soccorso',
            riskLevel: 'BASSO',
            courseType: 'AGGIORNAMENTO',
            category: 'Primo Soccorso',
            duration: 4,
            image1Url: undefined,
          }}
        />
      </div>
    </BrowserRouter>
  ),
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        story: 'Esempio di utilizzo delle card in una griglia responsive.',
      },
    },
  },
};