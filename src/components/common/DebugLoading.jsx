// src/components/DebugLoading.jsx
export default function DebugLoading() {
  const [dots, setDots] = useState(0);
  
  useEffect(() => {
    const interval = setInterval(() => {
      setDots(prev => (prev + 1) % 4);
    }, 500);
    
    return () => clearInterval(interval);
  }, []);
  
  return (
    <div className="min-h-screen bg-dark flex flex-col items-center justify-center">
      <div className="text-2xl font-bold text-primary mb-4">
        Loading{".".repeat(dots)}
      </div>
      <div className="text-gray-400 text-sm">
        Checking authentication status...
      </div>
      <button 
        onClick={() => window.location.reload()}
        className="mt-8 px-4 py-2 bg-gray-700 rounded hover:bg-gray-600"
      >
        Force Reload
      </button>
    </div>
  );
}