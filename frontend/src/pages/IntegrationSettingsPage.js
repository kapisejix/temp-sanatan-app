import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  Settings, Brain, Headphones, Image, Video, Phone, CreditCard,
  Cloud, Bell, BarChart3, Save, Loader2, Check, Eye, EyeOff,
  ChevronDown, ChevronRight, AlertCircle
} from 'lucide-react';

const ICONS = { brain: Brain, headphones: Headphones, image: Image, video: Video, phone: Phone, 'credit-card': CreditCard, cloud: Cloud, bell: Bell, 'bar-chart': BarChart3 };

export default function IntegrationSettingsPage() {
  const { api } = useAuth();
  const [schema, setSchema] = useState({});
  const [values, setValues] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [expanded, setExpanded] = useState(null);
  const [showSecrets, setShowSecrets] = useState({});
  const [formValues, setFormValues] = useState({});

  useEffect(() => {
    const fetch = async () => {
      try {
        const [schemaRes, valuesRes] = await Promise.all([
          api.get('/admin/integrations/schema'),
          api.get('/admin/integrations'),
        ]);
        setSchema(schemaRes.data);
        setValues(valuesRes.data);
        // Init form values
        const init = {};
        Object.entries(valuesRes.data).forEach(([k, v]) => { init[k] = v.is_set ? '' : ''; });
        setFormValues(init);
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    };
    fetch();
  }, [api]);

  const handleSave = async (categoryKey) => {
    setSaving(true);
    setSaved(false);
    const cat = schema[categoryKey];
    if (!cat) return;

    const updates = {};
    cat.fields.forEach(f => {
      const val = formValues[f.key];
      if (val && val.trim()) updates[f.key] = val.trim();
    });

    if (Object.keys(updates).length === 0) { setSaving(false); return; }

    try {
      await api.put('/admin/integrations', updates);
      setSaved(true);
      // Refresh values
      const { data } = await api.get('/admin/integrations');
      setValues(data);
      // Clear form
      const cleared = { ...formValues };
      Object.keys(updates).forEach(k => { cleared[k] = ''; });
      setFormValues(cleared);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      alert(err.response?.data?.detail || 'Error saving');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-64 bg-[#E8E4E1] rounded-lg animate-pulse" />
        {[...Array(4)].map((_, i) => <div key={i} className="h-20 bg-white rounded-xl border border-[#E8E4E1] animate-pulse" />)}
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="integration-settings-page">
      <div className="animate-fade-in">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#E95A34] mb-1">Configuration</p>
        <h1 className="text-3xl font-bold tracking-tight" style={{ fontFamily: 'Manrope' }}>Integration Hub</h1>
        <p className="text-sm text-[#7A8690] mt-1">Configure all API keys and third-party integrations from one place</p>
      </div>

      <div className="p-4 bg-[#FEF0EC] rounded-xl border border-[#FDDDD4] flex items-start gap-3 animate-fade-in">
        <AlertCircle size={18} className="text-[#E95A34] flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-[#D08465]">Secure Storage</p>
          <p className="text-xs text-[#7A8690] mt-0.5">All API keys are stored securely in the database. Secret keys are masked in the UI. Only Super Admins can access this page.</p>
        </div>
      </div>

      {saved && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 animate-fade-in">
          <Check size={16} className="text-green-600" />
          <span className="text-sm text-green-700">Settings saved successfully!</span>
        </div>
      )}

      <div className="space-y-3 animate-fade-in">
        {Object.entries(schema).map(([catKey, cat]) => {
          const Icon = ICONS[cat.icon] || Settings;
          const isExpanded = expanded === catKey;
          const setFieldCount = cat.fields.filter(f => values[f.key]?.is_set).length;

          return (
            <div key={catKey} className="bg-white rounded-xl border border-[#E8E4E1] overflow-hidden" data-testid={`integration-${catKey}`}>
              <button onClick={() => setExpanded(isExpanded ? null : catKey)} className="w-full flex items-center justify-between px-6 py-4 hover:bg-[#F8F3F1] transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-[#FEF0EC] rounded-lg flex items-center justify-center">
                    <Icon size={20} className="text-[#E95A34]" />
                  </div>
                  <div className="text-left">
                    <h3 className="text-sm font-semibold" style={{ fontFamily: 'Manrope' }}>{cat.label}</h3>
                    <p className="text-xs text-[#7A8690]">{setFieldCount}/{cat.fields.length} configured</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {setFieldCount > 0 && (
                    <span className="text-xs px-2 py-1 rounded-full bg-green-50 text-green-700 font-medium">Active</span>
                  )}
                  {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                </div>
              </button>

              {isExpanded && (
                <div className="px-6 py-5 border-t border-[#E8E4E1] bg-[#F8F3F1] space-y-4">
                  {cat.fields.map(field => {
                    const current = values[field.key];
                    const isSecret = field.type === 'secret';
                    const showSecret = showSecrets[field.key];

                    return (
                      <div key={field.key}>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-sm font-medium text-[#374652]">{field.label}</label>
                          {current?.is_set && <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-50 text-green-600">Set</span>}
                        </div>
                        {field.description && <p className="text-xs text-[#989EA4] mb-1.5">{field.description}</p>}

                        {field.type === 'select' ? (
                          <select
                            value={formValues[field.key] || ''}
                            onChange={(e) => setFormValues({ ...formValues, [field.key]: e.target.value })}
                            className="w-full px-3 py-2 bg-white border border-[#E8E4E1] rounded-lg text-sm focus:ring-2 focus:ring-[#E95A34]"
                          >
                            <option value="">{current?.is_set ? `Current: ${current.value}` : '-- Select --'}</option>
                            {(field.options || []).map(o => <option key={o} value={o}>{o}</option>)}
                          </select>
                        ) : field.type === 'toggle' ? (
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" checked={formValues[field.key] === 'true'} onChange={(e) => setFormValues({ ...formValues, [field.key]: e.target.checked ? 'true' : 'false' })} className="accent-[#E95A34]" />
                            <span className="text-sm">Enabled</span>
                          </label>
                        ) : (
                          <div className="relative">
                            <input
                              type={isSecret && !showSecret ? 'password' : 'text'}
                              value={formValues[field.key] || ''}
                              onChange={(e) => setFormValues({ ...formValues, [field.key]: e.target.value })}
                              placeholder={current?.is_set ? `Currently set (${current.value})` : `Enter ${field.label}`}
                              className="w-full px-3 py-2 bg-white border border-[#E8E4E1] rounded-lg text-sm focus:ring-2 focus:ring-[#E95A34] pr-10"
                              data-testid={`input-${field.key}`}
                            />
                            {isSecret && (
                              <button onClick={() => setShowSecrets({ ...showSecrets, [field.key]: !showSecret })} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#7A8690]">
                                {showSecret ? <EyeOff size={16} /> : <Eye size={16} />}
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}

                  <button onClick={() => handleSave(catKey)} disabled={saving} className="flex items-center gap-2 px-4 py-2.5 bg-[#E95A34] hover:bg-[#D04A28] text-white rounded-lg text-sm font-medium disabled:opacity-50 transition-colors" data-testid={`save-${catKey}`}>
                    {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                    Save {cat.label} Settings
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
