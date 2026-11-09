type SectionTagProps = {
  children: React.ReactNode;
  /** Número da seção exibido antes do rótulo (ex.: "01"). */
  number?: string;
  /** Variante dourada (para fundos escuros). */
  gold?: boolean;
  className?: string;
};

/** Etiqueta acima dos títulos de seção ("01 · A empresa"). */
export function SectionTag({ children, number, gold, className = "" }: SectionTagProps) {
  return (
    <p className={`tab ${gold ? "tab-ouro" : ""} ${className}`}>
      {number && <span className="opacity-70">{number}</span>}
      {children}
    </p>
  );
}
