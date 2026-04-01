import React from 'react';
import PreventiviPage from './finance/PreventiviPage';

/**
 * QuotesAndInvoices - Preventivi
 *
 * Le fatture sono gestite in /management/billing.
 * Questo componente mostra direttamente PreventiviPage.
 */
const QuotesAndInvoices: React.FC = () => {
  return <PreventiviPage />;
};

export default QuotesAndInvoices;