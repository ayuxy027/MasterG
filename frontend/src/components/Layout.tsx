import { ReactNode, useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import Navbar from "./Navbar";
import Pattern from "../design/Pattern";
import Banner from "../../Banner";

interface LayoutProps {
    children: ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
    const location = useLocation();
    const isBoardPage = location.pathname === '/board';
    const isChatPage = location.pathname === '/chat';
    const [bannerVisible, setBannerVisible] = useState(true);

    useEffect(() => {
        const handleScroll = () => {
            const scrollY = window.scrollY;
            // Fade out banner after scrolling 50px
            setBannerVisible(scrollY < 50);
        };

        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // Don't render regular layout for board page and chat page (they have their own layouts)
    if (isBoardPage || isChatPage) {
        return <>{children}</>;
    }

    return (
        <div className="text-gray-900">
            {/* Banner at the top - fades on scroll */}
            <Banner isVisible={bannerVisible} />
            {/* Pattern background only for navbar and hero section */}
            <div className="relative" style={{ minHeight: '100vh' }}>
                <Pattern />
                <div className="absolute inset-0 z-10">
                    <div className="fixed top-[40px] sm:top-[44px] left-0 right-0 z-50 flex justify-center px-4 pt-6 pb-6">
                        <Navbar />
                    </div>
                    <main className="px-4 sm:px-6 lg:px-8 pt-32 md:pt-36 pb-16">
                        {children}
                    </main>
                </div>
            </div>
            {/* Rest of the content continues normally without pattern */}
        </div>
    );
};

export default Layout;

