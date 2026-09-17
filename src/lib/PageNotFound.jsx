import { useLocation } from 'react-router-dom';

export default function PageNotFound() {
    const location = useLocation();
    const pageName = location.pathname.substring(1);
    
    return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-slate-950 text-white">
            <div className="max-w-md w-full text-center space-y-6">
                <div className="space-y-2">
                    <h1 className="text-7xl font-light text-slate-700">404</h1>
                    <div className="h-0.5 w-16 bg-slate-800 mx-auto"></div>
                </div>
                <div className="space-y-3">
                    <h2 className="text-2xl font-medium text-slate-200">
                        Page Not Found
                    </h2>
                    <p className="text-slate-400 leading-relaxed">
                        The page <span className="font-medium text-slate-300">"{pageName}"</span> could not be found in this application.
                    </p>
                </div>
                <div className="pt-6">
                    <button 
                        onClick={() => window.location.href = '/'} 
                        className="inline-flex items-center px-4 py-2 text-sm font-medium text-slate-200 bg-slate-800 border border-slate-700 rounded-lg hover:bg-slate-700 transition-colors duration-200"
                    >
                        Go Home
                    </button>
                </div>
            </div>
        </div>
    );
}
