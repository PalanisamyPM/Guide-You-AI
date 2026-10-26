import React, { useState } from 'react';
import { Calendar, Clock, X, Check, Video, AlertCircle } from 'lucide-react';
import { Review } from '../types.js';

interface RescheduleModalProps {
  review: Review;
  projectName: string;
  candidateName: string;
  onClose: () => void;
  onSuccess: (updatedDate: string) => void;
}

export const RescheduleModal: React.FC<RescheduleModalProps> = ({
  review,
  projectName,
  candidateName,
  onClose,
  onSuccess,
}) => {
  const currentDate = new Date(review.scheduled_date);
  
  // Format initial YYYY-MM-DD
  const [selectedDate, setSelectedDate] = useState<string>(
    currentDate.toISOString().split('T')[0]
  );
  
  // Initial time
  const [selectedHour, setSelectedHour] = useState<number>(currentDate.getHours());
  const [selectedMinute, setSelectedMinute] = useState<number>(currentDate.getMinutes());
  const [customMeetLink, setCustomMeetLink] = useState<string>(review.google_meet_link);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const presetSlots = [
    { label: '09:30 AM (Morning Slot 1)', hour: 9, minute: 30 },
    { label: '11:15 AM (Morning Slot 2)', hour: 11, minute: 15 },
    { label: '01:45 PM (Afternoon Slot 1)', hour: 13, minute: 45 },
    { label: '03:15 PM (Afternoon Slot 2)', hour: 15, minute: 15 },
    { label: '04:30 PM (Late Afternoon Slot)', hour: 16, minute: 30 },
  ];

  const handleSave = async () => {
    setIsSaving(true);
    setErrorMsg(null);

    try {
      const newDate = new Date(selectedDate);
      newDate.setHours(selectedHour, selectedMinute, 0, 0);

      const response = await fetch(`/api/reviews/${review.id}/reschedule`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scheduledDate: newDate.toISOString(),
          googleMeetLink: customMeetLink,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update meeting schedule');
      }

      onSuccess(newDate.toISOString());
      onClose();
    } catch (err: any) {
      console.error('Reschedule error:', err);
      setErrorMsg(err.message || 'Failed to update meeting schedule');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl space-y-4">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950">
          <div className="flex items-center space-x-2">
            <Calendar className="w-4 h-4 text-blue-400" />
            <h3 className="text-sm font-bold text-white">Customize Meeting Date & Time</h3>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs flex items-center justify-center transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 text-xs">
          <div>
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
              Round {review.review_round} Review
            </span>
            <h4 className="text-sm font-semibold text-slate-100 mt-1">{projectName}</h4>
            <p className="text-slate-400 text-[11px]">Candidate: {candidateName}</p>
          </div>

          {/* Date Picker */}
          <div className="space-y-1.5">
            <label className="font-semibold text-slate-300 flex items-center space-x-1.5">
              <Calendar className="w-3.5 h-3.5 text-blue-400" />
              <span>Select Date:</span>
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-blue-500 transition"
            />
          </div>

          {/* Preset Time Slots */}
          <div className="space-y-1.5">
            <label className="font-semibold text-slate-300 flex items-center space-x-1.5">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              <span>Select Distinct Time Slot:</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {presetSlots.map((slot, i) => {
                const isSelected = selectedHour === slot.hour && selectedMinute === slot.minute;
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => {
                      setSelectedHour(slot.hour);
                      setSelectedMinute(slot.minute);
                    }}
                    className={`p-2.5 rounded-lg border text-left transition ${
                      isSelected
                        ? 'bg-blue-600/20 border-blue-500 text-blue-300 font-semibold'
                        : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span>{slot.label}</span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-blue-400" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Google Meet Link Config */}
          <div className="space-y-1.5">
            <label className="font-semibold text-slate-300 flex items-center space-x-1.5">
              <Video className="w-3.5 h-3.5 text-purple-400" />
              <span>Google Meet URL:</span>
            </label>
            <input
              type="url"
              value={customMeetLink}
              onChange={(e) => setCustomMeetLink(e.target.value)}
              placeholder="https://meet.google.com/xxx-yyyy-zzz"
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 font-mono text-xs focus:outline-none focus:border-purple-500 transition"
            />
          </div>

          {errorMsg && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950 flex items-center justify-end space-x-2">
          <button
            onClick={onClose}
            className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow transition disabled:opacity-50"
          >
            {isSaving ? 'Saving...' : 'Update Review Schedule'}
          </button>
        </div>
      </div>
    </div>
  );
};
