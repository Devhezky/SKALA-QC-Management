'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, Building2, Phone, MapPin, Globe } from 'lucide-react';
import { toast } from 'sonner';

interface Client {
    id: string;
    perfexId: number;
    company: string;
    vat: string;
    phonenumber: string;
    country: string;
    city: string;
    address: string;
    state: string;
    website: string;
    active: boolean;
    _count: {
        contacts: number;
        projects: number;
    };
}

export default function ClientsPage() {
    const [clients, setClients] = useState<Client[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSyncing, setIsSyncing] = useState(false);

    const fetchClients = async () => {
        try {
            const response = await fetch('/api/clients');
            if (response.ok) {
                const data = await response.json();
                setClients(data);
            }
        } catch (error) {
            console.error('Error fetching clients:', error);
            toast.error('Failed to load clients');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSync = async () => {
        setIsSyncing(true);
        try {
            const response = await fetch('/api/perfex/sync-clients', { method: 'POST' });
            const data = await response.json();

            if (data.success) {
                toast.success(data.message);
                fetchClients();
            } else {
                toast.error('Sync failed: ' + data.error);
            }
        } catch (error) {
            toast.error('Sync failed');
        } finally {
            setIsSyncing(false);
        }
    };

    useEffect(() => {
        fetchClients();
    }, []);

    return (
        <div className="p-8 space-y-8 bg-gray-50 min-h-screen">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Clients</h1>
                    <p className="text-sm text-gray-500 mt-1">Manage your clients from Skala</p>
                </div>
                <Button
                    onClick={handleSync}
                    disabled={isSyncing}
                    className="gap-2 w-full sm:w-auto"
                >
                    <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                    {isSyncing ? 'Syncing...' : 'Sync Clients'}
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Building2 className="w-5 h-5 text-blue-600" />
                        Client List
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Company</TableHead>
                                    <TableHead>Contact Info</TableHead>
                                    <TableHead>Location</TableHead>
                                    <TableHead>Stats</TableHead>
                                    <TableHead>Status</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center py-8">Loading clients...</TableCell>
                                    </TableRow>
                                ) : clients.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                                            No clients found. Click Sync to fetch from Skala.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    clients.map((client) => (
                                        <TableRow key={client.id}>
                                            <TableCell>
                                                <div className="font-medium text-gray-900">{client.company}</div>
                                                {client.website && (
                                                    <a href={client.website} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline flex items-center gap-1 mt-1">
                                                        <Globe className="w-3 h-3" />
                                                        {client.website.replace(/^https?:\/\//, '')}
                                                    </a>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <div className="space-y-1 text-sm">
                                                    {client.phonenumber && (
                                                        <div className="flex items-center gap-2 text-gray-600">
                                                            <Phone className="w-3 h-3" />
                                                            {client.phonenumber}
                                                        </div>
                                                    )}
                                                    {client.vat && (
                                                        <div className="text-xs text-gray-500">VAT: {client.vat}</div>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-start gap-2 text-sm text-gray-600">
                                                    <MapPin className="w-3 h-3 mt-1 shrink-0" />
                                                    <span>
                                                        {[client.address, client.city, client.state, client.country].filter(Boolean).join(', ')}
                                                    </span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex gap-2">
                                                    <Badge variant="secondary">{client._count.projects} Projects</Badge>
                                                    <Badge variant="outline">{client._count.contacts} Contacts</Badge>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge className={client.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}>
                                                    {client.active ? 'Active' : 'Inactive'}
                                                </Badge>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
