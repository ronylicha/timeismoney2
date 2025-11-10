import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent, Button, Badge, Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui';
import { Download, RefreshCw, Shield, Clock, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

interface Signature {
    id: number;
    signature_id: string;
    signer_name: string;
    signer_email: string;
    signer_role: string;
    signature_level: string;
    signature_time: string;
    status: string;
    processing_time: number;
    has_timestamp: boolean;
    signable_type: string;
    signable_id: number;
}

interface SignatureStats {
    total: number;
    valid: number;
    failed: number;
    qualified: number;
    with_timestamp: number;
    success_rate: number;
    qualification_rate: number;
    timestamp_rate: number;
}

interface SignatureFilters {
    status: string;
    level: string;
    signer: string;
    date_from: string;
    date_to: string;
    document_type: string;
    sort_by: string;
    sort_order: string;
    per_page: number;
}

export default function SignatureDashboard() {
    const [signatures, setSignatures] = useState<Signature[]>([]);
    const [stats, setStats] = useState<SignatureStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState<SignatureFilters>({
        status: '',
        level: '',
        signer: '',
        date_from: '',
        date_to: '',
        document_type: '',
        sort_by: 'signature_time',
        sort_order: 'desc',
        per_page: 15,
    });
    const [pagination, setPagination] = useState({
        current_page: 1,
        last_page: 1,
        per_page: 15,
        total: 0,
        from: 0,
        to: 0,
    });

    // Charger les signatures
    const loadSignatures = async (page = 1) => {
        try {
            setLoading(true);
            const params = new URLSearchParams();
            Object.entries({ ...filters, page: page.toString() }).forEach(([key, value]) => {
                if (value) params.append(key, value.toString());
            });

            const response = await fetch(`/api/signatures?${params}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json',
                },
            });

            const data = await response.json();

            if (data.success) {
                setSignatures(data.data);
                setPagination(data.pagination);
            } else {
                toast.error('Erreur lors du chargement des signatures');
            }
        } catch (error) {
            toast.error('Erreur réseau');
        } finally {
            setLoading(false);
        }
    };

    // Charger les statistiques
    const loadStats = async () => {
        try {
            const response = await fetch('/api/signatures/statistics', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json',
                },
            });

            const data = await response.json();

            if (data.success) {
                setStats(data.data.summary);
            }
        } catch (error) {
            console.error('Erreur lors du chargement des statistiques:', error);
        }
    };

    // Vérifier une signature
    const verifySignature = async (signatureId: string) => {
        try {
            const response = await fetch('/api/signatures/verify', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ signature_id: signatureId }),
            });

            const data = await response.json();

            if (data.success) {
                toast.success('Signature vérifiée avec succès');
                // Afficher les détails de vérification
                console.log('Résultat vérification:', data.data.verification);
            } else {
                toast.error(data.message || 'Erreur lors de la vérification');
            }
        } catch (error) {
            toast.error('Erreur réseau');
        }
    };

    // Télécharger un document signé
    const downloadSignedDocument = async (signatureId: string) => {
        try {
            const response = await fetch(`/api/signatures/${signatureId}/download`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                },
            });

            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `signed_document_${signatureId}.pdf`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
                toast.success('Téléchargement démarré');
            } else {
                toast.error('Erreur lors du téléchargement');
            }
        } catch (error) {
            toast.error('Erreur réseau');
        }
    };

    // Exporter les signatures
    const exportSignatures = async (format: string) => {
        try {
            const params = new URLSearchParams();
            params.append('format', format);
            Object.entries(filters).forEach(([key, value]) => {
                if (value) params.append(key, value.toString());
            });

            const response = await fetch(`/api/signatures/export?${params}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json',
                },
            });

            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `signatures_${new Date().toISOString().split('T')[0]}.${format}`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
                toast.success('Export démarré');
            } else {
                toast.error('Erreur lors de l\'export');
            }
        } catch (error) {
            toast.error('Erreur réseau');
        }
    };

    // Formater le statut
    const getStatusBadge = (status: string) => {
        const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
            valid: 'default',
            pending: 'secondary',
            failed: 'destructive',
            expired: 'outline',
            revoked: 'destructive',
        };

        const labels = {
            valid: '✅ Valide',
            pending: '⏳ En attente',
            failed: '❌ Échouée',
            expired: '⚠️ Expirée',
            revoked: '🚫 Révoquée',
        };

        return (
            <Badge variant={variants[status] || 'secondary'}>
                {labels[status as keyof typeof labels] || status}
            </Badge>
        );
    };

    // Formater le niveau de signature
    const getLevelBadge = (level: string) => {
        const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
            QES: 'default',
            AES: 'secondary',
            SES: 'outline',
        };

        const labels = {
            QES: 'QES - Qualifiée',
            AES: 'AES - Avancée',
            SES: 'SES - Simple',
        };

        return (
            <Badge variant={variants[level] || 'secondary'}>
                {labels[level as keyof typeof labels] || level}
            </Badge>
        );
    };

    useEffect(() => {
        loadSignatures();
        loadStats();
    }, []);

    useEffect(() => {
        loadSignatures(1);
    }, [filters]);

    return (
        <div className="space-y-6">
            {/* En-tête avec statistiques */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Signatures</CardTitle>
                        <Shield className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats?.total || 0}</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Taux de Succès</CardTitle>
                        <CheckCircle className="h-4 w-4 text-green-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">
                            {stats?.success_rate || 0}%
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Signatures Qualifiées</CardTitle>
                        <Shield className="h-4 w-4 text-blue-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-blue-600">
                            {stats?.qualified || 0}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            {stats?.qualification_rate || 0}% du total
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Avec Horodatage</CardTitle>
                        <Clock className="h-4 w-4 text-purple-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-purple-600">
                            {stats?.with_timestamp || 0}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            {stats?.timestamp_rate || 0}% du total
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Filtres et actions */}
            <Card>
                <CardHeader>
                    <CardTitle>Filtres et Actions</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                        <Input
                            placeholder="Rechercher par signataire..."
                            value={filters.signer}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFilters({ ...filters, signer: e.target.value })}
                            className="w-full"
                        />

                        <Select
                            value={filters.status}
                            onValueChange={(value: string) => setFilters({ ...filters, status: value })}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Statut" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="">Tous les statuts</SelectItem>
                                <SelectItem value="valid">Valides</SelectItem>
                                <SelectItem value="pending">En attente</SelectItem>
                                <SelectItem value="failed">Échouées</SelectItem>
                                <SelectItem value="expired">Expirées</SelectItem>
                            </SelectContent>
                        </Select>

                        <Select
                            value={filters.level}
                            onValueChange={(value: string) => setFilters({ ...filters, level: value })}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Niveau" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="">Tous les niveaux</SelectItem>
                                <SelectItem value="QES">QES - Qualifiée</SelectItem>
                                <SelectItem value="AES">AES - Avancée</SelectItem>
                                <SelectItem value="SES">SES - Simple</SelectItem>
                            </SelectContent>
                        </Select>

                        <Select
                            value={filters.document_type}
                            onValueChange={(value: string) => setFilters({ ...filters, document_type: value })}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Type de document" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="">Tous les types</SelectItem>
                                <SelectItem value="invoice">Factures</SelectItem>
                                <SelectItem value="credit_note">Avoirs</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        <Button
                            variant="outline"
                            onClick={() => loadSignatures(1)}
                            disabled={loading}
                        >
                            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                            Actualiser
                        </Button>

                        <Button
                            variant="outline"
                            onClick={() => exportSignatures('csv')}
                        >
                            <Download className="h-4 w-4 mr-2" />
                            Exporter CSV
                        </Button>

                        <Button
                            variant="outline"
                            onClick={() => exportSignatures('xlsx')}
                        >
                            <Download className="h-4 w-4 mr-2" />
                            Exporter XLSX
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Tableau des signatures */}
            <Card>
                <CardHeader>
                    <CardTitle>Signatures Électroniques</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>ID Signature</TableHead>
                                <TableHead>Signataire</TableHead>
                                <TableHead>Niveau</TableHead>
                                <TableHead>Document</TableHead>
                                <TableHead>Date</TableHead>
                                <TableHead>Statut</TableHead>
                                <TableHead>Horodatage</TableHead>
                                <TableHead>Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={8} className="text-center py-8">
                                        <RefreshCw className="h-6 w-6 animate-spin mx-auto" />
                                        <p className="mt-2">Chargement...</p>
                                    </TableCell>
                                </TableRow>
                            ) : signatures.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={8} className="text-center py-8">
                                        <p className="text-muted-foreground">
                                            Aucune signature trouvée
                                        </p>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                signatures.map((signature) => (
                                    <TableRow key={signature.id}>
                                        <TableCell className="font-mono text-sm">
                                            {signature.signature_id}
                                        </TableCell>
                                        <TableCell>
                                            <div>
                                                <div className="font-medium">{signature.signer_name}</div>
                                                {signature.signer_email && (
                                                    <div className="text-sm text-muted-foreground">
                                                        {signature.signer_email}
                                                    </div>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            {getLevelBadge(signature.signature_level)}
                                        </TableCell>
                                        <TableCell>
                                            <div className="text-sm">
                                                {signature.signable_type.replace('App\\Models\\', '')} #{signature.signable_id}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="text-sm">
                                                {new Date(signature.signature_time).toLocaleDateString('fr-FR')}
                                                <br />
                                                {new Date(signature.signature_time).toLocaleTimeString('fr-FR')}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            {getStatusBadge(signature.status)}
                                        </TableCell>
                                        <TableCell>
                                            {signature.has_timestamp ? (
                                                <Badge variant="secondary">
                                                    <Clock className="h-3 w-3 mr-1" />
                                                    Oui
                                                </Badge>
                                            ) : (
                                                <Badge variant="outline">Non</Badge>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex gap-2">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => verifySignature(signature.signature_id)}
                                                    disabled={signature.status !== 'valid'}
                                                >
                                                    <Shield className="h-3 w-3 mr-1" />
                                                    Vérifier
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => downloadSignedDocument(signature.signature_id)}
                                                    disabled={signature.status !== 'valid'}
                                                >
                                                    <Download className="h-3 w-3 mr-1" />
                                                    Télécharger
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>

                    {/* Pagination */}
                    {pagination.last_page > 1 && (
                        <div className="flex items-center justify-between mt-4">
                            <div className="text-sm text-muted-foreground">
                                Affichage de {pagination.from || 0} à {pagination.to || 0} sur {pagination.total} signatures
                            </div>
                            <div className="flex gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => loadSignatures(pagination.current_page - 1)}
                                    disabled={pagination.current_page <= 1}
                                >
                                    Précédent
                                </Button>
                                <span className="flex items-center px-3 py-1 text-sm">
                                    Page {pagination.current_page} / {pagination.last_page}
                                </span>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => loadSignatures(pagination.current_page + 1)}
                                    disabled={pagination.current_page >= pagination.last_page}
                                >
                                    Suivant
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}