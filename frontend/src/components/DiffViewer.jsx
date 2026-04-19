import React from 'react';
import { diffLines } from 'diff';

const DiffViewer = ({ oldText, newText }) => {
  const safeOld = oldText || '';
  const safeNew = newText || '';
  const diff = diffLines(safeOld, safeNew);
  const hasChanges = safeOld !== safeNew;

  return (
    <div className="w-full font-sans text-sm leading-7">
      {!hasChanges && (
        <div className="text-fg-3 italic p-4 text-center border border-dashed border-line rounded-card">
          内容无变更
        </div>
      )}

      <div className="space-y-1">
        {diff.map((part, index) => {
          if (part.removed) {
            return (
              <div
                key={index}
                className="group relative bg-danger-500/8 hover:bg-danger-500/12 transition-colors border-l-2 border-danger-500/40 pl-4 pr-2 py-1 select-text"
              >
                <span className="text-danger-400/50 font-mono text-xs block mb-1 select-none uppercase tracking-wider">
                  已删除
                </span>
                <span className="text-danger-300/60 font-mono whitespace-pre-wrap line-through decoration-danger-500/30">
                  {part.value}
                </span>
              </div>
            );
          }

          if (part.added) {
            return (
              <div
                key={index}
                className="group relative bg-success-500/8 hover:bg-success-500/12 transition-colors border-l-2 border-success-500/50 pl-4 pr-2 py-2 my-1 rounded-r select-text"
              >
                <span className="text-success-400/60 font-mono text-xs block mb-1 select-none uppercase tracking-wider">
                  已新增
                </span>
                <span className="text-success-300 font-mono whitespace-pre-wrap">
                  {part.value}
                </span>
              </div>
            );
          }

          return (
            <div
              key={index}
              className="pl-4 pr-2 py-1 text-fg-2 font-mono whitespace-pre-wrap hover:text-fg-1 transition-colors border-l-2 border-transparent"
            >
              {part.value}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default DiffViewer;
