import React from 'react';
import { useApp } from '../../context/AppContext';
import { CheckCircle2, AlertCircle, Info, XCircle, X } from 'lucide-react';

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useApp();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col space-y-2.5 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => {
        let icon = <Info className="w-4 h-4 text-blue-500" />;
        let borderColor = 'border-blue-200';
        let bgLight = 'bg-blue-50/90';

        if (toast.type === 'success') {
          icon = <CheckCircle2 className="w-4 h-4 text-teal-600" />;
          borderColor = 'border-teal-200';
          bgLight = 'bg-teal-50/95';
        } else if (toast.type === 'warning') {
          icon = <AlertCircle className="w-4 h-4 text-amber-500" />;
          borderColor = 'border-amber-200';
          bgLight = 'bg-amber-50/95';
        } else if (toast.type === 'error') {
          icon = <XCircle className="w-4 h-4 text-rose-500" />;
          borderColor = 'border-rose-200';
          bgLight = 'bg-rose-50/95';
        }

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start justify-between p-3.5 rounded-xl border ${borderColor} ${bgLight} shadow-lg backdrop-blur-sm animate-slide-up transition`}
          >
            <div className="flex items-start space-x-2.5">
              <span className="mt-0.5">{icon}</span>
              <div>
                <h5 className="font-semibold text-xs text-slate-900">{toast.title}</h5>
                <p className="text-[11px] text-slate-600 mt-0.5">{toast.message}</p>
              </div>
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="text-slate-400 hover:text-slate-700 p-0.5 rounded transition"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
