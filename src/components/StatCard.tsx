import React from 'react';
import { ArrowUpIcon, ArrowDownIcon } from 'lucide-react';
interface StatCardProps {
  title: string;
  value: string;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  icon: ReactNode;
  iconBg: string;
}
export function StatCard({
  title,
  value,
  change,
  changeType = 'neutral',
  icon,
  iconBg
}: StatCardProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 flex items-start justify-between hover:shadow-md transition-shadow duration-200">
      <div className="flex-1">
        <p className="text-sm font-medium text-slate-500 mb-1">{title}</p>
        <p className="text-2xl font-bold text-slate-900 mb-2">{value}</p>
        {change &&
        <div className="flex items-center gap-1">
            {changeType === 'positive' &&
          <ArrowUpIcon className="w-3 h-3 text-emerald-500" />
          }
            {changeType === 'negative' &&
          <ArrowDownIcon className="w-3 h-3 text-red-500" />
          }
            <span
            className={`text-xs font-medium ${changeType === 'positive' ? 'text-emerald-600' : changeType === 'negative' ? 'text-red-600' : 'text-slate-500'}`}>

              {change}
            </span>
          </div>
        }
      </div>
      <div
        className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${iconBg}`}>

        {icon}
      </div>
    </div>);

}