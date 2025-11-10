import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, Button, Input, Badge, Alert, AlertDescription, Tabs, TabsContent, TabsList, TabsTrigger } from '../ui';
import { Shield, CheckCircle, XCircle, AlertTriangle, Clock, FileText, User, Calendar } from 'lucide-react';
import { toast } from 'sonner';

interface VerificationResult {
    valid: boolean;
    signatures: Array<{
        signature_id: string;
        signer: string;
        signature_time: string;
        certificate_valid: boolean;
        trust_chain_valid: boolean;
    }>;
    timestamps: Array<{
        timestamp_time: string;
        tsa_trusted: boolean;
        valid: boolean;
    }>;
    integrity: {
        valid: boolean;
        hash: string;
        algorithm: string;
    };
    validation_time: number;
    errors: string[];
    warnings: string[];
}

interface SignatureDetails {
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
    certificate_info?: any;
    timestamp_info?: any;
}

export default function SignatureVerification() {
    const [signatureId, setSignatureId] = useState('');
    const [loading, setLoading] = useState(false);
    const [signature, setSignature] = useState<SignatureDetails | null>(null);
    const [verification, setVerification] = useState<VerificationResult | null>(null);

    // Vérifier une signature
    const verifySignature = async () => {
        if (!signatureId.trim()) {
            toast.error('Veuillez entrer un ID de signature');
            return;
        }

        try {
            setLoading(true);
            setSignature(null);
            setVerification(null);

            const response = await fetch('/api/signatures/verify', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ signature_id: signatureId.trim() }),
            });

            const data = await response.json();

            if (data.success) {
                setSignature(data.data.signature);
                setVerification(data.data.verification);
                toast.success('Signature vérifiée avec succès');
            } else {
                toast.error(data.message || 'Signature non trouvée');
            }
        } catch (error) {
            toast.error('Erreur réseau lors de la vérification');
        } finally {
            setLoading(false);
        }
    };

    // Valider un document signé
    const validateDocument = async () => {
        if (!signatureId.trim()) {
            toast.error('Veuillez entrer un ID de signature');
            return;
        }

        try {
            setLoading(true);

            const response = await fetch('/api/signatures/validate', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ signature_id: signatureId.trim() }),
            });

            const data = await response.json();

            if (data.success) {
                setSignature(data.data.signature);
                setVerification(data.data.validation);
                toast.success('Document validé avec succès');
            } else {
                toast.error(data.message || 'Erreur lors de la validation');
            }
        } catch (error) {
            toast.error('Erreur réseau lors de la validation');
        } finally {
            setLoading(false);
        }
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



    return (
        <div className="space-y-6">
            {/* En-tête avec recherche */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Shield className="h-5 w-5" />
                        Vérification de Signature Électronique
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex gap-4">
                        <div className="flex-1">
                            <Input
                                placeholder="Entrez l'ID de la signature (ex: SIG-123456789)"
                                value={signatureId}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSignatureId(e.target.value)}
                                className="font-mono"
                                onKeyPress={(e: React.KeyboardEvent<HTMLInputElement>) => {
                                    if (e.key === 'Enter') {
                                        verifySignature();
                                    }
                                }}
                            />
                        </div>
                        <Button
                            onClick={verifySignature}
                            disabled={loading || !signatureId.trim()}
                        >
                            <Shield className="h-4 w-4 mr-2" />
                            {loading ? 'Vérification...' : 'Vérifier'}
                        </Button>
                        <Button
                            variant="outline"
                            onClick={validateDocument}
                            disabled={loading || !signatureId.trim()}
                        >
                            <FileText className="h-4 w-4 mr-2" />
                            Valider
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Résultats de la vérification */}
            {signature && verification && (
                <Tabs value="overview" className="space-y-4">
                    <TabsList className="grid w-full grid-cols-4">
                        <TabsTrigger value="overview">Aperçu</TabsTrigger>
                        <TabsTrigger value="signatures">Signatures</TabsTrigger>
                        <TabsTrigger value="timestamps">Horodatages</TabsTrigger>
                        <TabsTrigger value="integrity">Intégrité</TabsTrigger>
                    </TabsList>

                    {/* Aperçu général */}
                    <TabsContent value="overview" className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-lg">Informations de Signature</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="flex items-center gap-2">
                                        <User className="h-4 w-4 text-muted-foreground" />
                                        <div>
                                            <div className="font-medium">{signature.signer_name}</div>
                                            {signature.signer_email && (
                                                <div className="text-sm text-muted-foreground">
                                                    {signature.signer_email}
                                                </div>
                                            )}
                                            {signature.signer_role && (
                                                <div className="text-sm text-muted-foreground">
                                                    {signature.signer_role}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <Calendar className="h-4 w-4 text-muted-foreground" />
                                        <div>
                                            <div className="font-medium">
                                                {new Date(signature.signature_time).toLocaleDateString('fr-FR')}
                                            </div>
                                            <div className="text-sm text-muted-foreground">
                                                {new Date(signature.signature_time).toLocaleTimeString('fr-FR')}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <Shield className="h-4 w-4 text-muted-foreground" />
                                        <div>
                                            <div className="font-medium">Niveau de Signature</div>
                                            {getLevelBadge(signature.signature_level)}
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <FileText className="h-4 w-4 text-muted-foreground" />
                                        <div>
                                            <div className="font-medium">Document</div>
                                            <div className="text-sm text-muted-foreground">
                                                {signature.signable_type.replace('App\\Models\\', '')} #{signature.signable_id}
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-lg">Résultat de Vérification</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="flex items-center gap-2">
                                        {verification.valid ? (
                                            <CheckCircle className="h-5 w-5 text-green-600" />
                                        ) : (
                                            <XCircle className="h-5 w-5 text-red-600" />
                                        )}
                                        <div>
                                            <div className="font-medium">
                                                {verification.valid ? '✅ Valide' : '❌ Invalide'}
                                            </div>
                                            <div className="text-sm text-muted-foreground">
                                                Temps de vérification: {verification.validation_time}ms
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <Clock className="h-4 w-4 text-muted-foreground" />
                                        <div>
                                            <div className="font-medium">Horodatage</div>
                                            <div className="text-sm">
                                                {signature.has_timestamp ? (
                                                    <Badge variant="secondary">
                                                        <Clock className="h-3 w-3 mr-1" />
                                                        Présent
                                                    </Badge>
                                                ) : (
                                                    <Badge variant="outline">Absent</Badge>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                                        <div>
                                            <div className="font-medium">Temps de Traitement</div>
                                            <div className="text-sm text-muted-foreground">
                                                {signature.processing_time}ms
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Erreurs et avertissements */}
                        {(verification.errors.length > 0 || verification.warnings.length > 0) && (
                            <div className="space-y-4">
                                {verification.errors.length > 0 && (
                                    <Alert variant="destructive">
                                        <XCircle className="h-4 w-4" />
                                        <AlertDescription>
                                            <div className="font-medium mb-2">Erreurs de validation:</div>
                                            <ul className="list-disc list-inside space-y-1">
                                                {verification.errors.map((error, index) => (
                                                    <li key={index} className="text-sm">{error}</li>
                                                ))}
                                            </ul>
                                        </AlertDescription>
                                    </Alert>
                                )}

                                {verification.warnings.length > 0 && (
                                    <Alert>
                                        <AlertTriangle className="h-4 w-4" />
                                        <AlertDescription>
                                            <div className="font-medium mb-2">Avertissements:</div>
                                            <ul className="list-disc list-inside space-y-1">
                                                {verification.warnings.map((warning, index) => (
                                                    <li key={index} className="text-sm">{warning}</li>
                                                ))}
                                            </ul>
                                        </AlertDescription>
                                    </Alert>
                                )}
                            </div>
                        )}
                    </TabsContent>

                    {/* Détails des signatures */}
                    <TabsContent value="signatures">
                        <Card>
                            <CardHeader>
                                <CardTitle>Détails des Signatures</CardTitle>
                            </CardHeader>
                            <CardContent>
                                {verification.signatures.length === 0 ? (
                                    <p className="text-muted-foreground text-center py-8">
                                        Aucune signature trouvée
                                    </p>
                                ) : (
                                    <div className="space-y-4">
                                        {verification.signatures.map((sig, index) => (
                                            <div key={index} className="border rounded-lg p-4">
                                                <div className="flex items-center justify-between mb-2">
                                                    <div className="font-medium font-mono text-sm">
                                                        {sig.signature_id}
                                                    </div>
                                                    {sig.certificate_valid && sig.trust_chain_valid ? (
                                                        <Badge variant="default">
                                                            <CheckCircle className="h-3 w-3 mr-1" />
                                                            Valide
                                                        </Badge>
                                                    ) : (
                                                        <Badge variant="destructive">
                                                            <XCircle className="h-3 w-3 mr-1" />
                                                            Invalide
                                                        </Badge>
                                                    )}
                                                </div>

                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                                    <div>
                                                        <div className="font-medium">Signataire</div>
                                                        <div className="text-muted-foreground">{sig.signer}</div>
                                                    </div>
                                                    <div>
                                                        <div className="font-medium">Date de signature</div>
                                                        <div className="text-muted-foreground">
                                                            {new Date(sig.signature_time).toLocaleString('fr-FR')}
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <div className="font-medium">Certificat valide</div>
                                                        <div className={sig.certificate_valid ? 'text-green-600' : 'text-red-600'}>
                                                            {sig.certificate_valid ? '✅ Oui' : '❌ Non'}
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <div className="font-medium">Chaîne de confiance</div>
                                                        <div className={sig.trust_chain_valid ? 'text-green-600' : 'text-red-600'}>
                                                            {sig.trust_chain_valid ? '✅ Valide' : '❌ Invalide'}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Horodatages */}
                    <TabsContent value="timestamps">
                        <Card>
                            <CardHeader>
                                <CardTitle>Horodatages Qualifiés</CardTitle>
                            </CardHeader>
                            <CardContent>
                                {verification.timestamps.length === 0 ? (
                                    <p className="text-muted-foreground text-center py-8">
                                        Aucun horodatage trouvé
                                    </p>
                                ) : (
                                    <div className="space-y-4">
                                        {verification.timestamps.map((ts, index) => (
                                            <div key={index} className="border rounded-lg p-4">
                                                <div className="flex items-center justify-between mb-2">
                                                    <div className="font-medium">
                                                        Horodatage #{index + 1}
                                                    </div>
                                                    {ts.valid && ts.tsa_trusted ? (
                                                        <Badge variant="default">
                                                            <CheckCircle className="h-3 w-3 mr-1" />
                                                            Valide
                                                        </Badge>
                                                    ) : (
                                                        <Badge variant="destructive">
                                                            <XCircle className="h-3 w-3 mr-1" />
                                                            Invalide
                                                        </Badge>
                                                    )}
                                                </div>

                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                                    <div>
                                                        <div className="font-medium">Date d'horodatage</div>
                                                        <div className="text-muted-foreground">
                                                            {new Date(ts.timestamp_time).toLocaleString('fr-FR')}
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <div className="font-medium">Autorité TSA</div>
                                                        <div className={ts.tsa_trusted ? 'text-green-600' : 'text-red-600'}>
                                                            {ts.tsa_trusted ? '✅ Fiable' : '❌ Non fiable'}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Intégrité du document */}
                    <TabsContent value="integrity">
                        <Card>
                            <CardHeader>
                                <CardTitle>Vérification d'Intégrité</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2">
                                        {verification.integrity.valid ? (
                                            <CheckCircle className="h-5 w-5 text-green-600" />
                                        ) : (
                                            <XCircle className="h-5 w-5 text-red-600" />
                                        )}
                                        <div>
                                            <div className="font-medium">
                                                {verification.integrity.valid ? '✅ Intégrité confirmée' : '❌ Intégrité compromise'}
                                            </div>
                                            <div className="text-sm text-muted-foreground">
                                                Algorithme: {verification.integrity.algorithm}
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        <div className="font-medium mb-2">Hash du document:</div>
                                        <div className="font-mono text-sm bg-muted p-3 rounded break-all">
                                            {verification.integrity.hash}
                                        </div>
                                    </div>

                                    <Alert>
                                        <AlertTriangle className="h-4 w-4" />
                                        <AlertDescription>
                                            L'intégrité du document garantit que le fichier n'a pas été modifié
                                            depuis la signature. Le hash SHA-256 est unique et toute modification
                                            du document modifierait cette valeur.
                                        </AlertDescription>
                                    </Alert>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            )}
        </div>
    );
}