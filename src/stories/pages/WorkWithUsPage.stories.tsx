import type { Meta, StoryObj } from '@storybook/react';
import { BrowserRouter } from 'react-router-dom';
import WorkWithUsPage from '../../pages/public/WorkWithUsPage';

const meta: Meta<typeof WorkWithUsPage> = {
  title: 'Pages/Public/WorkWithUsPage',
  component: WorkWithUsPage,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: 'Pagina "Lavora con Noi" che mostra le opportunità di carriera, i benefici di lavorare con Element Formazione e include un form per le candidature.'
      }
    }
  },
  decorators: [
    (Story) => (
      <BrowserRouter>
        <Story />
      </BrowserRouter>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  name: 'Pagina Lavora con Noi',
  parameters: {
    docs: {
      description: {
        story: 'La pagina completa "Lavora con Noi" con hero section, benefici, posizioni aperte, processo di selezione e form candidatura.'
      }
    }
  }
};

export const MobileView: Story = {
  name: 'Vista Mobile',
  parameters: {
    viewport: {
      defaultViewport: 'mobile1'
    },
    docs: {
      description: {
        story: 'Come appare la pagina su dispositivi mobile.'
      }
    }
  }
};

export const TabletView: Story = {
  name: 'Vista Tablet',
  parameters: {
    viewport: {
      defaultViewport: 'tablet'
    },
    docs: {
      description: {
        story: 'Come appare la pagina su dispositivi tablet.'
      }
    }
  }
};