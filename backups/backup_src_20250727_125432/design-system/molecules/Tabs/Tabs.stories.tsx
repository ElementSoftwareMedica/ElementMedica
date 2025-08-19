import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './Tabs';
import { fn } from '@storybook/test';

const meta: Meta<typeof Tabs> = {
  title: 'Design System/Molecules/Tabs',
  component: Tabs,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: `
Componente Tabs per organizzare contenuto in pannelli navigabili.

## Caratteristiche
- Pattern compound component per massima flessibilità
- Supporto per orientamento orizzontale e verticale
- Accessibilità completa (ARIA, keyboard navigation)
- Stili personalizzabili
- Gestione stato integrata

## Compound Components
- \`Tabs\` - Container principale
- \`TabsList\` - Container per i trigger
- \`TabsTrigger\` - Singolo tab clickabile
- \`TabsContent\` - Contenuto del pannello

## Utilizzo
Utilizza questo componente per organizzare contenuto correlato in sezioni navigabili.
        `,
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    value: {
      control: 'text',
      description: 'Valore del tab attivo',
    },
    orientation: {
      control: 'radio',
      options: ['horizontal', 'vertical'],
      description: 'Orientamento dei tabs',
    },
  },
  args: {
    onValueChange: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

// Template per le storie con stato
const TabsTemplate = (args: any) => {
  const [activeTab, setActiveTab] = useState(args.value || 'tab1');
  
  return (
    <Tabs {...args} value={activeTab} onValueChange={setActiveTab}>
      <TabsList>
        <TabsTrigger value="tab1">Account</TabsTrigger>
        <TabsTrigger value="tab2">Password</TabsTrigger>
        <TabsTrigger value="tab3">Settings</TabsTrigger>
      </TabsList>
      <TabsContent value="tab1" className="mt-4 p-4 border rounded-md">
        <h3 className="text-lg font-semibold mb-2">Account Settings</h3>
        <p className="text-gray-600">
          Manage your account settings and set e-mail preferences.
        </p>
        <div className="mt-4 space-y-2">
          <div>
            <label className="block text-sm font-medium">Name</label>
            <input 
              type="text" 
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md" 
              placeholder="Your name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Email</label>
            <input 
              type="email" 
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md" 
              placeholder="your.email@example.com"
            />
          </div>
        </div>
      </TabsContent>
      <TabsContent value="tab2" className="mt-4 p-4 border rounded-md">
        <h3 className="text-lg font-semibold mb-2">Password</h3>
        <p className="text-gray-600">
          Change your password here. After saving, you'll be logged out.
        </p>
        <div className="mt-4 space-y-2">
          <div>
            <label className="block text-sm font-medium">Current Password</label>
            <input 
              type="password" 
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
          <div>
            <label className="block text-sm font-medium">New Password</label>
            <input 
              type="password" 
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
        </div>
      </TabsContent>
      <TabsContent value="tab3" className="mt-4 p-4 border rounded-md">
        <h3 className="text-lg font-semibold mb-2">Settings</h3>
        <p className="text-gray-600">
          Configure your application preferences and notifications.
        </p>
        <div className="mt-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Email Notifications</span>
            <input type="checkbox" className="rounded" />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Push Notifications</span>
            <input type="checkbox" className="rounded" />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">SMS Notifications</span>
            <input type="checkbox" className="rounded" />
          </div>
        </div>
      </TabsContent>
    </Tabs>
  );
};

// Storia base
export const Default: Story = {
  render: TabsTemplate,
  args: {
    value: 'tab1',
  },
};

// Con tab disabilitato
const TabsWithDisabledTemplate = (args: any) => {
  const [activeTab, setActiveTab] = useState(args.value || 'tab1');
  
  return (
    <Tabs {...args} value={activeTab} onValueChange={setActiveTab}>
      <TabsList>
        <TabsTrigger value="tab1">Available</TabsTrigger>
        <TabsTrigger value="tab2" disabled>Disabled</TabsTrigger>
        <TabsTrigger value="tab3">Another Tab</TabsTrigger>
      </TabsList>
      <TabsContent value="tab1" className="mt-4 p-4 border rounded-md">
        <p>This tab is available and active.</p>
      </TabsContent>
      <TabsContent value="tab2" className="mt-4 p-4 border rounded-md">
        <p>This content won't be shown because the tab is disabled.</p>
      </TabsContent>
      <TabsContent value="tab3" className="mt-4 p-4 border rounded-md">
        <p>This is another available tab.</p>
      </TabsContent>
    </Tabs>
  );
};

export const WithDisabledTab: Story = {
  render: TabsWithDisabledTemplate,
  args: {
    value: 'tab1',
  },
};

// Orientamento verticale
const VerticalTabsTemplate = (args: any) => {
  const [activeTab, setActiveTab] = useState(args.value || 'overview');
  
  return (
    <div className="w-full max-w-4xl">
      <Tabs {...args} value={activeTab} onValueChange={setActiveTab} orientation="vertical">
        <TabsList className="flex-col h-auto w-48">
          <TabsTrigger value="overview" className="w-full justify-start">Overview</TabsTrigger>
          <TabsTrigger value="analytics" className="w-full justify-start">Analytics</TabsTrigger>
          <TabsTrigger value="reports" className="w-full justify-start">Reports</TabsTrigger>
          <TabsTrigger value="notifications" className="w-full justify-start">Notifications</TabsTrigger>
        </TabsList>
        <div className="flex-1">
          <TabsContent value="overview" className="p-6 border rounded-md">
            <h3 className="text-xl font-semibold mb-4">Overview</h3>
            <p className="text-gray-600 mb-4">
              Get a high-level view of your application's performance and key metrics.
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-blue-50 rounded-lg">
                <h4 className="font-medium text-blue-900">Total Users</h4>
                <p className="text-2xl font-bold text-blue-600">1,234</p>
              </div>
              <div className="p-4 bg-green-50 rounded-lg">
                <h4 className="font-medium text-green-900">Revenue</h4>
                <p className="text-2xl font-bold text-green-600">€12,345</p>
              </div>
            </div>
          </TabsContent>
          <TabsContent value="analytics" className="p-6 border rounded-md">
            <h3 className="text-xl font-semibold mb-4">Analytics</h3>
            <p className="text-gray-600">
              Detailed analytics and insights about user behavior and application usage.
            </p>
          </TabsContent>
          <TabsContent value="reports" className="p-6 border rounded-md">
            <h3 className="text-xl font-semibold mb-4">Reports</h3>
            <p className="text-gray-600">
              Generate and download comprehensive reports for your data.
            </p>
          </TabsContent>
          <TabsContent value="notifications" className="p-6 border rounded-md">
            <h3 className="text-xl font-semibold mb-4">Notifications</h3>
            <p className="text-gray-600">
              Manage your notification preferences and settings.
            </p>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
};

export const Vertical: Story = {
  render: VerticalTabsTemplate,
  args: {
    value: 'overview',
    orientation: 'vertical',
  },
};

// Molti tabs
const ManyTabsTemplate = (args: any) => {
  const [activeTab, setActiveTab] = useState(args.value || 'tab1');
  
  return (
    <Tabs {...args} value={activeTab} onValueChange={setActiveTab}>
      <TabsList>
        <TabsTrigger value="tab1">Tab 1</TabsTrigger>
        <TabsTrigger value="tab2">Tab 2</TabsTrigger>
        <TabsTrigger value="tab3">Tab 3</TabsTrigger>
        <TabsTrigger value="tab4">Tab 4</TabsTrigger>
        <TabsTrigger value="tab5">Tab 5</TabsTrigger>
        <TabsTrigger value="tab6">Tab 6</TabsTrigger>
      </TabsList>
      {[1, 2, 3, 4, 5, 6].map((num) => (
        <TabsContent key={num} value={`tab${num}`} className="mt-4 p-4 border rounded-md">
          <h3 className="text-lg font-semibold mb-2">Content {num}</h3>
          <p className="text-gray-600">
            This is the content for tab {num}. Each tab can contain different content.
          </p>
        </TabsContent>
      ))}
    </Tabs>
  );
};

export const ManyTabs: Story = {
  render: ManyTabsTemplate,
  args: {
    value: 'tab1',
  },
};

// Stili personalizzati
const CustomStyledTemplate = (args: any) => {
  const [activeTab, setActiveTab] = useState(args.value || 'design');
  
  return (
    <Tabs {...args} value={activeTab} onValueChange={setActiveTab}>
      <TabsList className="bg-purple-100">
        <TabsTrigger 
          value="design" 
          className="data-[state=active]:bg-purple-600 data-[state=active]:text-white"
        >
          Design
        </TabsTrigger>
        <TabsTrigger 
          value="development" 
          className="data-[state=active]:bg-purple-600 data-[state=active]:text-white"
        >
          Development
        </TabsTrigger>
        <TabsTrigger 
          value="testing" 
          className="data-[state=active]:bg-purple-600 data-[state=active]:text-white"
        >
          Testing
        </TabsTrigger>
      </TabsList>
      <TabsContent value="design" className="mt-4 p-4 border-2 border-purple-200 rounded-md">
        <h3 className="text-lg font-semibold mb-2 text-purple-800">Design Phase</h3>
        <p className="text-gray-600">
          Create wireframes, mockups, and design systems for the project.
        </p>
      </TabsContent>
      <TabsContent value="development" className="mt-4 p-4 border-2 border-purple-200 rounded-md">
        <h3 className="text-lg font-semibold mb-2 text-purple-800">Development Phase</h3>
        <p className="text-gray-600">
          Implement the design using modern web technologies and best practices.
        </p>
      </TabsContent>
      <TabsContent value="testing" className="mt-4 p-4 border-2 border-purple-200 rounded-md">
        <h3 className="text-lg font-semibold mb-2 text-purple-800">Testing Phase</h3>
        <p className="text-gray-600">
          Perform comprehensive testing to ensure quality and reliability.
        </p>
      </TabsContent>
    </Tabs>
  );
};

export const CustomStyled: Story = {
  render: CustomStyledTemplate,
  args: {
    value: 'design',
  },
};