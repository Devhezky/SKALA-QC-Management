<?php

defined('BASEPATH') or exit('No direct script access allowed');

class Qc_sso extends AdminController
{
    public function __construct()
    {
        parent::__construct();
        $this->load->helper('string');
    }

    /**
     * Entry point for SSO Login
     */
    public function login()
    {
        // If user is not logged in, AdminController will redirect to login page automatically.
        // But we want to ensure they come back here after login.
        // AdminController's constructor handles this if we are accessing an admin route.
        
        // However, if we are not logged in, we might want to customize the redirect.
        // For now, let's rely on standard Perfex behavior. 
        // If accessed via /admin/qc_integration/qc_sso/login, it requires login.
        
        // Generate a temporary token
        $token = random_string('alnum', 64);
        $staff_id = get_staff_user_id();
        
        // Store token in DB
        $this->db->insert(db_prefix() . 'qc_auth_tokens', [
            'staff_id' => $staff_id,
            'token' => $token,
            'created_at' => date('Y-m-d H:i:s'),
            'expires_at' => date('Y-m-d H:i:s', strtotime('+1 minute'))
        ]);

        // Redirect to QC App Callback
        // Prioritize return_url from request, otherwise use default production URL
        $qc_app_url = $this->input->get('return_url') ? urldecode($this->input->get('return_url')) : 'https://qc.narapatistudio.com/api/auth/callback/skala'; 
        
        $redirect_url = $qc_app_url . '?code=' . $token;
        
        // Pass popup parameter if present
        if ($this->input->get('popup')) {
            $redirect_url .= '&popup=1';
        }
        
        redirect($redirect_url);
    }

    /**
     * API Endpoint to validate token
     * This should be accessible without login (public API), but protected by the token itself.
     * We can't extend AdminController because that requires login.
     * We should extend ClientsController or CI_Controller, but we need DB access.
     */
    public function validate()
    {
        // We need to bypass AdminController's login check. 
        // Since we are inside a module controller, if we extend AdminController, it enforces login.
        // But this endpoint is called by the QC Server, which is not logged in as a staff.
        // So we should probably use a separate controller or method that doesn't extend AdminController,
        // OR we use the existing API module if possible, but the user wanted a custom module.
        
        // Let's try extending CI_Controller directly and loading necessary libraries.
    }
}
