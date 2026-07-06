import React from 'react';
import { User } from '../types';
import { User as UserIcon, Mail, Shield, Camera, Save, CheckCircle, Smartphone, AlertTriangle, Key, LogOut, Image, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

const SUGGESTED_AVATARS = [
  'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80', // Professional Man
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80', // Professional Woman
  'https://images.unsplash.com/photo-1519244703995-f4e0f30006d5?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80', // Casual Man
  'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80', // Casual Woman
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Admin&backgroundColor=c0aede', // Illustrated Avatar
];

interface ProfileProps {
  user: User;
  onUpdateUser: (user: User) => void;
  onInstall?: () => void;
  canInstall?: boolean;
}

export const Profile: React.FC<ProfileProps> = ({ user, onUpdateUser, onInstall, canInstall }) => {
  const [formData, setFormData] = React.useState({
    name: user.name,
    email: user.email || `${user.username}@portal.com`,
    avatar: user.avatar || '',
  });
  const [isSaved, setIsSaved] = React.useState(false);
  const [showAvatarPresets, setShowAvatarPresets] = React.useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateUser({
      ...user,
      ...formData
    });
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
      <div>
        <h2 className="text-3xl font-black tracking-tight text-zinc-900 dark:text-white mb-2">Account Profile</h2>
        <p className="text-zinc-500 dark:text-zinc-400">Manage your personal information, security, and preferences.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-line dark:border-zinc-800 shadow-sm overflow-hidden">
            <div className="h-48 bg-gradient-to-tr from-zinc-900 via-zinc-800 to-zinc-700 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-800 relative overflow-hidden group">
              {/* Decorative elements */}
              <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '32px 32px' }}></div>
              <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-white/10 rounded-full blur-3xl group-hover:scale-110 transition-transform duration-1000"></div>
              <div className="absolute -top-24 -left-24 w-64 h-64 bg-[#F5F5F7]0/20 rounded-full blur-3xl group-hover:scale-110 transition-transform duration-1000"></div>
              
              <div className="absolute -bottom-16 left-8 flex items-end gap-6">
                <div className="relative group/avatar">
                  <div className="w-32 h-32 rounded-3xl bg-white dark:bg-zinc-900 p-1.5 shadow-2xl relative z-10 transition-transform group-hover/avatar:scale-105 duration-300">
                    {formData.avatar ? (
                      <img 
                        src={formData.avatar} 
                        alt="Avatar" 
                        className="w-full h-full rounded-[1.25rem] object-cover bg-[#E5E5E5]"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-full h-full rounded-[1.25rem] bg-[#E5E5E5] dark:bg-zinc-800 flex items-center justify-center text-zinc-400">
                        <UserIcon size={48} />
                      </div>
                    )}
                  </div>
                  <button 
                    type="button"
                    onClick={() => setShowAvatarPresets(!showAvatarPresets)}
                    className="absolute inset-0 z-20 flex items-center justify-center bg-black/50 opacity-0 group-hover/avatar:opacity-100 transition-opacity rounded-3xl text-white backdrop-blur-sm cursor-pointer"
                  >
                    <div className="flex flex-col items-center gap-2">
                      <Camera size={24} />
                      <span className="text-xs font-bold uppercase tracking-wider">Change</span>
                    </div>
                  </button>
                </div>
              </div>
            </div>

            <div className="pt-24 p-8">
              <form onSubmit={handleSubmit} className="space-y-8">
                
                {/* Expanded Avatar Selector */}
                {showAvatarPresets && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="p-5 bg-[#F5F5F7] dark:bg-zinc-800/50 rounded-2xl border border-line dark:border-white/5 space-y-4"
                  >
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-black uppercase tracking-wider text-zinc-400 flex items-center gap-2">
                        <Sparkles size={14} /> Quick Select Avatars
                      </h4>
                      <button 
                        type="button" 
                        onClick={() => setShowAvatarPresets(false)}
                        className="text-xs font-bold text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
                      >
                        Hide
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-4">
                      {SUGGESTED_AVATARS.map((url, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => setFormData({ ...formData, avatar: url })}
                          className={cn(
                            "w-16 h-16 rounded-2xl overflow-hidden hover:scale-105 active:scale-95 transition-all shadow-sm ring-2 ring-offset-2 dark:ring-offset-zinc-900",
                            formData.avatar === url ? "ring-zinc-900 dark:ring-white" : "ring-transparent object-opacity-50"
                          )}
                        >
                          <img src={url} alt={`Preset ${i + 1}`} className="w-full h-full object-cover pointer-events-none" referrerPolicy="no-referrer" />
                        </button>
                      ))}
                    </div>
                    <div className="pt-2">
                      <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider ml-1 mb-2 block">Or paste custom image URL</label>
                      <div className="relative group">
                        <Image className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-zinc-900 dark:group-focus-within:text-white transition-colors" size={18} />
                        <input
                          type="text"
                          value={formData.avatar}
                          onChange={(e) => setFormData({ ...formData, avatar: e.target.value })}
                          placeholder="https://example.com/photo.jpg"
                          className="w-full pl-12 pr-4 py-3 bg-white dark:bg-zinc-900 border border-line dark:border-white/5 rounded-xl text-sm font-medium focus:ring-2 focus:ring-zinc-900 dark:focus:ring-white outline-none text-zinc-900 dark:text-white transition-all shadow-sm"
                        />
                      </div>
                    </div>
                  </motion.div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider ml-1 block">Full Name</label>
                    <div className="relative group">
                      <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-zinc-900 dark:group-focus-within:text-white transition-colors" size={18} />
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full pl-12 pr-4 py-3.5 bg-[#F5F5F7] dark:bg-zinc-800/50 border border-line dark:border-white/5 rounded-2xl text-sm font-medium focus:ring-2 focus:ring-zinc-900 dark:focus:ring-white focus:bg-white dark:focus:bg-zinc-900 outline-none text-zinc-900 dark:text-white transition-all shadow-sm"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider ml-1 block">Email Address</label>
                    <div className="relative group">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-zinc-900 dark:group-focus-within:text-white transition-colors" size={18} />
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full pl-12 pr-4 py-3.5 bg-[#F5F5F7] dark:bg-zinc-800/50 border border-line dark:border-white/5 rounded-2xl text-sm font-medium focus:ring-2 focus:ring-zinc-900 dark:focus:ring-white focus:bg-white dark:focus:bg-zinc-900 outline-none text-zinc-900 dark:text-white transition-all shadow-sm"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-zinc-100 dark:border-white/5 mt-8">
                  <div className="flex items-center gap-3">
                    {isSaved && (
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2"
                      >
                        <CheckCircle size={18} />
                        Profile Updated
                      </motion.div>
                    )}
                  </div>
                  <button
                    type="submit"
                    className="bg-zinc-900 dark:bg-white dark:text-zinc-900 text-white px-8 py-3.5 rounded-2xl font-bold flex items-center gap-3 hover:scale-105 active:scale-95 transition-all shadow-[0_8px_30px_rgb(0,0,0,0.12)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.2)]"
                  >
                    <Save size={18} />
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>

        <div className="space-y-8">
          <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-line dark:border-zinc-800 shadow-sm p-8">
            <h3 className="text-lg font-black tracking-tight text-zinc-900 dark:text-white mb-6 flex items-center gap-2">
              <Shield size={20} className="text-zinc-400" />
              Account Level
            </h3>
            <div className="space-y-6">
              <div>
                <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2 block">Role</label>
                <div className="bg-[#F5F5F7] dark:bg-zinc-800/50 border border-zinc-100 dark:border-white/5 rounded-xl px-4 py-3 flex items-center justify-between">
                  <span className="font-bold text-zinc-900 dark:text-white capitalize">{user.role}</span>
                  <div className="px-2.5 py-1 bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400 rounded-lg text-[10px] font-black uppercase tracking-widest bg-emerald-50">Active</div>
                </div>
              </div>
              
              <div>
                <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2 block">Username</label>
                <div className="bg-[#F5F5F7] dark:bg-zinc-800/50 border border-zinc-100 dark:border-white/5 rounded-xl px-4 py-3 text-zinc-500 dark:text-zinc-400 font-mono text-sm">
                  @{user.username}
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2 block">Security</label>
                <button className="w-full bg-[#F5F5F7] dark:bg-zinc-800/50 border border-line dark:border-white/10 hover:border-zinc-300 dark:hover:border-white/20 rounded-xl px-4 py-3 flex items-center justify-between text-zinc-700 dark:text-zinc-300 font-bold text-sm transition-all group">
                  <div className="flex items-center gap-2">
                    <Key size={16} className="text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-white transition-colors" />
                    Change Password
                  </div>
                  <span className="text-zinc-400">→</span>
                </button>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-indigo-500 to-purple-600 dark:from-indigo-600 dark:to-purple-800 rounded-3xl shadow-lg p-8 text-white relative overflow-hidden group">
            {/* Background patterns */}
            <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '16px 16px' }}></div>
            <div className="absolute -right-12 -top-12 w-40 h-40 bg-white/20 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700"></div>

            <div className="relative z-10">
              <h3 className="text-xl font-black mb-2 flex items-center gap-2">
                <Smartphone size={24} />
                Mobile App
              </h3>
              <p className="text-indigo-100 text-sm mb-6 font-medium leading-relaxed">
                Install the portal app on your device for quick access to attendance, and payroll on the go.
              </p>
              
              <button 
                onClick={onInstall}
                disabled={!canInstall}
                className={cn(
                  "w-full py-3.5 rounded-2xl font-bold text-sm transition-all shadow-lg flex items-center justify-center gap-2 relative overflow-hidden",
                  canInstall 
                    ? "bg-white text-indigo-600 hover:scale-105 active:scale-95 cursor-pointer" 
                    : "bg-white/20 text-white/50 cursor-not-allowed shadow-none"
                )}
              >
                {canInstall ? (
                  <>
                    <span className="relative z-10">Install Now</span>
                  </>
                ) : (
                  <>
                    <CheckCircle size={18} className="text-white/50" />
                    App Installed
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="bg-red-50 dark:bg-red-500/5 border border-red-100 dark:border-red-500/10 rounded-3xl p-8 relative overflow-hidden">
            <h3 className="text-red-600 dark:text-red-400 font-bold mb-3 flex items-center gap-2">
              <AlertTriangle size={18} />
              Danger Zone
            </h3>
            <p className="text-red-800/70 dark:text-red-300/60 text-sm mb-6 leading-relaxed">
              Once you delete your account, all your settings will be permanently removed. This action cannot be undone.
            </p>
            <button className="w-full py-3.5 bg-white dark:bg-zinc-900 border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-500 rounded-2xl text-sm font-bold hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors shadow-sm flex items-center justify-center gap-2 group">
              <LogOut size={16} className="group-hover:-translate-x-1 transition-transform" />
              Delete Account
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
