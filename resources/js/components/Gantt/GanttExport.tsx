import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowDownTrayIcon, DocumentArrowDownIcon, XMarkIcon } from '@heroicons/react/24/outline';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { toast } from 'react-toastify';

interface GanttExportProps {
    ganttContainerRef: React.RefObject<HTMLDivElement>;
    projectName: string;
}

const GanttExport: React.FC<GanttExportProps> = ({ ganttContainerRef, projectName }) => {
    const { t } = useTranslation();
    const [showModal, setShowModal] = useState(false);
    const [exporting, setExporting] = useState(false);
    const [exportFormat, setExportFormat] = useState<'png' | 'pdf'>('png');

    const generateFileName = (format: string) => {
        const date = new Date().toISOString().split('T')[0];
        const sanitizedName = projectName.replace(/[^a-z0-9]/gi, '-').toLowerCase();
        return `gantt-${sanitizedName}-${date}.${format}`;
    };

    const captureGantt = async (): Promise<HTMLCanvasElement | null> => {
        if (!ganttContainerRef.current) {
            toast.error(t('projects.gantt.exportError'));
            return null;
        }

        try {
            // Capture the Gantt chart as canvas
            const canvas = await html2canvas(ganttContainerRef.current, {
                backgroundColor: '#ffffff',
                scale: 2, // Higher resolution
                logging: false,
                useCORS: true,
                allowTaint: true,
                scrollX: 0,
                scrollY: -window.scrollY,
            });

            return canvas;
        } catch (error) {
            console.error('Error capturing Gantt chart:', error);
            toast.error(t('projects.gantt.exportError'));
            return null;
        }
    };

    const exportAsPNG = async () => {
        setExporting(true);
        try {
            const canvas = await captureGantt();
            if (!canvas) {
                setExporting(false);
                return;
            }

            // Convert canvas to blob
            canvas.toBlob((blob) => {
                if (!blob) {
                    toast.error(t('projects.gantt.exportError'));
                    setExporting(false);
                    return;
                }

                // Create download link
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.download = generateFileName('png');
                link.href = url;
                link.click();

                // Cleanup
                URL.revokeObjectURL(url);

                toast.success(t('projects.gantt.exportSuccess'));
                setExporting(false);
                setShowModal(false);
            }, 'image/png');
        } catch (error) {
            console.error('Error exporting PNG:', error);
            toast.error(t('projects.gantt.exportError'));
            setExporting(false);
        }
    };

    const exportAsPDF = async () => {
        setExporting(true);
        try {
            const canvas = await captureGantt();
            if (!canvas) {
                setExporting(false);
                return;
            }

            // Calculate PDF dimensions
            const imgWidth = canvas.width;
            const imgHeight = canvas.height;

            // A4 size in points (landscape)
            const pdfWidth = 842; // A4 landscape width
            const pdfHeight = 595; // A4 landscape height

            // Calculate scaling to fit on page
            const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
            const scaledWidth = imgWidth * ratio;
            const scaledHeight = imgHeight * ratio;

            // Create PDF
            const pdf = new jsPDF({
                orientation: scaledWidth > scaledHeight ? 'landscape' : 'portrait',
                unit: 'pt',
                format: 'a4',
            });

            // Add title
            pdf.setFontSize(16);
            pdf.text(`Gantt Chart - ${projectName}`, 40, 40);

            // Add date
            pdf.setFontSize(10);
            pdf.setTextColor(128);
            const date = new Date().toLocaleDateString();
            pdf.text(`${t('common.date')}: ${date}`, 40, 60);

            // Add chart image
            const imgData = canvas.toDataURL('image/png');
            const yOffset = 80;

            // Center the image
            const xOffset = (pdf.internal.pageSize.getWidth() - scaledWidth) / 2;

            pdf.addImage(
                imgData,
                'PNG',
                Math.max(xOffset, 20),
                yOffset,
                scaledWidth * 0.9, // Slightly smaller to add margin
                scaledHeight * 0.9
            );

            // Save PDF
            pdf.save(generateFileName('pdf'));

            toast.success(t('projects.gantt.exportSuccess'));
            setExporting(false);
            setShowModal(false);
        } catch (error) {
            console.error('Error exporting PDF:', error);
            toast.error(t('projects.gantt.exportError'));
            setExporting(false);
        }
    };

    const handleExport = () => {
        if (exportFormat === 'png') {
            exportAsPNG();
        } else {
            exportAsPDF();
        }
    };

    return (
        <>
            {/* Export Button */}
            <button
                onClick={() => setShowModal(true)}
                className="flex items-center space-x-2 px-3 py-2 text-sm bg-green-600 text-white rounded-md hover:bg-green-700 transition"
            >
                <ArrowDownTrayIcon className="h-4 w-4" />
                <span>{t('projects.gantt.export')}</span>
            </button>

            {/* Export Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md">
                        {/* Modal Header */}
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                                {t('projects.gantt.exportOptions')}
                            </h3>
                            <button
                                onClick={() => setShowModal(false)}
                                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                            >
                                <XMarkIcon className="h-5 w-5" />
                            </button>
                        </div>

                        {/* Format Selection */}
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    {t('common.format')}
                                </label>
                                <div className="flex space-x-4">
                                    <button
                                        onClick={() => setExportFormat('png')}
                                        className={`flex-1 px-4 py-3 rounded-lg border-2 transition ${
                                            exportFormat === 'png'
                                                ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                                                : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-gray-400'
                                        }`}
                                    >
                                        <DocumentArrowDownIcon className="h-6 w-6 mx-auto mb-1" />
                                        <div className="text-sm font-medium">PNG</div>
                                        <div className="text-xs text-gray-500 dark:text-gray-400">Image</div>
                                    </button>
                                    <button
                                        onClick={() => setExportFormat('pdf')}
                                        className={`flex-1 px-4 py-3 rounded-lg border-2 transition ${
                                            exportFormat === 'pdf'
                                                ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                                                : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-gray-400'
                                        }`}
                                    >
                                        <DocumentArrowDownIcon className="h-6 w-6 mx-auto mb-1" />
                                        <div className="text-sm font-medium">PDF</div>
                                        <div className="text-xs text-gray-500 dark:text-gray-400">Document</div>
                                    </button>
                                </div>
                            </div>

                            {/* Info Text */}
                            <div className="text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg">
                                <p>
                                    {exportFormat === 'png'
                                        ? t('projects.gantt.exportPNG') || 'Exports the Gantt chart as a high-resolution PNG image.'
                                        : t('projects.gantt.exportPDF') || 'Exports the Gantt chart as a PDF document with project details.'}
                                </p>
                            </div>
                        </div>

                        {/* Modal Actions */}
                        <div className="flex items-center justify-end space-x-3 mt-6">
                            <button
                                onClick={() => setShowModal(false)}
                                disabled={exporting}
                                className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition disabled:opacity-50"
                            >
                                {t('common.cancel')}
                            </button>
                            <button
                                onClick={handleExport}
                                disabled={exporting}
                                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                            >
                                {exporting ? (
                                    <>
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                        <span>{t('projects.gantt.exporting')}</span>
                                    </>
                                ) : (
                                    <>
                                        <ArrowDownTrayIcon className="h-4 w-4" />
                                        <span>{t('common.export')}</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default GanttExport;
