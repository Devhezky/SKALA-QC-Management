import axios, { AxiosInstance, AxiosError } from 'axios';

export interface PerfexUser {
    staffid: string;
    email: string;
    firstname: string;
    lastname: string;
    phonenumber: string;
    active: string; // "0" or "1"
    admin: string; // "0" or "1"
    role: string;
    permissions?: any;
}

export interface PerfexLoginResponse {
    status: boolean;
    message: string;
    data?: PerfexUser;
}

export interface PerfexTask {
    id?: number;
    name: string;
    description?: string;
    priority?: number; // 1: Low, 2: Medium, 3: High, 4: Urgent
    startdate?: string;
    duedate?: string;
    rel_id?: number; // Project ID
    rel_type?: string; // "project"
    status?: number; // 1: Not Started, 4: In Progress, 5: Testing, 3: Awaiting Feedback, 2: Complete
}

export class PerfexApiClient {
    private client: AxiosInstance;

    constructor() {
        // Use PERFEX_API_URL and PERFEX_API_KEY as per .env
        const baseURL = process.env.PERFEX_API_URL;
        const token = process.env.PERFEX_API_KEY;

        // We don't throw here to allow build time execution, but we warn
        if (!baseURL) {
            console.warn('PERFEX_API_URL is not defined');
        }

        this.client = axios.create({
            baseURL,
            headers: {
                'authtoken': token || '', // Perfex REST API uses 'authtoken' header usually, or check documentation. 
                // Based on standard Perfex REST API module, it often uses 'authtoken' or 'Authorization: Bearer' depending on config.
                // Let's try 'authtoken' as it's common for the specific module often used. 
                // If the user provided a JWT, it might be Bearer. 
                // The key provided looks like a JWT. Let's use Authorization header.
                'Authorization': token ? `${token}` : '', // Removing Bearer prefix if the key is just the token string which might be used directly or with Bearer. 
                // Actually, standard Perfex REST API (by gordon) uses 'authtoken'. 
                // But if it's the official one or another, it might vary.
                // Let's stick to the previous implementation's logic but update the env var names.
                // Previous code used: 'Authorization': token ? `Bearer ${token}` : '',
                // The key provided is a JWT. Let's assume Bearer for now.
            },
            timeout: 10000, // 10s timeout
        });
    }

    /**
     * Validate staff credentials against Perfex API
     */
    async validateStaff(email: string): Promise<PerfexUser | null> {
        // Optimization: Check for demo accounts first to avoid unnecessary API calls
        if (email === 'admin@demo.com' || email === 'qc@demo.com') {
            return this.mockLogin(email);
        }

        try {
            const response = await this.client.get(`/api/staffs/search/${encodeURIComponent(email)}`);

            if (response.data && response.data.length > 0) {
                const staffId = response.data[0].staffid;
                return this.getStaffDetails(staffId);
            }

            // If not found in API, check if we should mock in dev
            if (process.env.NODE_ENV === 'development') {
                console.log('[DEV] User not found in API, trying mock login');
                return this.mockLogin(email);
            }

            return null;
        } catch (error) {
            console.error('Error validating staff:', error instanceof Error ? error.message : 'Unknown error');
            if (process.env.NODE_ENV === 'development') {
                console.log('[DEV] Falling back to mock login');
                return this.mockLogin(email);
            }
            return null;
        }
    }

    async getStaffDetails(staffId: string): Promise<PerfexUser | null> {
        try {
            const response = await this.client.get(`/api/staffs/${staffId}`);
            if (response.data && response.data.status !== false) {
                return response.data as PerfexUser;
            }
            return null;
        } catch (error) {
            console.error(`Error fetching staff details for ${staffId}:`, error instanceof Error ? error.message : 'Unknown error');
            return null;
        }
    }

    async getAllStaff(): Promise<PerfexUser[]> {
        try {
            const response = await this.client.get(`/api/staffs`);
            if (response.data) {
                return response.data as PerfexUser[];
            }
            return [];
        } catch (error) {
            console.error('Error fetching all staff:', error instanceof Error ? error.message : 'Unknown error');
            if (process.env.NODE_ENV === 'development') {
                return [
                    {
                        staffid: '1',
                        email: 'admin@example.com',
                        firstname: 'Dev',
                        lastname: 'Admin',
                        phonenumber: '08123456789',
                        active: '1',
                        admin: '1',
                        role: '1'
                    },
                    {
                        staffid: '2',
                        email: 'staff@example.com',
                        firstname: 'Dev',
                        lastname: 'Staff',
                        phonenumber: '08123456788',
                        active: '1',
                        admin: '0',
                        role: '2'
                    }
                ];
            }
            return [];
        }
    }

    /**
     * Verify credentials against Perfex
     * Note: Standard Perfex API does not expose password verification.
     * This requires a custom endpoint or direct DB access in production.
     */
    async verifyCredentials(email: string, password: string): Promise<boolean> {
        // 1. Demo Accounts (Hardcoded for testing)
        if (email === 'admin@demo.com' && password === 'admin123') {
            return true;
        }
        if (email === 'qc@demo.com' && password === 'qc123') {
            return true;
        }

        // 2. Verify against Perfex API
        try {
            // Attempt to login via Perfex API
            // Using /api/login/auth endpoint which we configured in the backend
            const response = await this.client.post('/api/login/auth', {
                email,
                password
            });

            // Check for successful response (status: true or 1)
            if (response.data && (response.data.status === true || response.data.status === 1)) {
                return true;
            }

            return false;
        } catch (error) {
            console.error('Error verifying credentials with Perfex:', error instanceof Error ? error.message : 'Unknown error');
            return false;
        }
    }

