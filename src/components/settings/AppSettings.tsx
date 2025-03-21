import React from 'react';
import { Bell, Video, Download, Shield } from 'lucide-react';
export function AppSettings() {
  return <div className="space-y-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Bell size={20} className="text-gray-400" />
            <div>
              <h3 className="font-medium">Push Notifications</h3>
              <p className="text-sm text-gray-400">
                Get notified about new releases
              </p>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" className="sr-only peer" />
            <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
          </label>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Video size={20} className="text-gray-400" />
            <div>
              <h3 className="font-medium">Autoplay Next Episode</h3>
              <p className="text-sm text-gray-400">
                Automatically play next episode
              </p>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" className="sr-only peer" defaultChecked />
            <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
          </label>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Download size={20} className="text-gray-400" />
            <div>
              <h3 className="font-medium">Auto Download</h3>
              <p className="text-sm text-gray-400">
                Download episodes for offline viewing
              </p>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" className="sr-only peer" />
            <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
          </label>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Shield size={20} className="text-gray-400" />
            <div>
              <h3 className="font-medium">Parental Controls</h3>
              <p className="text-sm text-gray-400">Set content restrictions</p>
            </div>
          </div>
          <button className="text-sm text-red-500 hover:text-red-400 transition">
            Configure
          </button>
        </div>
      </div>
    </div>;
}