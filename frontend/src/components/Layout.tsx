import { ReactNode } from "react";
import { useLocation } from "react-router-dom";
import Navbar from "./Navbar";
import Pattern from "../design/Pattern";

interface LayoutProps {
    children: ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
    const location = useLocation();
    const isBoardPage = location.pathname === '/board';

    // Don't render regular layout for board page (it has its own minimized navbar)
    if (isBoardPage) {
        return <>{children}</>;
    }

    return (
        <div className="text-gray-900">
            {/* Pattern background only for navbar and hero section */}
            <div className="relative" style={{minHeight: '100vh'}}>
                <Pattern />
                <div className="absolute inset-0 z-10">
                    <div className="fixed top-0 left-0 right-0 z-50 flex justify-center px-4 pt-6 pb-6">
                        <Navbar />
                    </div>
                    <main className="px-4 sm:px-6 lg:px-8 pt-24 md:pt-28 pb-16">
                        {children}
                    </main>
                </div>
            </div>
            {/* Rest of the content continues normally without pattern */}
        </div>
    );
};

export default Layout;

