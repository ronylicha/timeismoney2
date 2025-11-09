import React, { useState, useEffect } from 'react';
import { AlertTriangle, CheckCircle, Info, FileText, Shield } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface ComplianceIssue {
  type: 'error' | 'warning' | 'info';
  message: string;
  field?: string;
}

interface FrenchComplianceCheckerProps {
  invoice: any;
  tenant: any;
  onComplianceCheck?: (issues: ComplianceIssue[]) => void;
}

const FrenchComplianceChecker: React.FC<FrenchComplianceCheckerProps> = ({
  invoice,
  tenant,
  onComplianceCheck
}) => {
  const { t } = useTranslation();
  const [issues, setIssues] = useState<ComplianceIssue[]>([]);
  const [isCompliant, setIsCompliant] = useState(true);

  useEffect(() => {
    checkCompliance();
  }, [invoice, tenant]);

  const checkCompliance = () => {
    const newIssues: ComplianceIssue[] = [];

    // Vérifications obligatoires
    if (!invoice.invoice_number) {
      newIssues.push({
        type: 'error',
        message: t('compliance.errors.invoice_number_missing'),
        field: 'invoice_number'
      });
    }

    if (!invoice.date) {
      newIssues.push({
        type: 'error',
        message: t('compliance.errors.date_missing'),
        field: 'date'
      });
    }

    if (!invoice.due_date) {
      newIssues.push({
        type: 'error',
        message: t('compliance.errors.due_date_missing'),
        field: 'due_date'
      });
    }

    if (!invoice.client) {
      newIssues.push({
        type: 'error',
        message: t('compliance.errors.client_missing'),
        field: 'client'
      });
    }

    // Vérifications tenant
    if (!tenant.legal_mention_siret && !tenant.is_auto_entrepreneur) {
      newIssues.push({
        type: 'warning',
        message: t('compliance.warnings.siret_missing'),
        field: 'legal_mention_siret'
      });
    }

    if (!tenant.legal_mention_ape && !tenant.is_auto_entrepreneur) {
      newIssues.push({
        type: 'warning',
        message: t('compliance.warnings.ape_missing'),
        field: 'legal_mention_ape'
      });
    }

    // Vérifications TVA
    if (invoice.tax_rate > 0 && !tenant.legal_mention_tva_intracom && !tenant.is_auto_entrepreneur) {
      newIssues.push({
        type: 'warning',
        message: t('compliance.warnings.tva_intracom_missing'),
        field: 'legal_mention_tva_intracom'
      });
    }

    // Vérifications facturation électronique
    if (invoice.client?.is_public_entity && invoice.client?.country === 'FR') {
      if (!tenant.legal_mention_siret) {
        newIssues.push({
          type: 'error',
          message: t('compliance.errors.chorus_pro_siret_required'),
          field: 'legal_mention_siret'
        });
      }

      if (!invoice.electronic_invoice_format) {
        newIssues.push({
          type: 'info',
          message: t('compliance.info.electronic_invoice_recommended'),
          field: 'electronic_invoice_format'
        });
      }
    }

    // Vérifications mentions légales
    if (!tenant.legal_mention_address) {
      newIssues.push({
        type: 'warning',
        message: t('compliance.warnings.address_missing'),
        field: 'legal_mention_address'
      });
    }

    if (!tenant.is_auto_entrepreneur && !tenant.legal_mention_capital) {
      newIssues.push({
        type: 'warning',
        message: t('compliance.warnings.capital_missing'),
        field: 'legal_mention_capital'
      });
    }

    setIssues(newIssues);
    setIsCompliant(newIssues.filter(issue => issue.type === 'error').length === 0);
    
    if (onComplianceCheck) {
      onComplianceCheck(newIssues);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'error':
        return <AlertTriangle className="w-5 h-5 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case 'info':
        return <Info className="w-5 h-5 text-blue-500" />;
      default:
        return <Info className="w-5 h-5 text-gray-500" />;
    }
  };

  const getAlertClass = (type: string) => {
    switch (type) {
      case 'error':
        return 'border-red-200 bg-red-50 text-red-800';
      case 'warning':
        return 'border-yellow-200 bg-yellow-50 text-yellow-800';
      case 'info':
        return 'border-blue-200 bg-blue-50 text-blue-800';
      default:
        return 'border-gray-200 bg-gray-50 text-gray-800';
    }
  };

  const errorCount = issues.filter(issue => issue.type === 'error').length;
  const warningCount = issues.filter(issue => issue.type === 'warning').length;
  const infoCount = issues.filter(issue => issue.type === 'info').length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Shield className="w-6 h-6 text-indigo-600" />
          <h3 className="text-lg font-semibold text-gray-900">
            {t('compliance.title')}
          </h3>
        </div>
        
        <div className="flex items-center space-x-2">
          {isCompliant ? (
            <div className="flex items-center space-x-1 text-green-600">
              <CheckCircle className="w-5 h-5" />
              <span className="text-sm font-medium">
                {t('compliance.compliant')}
              </span>
            </div>
          ) : (
            <div className="flex items-center space-x-1 text-red-600">
              <AlertTriangle className="w-5 h-5" />
              <span className="text-sm font-medium">
                {t('compliance.not_compliant')}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="text-center p-3 bg-red-50 rounded-lg">
          <div className="text-2xl font-bold text-red-600">{errorCount}</div>
          <div className="text-sm text-red-600">{t('compliance.errors.label')}</div>
        </div>
        <div className="text-center p-3 bg-yellow-50 rounded-lg">
          <div className="text-2xl font-bold text-yellow-600">{warningCount}</div>
          <div className="text-sm text-yellow-600">{t('compliance.warnings.label')}</div>
        </div>
        <div className="text-center p-3 bg-blue-50 rounded-lg">
          <div className="text-2xl font-bold text-blue-600">{infoCount}</div>
          <div className="text-sm text-blue-600">{t('compliance.info.label')}</div>
        </div>
      </div>

      {/* Issues List */}
      {issues.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-900">
            {t('compliance.issues_found')}
          </h4>
          <div className="space-y-2">
            {issues.map((issue, index) => (
              <div
                key={index}
                className={`flex items-start space-x-3 p-3 rounded-lg border ${getAlertClass(
                  issue.type
                )}`}
              >
                {getIcon(issue.type)}
                <div className="flex-1">
                  <p className="text-sm font-medium">{issue.message}</p>
                  {issue.field && (
                    <p className="text-xs mt-1 opacity-75">
                      {t('compliance.field')}: {issue.field}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Legal Mentions Preview */}
      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <div className="flex items-center space-x-2 mb-3">
          <FileText className="w-5 h-5 text-gray-600" />
          <h4 className="text-sm font-medium text-gray-900">
            {t('compliance.legal_mentions_preview')}
          </h4>
        </div>
        <div className="text-xs text-gray-600 space-y-1">
          <p><strong>{t('compliance.invoice_number')}:</strong> {invoice.invoice_number || 'N/A'}</p>
          <p><strong>{t('compliance.date')}:</strong> {invoice.date ? new Date(invoice.date).toLocaleDateString('fr-FR') : 'N/A'}</p>
          <p><strong>{t('compliance.due_date')}:</strong> {invoice.due_date ? new Date(invoice.due_date).toLocaleDateString('fr-FR') : 'N/A'}</p>
          {tenant.legal_mention_siret && (
            <p><strong>SIRET:</strong> {tenant.legal_mention_siret}</p>
          )}
          {tenant.legal_mention_ape && (
            <p><strong>Code APE:</strong> {tenant.legal_mention_ape}</p>
          )}
          {tenant.is_auto_entrepreneur && (
            <p><strong>Auto-entrepreneur:</strong> TVA non applicable, art. 293 B du CGI</p>
          )}
          {invoice.tax_rate > 0 && !tenant.is_auto_entrepreneur && (
            <p><strong>TVA:</strong> {invoice.tax_rate}%</p>
          )}
          <p className="mt-2 text-xs italic">
            En cas de retard de paiement, une indemnité forfaitaire de 40 € sera due. Indemnité de retard : 3 fois le taux d'intérêt légal.
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex space-x-3">
        <button
          onClick={checkCompliance}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
        >
          {t('compliance.refresh_check')}
        </button>
        
        {invoice.client?.is_public_entity && invoice.client?.country === 'FR' && isCompliant && (
          <button
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            {t('compliance.send_to_chorus_pro')}
          </button>
        )}
      </div>
    </div>
  );
};

export default FrenchComplianceChecker;
