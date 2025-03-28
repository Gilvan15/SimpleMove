export default function Footer() {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="bg-white shadow-md py-3 z-10 mt-auto">
      <div className="container mx-auto px-4 flex justify-between items-center">
        <div className="text-sm text-gray-600">
          &copy; {currentYear} SimpleMove
        </div>
        <div className="flex space-x-4 text-gray-600">
          <a href="#" className="text-sm hover:text-primary">Termos</a>
          <a href="#" className="text-sm hover:text-primary">Privacidade</a>
          <a href="#" className="text-sm hover:text-primary">Ajuda</a>
        </div>
      </div>
    </footer>
  );
}