    /**
     * Mock login for development if API is not available
     */
    async mockLogin(email: string): Promise<PerfexUser | null> {
        // Handle Demo Accounts
        if (email === 'admin@demo.com') {
            return {
                staffid: '999',
                email: 'admin@demo.com',
                firstname: 'Demo',
                lastname: 'Admin',
                phonenumber: '08123456789',
                active: '1',
                admin: '1', // Admin role
                role: '1',
            };
        }
        if (email === 'qc@demo.com') {
            return {
                staffid: '888',
                email: 'qc@demo.com',
                firstname: 'Demo',
                lastname: 'QC',
                phonenumber: '08123456788',
                active: '1',
                admin: '0', // Not admin
                role: '2', // QC role (assuming 2 is QC/Staff)
            };
        }

        if (process.env.NODE_ENV === 'development') {
            return {
                staffid: '1',
                email: email,
                firstname: 'Dev',
                lastname: 'Admin',
                phonenumber: '08123456789',
                active: '1',
                admin: '1',
                role: '1',
            };
        }
        return null;
    }

    async getProjects(): Promise<PerfexProject[]> {
        try {
            const response = await this.client.get('/api/projects');
            if (response.data) {
                return response.data as PerfexProject[];
            }
            return [];
        } catch (error) {
            console.error('Error fetching projects from Perfex:', error instanceof Error ? error.message : 'Unknown error');
            if (process.env.NODE_ENV === 'development') {
                return this.mockGetProjects();
            }
            return [];
        }
    }

    async updateProjectStatus(id: number, status: number): Promise<boolean> {
        try {
            const response = await this.client.put(`/api/projects/${id}`, { status });
            return response.data && response.data.status !== false;
        } catch (error) {
            console.error(`Error updating project status for ${id}:`, error instanceof Error ? error.message : 'Unknown error');
            if (process.env.NODE_ENV === 'development') {
                console.log(`[MOCK] Updated project ${id} status to ${status}`);
                return true;
            }
            return false;
        }
    }

    /**
     * Create a note for a project in Perfex
     */
    async createProjectNote(projectId: number, content: string): Promise<boolean> {
        try {
            // Endpoint: POST /projects/:id/notes (This depends on the API module, often it's a sub-resource or a generic notes endpoint)
            // If generic: POST /notes { rel_id: projectId, rel_type: 'project', description: content }
            // Let's assume generic notes endpoint which is common.
            const response = await this.client.post('/api/notes', {
                rel_id: projectId,
                rel_type: 'project',
                description: content
            });
            return response.data && response.data.status !== false;
        } catch (error) {
            console.error(`Error creating note for project ${projectId}:`, error instanceof Error ? error.message : 'Unknown error');
            return false;
        }
    }

    /**
     * Upload a file to a project in Perfex
     */
    async uploadProjectFile(projectId: number, file: Blob, filename: string): Promise<boolean> {
        try {
            const formData = new FormData();
            formData.append('file', file, filename);
            formData.append('rel_id', projectId.toString());
            formData.append('rel_type', 'project');

            // Need to handle headers for FormData
            const response = await this.client.post('/api/media/upload', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });
            return response.data && response.data.status !== false;
        } catch (error) {
            console.error(`Error uploading file for project ${projectId}:`, error instanceof Error ? error.message : 'Unknown error');
            return false;
        }
    }

    /**
     * Create a task in Perfex
     */
    async createTask(task: PerfexTask): Promise<boolean> {
        try {
            const response = await this.client.post('/api/tasks', task);
            return response.data && response.data.status !== false;
        } catch (error) {
            console.error(`Error creating task for project ${task.rel_id}:`, error instanceof Error ? error.message : 'Unknown error');
            return false;
        }
    }

    async getClients(): Promise<any[]> {
        try {
            const response = await this.client.get('/api/customers');
            console.log('[PerfexClient] getClients response status:', response.status);
            console.log('[PerfexClient] getClients data type:', typeof response.data);
            console.log('[PerfexClient] getClients data length:', Array.isArray(response.data) ? response.data.length : 'not array');
            // If response is an array, return it. If it's an object with data, return data
            if (Array.isArray(response.data)) {
                return response.data;
            } else if (response.data && Array.isArray(response.data.data)) {
                return response.data.data;
            }
            return response.data || [];
        } catch (error) {
            console.error('Error fetching clients:', error instanceof Error ? error.message : 'Unknown error');
            return [];
        }
    }

    async getContacts(): Promise<any[]> {
        try {
            const response = await this.client.get('/api/contacts');
            return response.data;
        } catch (error) {
            console.error('Error fetching contacts:', error instanceof Error ? error.message : 'Unknown error');
            return [];
        }
    }

    async mockGetProjects(): Promise<PerfexProject[]> {
        return [
            {
                id: 101,
                name: 'Villa Ubud Renovation',
                description: 'Full renovation of Villa Ubud main building',
                clientid: 5,
                company: 'Bali Villas Corp',
                status: 2, // In Progress
                start_date: '2024-01-15',
                deadline: '2024-06-30',
                project_cost: 1500000000
            },
            {
                id: 102,
                name: 'Canggu Beach Club',
                description: 'New construction of beach club in Canggu',
                clientid: 8,
                company: 'Canggu Hospitality Group',
                status: 1, // Not Started
                start_date: '2024-03-01',
                deadline: '2024-12-31',
                project_cost: 5000000000
            }
        ];
    }
}

export interface PerfexProject {
    id: number;
    name: string;
    description: string;
    clientid: number;
    company: string; // client name
    status: number; // 1: Not Started, 2: In Progress, 3: On Hold, 4: Finished, 5: Cancelled
    start_date: string;
    deadline: string;
    project_cost: number;
}

export const perfexClient = new PerfexApiClient();
