'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, Users, Phone, Mail, Building2, Star } from 'lucide-react';
import { toast } from 'sonner';

interface Contact {
    id: string;
    perfexId: number;
    email: string;
    firstname: string;
    lastname: string;
    phonenumber: string;
    title: string;
    active: boolean;
    isPrimary: boolean;
    lastLogin: string;
    client: {
        company: string;
    };
}

export default function ContactsPage() {
    const [contacts, setContacts] = useState<Contact[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSyncing, setIsSyncing] = useState(false);

    const fetchContacts = async () => {
        try {
            const response = await fetch('/api/contacts');
            if (response.ok) {
                const data = await response.json();
                setContacts(data);
            }
        } catch (error) {
            console.error('Error fetching contacts:', error);
            toast.error('Failed to load contacts');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSync = async () => {
        setIsSyncing(true);
        try {
            const response = await fetch('/api/perfex/sync-contacts', { method: 'POST' });
            const data = await response.json();

            if (data.success) {
                toast.success(data.message);
                fetchContacts();
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
        fetchContacts();
    }, []);

    return (
        <div className="p-8 space-y-8 bg-gray-50 min-h-screen">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Contacts</h1>
                    <p className="text-sm text-gray-500 mt-1">Manage client contacts and login credentials</p>
                </div>
                <Button
                    onClick={handleSync}
                    disabled={isSyncing}
                    className="gap-2"
                >
                    <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                    {isSyncing ? 'Syncing...' : 'Sync Contacts'}
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Users className="w-5 h-5 text-blue-600" />
                        Contact List
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Client</TableHead>
                                <TableHead>Contact Info</TableHead>
                                <TableHead>Role</TableHead>
                                <TableHead>Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-8">Loading contacts...</TableCell>
                                </TableRow>
                            ) : contacts.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                                        No contacts found. Click Sync to fetch from Skala.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                contacts.map((contact) => (
                                    <TableRow key={contact.id}>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <div className="font-medium text-gray-900">
                                                    {contact.firstname} {contact.lastname}
                                                </div>
                                                {contact.isPrimary && (
                                                    <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                                                )}
                                            </div>
                                            {contact.title && (
                                                <div className="text-xs text-gray-500 mt-1">{contact.title}</div>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2 text-sm text-gray-600">
                                                <Building2 className="w-3 h-3" />
                                                {contact.client.company}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="space-y-1 text-sm">
                                                <div className="flex items-center gap-2 text-gray-600">
                                                    <Mail className="w-3 h-3" />
                                                    {contact.email}
                                                </div>
                                                {contact.phonenumber && (
                                                    <div className="flex items-center gap-2 text-gray-600">
                                                        <Phone className="w-3 h-3" />
                                                        {contact.phonenumber}
                                                    </div>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline">{contact.isPrimary ? 'Primary Contact' : 'Contact'}</Badge>
                                        </TableCell>
                                        <TableCell>
                                            <Badge className={contact.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}>
                                                {contact.active ? 'Active' : 'Inactive'}
                                            </Badge>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
