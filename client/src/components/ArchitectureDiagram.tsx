export function ArchitectureDiagram() {
  return (
    <div className="flex flex-col items-center">
      <img 
        src="/architecture.svg" 
        alt="Application Architecture" 
        className="w-full h-auto object-contain rounded-md transition-transform duration-200"
      />
    </div>
  );
}