"use client";

import { useState } from "react";

// Descripción con "Mostrar más / menos" (line-clamp expandible), como ficha.info.
export function ColegaDescription({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  const long = text.length > 320;

  return (
    <div>
      <p className={`text-[15px] text-[#3c4753] whitespace-pre-line leading-relaxed ${!open && long ? "line-clamp-6" : ""}`}>
        {text}
      </p>
      {long && (
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="mt-2 text-sm font-semibold text-[#1f6feb] hover:underline"
        >
          {open ? "Mostrar menos" : "Mostrar más"}
        </button>
      )}
    </div>
  );
}
