import React from 'react';
import { Settings, AlertCircle } from 'lucide-react';

export default function SettingsPage() {
  return (
    <div className="space-y-6" data-testid="settings-page">
      <div className="animate-fade-in">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#E95A34] mb-1">Configuration</p>
        <h1 className="text-3xl font-bold tracking-tight" style={{ fontFamily: 'Manrope' }}>App Settings</h1>
        <p className="text-sm text-[#7A8690] mt-1">Featured content, banners, daily shloka, announcements</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-in">
        {[
          { title: 'Featured Content', desc: 'Set which content appears as featured on the home screen' },
          { title: 'Home Banner', desc: 'Configure banner image and text for the mobile app home' },
          { title: 'Daily Shloka', desc: 'Configure the daily shloka that appears on the home screen' },
          { title: 'Announcements', desc: 'Send announcements to all app users' },
        ].map((setting) => (
          <div key={setting.title} className="bg-white rounded-xl border border-[#E8E4E1] p-5 hover:shadow-sm transition-all">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-[#FEF0EC] rounded-lg flex items-center justify-center flex-shrink-0">
                <Settings size={18} className="text-[#E95A34]" />
              </div>
              <div>
                <h3 className="text-sm font-semibold" style={{ fontFamily: 'Manrope' }}>{setting.title}</h3>
                <p className="text-xs text-[#7A8690] mt-1">{setting.desc}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="p-3 bg-[#FEF0EC] rounded-lg flex items-center gap-2">
        <AlertCircle size={14} className="text-[#E95A34]" />
        <span className="text-xs text-[#D08465]">Detailed settings management coming in next phase</span>
      </div>
    </div>
  );
}
