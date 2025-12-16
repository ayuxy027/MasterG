import { useState } from 'react';
import { Link } from 'react-router-dom';

const Avatar = ({ src, alt }: { src: string; alt: string }) => {
    const [imageError, setImageError] = useState(false);

    return (
        <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-br from-orange-300 to-orange-500 rounded-full opacity-50"></div>
            {imageError ? (
                <div className="relative w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 rounded-full bg-gradient-to-br from-orange-300 to-orange-500 border-2 border-white shadow-md"></div>
            ) : (
                <img
                    src={src}
                    alt={alt}
                    className="relative w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 rounded-full border-2 border-white shadow-md"
                    onError={() => setImageError(true)}
                />
            )}
        </div>
    );
};

const Herobox = () => {
    // Fallback gradient backgrounds for missing images
    const fallbackGradients = [
        "linear-gradient(135deg, #F97316 0%, #FB923C 50%, #FED7AA 100%)",
        "linear-gradient(135deg, #FB923C 0%, #F97316 50%, #EA580C 100%)",
    ];

    const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
        const target = e.target as HTMLImageElement;
        target.style.display = 'none';
        const parent = target.parentElement;
        if (parent) {
            parent.style.background = fallbackGradients[Math.floor(Math.random() * fallbackGradients.length)];
        }
    };

    return (
        <div className="bg-white px-4 sm:px-6 md:px-12 lg:px-20 py-8 sm:py-12 md:py-16">
            <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-6 gap-4 sm:gap-6 items-stretch">
                {/* Left Image */}
                <div className="md:col-span-2 relative group">
                    <div className="relative h-full min-h-[250px] sm:min-h-[300px] md:min-h-[400px] rounded-xl overflow-hidden border-2 border-orange-400/20 hover:border-orange-400/40 transition-all duration-300">
                        <div className="absolute inset-0 bg-gradient-to-br from-orange-500 via-orange-400 to-orange-300 z-0"></div>
                        <img
                            src="https://images.unsplash.com/photo-1573894999291-f440466112cc?ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&q=80&w=2070"
                            alt="Indian Students Learning"
                            className="absolute inset-0 w-full h-full object-cover z-10"
                            onError={handleImageError}
                        />
                    </div>
                </div>

                {/* Center Cards */}
                <div className="md:col-span-2 flex flex-col gap-4 sm:gap-6">
                    {/* Top Card - LMR */}
                    <div className="relative bg-white border-2 border-orange-400 rounded-xl p-4 sm:p-5 md:p-6 flex flex-col justify-center h-full hover:shadow-lg transition-all duration-300">
                        <div className="flex items-center mb-3 sm:mb-4 gap-2 sm:gap-3">
                            <div className="flex -space-x-2 sm:-space-x-3">
                                {[
                                    "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=100&h=100&fit=crop&crop=faces&q=80",
                                    "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=100&h=100&fit=crop&crop=faces&q=80",
                                    "https://images.unsplash.com/photo-1607746882042-944635dfe10e?w=100&h=100&fit=crop&crop=faces&q=80",
                                    "https://images.unsplash.com/photo-1619895862022-09114b41f16f?w=100&h=100&fit=crop&crop=faces&q=80",
                                ].map((src, idx) => (
                                    <Avatar key={idx} src={src} alt="Indian Teacher Avatar" />
                                ))}
                            </div>
                            <p className="text-xs sm:text-sm text-gray-600 font-medium">
                                and 500+ more Users!
                            </p>
                        </div>
                        <h3 className="text-base sm:text-lg font-semibold text-gray-800 leading-relaxed mb-2 sm:mb-3">
                            Transform Your Study <br /> Materials with AI
                        </h3>
                        <Link to="/posters" className="inline-block bg-orange-400 text-white border-2 border-orange-400 font-semibold px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg text-xs sm:text-sm hover:bg-orange-500 hover:border-orange-500 transition-all duration-300 w-fit">
                            Try Generating Posters →
                        </Link>
                    </div>

                    {/* Bottom Card - Stitch */}
                    <div className="relative bg-orange-400 border-2 border-orange-400 rounded-xl p-4 sm:p-5 md:p-6 md:px-8 flex flex-col justify-center h-full hover:shadow-lg transition-all duration-300">
                        <p className="text-lg sm:text-xl font-semibold text-white leading-relaxed mb-2 sm:mb-3">
                            Create Stunning <br />
                            AI-Powered Presentations
                        </p>
                        <a href="/stitch" className="inline-block bg-white text-orange-400 border-2 border-white font-semibold px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg text-xs sm:text-sm hover:bg-orange-50 hover:text-orange-500 transition-all duration-300 w-fit">
                            Try Stitch →
                        </a>
                    </div>
                </div>

                {/* Right Image */}
                <div className="md:col-span-2 relative group">
                    <div className="relative h-full min-h-[250px] sm:min-h-[300px] md:min-h-[400px] rounded-xl overflow-hidden border-2 border-orange-400/20 hover:border-orange-400/40 transition-all duration-300">
                        <div className="absolute inset-0 bg-gradient-to-bl from-orange-500 via-orange-400 to-orange-300 z-0"></div>
                        <img
                            src="https://images.unsplash.com/photo-1597743622436-c6b5661731e0?ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTR8fGluZGlhbiUyMGNsYXNzcm9vbXxlbnwwfHwwfHx8MA%3D%3D&auto=format&fit=crop&q=60&w=900"
                            alt="Indian Classroom"
                            className="absolute inset-0 w-full h-full object-cover z-10"
                            onError={handleImageError}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

const Landing = () => {

    return (
        <div className="py-3 sm:py-4 md:py-5">
            <div className="px-2 sm:px-4 md:px-6 lg:px-8 relative overflow-hidden flex justify-center items-start md:items-center">

                <div className="max-w-7xl my-2 mx-auto">
                    {/* Header Section */}
                    <div className="text-center mb-8 sm:mb-12 md:mb-16 relative z-10">
                        <span className="inline-flex items-center justify-center gap-1 sm:gap-2 mb-3 sm:mb-4 px-3 sm:px-4 py-1.5 sm:py-2 border-2 text-white border-orange-400 bg-orange-400 rounded-full text-[10px] sm:text-xs md:text-sm font-medium">
                            <svg className="w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15.236 22a3 3 0 0 0-2.2-5" />
                                <path strokeLinecap="round" strokeLinejoin="round" d="M16 20a3 3 0 0 1 3-3h1a2 2 0 0 0 2-2v-2a4 4 0 0 0-4-4V4" />
                                <path strokeLinecap="round" strokeLinejoin="round" d="M18 13h.01" />
                                <path strokeLinecap="round" strokeLinejoin="round" d="M18 6a4 4 0 0 0-4 4 7 7 0 0 0-7 7c0-5 4-5 4-10.5a4.5 4.5 0 1 0-9 0 2.5 2.5 0 0 0 5 0C7 10 3 11 3 17c0 2.8 2.2 5 5 5h10" />
                            </svg>
                            <span className="hidden sm:inline">|</span>
                            <span className="text-[10px] sm:text-xs md:text-sm">Trusted by 500+ students</span>
                        </span>

                        <h1 className="text-2xl sm:text-3xl md:text-5xl lg:text-7xl tracking-tight font-semibold text-orange-400 mb-2 px-2">
                            Your Personlised  <br className="hidden sm:block" />
                            <span className="inline-flex items-center align-middle flex-wrap justify-center gap-1 sm:gap-2 md:gap-3">
                                <span className="inline-flex items-center justify-center border-2 border-orange-400 rounded-full px-2 py-1 sm:px-3 sm:py-1.5 md:px-4 md:py-2 lg:px-6 lg:py-3 transform -rotate-6 origin-center mr-1 sm:mr-2 md:mr-3">
                                    <svg className="text-orange-400 w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 lg:w-10 lg:h-10" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M8 4c-2.2 0-4 1.8-4 4v16c0 2.2 1.8 4 4 4h16c2.2 0 4-1.8 4-4V8c0-2.2-1.8-4-4-4H8z" />
                                        <path d="M8 12h16m-16 4h12m-12 4h8" />
                                        <circle cx="24" cy="24" r="4.5" />
                                        <path d="M24 22v4m-2-2h4" strokeWidth="1.2" />
                                    </svg>
                                </span>
                                <span
                                    className="text-2xl sm:text-4xl md:text-5xl lg:text-7xl text-orange-400 font-semibold"
                                    style={{
                                        WebkitTextStroke: '2px #FB923C',
                                        WebkitTextFillColor: 'transparent',
                                        color: 'transparent',
                                        paintOrder: 'stroke fill'
                                    }}
                                >
                                    Lightweight
                                </span>
                                <span className="inline-flex items-center mx-1 sm:mx-2 md:mx-3 align-middle">
                                    <span className="inline-flex items-center justify-center border-2 border-orange-400 rounded-full px-2 py-1 sm:px-3 sm:py-1.5 md:px-4 md:py-2 lg:px-6 lg:py-3 transform rotate-6 origin-center">
                                        <svg className="text-orange-400 w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 lg:w-10 lg:h-10" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M16 6.67a4 4 0 1 0-7.996.167 5.33 5.33 0 0 0-3.368 7.693 5.33 5.33 0 0 0 .741 8.784A5.33 5.33 0 1 0 16 24Z" />
                                            <path d="M12 17.33a6 6 0 0 0 4-5.33" />
                                            <path d="M8.004 6.833a4 4 0 0 0 .531 1.833" />
                                            <path d="M4.636 14.528a5.33 5.33 0 0 1 .78-.528" />
                                            <path d="M8 24a5.33 5.33 0 0 1-2.623-.688" />
                                            <path d="M16 17.33h5.33" />
                                            <path d="M16 24h8a2.67 2.67 0 0 1 2.67 2.67v1.33" />
                                            <path d="M16 10.67h10.67" />
                                            <path d="M21.33 10.67V6.67a2.67 2.67 0 0 1 2.67-2.67" />
                                            <circle cx="21.33" cy="17.33" r=".67" />
                                            <circle cx="24" cy="4" r=".67" />
                                            <circle cx="26.67" cy="28" r=".67" />
                                            <circle cx="26.67" cy="10.67" r=".67" />
                                        </svg>
                                    </span>
                                </span>
                            </span>
                            <br className="hidden sm:block" /> <span className="block sm:inline">Growth Companion</span>
                        </h1>

                        <p className="text-gray-800 text-xs sm:text-sm md:text-lg lg:text-xl max-w-[90%] sm:max-w-[85%] md:max-w-[80%] mt-3 sm:mt-4 mx-auto px-4 sm:px-6 md:px-10 mb-6 sm:mb-8 leading-relaxed">
                            Experience best in class Modern, lightweight, and AI enabled Learning Experience with MasterG.
                        </p>

                        {/* Buttons */}
                        <div className="flex flex-row gap-3 sm:gap-4 justify-center items-center px-4">
                            <button className="bg-orange-400 text-white border-2 border-orange-400 font-semibold px-5 sm:px-6 md:px-8 py-2 sm:py-2.5 md:py-3 rounded-full text-xs sm:text-sm md:text-base shadow-md hover:shadow-lg hover:bg-orange-500 hover:border-orange-500 transition-all duration-300 whitespace-nowrap">
                                Get Started
                            </button>
                            <Link to="/board" className="bg-white text-orange-400 border-2 border-orange-400 font-semibold px-5 sm:px-6 md:px-8 py-2 sm:py-2.5 md:py-3 rounded-full text-xs sm:text-sm md:text-base shadow-md hover:shadow-lg hover:bg-orange-50 hover:border-orange-500 transition-all duration-300 whitespace-nowrap">
                                Try Whiteboard
                            </Link>
                        </div>
                    </div>

                </div>
            </div>
            <Herobox />
        </div>
    );
};

export default Landing;
