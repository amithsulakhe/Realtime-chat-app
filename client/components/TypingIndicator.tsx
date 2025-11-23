'use client';

export default function TypingIndicator() {
  return (
    <div className="px-4 py-2">
      <div className="flex items-start gap-3 flex-row-reverse">
        <div className=" w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-medium">
          B
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2 mb-1 justify-end">
            <span className="text-sm font-semibold text-gray-900">Bot</span>
            <span className="text-xs text-gray-500">typing...</span>
          </div>
          <div className="flex justify-end">
            <div className="flex items-center gap-2 bg-white rounded-full px-4 py-2.5 shadow-md border border-gray-200">
              <span className="text-sm font-medium text-gray-700">Replying</span>
              <div className="flex gap-1.5 items-center">
                <div className="w-2 h-2 bg-blue-500 rounded-full typing-dot typing-dot-1"></div>
                <div className="w-2 h-2 bg-blue-500 rounded-full typing-dot typing-dot-2"></div>
                <div className="w-2 h-2 bg-blue-500 rounded-full typing-dot typing-dot-3"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
