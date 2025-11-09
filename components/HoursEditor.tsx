'use client';

import { useState } from 'react';

export interface DayHours {
  day: string;
  open: string;
  close: string;
  isClosed: boolean;
}

interface HoursEditorProps {
  value: Record<string, string>;
  onChange: (hours: Record<string, string>) => void;
}

const DAYS = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
];

const DAY_LABELS: Record<string, string> = {
  monday: 'Monday',
  tuesday: 'Tuesday',
  wednesday: 'Wednesday',
  thursday: 'Thursday',
  friday: 'Friday',
  saturday: 'Saturday',
  sunday: 'Sunday',
};

export default function HoursEditor({ value, onChange }: HoursEditorProps) {
  const parseDayHours = (day: string): DayHours => {
    const dayValue = value[day] || '';
    if (dayValue === 'closed' || !dayValue) {
      return { day, open: '09:00', close: '17:00', isClosed: true };
    }
    const [open, close] = dayValue.split('-');
    return { day, open: open || '09:00', close: close || '17:00', isClosed: false };
  };

  const updateDay = (day: string, updates: Partial<DayHours>) => {
    const current = parseDayHours(day);
    const updated = { ...current, ...updates };
    
    const newHours = { ...value };
    if (updated.isClosed) {
      newHours[day] = 'closed';
    } else {
      newHours[day] = `${updated.open}-${updated.close}`;
    }
    
    onChange(newHours);
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Operating Hours
      </label>
      
      <div className="space-y-3">
        {DAYS.map((day) => {
          const dayHours = parseDayHours(day);
          
          return (
            <div key={day} className="flex items-center gap-3">
              <div className="w-28 text-sm font-medium text-gray-700">
                {DAY_LABELS[day]}
              </div>
              
              <input
                type="checkbox"
                id={`${day}-closed`}
                checked={dayHours.isClosed}
                onChange={(e) => updateDay(day, { isClosed: e.target.checked })}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <label
                htmlFor={`${day}-closed`}
                className="text-sm text-gray-600 w-16"
              >
                Closed
              </label>
              
              {!dayHours.isClosed && (
                <>
                  <input
                    type="time"
                    value={dayHours.open}
                    onChange={(e) => updateDay(day, { open: e.target.value })}
                    className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm"
                  />
                  <span className="text-gray-500">to</span>
                  <input
                    type="time"
                    value={dayHours.close}
                    onChange={(e) => updateDay(day, { close: e.target.value })}
                    className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm"
                  />
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
<<<<<<< HEAD
=======

>>>>>>> origin/main
