"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Save, TestTube, AlertCircle, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

interface AISettings {
  apiKey: string;
  provider: string;
  model: string;
  temperature: number;
  maxTokens: number;
  enabled: boolean;
  autoAnalysis: boolean;
}

const defaultSettings: AISettings = {
  apiKey: '',
  provider: 'openai',
  model: 'gpt-4-turbo',
  temperature: 0.7,
  maxTokens: 2000,
  enabled: false,
  autoAnalysis: false,
};

const providers = [
  { 
    value: 'openai', 
    label: 'OpenAI', 
    description: 'GPT models from OpenAI',
    models: [
      { value: 'gpt-4-turbo', label: 'GPT-4 Turbo', description: 'Most capable model for complex analysis' },
      { value: 'gpt-4', label: 'GPT-4', description: 'Powerful model for detailed analysis' },
      { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo', description: 'Fast and efficient for standard analysis' },
    ]
  },
  { 
    value: 'glm', 
    label: 'GLM (BigModel.cn)', 
    description: 'GLM models from BigModel.cn',
    models: [
      { value: 'glm-4.5', label: 'GLM-4.5', description: 'Most capable GLM model' },
      { value: 'glm-4', label: 'GLM-4', description: 'Fast and efficient for standard analysis' },
      { value: 'glm-3-turbo', label: 'GLM-3 Turbo', description: 'Quick analysis for simple cases' },
    ]
  },
  { 
    value: 'gemini', 
    label: 'Google Gemini', 
    description: 'Gemini models from Google',
    models: [
      { value: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro', description: 'Best performing multimodal model' },
      { value: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash', description: 'Fast and cost-efficient model' },
      { value: 'gemini-pro', label: 'Gemini Pro', description: 'Capable model for scaling' },
    ]
  }
];

export function AISettings() {
  const [settings, setSettings] = useState<AISettings>(defaultSettings);
  const [isLoading, setIsLoading] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // Load settings from localStorage
  useEffect(() => {
    const savedSettings = localStorage.getItem('aiSettings');
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        setSettings({ ...defaultSettings, ...parsed });
      } catch (error) {
        console.error('Failed to parse AI settings:', error);
      }
    }
  }, []);

  // Save settings to localStorage
  const saveSettings = () => {
    try {
      localStorage.setItem('aiSettings', JSON.stringify(settings));
      toast.success('AI Settings saved successfully!');
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Failed to save settings');
    }
  };

  // Test AI API connection
  const testConnection = async () => {
    if (!settings.apiKey.trim()) {
      toast.error('API Key is required for testing');
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    try {
      const response = await fetch('/api/ai/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          apiKey: settings.apiKey,
          provider: settings.provider,
          model: settings.model,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setTestResult({
          success: true,
          message: 'Connection successful! AI is ready to use.',
        });
        toast.success('AI connection test successful');
      } else {
        setTestResult({
          success: false,
          message: result.error || 'Connection failed',
        });
        toast.error('AI connection test failed');
      }
    } catch (error) {
      setTestResult({
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error occurred',
      });
      toast.error('AI connection test failed');
    } finally {
      setIsTesting(false);
    }
  };

  // Reset to default settings
  const resetSettings = () => {
    setSettings(defaultSettings);
    localStorage.removeItem('aiSettings');
    setTestResult(null);
    toast.success('Settings reset to default');
  };

  const updateSetting = <K extends keyof AISettings>(key: K, value: AISettings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    setTestResult(null); // Clear test result when settings change
    
    // Auto-reset model when provider changes
    if (key === 'provider') {
      const selectedProvider = providers.find(p => p.value === value);
      if (selectedProvider && selectedProvider.models.length > 0) {
        setSettings(prev => ({ ...prev, [key]: value, model: selectedProvider.models[0].value }));
      }
    }
  };

  const currentProvider = providers.find(p => p.value === settings.provider);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
              🤖
            </div>
            AI Analysis Settings
          </CardTitle>
          <CardDescription>
            Configure AI-powered QC analysis using OpenAI, GLM, or Google Gemini for intelligent insights and recommendations.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Enable/Disable AI */}
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="ai-enabled">Enable AI Analysis</Label>
              <p className="text-sm text-muted-foreground">
                Allow AI to analyze QC data and provide insights
              </p>
            </div>
            <Switch
              id="ai-enabled"
              checked={settings.enabled}
              onCheckedChange={(checked) => updateSetting('enabled', checked)}
            />
          </div>

          {/* Auto Analysis */}
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="auto-analysis">Auto Analysis</Label>
              <p className="text-sm text-muted-foreground">
                Automatically analyze QC data when generating reports
              </p>
            </div>
            <Switch
              id="auto-analysis"
              checked={settings.autoAnalysis}
              onCheckedChange={(checked) => updateSetting('autoAnalysis', checked)}
              disabled={!settings.enabled}
            />
          </div>

          {/* Provider Selection */}
          <div className="space-y-2">
            <Label htmlFor="provider">AI Provider</Label>
            <Select
              value={settings.provider}
              onValueChange={(value) => updateSetting('provider', value)}
              disabled={!settings.enabled}
            >
              <SelectTrigger id="provider">
                <SelectValue placeholder="Select AI provider" />
              </SelectTrigger>
              <SelectContent>
                {providers.map((provider) => (
                  <SelectItem key={provider.value} value={provider.value}>
                    <div className="flex flex-col">
                      <span className="font-medium">{provider.label}</span>
                      <span className="text-xs text-muted-foreground">
                        {provider.description}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* API Key */}
          <div className="space-y-2">
            <Label htmlFor="api-key">
              {currentProvider?.label === 'OpenAI' ? 'OpenAI API Key' : currentProvider?.label === 'Google Gemini' ? 'Gemini API Key' : 'GLM API Key'}
            </Label>
            <Input
              id="api-key"
              type="password"
              placeholder={`Enter your ${currentProvider?.label} API key`}
              value={settings.apiKey}
              onChange={(e) => updateSetting('apiKey', e.target.value)}
              disabled={!settings.enabled}
            />
            <p className="text-xs text-muted-foreground">
              {currentProvider?.label === 'OpenAI' ? (
                <>Get your API key from{' '}
                  <a 
                    href="https://platform.openai.com/api-keys" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    OpenAI Platform
                  </a>
                </>
              ) : currentProvider?.label === 'Google Gemini' ? (
                <>Get your API key from{' '}
                  <a 
                    href="https://aistudio.google.com/app/apikey" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    Google AI Studio
                  </a>
                </>
              ) : (
                <>Get your API key from{' '}
                  <a 
                    href="https://open.bigmodel.cn/" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    BigModel.cn
                  </a>
                </>
              )}
            </p>
          </div>

          {/* Model Selection */}
          <div className="space-y-2">
            <Label htmlFor="model">AI Model</Label>
            <Select
              value={settings.model}
              onValueChange={(value) => updateSetting('model', value)}
              disabled={!settings.enabled}
            >
              <SelectTrigger id="model">
                <SelectValue placeholder="Select AI model" />
              </SelectTrigger>
              <SelectContent>
                {currentProvider?.models.map((model) => (
                  <SelectItem key={model.value} value={model.value}>
                    <div className="flex flex-col">
                      <span className="font-medium">{model.label}</span>
                      <span className="text-xs text-muted-foreground">
                        {model.description}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Temperature */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="temperature">Temperature</Label>
              <Badge variant="outline">{settings.temperature.toFixed(1)}</Badge>
            </div>
            <Slider
              id="temperature"
              min={0}
              max={2}
              step={0.1}
              value={[settings.temperature]}
              onValueChange={([value]) => updateSetting('temperature', value)}
              disabled={!settings.enabled}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              Controls randomness: 0 = focused, 2 = creative
            </p>
          </div>

          {/* Max Tokens */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="max-tokens">Max Tokens</Label>
              <Badge variant="outline">{settings.maxTokens}</Badge>
            </div>
            <Slider
              id="max-tokens"
              min={1000}
              max={8000}
              step={500}
              value={[settings.maxTokens]}
              onValueChange={([value]) => updateSetting('maxTokens', value)}
              disabled={!settings.enabled}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              Maximum length of AI response
            </p>
          </div>

          {/* Test Result */}
          {testResult && (
            <Alert className={testResult.success ? 'border-green-200' : 'border-red-200'}>
              <div className="flex items-center gap-2">
                {testResult.success ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-red-600" />
                )}
                <AlertDescription className={testResult.success ? 'text-green-700' : 'text-red-700'}>
                  {testResult.message}
                </AlertDescription>
              </div>
            </Alert>
          )}

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2 pt-4">
            <Button
              onClick={testConnection}
              disabled={!settings.enabled || !settings.apiKey.trim() || isTesting}
              variant="outline"
              size="sm"
            >
              {isTesting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Testing...
                </>
              ) : (
                <>
                  <TestTube className="h-4 w-4 mr-2" />
                  Test Connection
                </>
              )}
            </Button>
            
            <Button
              onClick={saveSettings}
              disabled={!settings.enabled}
              size="sm"
            >
              <Save className="h-4 w-4 mr-2" />
              Save Settings
            </Button>
            
            <Button
              onClick={resetSettings}
              variant="outline"
              size="sm"
            >
              Reset to Default
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">How AI Analysis Works</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
              1
            </div>
            <div>
              <h4 className="font-medium">Data Collection</h4>
              <p className="text-sm text-muted-foreground">
                QC inspection data including items, scores, and comments are collected
              </p>
            </div>
          </div>
          
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
              2
            </div>
            <div>
              <h4 className="font-medium">AI Analysis</h4>
              <p className="text-sm text-muted-foreground">
                {currentProvider?.label} AI analyzes data for patterns, risks, and improvement opportunities
              </p>
            </div>
          </div>
          
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
              3
            </div>
            <div>
              <h4 className="font-medium">Report Generation</h4>
              <p className="text-sm text-muted-foreground">
                AI insights are included in the PDF report alongside QC data
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
